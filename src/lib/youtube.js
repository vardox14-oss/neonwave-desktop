// --- Extraction YouTube 100% locale via youtubei.js (InnerTube) ---
// Remplace le proxy VPS : l'extraction se fait depuis la machine de
// l'utilisateur, donc les URLs googlevideo sont liées à sa propre IP.

const vm = require('node:vm');

// Clients InnerTube essayés dans l'ordre. MWEB/TV exposent du webm/opus
// déchiffrable ; iOS fournit des URLs mp4 directes en dernier recours.
const STREAM_CLIENTS = ['MWEB', 'TV', 'IOS', 'WEB_EMBEDDED'];
const SESSION_MAX_AGE_MS = 6 * 60 * 60 * 1000; // recrée la session (player à jour) toutes les 6h

let innertubePromise = null;
let innertubeCreatedAt = 0;

const getInnertube = () => {
    const expired = innertubePromise && (Date.now() - innertubeCreatedAt > SESSION_MAX_AGE_MS);
    if (!innertubePromise || expired) {
        innertubeCreatedAt = Date.now();
        innertubePromise = (async () => {
            const { Innertube, Platform } = await import('youtubei.js');

            // Évaluateur requis pour déchiffrer les URLs (sig/nsig) : le script
            // extrait du player YouTube est autonome, on l'exécute en sandbox vm.
            Platform.shim.eval = async (data, _env) => {
                const context = vm.createContext(Object.create(null));
                // Le script se termine par un `return` top-level : on l'enveloppe.
                return vm.runInContext(`(function () {\n${data.output}\n})()`, context, { timeout: 15000 });
            };

            return Innertube.create({ retrieve_player: true });
        })();
        innertubePromise.catch(() => {
            innertubePromise = null;
        });
    }
    return innertubePromise;
};

// Privilégie mp4/m4a (compatible iOS AVPlayer et Chromium), puis le meilleur bitrate.
const pickBestAudioFormat = (info) => {
    const candidates = [
        ...(info.streaming_data?.adaptive_formats || []),
        ...(info.streaming_data?.formats || [])
    ].filter((format) => (format.mime_type || '').startsWith('audio'));

    if (!candidates.length) return null;

    const scoreOf = (format) => {
        const mime = (format.mime_type || '').toLowerCase();
        let score = format.bitrate || 0;
        if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) {
            score += 2_000_000;
        } else if (mime.includes('webm')) {
            score += 500_000;
        }
        return score;
    };

    return candidates.sort((left, right) => scoreOf(right) - scoreOf(left))[0];
};

// Sonde l'URL (1 seule requête) : valide qu'elle répond ET récupère la taille
// totale du fichier (via content-range), évitant un second probe plus tard.
const probeStreamUrl = async (url) => {
    try {
        const response = await fetch(url, {
            headers: { Range: 'bytes=0-0' },
            signal: AbortSignal.timeout(8000)
        });
        response.body?.cancel?.().catch?.(() => {});
        if (response.status !== 200 && response.status !== 206) return null;
        const match = /bytes\s+\d+-\d+\/(\d+)/.exec(response.headers.get('content-range') || '');
        return { totalBytes: match ? Number.parseInt(match[1], 10) : null };
    } catch {
        return null;
    }
};

// Résout la meilleure URL audio pour une vidéo en parcourant les clients.
// Un unique probe par candidat valide l'URL et renvoie sa taille.
const resolveAudioStream = async (videoId) => {
    const yt = await getInnertube();

    for (const client of STREAM_CLIENTS) {
        try {
            const info = await yt.getBasicInfo(videoId, { client });
            if (info?.playability_status?.status !== 'OK') continue;

            const format = pickBestAudioFormat(info);
            if (!format) continue;

            const url = await format.decipher(yt.session.player);
            if (!url) continue;
            const probe = await probeStreamUrl(url);
            if (!probe) continue;

            return {
                url,
                client,
                mimeType: format.mime_type || 'audio/mp4',
                bitrate: format.bitrate || 0,
                durationMs: (info.basic_info?.duration || 0) * 1000,
                totalBytes: probe.totalBytes
            };
        } catch (error) {
            console.warn(`   InnerTube [${client}] failed for ${videoId}: ${error.message}`);
        }
    }

    return null;
};

const textOf = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.text || value.simpleText || String(value);
};

const mapVideoNode = (item) => {
    const videoId = item?.video_id || item?.id || '';
    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;

    const durationSec = Number(item?.duration?.seconds) || 0;
    const viewsText = textOf(item?.view_count) || textOf(item?.short_view_count);

    return {
        title: textOf(item?.title) || 'Sans titre',
        url: `/watch?v=${videoId}`,
        videoId,
        uploaderName: item?.author?.name || 'Artiste inconnu',
        uploaderUrl: item?.author?.url || '',
        thumbnail: item?.best_thumbnail?.url || item?.thumbnails?.[0]?.url || '',
        duration: durationSec,
        durationText: textOf(item?.duration) || '',
        views: Number.parseInt(String(viewsText).replace(/[^0-9]/g, '') || '0', 10),
        type: 'stream'
    };
};

const mapMusicNode = (item) => {
    const videoId = item?.id || '';
    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;

    const artists = Array.isArray(item?.artists)
        ? item.artists.map((artist) => artist?.name).filter(Boolean).join(', ')
        : '';
    const thumbnails = item?.thumbnail?.contents || item?.thumbnails || [];

    return {
        title: textOf(item?.title) || 'Sans titre',
        url: `/watch?v=${videoId}`,
        videoId,
        uploaderName: artists || item?.author?.name || 'Artiste inconnu',
        uploaderUrl: '',
        thumbnail: thumbnails[thumbnails.length - 1]?.url || '',
        duration: Number(item?.duration?.seconds) || 0,
        durationText: textOf(item?.duration) || '',
        views: 0,
        type: 'stream'
    };
};

// Recherche YouTube classique (candidats vidéo).
const searchVideos = async (query, { limit = 20 } = {}) => {
    const yt = await getInnertube();
    const search = await yt.search(query, { type: 'video' });
    const results = Array.isArray(search?.videos) ? search.videos : (search?.results || []);

    return results
        .map(mapVideoNode)
        .filter(Boolean)
        .slice(0, limit);
};

// Recherche YouTube Music (titres officiels — bien plus propre pour une appli musicale).
const searchMusicSongs = async (query, { limit = 20 } = {}) => {
    const yt = await getInnertube();
    const search = await yt.music.search(query, { type: 'song' });
    const sections = search?.contents || [];
    const items = [];

    for (const section of sections) {
        const contents = section?.contents || [];
        for (const node of contents) {
            const mapped = mapMusicNode(node);
            if (mapped) items.push(mapped);
            if (items.length >= limit) return items;
        }
    }

    return items;
};

module.exports = {
    getInnertube,
    resolveAudioStream,
    searchVideos,
    searchMusicSongs
};
