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

const load = () => {
    try {
        const raw = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'));
        if (typeof raw.spDc === 'string' && raw.spDc) state.spDc = raw.spDc;
    } catch { /* pas encore configuré */ }

    // Aucun compte connecté -> on retombe sur le token partagé embarqué.
    if (!state.spDc) {
        state.spDc = loadEmbeddedSpDc();
    }
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
const getSpDc = () => state.spDc;
const isConnected = () => Boolean(state.spDc);

// Charge le sp_dc persistant au require du module.
load();

module.exports = {
    setSpDc,
    getSpDc,
    clear,
    setToken,
    getToken,
    isConnected
};
