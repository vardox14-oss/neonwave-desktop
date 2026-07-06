// Preload de la fenêtre Spotify interne : intercepte le token web-player.
// Le web player Spotify émet ses requêtes avec un header Authorization: Bearer ;
// on hooke fetch pour capturer ce token et le transmettre au process principal.
const { ipcRenderer } = require('electron');

const originalFetch = window.fetch;
window.fetch = function (...args) {
    try {
        const headers = (args[1] && args[1].headers) || {};
        const auth = headers.authorization || headers.Authorization
            || (typeof headers.get === 'function' && headers.get('authorization'));
        if (auth && String(auth).startsWith('Bearer ')) {
            ipcRenderer.send('spotify:token', String(auth).slice(7));
        }
    } catch { /* ignore */ }
    return originalFetch.apply(this, args);
};
