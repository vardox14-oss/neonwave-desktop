// --- Session Spotify partagée (main Electron <-> serveur Express) ---
// Le cookie sp_dc (persistant) prouve la connexion ; le token web-player
// (volatile, ~1h) est régénéré par Electron et lu ici par les routes Canvas.
// main.js et server.js tournent dans le même process : ce module leur sert
// de point d'échange commun.

const path = require('path');
const fs = require('fs');

const getConfigPath = () => path.join(
    process.env.NEONWAVE_APPDATA_PATH || path.join(__dirname, '..', '..', 'data'),
    'spotify-session.json'
);

const state = {
    spDc: '',
    token: '',
    tokenExpiresAt: 0
};

// Cookie sp_dc embarqué (propriétaire) : sert de token par défaut pour que les
// Canvas marchent sans que chaque utilisateur connecte son compte. Optionnel.
const loadEmbeddedSpDc = () => {
    try {
        const embedded = require('./spotify-embedded');
        return typeof embedded === 'string' ? embedded.trim() : '';
    } catch {
        return '';
    }
};

const loadEnvironmentSpDc = () => String(
    process.env.SPOTIFY_SP_DC || process.env.SPOTIFY_DC_TOKEN || ''
).trim();

const load = () => {
    try {
        const raw = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'));
        if (typeof raw.spDc === 'string' && raw.spDc) state.spDc = raw.spDc;
    } catch { /* pas encore configuré */ }

    // En production mobile, le cookie reste dans le secret SPOTIFY_SP_DC du
    // serveur. Il ne doit jamais être compilé dans l'application iPhone.
    const environmentSpDc = loadEnvironmentSpDc();
    if (environmentSpDc) state.spDc = environmentSpDc;

    // Aucun compte connecté -> on retombe sur le token partagé embarqué.
    if (!state.spDc) {
        state.spDc = loadEmbeddedSpDc();
    }
    const environmentToken = String(process.env.SPOTIFY_WEB_TOKEN || '').trim();
    if (environmentToken) setToken(environmentToken, 50 * 60 * 1000);
    return state.spDc;
};

const persist = () => {
    try {
        fs.mkdirSync(path.dirname(getConfigPath()), { recursive: true });
        fs.writeFileSync(getConfigPath(), JSON.stringify({ spDc: state.spDc }));
    } catch (error) {
        console.warn('Spotify session persist failed:', error.message);
    }
};

const setSpDc = (value) => {
    state.spDc = String(value || '').trim();
    state.token = '';
    state.tokenExpiresAt = 0;
    persist();
};

const clear = () => {
    state.spDc = '';
    state.token = '';
    state.tokenExpiresAt = 0;
    try { fs.rmSync(getConfigPath(), { force: true }); } catch { /* ignore */ }
};

const setToken = (token, expiresInMs = 55 * 60 * 1000) => {
    state.token = String(token || '');
    state.tokenExpiresAt = token ? Date.now() + expiresInMs : 0;
};

const getToken = () => (state.token && state.tokenExpiresAt > Date.now() ? state.token : '');

const crypto = require('crypto');

// Secret dictionary cache
let secretCache = {
    dict: null,
    fetchedAt: 0
};

const getSecretKey = (asciiCodes) => {
    const transformed = asciiCodes.map((val, i) => val ^ ((i % 33) + 9));
    return Buffer.from(transformed.map(String).join(''), 'utf-8');
};

const generateTotp = (secret, timestampMs) => {
    const counter = Math.floor(timestampMs / 1000 / 30);
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(counter));
    const hmac = crypto.createHmac('sha1', secret);
    hmac.update(buf);
    const digest = hmac.digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const binary = ((digest[offset] & 0x7f) << 24) |
                   ((digest[offset + 1] & 0xff) << 16) |
                   ((digest[offset + 2] & 0xff) << 8) |
                   (digest[offset + 3] & 0xff);
    return String(binary % 1000000).padStart(6, '0');
};

const refreshWebPlayerToken = async (spDc) => {
    if (!spDc) return null;
    try {
        const now = Date.now();
        if (!secretCache.dict || (now - secretCache.fetchedAt > 60 * 60 * 1000)) {
            const secretsResp = await fetch('https://raw.githubusercontent.com/xyloflake/spot-secrets-go/main/secrets/secretDict.json', {
                signal: AbortSignal.timeout(5000)
            });
            if (secretsResp.ok) {
                secretCache.dict = await secretsResp.json();
                secretCache.fetchedAt = now;
            }
        }
        if (!secretCache.dict) return null;

        const versions = Object.keys(secretCache.dict);
        const latestVersion = versions[versions.length - 1];
        const secret = getSecretKey(secretCache.dict[latestVersion]);

        const headers = {
            'accept': 'application/json',
            'origin': 'https://open.spotify.com/',
            'referer': 'https://open.spotify.com/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
            'spotify-app-version': '1.2.46.25.g7f189073',
            'app-platform': 'WebPlayer',
            'cookie': 'sp_dc=' + spDc
        };

        const serverTimeResp = await fetch('https://open.spotify.com/api/server-time', {
            headers,
            signal: AbortSignal.timeout(5000)
        });
        const serverTimeData = serverTimeResp.ok ? await serverTimeResp.json() : null;
        const serverTime = serverTimeData?.serverTime ? (serverTimeData.serverTime * 1000) : Date.now();
        const totp = generateTotp(secret, serverTime);

        const tokenUrl = new URL('https://open.spotify.com/api/token');
        tokenUrl.searchParams.set('reason', 'init');
        tokenUrl.searchParams.set('productType', 'web-player');
        tokenUrl.searchParams.set('totp', totp);
        tokenUrl.searchParams.set('totpVer', String(latestVersion));
        tokenUrl.searchParams.set('ts', String(Math.floor(serverTime)));

        const tokenResp = await fetch(tokenUrl.toString(), {
            headers,
            signal: AbortSignal.timeout(8000)
        });
        if (!tokenResp.ok) {
            console.warn(`Spotify token HTTP ${tokenResp.status}`);
            return null;
        }
        const data = await tokenResp.json();
        if (data && data.accessToken) {
            const ttl = data.accessTokenExpirationTimestampMs ? Math.max(60000, data.accessTokenExpirationTimestampMs - Date.now() - 60000) : 50 * 60 * 1000;
            setToken(data.accessToken, ttl);
            return data.accessToken;
        }
        return null;
    } catch (err) {
        console.warn('Failed to refresh Spotify web player token:', err.message);
        return null;
    }
};

let refreshingPromise = null;
const getValidToken = async () => {
    const existing = getToken();
    if (existing) return existing;

    const spDc = state.spDc || load();
    if (!spDc) return '';

    if (!refreshingPromise) {
        refreshingPromise = refreshWebPlayerToken(spDc).finally(() => {
            refreshingPromise = null;
        });
    }
    const token = await refreshingPromise;
    return token || getToken();
};
const getSpDc = () => state.spDc;
const isConnected = () => Boolean(state.spDc);
let onTokenExpiredHandler = null;

const setOnTokenExpired = (fn) => {
    onTokenExpiredHandler = fn;
};

const notifyTokenExpired = () => {
    state.token = '';
    state.tokenExpiresAt = 0;
    if (typeof onTokenExpiredHandler === 'function') {
        try { onTokenExpiredHandler(); } catch (e) { console.warn('onTokenExpired error:', e.message); }
    }
};

// Charge le sp_dc persistant au require du module.
load();

module.exports = {
    setSpDc,
    getSpDc,
    clear,
    setToken,
    getToken,
    getValidToken,
    isConnected,
    setOnTokenExpired,
    notifyTokenExpired
};

