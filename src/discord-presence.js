const RPC = require('discord-rpc');

const DEFAULT_DISCORD_CLIENT_ID = '1490677764494327909';

class DiscordPresenceManager {
    constructor({ clientId = DEFAULT_DISCORD_CLIENT_ID } = {}) {
        this.clientId = String(clientId || '').trim();
        this.client = null;
        this.ready = false;
        this.connectPromise = null;
        this.retryAfter = 0;
        this.lastPayload = null;

        if (this.clientId) {
            RPC.register(this.clientId);
        }
    }

    sanitizeText(value, maxLength = 128) {
        return String(value || '').trim().slice(0, maxLength);
    }

    sanitizeImageSource(value, maxLength = 256) {
        const normalized = String(value || '').trim();
        if (!/^https?:\/\//i.test(normalized)) {
            return '';
        }
        return normalized.slice(0, maxLength);
    }

    buildActivity(payload = {}) {
        const status = payload.status === 'paused' ? 'paused' : 'playing';
        const track = payload.track || {};
        const title = this.sanitizeText(track.title || 'NeonWave');
        const artist = this.sanitizeText(track.artist || 'Artiste inconnu');
        const thumb = this.sanitizeImageSource(track.thumb || '');
        const position = Number.isFinite(payload.position) ? Math.max(0, payload.position) : 0;
        const duration = Number.isFinite(payload.duration) ? Math.max(0, payload.duration) : 0;

        const activity = {
            type: 2,
            details: title,
            state: this.sanitizeText(status === 'paused' ? `En pause - ${artist}` : `par ${artist}`),
            instance: false
        };

        if (thumb) {
            activity.assets = {
                large_image: thumb,
                large_text: this.sanitizeText(`${title} - ${artist}`)
            };
        }

        if (status === 'playing' && duration > 0) {
            const startTimestamp = Date.now() - Math.round(position * 1000);
            const endTimestamp = startTimestamp + Math.round(duration * 1000);
            activity.timestamps = {
                start: startTimestamp,
                end: endTimestamp
            };
        }

        return activity;
    }

    handleDisconnect(client, error = null) {
        if (error) {
            console.warn('Discord RPC unavailable:', error.message || error);
        }

        if (client && this.client === client) {
            this.client.removeAllListeners();
        }

        this.client = null;
        this.ready = false;
        this.connectPromise = null;
        this.retryAfter = Date.now() + 15000;
    }

    async ensureConnected() {
        if (!this.clientId) return false;
        if (this.ready && this.client) return true;
        if (this.connectPromise) return this.connectPromise;
        if (Date.now() < this.retryAfter) return false;

        const client = new RPC.Client({ transport: 'ipc' });

        client.on('ready', () => {
            this.ready = true;
            if (this.lastPayload) {
                this.setActivity(this.lastPayload).catch(() => {});
            }
        });

        client.on('disconnected', () => {
            this.handleDisconnect(client);
        });

        client.on('error', (error) => {
            this.handleDisconnect(client, error);
        });

        this.client = client;
        this.connectPromise = client.login({ clientId: this.clientId })
            .then(() => true)
            .catch((error) => {
                this.handleDisconnect(client, error);
                return false;
            })
            .finally(() => {
                this.connectPromise = null;
            });

        return this.connectPromise;
    }

    async setActivity(payload = {}) {
        this.lastPayload = payload;

        const connected = await this.ensureConnected();
        if (!connected || !this.client || !this.ready) {
            return false;
        }

        try {
            await this.client.request('SET_ACTIVITY', {
                pid: process.pid,
                activity: this.buildActivity(payload)
            });
            return true;
        } catch (error) {
            this.handleDisconnect(this.client, error);
            return false;
        }
    }

    async clearActivity() {
        this.lastPayload = null;

        if (!this.client || !this.ready) {
            return false;
        }

        try {
            await this.client.clearActivity();
            return true;
        } catch (error) {
            this.handleDisconnect(this.client, error);
            return false;
        }
    }

    async shutdown() {
        const activeClient = this.client;
        this.lastPayload = null;

        if (!activeClient) {
            return;
        }

        this.client = null;
        this.ready = false;
        this.connectPromise = null;

        try {
            await activeClient.clearActivity();
        } catch {}

        try {
            await activeClient.destroy();
        } catch {}
    }
}

module.exports = {
    DiscordPresenceManager,
    DEFAULT_DISCORD_CLIENT_ID
};
