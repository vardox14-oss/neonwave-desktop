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

const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://piped-api.lunar.icu',
    'https://api.piped.projectsegfau.lt',
    'https://pipedapi.riverside.rocks',
    'https://api-piped.mha.fi',
    'https://pipedapi.col7.it',
    'https://piped-api.garudalinux.org',
    'https://api.piped.cre.re'
];

// --- D1 HELPER FUNCTIONS ---
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
    const token = cookieToken || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

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

app.get('/deezer/albums/:id', checkIPAndAuth, async (c) => {
    const id = c.req.param('id');
    const res = await fetch(`https://api.deezer.com/album/${id}`);
    const data = await res.json();
    return c.json(data);
});

// --- YOUTUBE STREAMS & RESOLVING (PIPED DIRECT) ---
async function tryPipedFetch(path) {
    const shuffled = [...PIPED_INSTANCES].sort(() => Math.random() - 0.5);
    for (const baseUrl of shuffled.slice(0, 3)) {
        try {
            const res = await fetch(`${baseUrl}${path}`);
            if (res.status === 200) {
                const data = await res.json();
                if (data && (Array.isArray(data.items) || Array.isArray(data.audioStreams))) {
                    return data;
                }
            }
        } catch {}
    }
    return null;
}

app.get('/music/resolve/:spotifyId', checkIPAndAuth, async (c) => {
    const title = c.req.query('title');
    const artist = c.req.query('artist');
    const query = `${title} ${artist}`;
    const pipedData = await tryPipedFetch(`/search?q=${encodeURIComponent(query)}&filter=music_songs`);
    const bestItem = pipedData?.items?.[0];
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
    const title = c.req.query('title');
    const artist = c.req.query('artist');
    const query = `${title} ${artist}`;
    const pipedData = await tryPipedFetch(`/search?q=${encodeURIComponent(query)}&filter=music_songs`);
    const bestItem = pipedData?.items?.[0];
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
    const pipedData = await tryPipedFetch(`/streams/${encodeURIComponent(videoId)}`);
    if (pipedData && Array.isArray(pipedData.audioStreams) && pipedData.audioStreams.length > 0) {
        const sorted = [...pipedData.audioStreams].sort((l, r) => (r.bitrate || 0) - (l.bitrate || 0));
        const bestStream = sorted[0];
        if (bestStream?.url) {
            // Log history
            const db = c.env.DB;
            const user = c.get('user');
            const playEntry = {
                videoId,
                title: pipedData.title || 'Titre inconnu',
                artist: pipedData.uploader || 'Artiste inconnu',
                thumb: pipedData.thumbnailUrl || '',
                playedAt: new Date().toISOString()
            };
            user.history.unshift(playEntry);
            if (user.history.length > 500) user.history.pop();
            user.recentlyPlayed = [
                playEntry,
                ...user.recentlyPlayed.filter(t => t.videoId !== videoId)
            ].slice(0, 20);
            await saveUser(db, user);

            // Redirect client to direct audio stream URL
            return c.redirect(bestStream.url, 307);
        }
    }
    return c.json({ error: 'Impossible de charger le flux audio.' }, 404);
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
    return c.json({
        completed: user.musicOnboardingCompleted,
        genres: user.musicPreferences.genres || [],
        artists: user.musicPreferences.artists || [],
        followedArtists: user.followedArtists || []
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
    user.musicOnboardingCompleted = true;
    user.musicPreferencesUpdatedAt = new Date().toISOString();
    await saveUser(db, user);
    return c.json({ success: true });
});

app.post('/user/followed-artists/toggle', checkIPAndAuth, async (c) => {
    const db = c.env.DB;
    const user = c.get('user');
    const artist = await c.req.json();
    const index = user.followedArtists.findIndex(a => (a.spotifyId || a.name) === (artist.spotifyId || artist.name));
    if (index === -1) {
        user.followedArtists.push(artist);
    } else {
        user.followedArtists.splice(index, 1);
    }
    await saveUser(db, user);
    return c.json({ success: true, followedArtists: user.followedArtists });
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
