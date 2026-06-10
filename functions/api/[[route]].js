import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { sign, verify } from 'hono/jwt';
import { getCookie, setCookie } from 'hono/cookie';
import bcrypt from 'bcryptjs';

const app = new Hono().basePath('/api');

// --- CONSTANTS ---
const JWT_SECRET = 'neonwave-secret-2026';
const MIN_PASSWORD_LENGTH = 8;
const MAX_LOCAL_TRACK_BYTES = 50 * 1024 * 1024;
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS_BASE = 'https://accounts.spotify.com/api/token';

const MUSIC_GENRE_OPTIONS = [
    'Rap', 'Drill', 'R&B', 'Afro', 'Pop', 'Electro',
    'House', 'Techno', 'Trap', 'Dancehall', 'Amapiano', 'Latino'
];
const MUSIC_GENRE_MAP = MUSIC_GENRE_OPTIONS.reduce((acc, item) => {
    acc[item.toLowerCase()] = item;
    return acc;
}, {});

const FALLBACK_ARTIST_IMAGES = {
    'maes': 'https://cdn-images.dzcdn.net/images/artist/14c919011b4dc5575aa64bcf7311aa5d/1000x1000-000000-80-0-0.jpg',
    'ninho': 'https://cdn-images.dzcdn.net/images/artist/7601c5c0e2bd16cb585898316fd0dfec/1000x1000-000000-80-0-0.jpg',
    'sch': 'https://cdn-images.dzcdn.net/images/artist/8d9c407bd25fab0fc961b6abf335e874/1000x1000-000000-80-0-0.jpg',
    'damso': 'https://cdn-images.dzcdn.net/images/artist/f1a596b126611260994271ce4cb54bb0/1000x1000-000000-80-0-0.jpg',
    'gazo': 'https://cdn-images.dzcdn.net/images/artist/54c1dc208f92240e9d56b595708ed284/1000x1000-000000-80-0-0.jpg',
    'tiakola': 'https://cdn-images.dzcdn.net/images/artist/0df16db136e7417eeef74988208859c3/1000x1000-000000-80-0-0.jpg',
    'aya nakamura': 'https://cdn-images.dzcdn.net/images/artist/c8bca3e6aed3da8de8cbe0edd91bc156/1000x1000-000000-80-0-0.jpg',
    'burna boy': 'https://cdn-images.dzcdn.net/images/artist/ad15b7f03325752d60db9e4d39c079ae/1000x1000-000000-80-0-0.jpg',
    'drake': 'https://cdn-images.dzcdn.net/images/artist/eb0ed5b21d1ea5af021fc074ded0e91f/1000x1000-000000-80-0-0.jpg',
    'the weeknd': 'https://cdn-images.dzcdn.net/images/artist/581693b4724a7fcfa754455101e13a44/1000x1000-000000-80-0-0.jpg',
    'travis scott': 'https://cdn-images.dzcdn.net/images/artist/8d8316146026d7e6ce377e314536df62/1000x1000-000000-80-0-0.jpg',
    'jul': 'https://cdn-images.dzcdn.net/images/artist/16eb681d72934d4db17088dfc216669d/1000x1000-000000-80-0-0.jpg',
    'werenoi': 'https://cdn-images.dzcdn.net/images/artist/c9a941ffdfec123385b9e0b8b20f9ac0/1000x1000-000000-80-0-0.jpg',
    'booba': 'https://cdn-images.dzcdn.net/images/artist/38b687e97c6874e744d305ef2ca8d0d0/1000x1000-000000-80-0-0.jpg',
    'pnl': 'https://cdn-images.dzcdn.net/images/artist/9277fdce45b79945918c24f69cb6e8e3/1000x1000-000000-80-0-0.jpg',
    'freeze corleone': 'https://cdn-images.dzcdn.net/images/artist/cdac7dd9008bcce4c12809c93989e348/1000x1000-000000-80-0-0.jpg',
    'saif': 'https://cdn-images.dzcdn.net/images/artist/ce23fc0a3302d65712df2dcfeef5467e/1000x1000-000000-80-0-0.jpg',
    'saïf': 'https://cdn-images.dzcdn.net/images/artist/ce23fc0a3302d65712df2dcfeef5467e/1000x1000-000000-80-0-0.jpg',
    'pato': 'https://cdn-images.dzcdn.net/images/artist/28e12b8806d4baa0c3affc8e28a0809e/1000x1000-000000-80-0-0.jpg'
};

const DEFAULT_FALLBACK_IMAGES = [
    'https://cdn-images.dzcdn.net/images/artist/14c919011b4dc5575aa64bcf7311aa5d/1000x1000-000000-80-0-0.jpg',
    'https://cdn-images.dzcdn.net/images/artist/7601c5c0e2bd16cb585898316fd0dfec/1000x1000-000000-80-0-0.jpg',
    'https://cdn-images.dzcdn.net/images/artist/8d9c407bd25fab0fc961b6abf335e874/1000x1000-000000-80-0-0.jpg',
    'https://cdn-images.dzcdn.net/images/artist/f1a596b126611260994271ce4cb54bb0/1000x1000-000000-80-0-0.jpg'
];

const DEFAULT_FALLBACK_ARTIST_NAMES = [
    'Maes', 'Ninho', 'SCH', 'Damso', 'Gazo', 'Tiakola',
    'Aya Nakamura', 'Burna Boy', 'Drake', 'The Weeknd', 'Travis Scott', 'Jul'
];

const RELATED_ARTIST_FALLBACKS = {
    maes: ['SCH', 'Ninho', 'Damso', 'Tiakola', 'Gazo'],
    ninho: ['Maes', 'SCH', 'Damso', 'Tiakola', 'Gazo'],
    sch: ['Damso', 'Maes', 'Ninho', 'Gazo', 'Jul'],
    damso: ['SCH', 'Ninho', 'Maes', 'The Weeknd', 'Drake'],
    gazo: ['Tiakola', 'Maes', 'Ninho', 'SCH', 'Travis Scott'],
    tiakola: ['Gazo', 'Ninho', 'Maes', 'Aya Nakamura', 'Burna Boy'],
    'aya nakamura': ['Burna Boy', 'Tiakola', 'Drake', 'The Weeknd', 'Jul'],
    'burna boy': ['Aya Nakamura', 'Drake', 'The Weeknd', 'Tiakola', 'Damso'],
    drake: ['The Weeknd', 'Travis Scott', 'Burna Boy', 'Damso', 'Aya Nakamura'],
    'the weeknd': ['Drake', 'Travis Scott', 'Damso', 'Burna Boy', 'Aya Nakamura'],
    'travis scott': ['Drake', 'The Weeknd', 'Gazo', 'Damso', 'SCH'],
    jul: ['SCH', 'Maes', 'Ninho', 'Aya Nakamura', 'Tiakola']
};

const STATIC_FALLBACK_TRACKS = [
    {
        id: "J05Ww73KlLE",
        videoId: "J05Ww73KlLE",
        spotifyId: "",
        title: "Distant",
        artist: "Maes feat. Ninho",
        thumb: "https://cdn-images.dzcdn.net/images/cover/b0122ae8efd3951902e1f01673a4f219/1000x1000-000000-80-0-0.jpg",
        source: "spotify",
        durationMs: 181000
    },
    {
        id: "3r813K1jK1k",
        videoId: "3r813K1jK1k",
        spotifyId: "",
        title: "Madrina",
        artist: "Maes feat. Booba",
        thumb: "https://cdn-images.dzcdn.net/images/cover/708aea49a3c6311ba1d83273e6a4d0e3/1000x1000-000000-80-0-0.jpg",
        source: "spotify",
        durationMs: 200000
    },
    {
        id: "5wY31c9a6oM",
        videoId: "5wY31c9a6oM",
        spotifyId: "",
        title: "PARANO",
        artist: "GAULOIS feat. Maes",
        thumb: "https://cdn-images.dzcdn.net/images/cover/f53927289cf5798a4d82f92d953ea2ff/1000x1000-000000-80-0-0.jpg",
        source: "spotify",
        durationMs: 185000
    },
    {
        id: "j93dSpC8T3A",
        videoId: "j93dSpC8T3A",
        spotifyId: "",
        title: "T'avais raison",
        artist: "GIMS, Maes",
        thumb: "https://cdn-images.dzcdn.net/images/cover/fe8d3b62b12560fe169d428b0d28597e/1000x1000-000000-80-0-0.jpg",
        source: "spotify",
        durationMs: 181000
    },
    {
        id: "Gq4oD5k_yv4",
        videoId: "Gq4oD5k_yv4",
        spotifyId: "",
        title: "FC BEAUDOTTES",
        artist: "Maes",
        thumb: "https://cdn-images.dzcdn.net/images/cover/eb87bb36f5eaac37d553b85143bf8eed/1000x1000-000000-80-0-0.jpg",
        source: "spotify",
        durationMs: 185000
    },
    {
        id: "4CgR-p1hLsk",
        videoId: "4CgR-p1hLsk",
        spotifyId: "",
        title: "HIJAMA",
        artist: "Maes",
        thumb: "https://cdn-images.dzcdn.net/images/cover/33546e8c7b544a4a20d6592af1f4ad56/1000x1000-000000-80-0-0.jpg",
        source: "spotify",
        durationMs: 193000
    },
    {
        id: "d4TndR9g83M",
        videoId: "d4TndR9g83M",
        spotifyId: "",
        title: "Tout va bien",
        artist: "Alonzo feat. Ninho & Naps",
        thumb: "https://cdn-images.dzcdn.net/images/cover/444dfc082c5570458c36f0268b5a206e/1000x1000-000000-80-0-0.jpg",
        source: "spotify",
        durationMs: 190000
    },
    {
        id: "c7D2aI_A1P4",
        videoId: "c7D2aI_A1P4",
        spotifyId: "",
        title: "La Kiffance",
        artist: "Naps",
        thumb: "https://cdn-images.dzcdn.net/images/cover/0846f00620ad172c934e89bcad774388/1000x1000-000000-80-0-0.jpg",
        source: "spotify",
        durationMs: 179000
    }
];

function buildFallbackArtist(name, index = 0) {
    const safeName = (name || '').trim().replace(/\s+/g, ' ');
    const knownImage = FALLBACK_ARTIST_IMAGES[safeName.toLowerCase()];
    return {
        spotifyId: '',
        name: safeName,
        imageUrl: knownImage || DEFAULT_FALLBACK_IMAGES[index % DEFAULT_FALLBACK_IMAGES.length],
        spotifyUrl: '',
        genres: [],
        popularity: 0,
        followers: 0,
        source: 'fallback'
    };
}

async function searchSpotifyArtists(env, token, query, limit = 8) {
    if (!token) return [];
    try {
        const res = await fetch(`${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=artist&market=FR&limit=${limit}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data?.artists?.items || []).map(item => ({
            spotifyId: item.id || '',
            name: item.name || '',
            imageUrl: Array.isArray(item.images) && item.images.length > 0 ? (item.images[0].url || '') : '',
            spotifyUrl: item.external_urls?.spotify || '',
            genres: Array.isArray(item.genres) ? item.genres.slice(0, 5) : [],
            popularity: typeof item.popularity === 'number' ? item.popularity : 0,
            followers: item.followers?.total || 0,
            source: 'spotify'
        }));
    } catch (err) {
        console.error('Spotify artist search failed in worker:', err);
        return [];
    }
}

async function getTopTracks(env, token, limit = 12) {
    if (!token) return [];
    try {
        const res = await fetch(`${SPOTIFY_API_BASE}/search?q=top%2050%20France&type=track&market=FR&limit=${limit}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            return (data?.tracks?.items || []).map(item => ({
                id: item.id || '',
                videoId: '',
                spotifyId: item.id || '',
                title: item.name || '',
                artist: Array.isArray(item.artists) ? item.artists[0]?.name || '' : '',
                thumb: Array.isArray(item.album?.images) && item.album.images.length > 0 ? item.album.images[0].url : '',
                source: 'spotify',
                durationMs: item.duration_ms || 180000
            }));
        }
    } catch (err) {
        console.error('Failed fetching top tracks in worker:', err);
    }
    return [];
}

async function getOfflineFallbackRecommendations(db) {
    try {
        const rows = await db.prepare('SELECT history FROM users').all();
        const allTracksMap = new Map();
        
        if (rows && Array.isArray(rows.results)) {
            rows.results.forEach(row => {
                if (!row.history) return;
                try {
                    const history = JSON.parse(row.history);
                    if (Array.isArray(history)) {
                        history.forEach(track => {
                            if (!track.videoId) return;
                            const key = track.videoId;
                            if (!allTracksMap.has(key)) {
                                allTracksMap.set(key, {
                                    id: track.videoId,
                                    videoId: track.videoId,
                                    spotifyId: track.spotifyId || '',
                                    title: track.title,
                                    artist: track.artist || track.uploaderName || 'Artiste inconnu',
                                    thumb: track.thumb || track.thumbnail || '',
                                    source: track.source || 'youtube',
                                    durationMs: track.durationMs || 180000,
                                    count: 0
                                });
                            }
                            allTracksMap.get(key).count += 1;
                        });
                    }
                } catch {}
            });
        }
        
        const popularTracks = Array.from(allTracksMap.values())
            .sort((a, b) => b.count - a.count)
            .map(({ count, ...track }) => track);
            
        if (popularTracks.length >= 6) {
            return popularTracks;
        }
    } catch (e) {
        console.error('Offline fallback DB recommendations error:', e);
    }
    return STATIC_FALLBACK_TRACKS;
}

// --- INNERTUBE API (YouTube Internal API — replaces dead Piped instances) ---
const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const INNERTUBE_CLIENT = {
    clientName: 'WEB',
    clientVersion: '2.20240530.02.00',
    hl: 'fr',
    gl: 'FR'
};

async function innerTubeSearch(query, filter = 'music_songs') {
    // InnerTube params for music filter: EgIQAQ%3D%3D
    const params = filter === 'music_songs' ? 'EgIQAQ%3D%3D' : '';
    const url = `https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_API_KEY}`;
    const body = {
        context: { client: INNERTUBE_CLIENT },
        query: query
    };
    if (params) body.params = params;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                'Origin': 'https://www.youtube.com',
                'Referer': 'https://www.youtube.com/'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) return null;
        const data = await res.json();

        const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        const items = [];

        for (const section of contents) {
            const sectionContents = section?.itemSectionRenderer?.contents || [];
            for (const item of sectionContents) {
                if (item.videoRenderer) {
                    const v = item.videoRenderer;
                    if (!v.videoId) continue;

                    const durationText = v.lengthText?.simpleText || '0:00';
                    const parts = durationText.split(':').map(Number);
                    let dur = 0;
                    if (parts.length === 3) dur = parts[0] * 3600 + parts[1] * 60 + parts[2];
                    else if (parts.length === 2) dur = parts[0] * 60 + parts[1];

                    items.push({
                        title: v.title?.runs?.[0]?.text || 'Untitled',
                        url: `/watch?v=${v.videoId}`,
                        videoId: v.videoId,
                        uploaderName: v.ownerText?.runs?.[0]?.text || 'Unknown',
                        uploaderUrl: v.ownerText?.runs?.[0]?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url || '',
                        thumbnail: v.thumbnail?.thumbnails?.slice(-1)[0]?.url || '',
                        duration: dur,
                        durationText: durationText,
                        type: 'stream'
                    });
                }
            }
        }

        if (items.length > 0) {
            return { items };
        }
    } catch (err) {
        console.error('InnerTube search error:', err.message);
    }
    return null;
}


async function getBannedIPs(db) {
    const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind('banned_ips').first();
    return row ? JSON.parse(row.value) : [];
}

async function saveBannedIPs(db, ips) {
    await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind('banned_ips', JSON.stringify(ips)).run();
}

async function isSetupCompleted(db) {
    const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind('setup_completed').first();
    return row ? JSON.parse(row.value) === true : false;
}

async function setSetupCompleted(db, completed) {
    await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind('setup_completed', JSON.stringify(completed)).run();
}

function parseUser(row) {
    if (!row) return null;
    return {
        id: row.id,
        email: row.email,
        username: row.username,
        password: row.password,
        role: row.role,
        banned: row.banned === 1,
        musicOnboardingCompleted: row.music_onboarding_completed === 1,
        musicPreferences: row.music_preferences ? JSON.parse(row.music_preferences) : { genres: [], artists: [] },
        followedArtists: row.followed_artists ? JSON.parse(row.followed_artists) : [],
        musicPreferencesUpdatedAt: row.music_preferences_updated_at,
        favorites: row.favorites ? JSON.parse(row.favorites) : [],
        likedTracks: row.liked_tracks ? JSON.parse(row.liked_tracks) : [],
        history: row.history ? JSON.parse(row.history) : [],
        recentlyPlayed: row.recently_played ? JSON.parse(row.recently_played) : [],
        localTracks: row.local_tracks ? JSON.parse(row.local_tracks) : [],
        sharedPlaylists: row.shared_playlists ? JSON.parse(row.shared_playlists) : [],
        createdAt: row.created_at
    };
}

async function getUserById(db, id) {
    const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
    return parseUser(row);
}

async function getUserByEmail(db, email) {
    const row = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase().trim()).first();
    return parseUser(row);
}

async function saveUser(db, user) {
    await db.prepare(`
        INSERT OR REPLACE INTO users (
            id, email, username, password, role, banned, music_onboarding_completed,
            music_preferences, followed_artists, music_preferences_updated_at,
            favorites, liked_tracks, history, recently_played, local_tracks, shared_playlists, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        user.id,
        user.email.toLowerCase().trim(),
        user.username,
        user.password,
        user.role,
        user.banned ? 1 : 0,
        user.musicOnboardingCompleted ? 1 : 0,
        JSON.stringify(user.musicPreferences || { genres: [], artists: [] }),
        JSON.stringify(user.followedArtists || []),
        user.musicPreferencesUpdatedAt || null,
        JSON.stringify(user.favorites || []),
        JSON.stringify(user.likedTracks || []),
        JSON.stringify(user.history || []),
        JSON.stringify(user.recentlyPlayed || []),
        JSON.stringify(user.localTracks || []),
        JSON.stringify(user.sharedPlaylists || []),
        user.createdAt
    ).run();
}

async function hasOwner(db) {
    const row = await db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'OWNER'").first();
    return row && row.count > 0;
}

// --- MIDDLEWARES ---
const getClientIP = (c) => {
    return c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || '127.0.0.1';
};

const checkIPAndAuth = async (c, next) => {
    const db = c.env.DB;
    const clientIP = getClientIP(c);
    const bannedIPs = await getBannedIPs(db);
    if (bannedIPs.includes(clientIP)) {
        return c.json({ error: 'Votre adresse IP a été bannie.' }, 403);
    }

    const authHeader = c.req.header('Authorization');
    const cookieToken = getCookie(c, 'token');
    const token = cookieToken || c.req.query('token') || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (!token) {
        return c.json({ error: 'Auth requis' }, 401);
    }

    try {
        const secret = c.env.JWT_SECRET || JWT_SECRET;
        const decoded = await verify(token, secret, 'HS256');
        const user = await getUserById(db, decoded.id);

        if (!user) {
            return c.json({ error: 'Session invalide ou expirée' }, 401);
        }

        if (user.banned) {
            return c.json({ error: 'Votre compte a été banni.' }, 403);
        }

        c.set('user', user);
        await next();
    } catch (err) {
        return c.json({ error: 'Session invalide ou expirée', details: err.message, stack: err.stack }, 401);
    }
};

const requireAdmin = async (c, next) => {
    const user = c.get('user');
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
        return c.json({ error: 'Accès réservé aux administrateurs.' }, 403);
    }
    await next();
};

// --- SETUP & AUTH ENDPOINTS ---
app.get('/setup/status', async (c) => {
    const db = c.env.DB;
    const completed = await isSetupCompleted(db);
    return c.json({ setupRequired: !completed });
});

app.post('/setup/owner', async (c) => {
    const db = c.env.DB;
    const completed = await isSetupCompleted(db);
    if (completed) {
        return c.json({ error: 'Configuration déjà effectuée.' }, 400);
    }

    try {
        const body = await c.req.json();
        const email = String(body.email || '').trim();
        const username = String(body.username || '').trim();
        const password = String(body.password || '');

        if (!email || !username || !password) {
            return c.json({ error: 'Champs requis.' }, 400);
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            return c.json({ error: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.` }, 400);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const owner = {
            id: `user-${crypto.randomUUID()}`,
            email,
            username,
            password: hashedPassword,
            role: 'OWNER',
            banned: false,
            musicOnboardingCompleted: false,
            createdAt: new Date().toISOString()
        };

        await saveUser(db, owner);
        await setSetupCompleted(db, true);

        const secret = c.env.JWT_SECRET || JWT_SECRET;
        const token = await sign({ id: owner.id, email: owner.email, role: owner.role }, secret, 'HS256');
        setCookie(c, 'token', token, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
            maxAge: 30 * 24 * 60 * 60
        });

        return c.json({
            token,
            user: {
                id: owner.id,
                username: owner.username,
                email: owner.email,
                role: owner.role
            }
        });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.post('/auth/register', async (c) => {
    const db = c.env.DB;
    const body = await c.req.json();
    const email = String(body.email || '').trim();
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    if (!email || !username || !password) {
        return c.json({ error: 'Champs requis.' }, 400);
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
        return c.json({ error: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.` }, 400);
    }

    const existing = await getUserByEmail(db, email);
    if (existing) {
        return c.json({ error: 'Cet email est déjà enregistré.' }, 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
        id: `user-${crypto.randomUUID()}`,
        email,
        username,
        password: hashedPassword,
        role: 'USER',
        banned: false,
        musicOnboardingCompleted: false,
        createdAt: new Date().toISOString()
    };

    await saveUser(db, user);

    const secret = c.env.JWT_SECRET || JWT_SECRET;
    const token = await sign({ id: user.id, email: user.email, role: user.role }, secret, 'HS256');
    setCookie(c, 'token', token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: 7 * 24 * 60 * 60
    });

    return c.json({
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        }
    });
});

app.post('/auth/login', async (c) => {
    const db = c.env.DB;
    const body = await c.req.json();
    const email = String(body.email || '').trim();
    const password = String(body.password || '');
    const rememberMe = body.rememberMe === true;

    if (!email || !password) {
        return c.json({ error: 'Champs requis.' }, 400);
    }

    const user = await getUserByEmail(db, email);
    if (!user || user.banned) {
        return c.json({ error: 'Identifiants incorrects.' }, 401);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return c.json({ error: 'Identifiants incorrects.' }, 401);
    }

    const secret = c.env.JWT_SECRET || JWT_SECRET;
    const expiresIn = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
    const token = await sign({ id: user.id, email: user.email, role: user.role }, secret, 'HS256');

    setCookie(c, 'token', token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: expiresIn
    });

    return c.json({
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        }
    });
});

app.get('/auth/me', checkIPAndAuth, async (c) => {
    const user = c.get('user');
    return c.json({
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        }
    });
});

app.post('/auth/logout', async (c) => {
    return c.json({ success: true });
});

// --- SPOTIFY CLIENT CREDENTIALS FLOW ---
let tokenCache = { accessToken: null, expiresAt: 0 };
async function getSpotifyToken(env) {
    if (tokenCache.accessToken && tokenCache.expiresAt > Date.now()) {
        return tokenCache.accessToken;
    }
    const clientId = env.SPOTIFY_CLIENT_ID;
    const clientSecret = env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    const auth = btoa(`${clientId}:${clientSecret}`);
    const res = await fetch(SPOTIFY_ACCOUNTS_BASE, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ grant_type: 'client_credentials' })
    });
    if (!res.ok) return null;
    const data = await res.json();
    tokenCache = {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 60) * 1000
    };
    return tokenCache.accessToken;
}

// --- SPOTIFY ENDPOINTS ---
app.get('/spotify/search', checkIPAndAuth, async (c) => {
    const q = c.req.query('q');
    const token = await getSpotifyToken(c.env);
    if (!token) return c.json({ tracks: { items: [] } });

    const res = await fetch(`${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(q)}&type=track&market=FR&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    return c.json(data);
});

app.get('/spotify/search-albums', checkIPAndAuth, async (c) => {
    const q = c.req.query('q');
    const token = await getSpotifyToken(c.env);
    if (!token) return c.json({ albums: { items: [] } });

    const res = await fetch(`${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(q)}&type=album&market=FR&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    return c.json(data);
});

app.get('/spotify/albums/:id', checkIPAndAuth, async (c) => {
    const id = c.req.param('id');
    const token = await getSpotifyToken(c.env);
    if (!token) return c.json({ error: 'Spotify non configuré' }, 503);

    const res = await fetch(`${SPOTIFY_API_BASE}/albums/${id}?market=FR`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    return c.json(data);
});

app.get('/spotify/artists/defaults', checkIPAndAuth, async (c) => {
    const env = c.env;
    const token = await getSpotifyToken(env);
    const spotifyEnabled = Boolean(token);
    
    let items = [];
    if (spotifyEnabled) {
        try {
            const results = await Promise.allSettled(
                DEFAULT_FALLBACK_ARTIST_NAMES.map(async (name) => {
                    const matches = await searchSpotifyArtists(env, token, name, 3);
                    return matches[0] || null;
                })
            );
            
            const seen = new Set();
            results.forEach((res, index) => {
                const artist = res.status === 'fulfilled' && res.value ? res.value : buildFallbackArtist(DEFAULT_FALLBACK_ARTIST_NAMES[index], index);
                const identity = (artist.spotifyId || artist.name).toLowerCase();
                if (identity && !seen.has(identity)) {
                    seen.add(identity);
                    items.push(artist);
                }
            });
        } catch (err) {
            console.error('Failed fetching defaults from Spotify:', err);
        }
    }
    
    if (items.length === 0) {
        items = DEFAULT_FALLBACK_ARTIST_NAMES.map((name, index) => buildFallbackArtist(name, index));
    }
    
    return c.json({ items, spotifyEnabled });
});

app.get('/spotify/search-artists', checkIPAndAuth, async (c) => {
    const query = (c.req.query('q') || '').trim();
    if (query.length < 2) {
        return c.json({ items: [] });
    }
    
    const env = c.env;
    const token = await getSpotifyToken(env);
    const spotifyEnabled = Boolean(token);
    
    let items = [];
    if (spotifyEnabled) {
        items = await searchSpotifyArtists(env, token, query, 8);
    }
    
    if (items.length === 0) {
        const fallbackNames = Array.from(new Set([
            ...DEFAULT_FALLBACK_ARTIST_NAMES,
            ...Object.keys(RELATED_ARTIST_FALLBACKS),
            ...Object.values(RELATED_ARTIST_FALLBACKS).flat()
        ])).filter(name => name.toLowerCase().includes(query.toLowerCase()));
        
        if (fallbackNames.length > 0) {
            items = fallbackNames.slice(0, 8).map((name, index) => buildFallbackArtist(name, index));
        } else {
            items = [buildFallbackArtist(query)];
        }
    }
    
    return c.json({ items, spotifyEnabled });
});

app.get('/spotify/artists/:id/related', checkIPAndAuth, async (c) => {
    const artistId = c.req.param('id');
    const fallbackName = (c.req.query('name') || '').trim();
    const env = c.env;
    const token = await getSpotifyToken(env);
    const spotifyEnabled = Boolean(token);
    
    let items = [];
    if (spotifyEnabled && artistId && artistId !== 'fallback') {
        try {
            const res = await fetch(`${SPOTIFY_API_BASE}/artists/${encodeURIComponent(artistId)}/related-artists`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                items = (data?.artists || []).map(item => ({
                    spotifyId: item.id || '',
                    name: item.name || '',
                    imageUrl: Array.isArray(item.images) && item.images.length > 0 ? (item.images[0].url || '') : '',
                    spotifyUrl: item.external_urls?.spotify || '',
                    genres: Array.isArray(item.genres) ? item.genres.slice(0, 5) : [],
                    popularity: typeof item.popularity === 'number' ? item.popularity : 0,
                    followers: item.followers?.total || 0,
                    source: 'spotify'
                }));
            }
        } catch (err) {
            console.error('Spotify related artists failed:', err);
        }
    }
    
    if (items.length === 0 && fallbackName) {
        try {
            const deezerSearchRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(fallbackName)}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' }
            });
            if (deezerSearchRes.ok) {
                const deezerSearchData = await deezerSearchRes.json();
                const firstArtist = deezerSearchData?.data?.[0];
                if (firstArtist) {
                    const relatedRes = await fetch(`https://api.deezer.com/artist/${firstArtist.id}/related`, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' }
                    });
                    if (relatedRes.ok) {
                        const relatedData = await relatedRes.json();
                        items = (relatedData.data || []).slice(0, 8).map(item => ({
                            spotifyId: '',
                            name: item.name || '',
                            imageUrl: item.picture_big || item.picture_medium || '',
                            spotifyUrl: '',
                            genres: [],
                            popularity: 0,
                            followers: item.nb_fan || 0,
                            source: 'deezer'
                        }));
                    }
                }
            }
        } catch (err) {
            console.error('Deezer related artists fallback failed:', err);
        }

        if (items.length === 0) {
            const relatedNames = RELATED_ARTIST_FALLBACKS[fallbackName.toLowerCase()] || [];
            items = relatedNames.map((name, index) => buildFallbackArtist(name, index));
        }
    }
    
    return c.json({ items, spotifyEnabled });
});

app.get('/deezer/albums/:id', checkIPAndAuth, async (c) => {
    const id = c.req.param('id');
    const res = await fetch(`https://api.deezer.com/album/${id}`);
    const data = await res.json();
    return c.json(data);
});

// --- YOUTUBE SEARCH & RESOLVING (InnerTube API) ---

function normalizeText(text) {
    return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function scoreCandidate(item, expectedTitle, expectedArtist, expectedDurationMs) {
    let score = 0;
    const title = normalizeText(item.title);
    const uploader = normalizeText(item.uploaderName);
    const expTitle = normalizeText(expectedTitle);
    const expArtist = normalizeText(expectedArtist);

    // Title matching (most important)
    if (expTitle && title.includes(expTitle)) score += 50;
    else if (expTitle) {
        const words = expTitle.split(' ').filter(w => w.length > 2);
        const matched = words.filter(w => title.includes(w));
        score += Math.round((matched.length / Math.max(words.length, 1)) * 30);
    }

    // Artist matching
    if (expArtist && (title.includes(expArtist) || uploader.includes(expArtist))) score += 30;
    else if (expArtist) {
        const words = expArtist.split(' ').filter(w => w.length > 2);
        const matched = words.filter(w => uploader.includes(w) || title.includes(w));
        score += Math.round((matched.length / Math.max(words.length, 1)) * 20);
    }

    // Prefer "official audio" and "audio" over music videos
    if (title.includes('official audio') || title.includes('audio officiel')) score += 15;
    else if (title.includes('audio')) score += 8;

    // Penalize live, remix, cover, karaoke
    if (title.includes('live') && !expTitle.includes('live')) score -= 20;
    if (title.includes('remix') && !expTitle.includes('remix')) score -= 15;
    if (title.includes('cover') && !expTitle.includes('cover')) score -= 20;
    if (title.includes('karaoke') || title.includes('instrumental')) score -= 25;
    if (title.includes('slowed') || title.includes('reverb') || title.includes('sped up')) score -= 15;

    // Duration matching (if available)
    if (expectedDurationMs > 0 && item.duration > 0) {
        const expectedSec = expectedDurationMs / 1000;
        const diff = Math.abs(item.duration - expectedSec);
        if (diff < 5) score += 15;
        else if (diff < 15) score += 8;
        else if (diff > 60) score -= 10;
    }

    // Prefer shorter videos (more likely to be the song, not a compilation)
    if (item.duration > 600) score -= 10; // > 10 min
    if (item.duration > 1200) score -= 20; // > 20 min

    return score;
}

function pickBestResult(items, title, artist, durationMs) {
    if (!items || items.length === 0) return null;
    if (items.length === 1) return items[0];

    let best = items[0];
    let bestScore = -Infinity;
    for (const item of items.slice(0, 10)) {
        const s = scoreCandidate(item, title, artist, durationMs);
        if (s > bestScore) { bestScore = s; best = item; }
    }
    return best;
}

app.get('/music/resolve/:spotifyId', checkIPAndAuth, async (c) => {
    const title = c.req.query('title') || '';
    const artist = c.req.query('artist') || '';
    const durationMs = parseInt(c.req.query('durationMs') || '0', 10);
    const query = `${artist} ${title}`.trim();
    if (!query) return c.json({ error: 'Aucun flux trouvé.' }, 404);

    const searchData = await innerTubeSearch(query);
    const bestItem = pickBestResult(searchData?.items, title, artist, durationMs);
    if (bestItem) {
        return c.json({
            videoId: bestItem.videoId,
            title: bestItem.title,
            artist: bestItem.uploaderName,
            duration: bestItem.duration
        });
    }
    return c.json({ error: 'Aucun flux trouvé.' }, 404);
});

app.get('/music/resolve-by-metadata', checkIPAndAuth, async (c) => {
    const title = c.req.query('title') || '';
    const artist = c.req.query('artist') || '';
    const durationMs = parseInt(c.req.query('durationMs') || '0', 10);
    const query = `${artist} ${title}`.trim();
    if (!query) return c.json({ error: 'Aucun flux trouvé.' }, 404);

    const searchData = await innerTubeSearch(query);
    const bestItem = pickBestResult(searchData?.items, title, artist, durationMs);
    if (bestItem) {
        return c.json({
            videoId: bestItem.videoId,
            title: bestItem.title,
            artist: bestItem.uploaderName,
            duration: bestItem.duration
        });
    }
    return c.json({ error: 'Aucun flux trouvé.' }, 404);
});

app.get('/music/streams/:id', checkIPAndAuth, async (c) => {
    const videoId = c.req.param('id');
    const db = c.env.DB;
    const user = c.get('user');
    
    // Log history
    const playEntry = {
        videoId,
        title: c.req.query('title') || 'Titre inconnu',
        artist: c.req.query('artist') || 'Artiste inconnu',
        thumb: c.req.query('thumb') || '',
        playedAt: new Date().toISOString()
    };
    user.history.unshift(playEntry);
    if (user.history.length > 500) user.history.pop();
    user.recentlyPlayed = [
        playEntry,
        ...user.recentlyPlayed.filter(t => t.videoId !== videoId)
    ].slice(0, 20);
    await saveUser(db, user);

    try {
        const instancesRes = await fetch('https://api.invidious.io/instances.json?sort_by=health');
        if (instancesRes.ok) {
            const instances = await instancesRes.json();
            const urls = instances
                .filter(i => i[1].api === true && i[1].type === 'https' && i[1].cors === true)
                .map(i => i[1].uri);
            
            for (const url of urls.slice(0, 5)) {
                try {
                    const testRes = await fetch(`${url}/api/v1/videos/${videoId}`);
                    if (testRes.ok) {
                        const data = await testRes.json();
                        if (data.adaptiveFormats && data.adaptiveFormats.length > 0) {
                            const audio = data.adaptiveFormats.find(f => f.type.startsWith('audio/mp4')) || data.adaptiveFormats.find(f => f.type.startsWith('audio'));
                            if (audio && audio.url) {
                                return c.redirect(audio.url, 307);
                            }
                        }
                    }
                } catch (e) {}
            }
        }
    } catch (err) {
        console.error('Invidious fetch error:', err);
    }
    
    try {
        const testRes = await fetch(`https://inv.thepixora.com/api/v1/videos/${videoId}`);
        if (testRes.ok) {
            const data = await testRes.json();
            if (data.adaptiveFormats) {
                const audio = data.adaptiveFormats.find(f => f.type.startsWith('audio/mp4')) || data.adaptiveFormats.find(f => f.type.startsWith('audio'));
                if (audio && audio.url) return c.redirect(audio.url, 307);
            }
        }
    } catch (e) {}

    return c.json({ error: 'Aucun flux audio disponible.' }, 404);
});

// --- USER RECAPS & PREFERENCES ---
app.get('/user/recently-played', checkIPAndAuth, async (c) => {
    const user = c.get('user');
    return c.json(user.recentlyPlayed || []);
});

app.get('/user/weekly-recap', checkIPAndAuth, async (c) => {
    const user = c.get('user');
    return c.json({
        week: { id: 'current', label: 'Mon top écoutes' },
        hasData: user.history.length > 0,
        totalPlays: user.history.length,
        totalMinutes: Math.round(user.history.length * 3),
        artists: [],
        tracks: user.recentlyPlayed.slice(0, 5)
    });
});

app.get('/user/music-preferences', checkIPAndAuth, async (c) => {
    const user = c.get('user');
    const token = await getSpotifyToken(c.env);
    return c.json({
        completed: user.musicOnboardingCompleted,
        genres: user.musicPreferences.genres || [],
        artists: user.musicPreferences.artists || [],
        followedArtists: user.followedArtists || [],
        spotifyEnabled: Boolean(token)
    });
});

app.post('/user/music-preferences', checkIPAndAuth, async (c) => {
    const db = c.env.DB;
    const user = c.get('user');
    const body = await c.req.json();
    
    user.musicPreferences = {
        genres: body.genres || [],
        artists: body.artists || []
    };
    
    user.followedArtists = user.followedArtists || [];
    const existingFollowed = new Set(user.followedArtists.map(a => (a.spotifyId || a.name || '').toLowerCase()));
    
    (body.artists || []).forEach(artist => {
        const key = (artist.spotifyId || artist.name || '').toLowerCase();
        if (key && !existingFollowed.has(key)) {
            user.followedArtists.push(artist);
            existingFollowed.add(key);
        }
    });

    user.musicOnboardingCompleted = true;
    user.musicPreferencesUpdatedAt = new Date().toISOString();
    await saveUser(db, user);
    
    const token = await getSpotifyToken(c.env);
    return c.json({
        completed: user.musicOnboardingCompleted,
        genres: user.musicPreferences.genres || [],
        artists: user.musicPreferences.artists || [],
        followedArtists: user.followedArtists || [],
        spotifyEnabled: Boolean(token)
    });
});

app.post('/user/followed-artists/toggle', checkIPAndAuth, async (c) => {
    const db = c.env.DB;
    const user = c.get('user');
    const body = await c.req.json();
    const artist = body.artist || body;
    if (!artist?.name) {
        return c.json({ error: 'Artiste invalide.' }, 400);
    }
    
    user.followedArtists = user.followedArtists || [];
    const index = user.followedArtists.findIndex(a => (a.spotifyId || a.name) === (artist.spotifyId || artist.name));
    let followed = false;
    
    if (index === -1) {
        user.followedArtists.push(artist);
        followed = true;
    } else {
        user.followedArtists.splice(index, 1);
        followed = false;
    }
    
    await saveUser(db, user);
    return c.json({ followed, followedArtists: user.followedArtists });
});

app.get('/user/recommendations', checkIPAndAuth, async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const token = await getSpotifyToken(c.env);
    const spotifyEnabled = Boolean(token);
    
    if (!user.musicOnboardingCompleted) {
        return c.json({ items: [] });
    }
    
    const artistSeeds = (user.musicPreferences?.artists || [])
        .map(a => a.spotifyId || a.name)
        .filter(Boolean);
    const genreSeeds = user.musicPreferences?.genres || [];
    
    const artistIds = (user.musicPreferences?.artists || [])
        .map(a => a.spotifyId)
        .filter(Boolean);
        
    let items = [];
    if (spotifyEnabled && artistIds.length > 0) {
        try {
            const seedArtists = artistIds.slice(0, 5).join(',');
            const res = await fetch(`${SPOTIFY_API_BASE}/recommendations?seed_artists=${encodeURIComponent(seedArtists)}&market=FR&limit=12`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                items = (data?.tracks || []).map(item => ({
                    id: item.id || '',
                    videoId: '',
                    spotifyId: item.id || '',
                    title: item.name || '',
                    artist: Array.isArray(item.artists) ? item.artists[0]?.name || '' : '',
                    thumb: Array.isArray(item.album?.images) && item.album.images.length > 0 ? item.album.images[0].url : '',
                    source: 'spotify',
                    durationMs: item.duration_ms || 180000
                }));
            }
        } catch (err) {
            console.error('Failed fetching Spotify recommendations in user/recommendations:', err);
        }
    }
    
    if (items.length === 0) {
        const prefArtists = user.musicPreferences?.artists || [];
        if (prefArtists.length > 0) {
            try {
                const shuffled = [...prefArtists].sort(() => Math.random() - 0.5).slice(0, 3);
                for (const artistObj of shuffled) {
                    if (!artistObj.name) continue;
                    const deezerSearchRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(artistObj.name)}`, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' }
                    });
                    if (deezerSearchRes.ok) {
                        const deezerSearchData = await deezerSearchRes.json();
                        const firstArtist = deezerSearchData?.data?.[0];
                        if (firstArtist) {
                            const topRes = await fetch(`https://api.deezer.com/artist/${firstArtist.id}/top?limit=6`, {
                                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' }
                            });
                            if (topRes.ok) {
                                const topData = await topRes.json();
                                const tracks = (topData.data || []).map(item => ({
                                    id: item.id || '',
                                    videoId: '',
                                    spotifyId: '',
                                    title: item.title || '',
                                    artist: item.artist?.name || '',
                                    thumb: item.album?.cover_big || item.album?.cover_medium || '',
                                    source: 'deezer',
                                    durationMs: (item.duration || 180) * 1000
                                }));
                                items.push(...tracks);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Deezer recommendations fallback failed:', err);
            }
        }
    }
    
    if (items.length < 12) {
        const offline = await getOfflineFallbackRecommendations(db);
        offline.forEach(track => {
            if (items.length < 12 && !items.some(t => t.title.toLowerCase() === track.title.toLowerCase())) {
                items.push(track);
            }
        });
    }
    
    return c.json({
        items: items.slice(0, 12),
        seeds: {
            artists: artistSeeds,
            genres: genreSeeds
        }
    });
});

app.get('/music/recommendations', checkIPAndAuth, async (c) => {
    const seedTracks = c.req.query('seed_tracks') || '';
    const env = c.env;
    const db = c.env.DB;
    const token = await getSpotifyToken(env);
    
    let items = [];
    if (token && seedTracks) {
        try {
            const res = await fetch(`${SPOTIFY_API_BASE}/recommendations?seed_tracks=${encodeURIComponent(seedTracks)}&market=FR&limit=12`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                items = (data?.tracks || []).map(item => ({
                    id: item.id || '',
                    videoId: '',
                    spotifyId: item.id || '',
                    title: item.name || '',
                    artist: Array.isArray(item.artists) ? item.artists[0]?.name || '' : '',
                    thumb: Array.isArray(item.album?.images) && item.album.images.length > 0 ? item.album.images[0].url : '',
                    source: 'spotify',
                    durationMs: item.duration_ms || 180000
                }));
            }
        } catch (err) {
            console.error('Failed fetching Spotify recommendations in music/recommendations:', err);
        }
    }
    
    if (token && seedTracks && items.length === 0) {
        try {
            const trackRes = await fetch(`${SPOTIFY_API_BASE}/tracks/${encodeURIComponent(seedTracks)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (trackRes.ok) {
                const trackData = await trackRes.json();
                const artistName = trackData.artists?.[0]?.name;
                if (artistName) {
                    const deezerSearchRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}`, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' }
                    });
                    if (deezerSearchRes.ok) {
                        const deezerSearchData = await deezerSearchRes.json();
                        const firstArtist = deezerSearchData?.data?.[0];
                        if (firstArtist) {
                            const topRes = await fetch(`https://api.deezer.com/artist/${firstArtist.id}/top?limit=12`, {
                                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' }
                            });
                            if (topRes.ok) {
                                const topData = await topRes.json();
                                items = (topData.data || []).map(item => ({
                                    id: item.id || '',
                                    videoId: '',
                                    spotifyId: '',
                                    title: item.title || '',
                                    artist: item.artist?.name || '',
                                    thumb: item.album?.cover_big || item.album?.cover_medium || '',
                                    source: 'deezer',
                                    durationMs: (item.duration || 180) * 1000
                                }));
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Failed Deezer recommendations fallback by resolving seed track:', err);
        }
    }
    
    if (items.length === 0) {
        items = await getOfflineFallbackRecommendations(db);
    }
    
    return c.json({ items });
});

app.get('/music/trending', checkIPAndAuth, async (c) => {
    const env = c.env;
    const db = c.env.DB;
    const token = await getSpotifyToken(env);
    const spotifyEnabled = Boolean(token);
    
    let items = [];
    if (spotifyEnabled) {
        items = await getTopTracks(env, token, 12);
    }
    
    if (items.length === 0) {
        try {
            const chartRes = await fetch('https://api.deezer.com/chart/0/tracks?limit=15', {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' }
            });
            if (chartRes.ok) {
                const chartData = await chartRes.json();
                if (Array.isArray(chartData.data) && chartData.data.length > 0) {
                    items = chartData.data.map(item => ({
                        id: item.id || '',
                        videoId: '',
                        spotifyId: '',
                        title: item.title || '',
                        artist: item.artist?.name || '',
                        thumb: item.album?.cover_big || item.album?.cover_medium || '',
                        source: 'deezer',
                        durationMs: (item.duration || 180) * 1000
                    }));
                }
            }
        } catch (err) {
            console.error('Deezer charts fallback failed:', err);
        }
    }
    
    if (items.length === 0) {
        items = await getOfflineFallbackRecommendations(db);
    }
    
    return c.json({
        items: items.slice(0, 12),
        title: "Le Top du Moment — NeonWave",
        spotifyEnabled
    });
});

app.post('/music/history', checkIPAndAuth, async (c) => {
    const db = c.env.DB;
    const user = c.get('user');
    const track = await c.req.json();
    if (!track?.videoId) return c.json({ error: 'Track invalide.' }, 400);

    const spotifyId = track.spotifyId || track?.spotify?.spotifyId || '';
    const playEntry = {
        videoId: track.videoId,
        spotifyId,
        localTrackId: track.localTrackId || '',
        source: track.source || '',
        streamUrl: track.streamUrl || '',
        title: track.title || 'Sans titre',
        artist: track.artist || track.uploaderName || 'Artiste inconnu',
        thumb: track.thumbnail || track.thumb || '',
        durationMs: Number(track.durationMs) || 0,
        playedAt: new Date().toISOString()
    };

    user.history = user.history || [];
    user.history.unshift(playEntry);
    if (user.history.length > 500) user.history.pop();
    user.recentlyPlayed = [
        playEntry,
        ...(user.recentlyPlayed || []).filter((t) => {
            const currentSpotifyId = t?.spotifyId || '';
            if (spotifyId && currentSpotifyId) {
                return currentSpotifyId !== spotifyId;
            }
            return t.videoId !== track.videoId;
        })
    ].slice(0, 20);

    await saveUser(db, user);
    return c.json({ success: true });
});

app.get('/user/history', checkIPAndAuth, async (c) => {
    const user = c.get('user');
    return c.json(user.history || []);
});

app.get('/spotify/artist-profile', checkIPAndAuth, async (c) => {
    let spotifyId = (c.req.query('spotifyId') || '').trim();
    const name = (c.req.query('name') || '').trim();
    const env = c.env;
    const token = await getSpotifyToken(env);
    const spotifyEnabled = Boolean(token);
    
    let artist = null;
    let topTracks = [];
    let discography = { popular: [], albums: [], singles: [] };
    let relatedArtists = [];
    let appearsOn = [];
    
    // If spotify is enabled but we don't have a spotifyId, try to search for the artist by name first
    if (spotifyEnabled && (!spotifyId || spotifyId === 'fallback') && name) {
        try {
            const searchResults = await searchSpotifyArtists(env, token, name, 1);
            if (searchResults.length > 0) {
                spotifyId = searchResults[0].spotifyId;
            }
        } catch (err) {
            console.error('Failed to search Spotify artist by name:', err);
        }
    }
    
    if (spotifyEnabled && spotifyId && spotifyId !== 'fallback') {
        try {
            const artistRes = await fetch(`${SPOTIFY_API_BASE}/artists/${encodeURIComponent(spotifyId)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (artistRes.ok) {
                const artistData = await artistRes.json();
                artist = {
                    spotifyId: artistData.id || '',
                    name: artistData.name || '',
                    imageUrl: Array.isArray(artistData.images) && artistData.images.length > 0 ? artistData.images[0].url : '',
                    spotifyUrl: artistData.external_urls?.spotify || '',
                    genres: Array.isArray(artistData.genres) ? artistData.genres.slice(0, 5) : [],
                    popularity: artistData.popularity || 0,
                    followers: artistData.followers?.total || 0,
                    source: 'spotify'
                };
            }
            
            const tracksRes = await fetch(`${SPOTIFY_API_BASE}/artists/${encodeURIComponent(spotifyId)}/top-tracks?market=FR`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (tracksRes.ok) {
                const tracksData = await tracksRes.json();
                topTracks = (tracksData.tracks || []).map(item => ({
                    id: item.id || '',
                    videoId: '',
                    spotifyId: item.id || '',
                    title: item.name || '',
                    artist: Array.isArray(item.artists) ? item.artists[0]?.name || '' : '',
                    thumb: Array.isArray(item.album?.images) && item.album.images.length > 0 ? item.album.images[0].url : '',
                    source: 'spotify',
                    durationMs: item.duration_ms || 180000
                }));
            }
            
            const albumsRes = await fetch(`${SPOTIFY_API_BASE}/artists/${encodeURIComponent(spotifyId)}/albums?market=FR&limit=30`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (albumsRes.ok) {
                const albumsData = await albumsRes.json();
                const items = (albumsData.items || []).map(album => ({
                    spotifyId: album.id || '',
                    name: album.name || '',
                    imageUrl: Array.isArray(album.images) && album.images.length > 0 ? album.images[0].url : '',
                    spotifyUrl: album.external_urls?.spotify || '',
                    artists: Array.isArray(album.artists) ? album.artists.map(a => a.name) : [],
                    releaseDate: album.release_date || '',
                    totalTracks: album.total_tracks || 0,
                    type: album.album_type || 'album',
                    group: album.album_group || album.album_type || 'album',
                    source: 'spotify'
                }));
                
                discography.albums = items.filter(a => a.group === 'album');
                discography.singles = items.filter(a => a.group === 'single');
                discography.popular = items.slice(0, 10);
            }
            
            const relatedRes = await fetch(`${SPOTIFY_API_BASE}/artists/${encodeURIComponent(spotifyId)}/related-artists`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (relatedRes.ok) {
                const relatedData = await relatedRes.json();
                relatedArtists = (relatedData.artists || []).slice(0, 8).map(item => ({
                    spotifyId: item.id || '',
                    name: item.name || '',
                    imageUrl: Array.isArray(item.images) && item.images.length > 0 ? item.images[0].url : '',
                    spotifyUrl: item.external_urls?.spotify || '',
                    genres: Array.isArray(item.genres) ? item.genres.slice(0, 5) : [],
                    popularity: item.popularity || 0,
                    followers: item.followers?.total || 0,
                    source: 'spotify'
                }));
            }
        } catch (err) {
            console.error('Failed fetching Spotify artist profile:', err);
        }
    }
    
    if ((!artist || topTracks.length === 0) && name) {
        try {
            const deezerSearchRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' }
            });
            if (deezerSearchRes.ok) {
                const deezerSearchData = await deezerSearchRes.json();
                const firstArtist = deezerSearchData?.data?.[0];
                if (firstArtist) {
                    if (!artist) {
                        artist = {
                            spotifyId: '',
                            name: firstArtist.name || name,
                            imageUrl: firstArtist.picture_big || firstArtist.picture_medium || '',
                            spotifyUrl: '',
                            genres: [],
                            popularity: 0,
                            followers: firstArtist.nb_fan || 0,
                            source: 'deezer'
                        };
                    } else if (!artist.imageUrl && (firstArtist.picture_big || firstArtist.picture_medium)) {
                        artist.imageUrl = firstArtist.picture_big || firstArtist.picture_medium;
                    }
                    
                    const topRes = await fetch(`https://api.deezer.com/artist/${firstArtist.id}/top?limit=10`, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' }
                    });
                    if (topRes.ok) {
                        const topData = await topRes.json();
                        topTracks = (topData.data || []).map(item => ({
                            id: item.id || '',
                            videoId: '',
                            spotifyId: '',
                            title: item.title || '',
                            artist: item.artist?.name || '',
                            thumb: item.album?.cover_big || item.album?.cover_medium || '',
                            source: 'deezer',
                            durationMs: (item.duration || 180) * 1000
                        }));
                    }
                    
                    const albumsRes = await fetch(`https://api.deezer.com/artist/${firstArtist.id}/albums?limit=30`, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' }
                    });
                    if (albumsRes.ok) {
                        const albumsData = await albumsRes.json();
                        const items = (albumsData.data || []).map(album => ({
                            spotifyId: '',
                            name: album.title || '',
                            imageUrl: album.cover_big || album.cover_medium || '',
                            spotifyUrl: '',
                            artists: [artist.name],
                            releaseDate: album.release_date || '',
                            totalTracks: album.nb_tracks || 0,
                            type: 'album',
                            group: 'album',
                            source: 'deezer'
                        }));
                        discography.albums = items;
                        discography.popular = items.slice(0, 10);
                    }

                    if (relatedArtists.length === 0) {
                        const relatedRes = await fetch(`https://api.deezer.com/artist/${firstArtist.id}/related`, {
                            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' }
                        });
                        if (relatedRes.ok) {
                            const relatedData = await relatedRes.json();
                            relatedArtists = (relatedData.data || []).slice(0, 8).map(item => ({
                                spotifyId: '',
                                name: item.name || '',
                                imageUrl: item.picture_big || item.picture_medium || '',
                                spotifyUrl: '',
                                genres: [],
                                popularity: 0,
                                followers: item.nb_fan || 0,
                                source: 'deezer'
                            }));
                        }
                    }
                }
            }
        } catch (deezerErr) {
            console.error('Deezer fallback artist profile failed:', deezerErr);
        }
    }
    
    if (!artist) {
        artist = buildFallbackArtist(name || 'Artiste');
    }
    
    return c.json({
        item: {
            artist,
            topTracks,
            discography,
            appearsOn,
            relatedArtists
        },
        spotifyEnabled
    });
});

// --- FAVORITES & LIKED TRACKS ---
app.get('/user/favorites', checkIPAndAuth, async (c) => {
    const user = c.get('user');
    return c.json(user.favorites || []);
});

app.post('/user/favorites', checkIPAndAuth, async (c) => {
    const db = c.env.DB;
    const user = c.get('user');
    const body = await c.req.json();
    const videoId = body.videoId;
    if (!videoId) return c.json({ error: 'videoId requis' }, 400);

    const idx = user.favorites.indexOf(videoId);
    if (idx === -1) user.favorites.push(videoId);
    else user.favorites.splice(idx, 1);

    await saveUser(db, user);
    return c.json({ favorites: user.favorites });
});

app.get('/user/liked-tracks', checkIPAndAuth, async (c) => {
    const user = c.get('user');
    return c.json(user.likedTracks || []);
});

app.post('/user/liked-tracks', checkIPAndAuth, async (c) => {
    const db = c.env.DB;
    const user = c.get('user');
    const body = await c.req.json();
    const track = body.track;
    if (!track) return c.json({ error: 'track requis' }, 400);

    const idx = user.likedTracks.findIndex(t => t.id === track.id);
    if (idx === -1) {
        user.likedTracks.push(track);
        if (!user.favorites.includes(track.videoId)) user.favorites.push(track.videoId);
    } else {
        user.likedTracks.splice(idx, 1);
        user.favorites = user.favorites.filter(id => id !== track.videoId);
    }

    await saveUser(db, user);
    return c.json({ likedTracks: user.likedTracks, favorites: user.favorites });
});

// --- PLAYLISTS ---
app.get('/user/playlists', checkIPAndAuth, async (c) => {
    const db = c.env.DB;
    const user = c.get('user');
    const rows = await db.prepare('SELECT * FROM playlists WHERE user_id = ?').bind(user.id).all();
    const playlists = (rows.results || []).map(r => ({
        id: r.id,
        name: r.name,
        createdAt: r.created_at,
        tracks: JSON.parse(r.tracks)
    }));
    return c.json(playlists);
});

app.post('/user/playlists', checkIPAndAuth, async (c) => {
    const db = c.env.DB;
    const user = c.get('user');
    const body = await c.req.json();
    const name = String(body.name || '').trim();
    if (!name) return c.json({ error: 'Nom requis' }, 400);

    const playlist = {
        id: `playlist-${crypto.randomUUID()}`,
        name,
        created_at: new Date().toISOString(),
        tracks: '[]'
    };

    await db.prepare('INSERT INTO playlists (id, user_id, name, created_at, tracks) VALUES (?, ?, ?, ?, ?)')
        .bind(playlist.id, user.id, playlist.name, playlist.created_at, playlist.tracks).run();

    return c.json({ id: playlist.id, name: playlist.name, tracks: [] });
});

app.post('/user/playlists/:id/tracks', checkIPAndAuth, async (c) => {
    const db = c.env.DB;
    const playlistId = c.req.param('id');
    const body = await c.req.json();
    const track = body.track;
    if (!track) return c.json({ error: 'track requis' }, 400);

    const row = await db.prepare('SELECT * FROM playlists WHERE id = ?').bind(playlistId).first();
    if (!row) return c.json({ error: 'Playlist introuvable' }, 404);

    const tracks = JSON.parse(row.tracks);
    const exists = tracks.some(t => t.id === track.id);
    if (!exists) {
        tracks.push(track);
        await db.prepare('UPDATE playlists SET tracks = ? WHERE id = ?').bind(JSON.stringify(tracks), playlistId).run();
    }

    return c.json({ success: true, tracks });
});

// --- R2 LOCAL TRACKS STORAGE ---
app.get('/user/local-tracks', checkIPAndAuth, async (c) => {
    const user = c.get('user');
    return c.json(user.localTracks || []);
});

app.post('/user/local-tracks', checkIPAndAuth, async (c) => {
    const db = c.env.DB;
    const bucket = c.env.BUCKET;
    const user = c.get('user');

    if (!bucket) {
        return c.json({ error: 'Stockage Cloudflare R2 non configuré.' }, 503);
    }

    try {
        const formData = await c.req.parseBody();
        const file = formData.file;
        const title = String(formData.title || 'Titre inconnu');
        const artist = String(formData.artist || 'Artiste inconnu');

        if (!file || !(file instanceof File)) {
            return c.json({ error: 'Fichier audio requis.' }, 400);
        }

        const trackId = `local-${crypto.randomUUID()}`;
        const key = `local-tracks/${user.id}/${trackId}`;

        // Save file to R2
        const arrayBuffer = await file.arrayBuffer();
        await bucket.put(key, arrayBuffer, {
            customMetadata: {
                title,
                artist,
                userId: user.id
            }
        });

        const newTrack = {
            id: trackId,
            videoId: trackId,
            localTrackId: trackId,
            source: 'local',
            title,
            artist,
            thumb: '',
            durationMs: 0,
            mimeType: file.type,
            size: file.size,
            addedAt: new Date().toISOString(),
            streamUrl: `/api/user/local-tracks/${trackId}/stream`
        };

        user.localTracks.push(newTrack);
        await saveUser(db, user);

        return c.json(newTrack);
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.get('/user/local-tracks/:id/stream', checkIPAndAuth, async (c) => {
    const bucket = c.env.BUCKET;
    const user = c.get('user');
    const trackId = c.req.param('id');
    const key = `local-tracks/${user.id}/${trackId}`;

    if (!bucket) {
        return c.json({ error: 'Stockage Cloudflare R2 non configuré.' }, 503);
    }

    const object = await bucket.get(key);
    if (!object) {
        return c.json({ error: 'Fichier introuvable.' }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    return new Response(object.body, { headers });
});

// --- ADMIN ENDPOINTS ---
app.get('/admin/users', checkIPAndAuth, requireAdmin, async (c) => {
    const db = c.env.DB;
    const rows = await db.prepare('SELECT id, email, username, role, banned, created_at FROM users').all();
    return c.json(rows.results || []);
});

app.post('/admin/ban/:userId', checkIPAndAuth, requireAdmin, async (c) => {
    const db = c.env.DB;
    const userId = c.req.param('userId');
    const target = await getUserById(db, userId);
    if (!target) return c.json({ error: 'Utilisateur introuvable' }, 404);
    if (target.role === 'OWNER') return c.json({ error: 'Impossible de bannir le propriétaire' }, 400);

    target.banned = true;
    await saveUser(db, target);
    return c.json({ success: true });
});

app.post('/admin/unban/:userId', checkIPAndAuth, requireAdmin, async (c) => {
    const db = c.env.DB;
    const userId = c.req.param('userId');
    const target = await getUserById(db, userId);
    if (!target) return c.json({ error: 'Utilisateur introuvable' }, 404);

    target.banned = false;
    await saveUser(db, target);
    return c.json({ success: true });
});

app.get('/admin/banned-ips', checkIPAndAuth, requireAdmin, async (c) => {
    const db = c.env.DB;
    const ips = await getBannedIPs(db);
    return c.json(ips);
});

app.post('/admin/ban-ip', checkIPAndAuth, requireAdmin, async (c) => {
    const db = c.env.DB;
    const body = await c.req.json();
    const ip = String(body.ip || '').trim();
    if (!ip) return c.json({ error: 'IP requise' }, 400);

    const ips = await getBannedIPs(db);
    if (!ips.includes(ip)) {
        ips.push(ip);
        await saveBannedIPs(db, ips);
    }
    return c.json(ips);
});

export const onRequest = handle(app);
export default app;
