// --- Récupération des Canvas Spotify (boucles vidéo verticales) ---
// Interroge l'endpoint interne canvaz-cache avec un token web-player.
// Requête et réponse sont en Protocol Buffers ; on les encode/parse à la main
// (le schéma se limite à quelques champs string).

const dns = require('dns');
try { dns.setServers(['1.1.1.1', '8.8.8.8', '1.0.0.1']); } catch(e) {}
const CANVAS_ENDPOINT = 'https://spclient.wg.spotify.com/canvaz-cache/v0/canvases';
const canvasCache = new Map(); // trackId -> { url, cachedAt } (url '' = pas de canvas)
const CACHE_TTL = 6 * 60 * 60 * 1000;

// Encode un champ protobuf de type string (wire type 2).
const encodeString = (fieldNumber, value) => {
    const data = Buffer.from(value, 'utf8');
    return Buffer.concat([Buffer.from([(fieldNumber << 3) | 2]), Buffer.from([data.length]), data]);
};

// EntityCanvazRequest { entities: [ Entity { entity_uri } ] }
const buildRequest = (trackId) => {
    const entity = encodeString(1, `spotify:track:${trackId}`);
    return Buffer.concat([Buffer.from([(1 << 3) | 2]), Buffer.from([entity.length]), entity]);
};

// Extrait la première URL de fichier Canvas (.cnvs.mp4) de la réponse protobuf.
const extractCanvasUrl = (buffer) => {
    const text = buffer.toString('latin1');
    let index = 0;
    while ((index = text.indexOf('https://', index)) !== -1) {
        let end = index;
        while (end < text.length && text.charCodeAt(end) >= 0x20 && text[end] !== '"') end++;
        const url = text.slice(index, end).trim();
        if (url.includes('.cnvs.mp4') || (url.includes('canvaz.scdn.co') && url.includes('/video/'))) {
            return url;
        }
        index = end;
    }
    return '';
};

// Retourne l'URL du Canvas d'un morceau, ou '' s'il n'en a pas.
// `token` est le token web-player fourni par Electron.
const getCanvasUrl = async (trackId, token) => {
    if (!trackId || !token) return '';

    const cached = canvasCache.get(trackId);
    if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL) {
        return cached.url;
    }

    try {
        const response = await fetch(CANVAS_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/x-protobuf',
                'Accept': 'application/protobuf'
            },
            body: buildRequest(trackId),
            signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) {
            console.warn(`Canvas HTTP ${response.status} for ${trackId}`);
            // 401 ou 403 = token périmé ou non autorisé (ex: token invité anonyme) ;
            // on ne met PAS en cache pour pouvoir re-tester dès la reconnexion.
            if (response.status === 401 || response.status === 403) throw new Error('token expiré');
            canvasCache.set(trackId, { url: '', cachedAt: Date.now() });
            return '';
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const url = extractCanvasUrl(buffer);
        if (!url) console.warn(`Canvas response contained no video for ${trackId} (${buffer.length} bytes)`);
        canvasCache.set(trackId, { url, cachedAt: Date.now() });
        return url;
    } catch (error) {
        console.warn(`Canvas fetch failed for ${trackId}:`, error.message);
        if (error.message === 'token expiré') throw error;
        return '';
    }
};

const clearCache = () => canvasCache.clear();

module.exports = { getCanvasUrl, clearCache };
