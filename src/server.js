const path = require('path');
const { initializeEnv } = require('./load-env');
initializeEnv({
    appDataPath: process.env.NEONWAVE_APPDATA_PATH || '',
    baseDir: path.join(__dirname, '..'),
    resourcesPath: process.resourcesPath
});
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const net = require('net');
const spotify = require('./lib/spotify');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const {
    hashPassword,
    hashPasswordSync,
    isPasswordHash,
    verifyPassword
} = require('./lib/password');

const app = express();

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'neonwave-secret-2026';
const DB_PATH = process.env.NEONWAVE_DB_PATH || path.join(__dirname, '..', 'data', 'database.json');
const DB_BACKUP_PATH = `${DB_PATH}.bak`;
const LOCAL_TRACKS_DIR = process.env.NEONWAVE_LOCAL_TRACKS_PATH
    || path.join(path.dirname(DB_PATH), 'local-tracks');
const MIN_PASSWORD_LENGTH = 8;
const MAX_LOCAL_TRACK_BYTES = 50 * 1024 * 1024;
const PUBLIC_REGISTRATION_ENABLED = process.env.ALLOW_PUBLIC_REGISTRATION !== 'false';
const VALID_ADMIN_CREATED_ROLES = new Set(['USER', 'ADMIN']);
const LOCAL_AUDIO_TYPES = new Map([
    ['audio/mpeg', '.mp3'],
    ['audio/mp3', '.mp3'],
    ['audio/mp4', '.m4a'],
    ['audio/x-m4a', '.m4a'],
    ['audio/wav', '.wav'],
    ['audio/x-wav', '.wav'],
    ['audio/ogg', '.ogg'],
    ['audio/flac', '.flac']
]);

// --- DATABASE & MUSIC STATE ---
const createDefaultMusicState = () => ({
    musicOnboardingCompleted: false,
    musicPreferences: {
        genres: [],
        artists: []
    },
    followedArtists: [],
    musicPreferencesUpdatedAt: null
});

const MUSIC_GENRE_OPTIONS = [
    'Rap', 'Drill', 'R&B', 'Afro', 'Pop', 'Electro',
    'House', 'Techno', 'Trap', 'Dancehall', 'Amapiano', 'Latino'
];

const MUSIC_ARTIST_OPTIONS = [
    'Maes', 'Ninho', 'SCH', 'Damso', 'Gazo', 'Tiakola',
    'Aya Nakamura', 'Burna Boy', 'Drake', 'The Weeknd', 'Travis Scott', 'Jul'
];

const buildChoiceMap = (items) => items.reduce((acc, item) => {
    acc[item.toLowerCase()] = item;
    return acc;
}, {});

const MUSIC_GENRE_MAP = buildChoiceMap(MUSIC_GENRE_OPTIONS);

const createInitialDB = () => ({
    version: 1,
    setupCompleted: false,
    users: [],
    bannedIPs: [],
    createdAt: new Date().toISOString()
});

const ensureDatabaseShape = (db) => {
    if (!db || typeof db !== 'object') return createInitialDB();
    if (!Array.isArray(db.users)) db.users = [];
    if (!Array.isArray(db.bannedIPs)) db.bannedIPs = [];
    if (!Number.isFinite(db.version)) db.version = 1;
    if (!db.createdAt) db.createdAt = new Date().toISOString();
    db.users.forEach((user) => {
        if (!Array.isArray(user.localTracks)) user.localTracks = [];
        if (!Array.isArray(user.sharedPlaylists)) user.sharedPlaylists = [];
    });
    db.setupCompleted = db.users.some((user) => user.role === 'OWNER');
    return db;
};

const writeJsonAtomic = (filePath, data) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    const serialized = JSON.stringify(data, null, 2);

    fs.writeFileSync(tempPath, serialized);
    if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, `${filePath}.bak`);
    }
    fs.renameSync(tempPath, filePath);
};

const readDatabaseFile = () => {
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (error) {
        if (!fs.existsSync(DB_BACKUP_PATH)) throw error;
        console.warn(`Database read failed, restoring backup: ${error.message}`);
        const backupDB = JSON.parse(fs.readFileSync(DB_BACKUP_PATH, 'utf8'));
        writeJsonAtomic(DB_PATH, backupDB);
        return backupDB;
    }
};

const migrateLegacyPasswords = (db) => {
    if (!Array.isArray(db?.users)) return 0;

    let migratedCount = 0;
    db.users.forEach((user) => {
        if (typeof user?.password !== 'string' || isPasswordHash(user.password)) return;
        user.password = hashPasswordSync(user.password);
        migratedCount += 1;
    });

    return migratedCount;
};

const getDB = () => {
    if (!fs.existsSync(DB_PATH)) {
        const initial = createInitialDB();
        writeJsonAtomic(DB_PATH, initial);
        return initial;
    }
    const rawDB = readDatabaseFile();
    const serializedBeforeShape = JSON.stringify(rawDB);
    const db = ensureDatabaseShape(rawDB);
    let databaseChanged = serializedBeforeShape !== JSON.stringify(db);

    const migratedPasswordCount = migrateLegacyPasswords(db);
    if (migratedPasswordCount > 0) {
        databaseChanged = true;
        console.log(`Migrated ${migratedPasswordCount} legacy password(s) to bcrypt.`);
    }

    if (databaseChanged) {
        writeJsonAtomic(DB_PATH, db);
    }

    return db;
};
const saveDB = (db) => writeJsonAtomic(DB_PATH, ensureDatabaseShape(db));

const normalizeEmail = (email) => normalizeChoiceValue(email).toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
const isValidIP = (ip) => net.isIP(normalizeChoiceValue(ip)) !== 0;
const hasOwner = (db) => Array.isArray(db?.users) && db.users.some((user) => user.role === 'OWNER');
const isSetupRequired = (db) => !hasOwner(db);
const createUserId = (prefix = 'user') => `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
const getPublicUser = (user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
});

const setAuthCookie = (res, token, maxAge) => {
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge
    });
};

const issueAuthSession = (res, user, { rememberMe = false } = {}) => {
    const expiresIn = rememberMe ? '30d' : '7d';
    const maxAge = (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000;
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn });
    setAuthCookie(res, token, maxAge);
    return {
        token,
        user: getPublicUser(user)
    };
};

const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de tentatives. Reessaie dans quelques minutes.' }
});

const setupRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de tentatives de configuration. Reessaie plus tard.' }
});

// --- APP CONFIG ---
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
}));
app.use(cors({
    origin: true, // In production, replace with specific domain
    credentials: true
}));
app.use(express.json({ limit: '80mb' }));
app.use(cookieParser());
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api/setup/owner', setupRateLimiter);

// --- GLOBAL REQUEST LOGGER ---
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});
app.use(express.static(path.join(__dirname, '..', 'public'), {
    etag: false,
    lastModified: false,
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
    }
}));

// --- IP & AUTH HELPERS/MIDDLEWARES ---
const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress?.replace('::ffff:', '') ||
           req.ip?.replace('::ffff:', '') ||
           '127.0.0.1';
};

const authenticate = (req, res, next) => {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Auth requis' });
    
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        const db = getDB();
        const user = db.users.find(u => u.id === req.user.id);
        if (user && user.banned) return res.status(403).json({ error: 'Votre compte a été banni.' });
        
        const clientIP = getClientIP(req);
        if (db.bannedIPs.includes(clientIP)) return res.status(403).json({ error: 'Votre adresse IP a été bannie.' });
        
        next();
    } catch { 
        res.status(401).json({ error: 'Session invalide ou expirée' }); 
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
    }
    next();
};

const sanitizeFileStem = (value) => normalizeChoiceValue(value || 'titre')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'titre';

const getLocalTrackUserDir = (userId) => path.join(
    LOCAL_TRACKS_DIR,
    sanitizeFileStem(userId)
);

const getLocalTrackPublicPayload = (track) => ({
    id: track.id,
    videoId: track.id,
    localTrackId: track.id,
    source: 'local',
    title: track.title,
    artist: track.artist,
    thumb: track.thumb || '',
    durationMs: Number(track.durationMs) || 0,
    mimeType: track.mimeType,
    size: track.size,
    addedAt: track.addedAt,
    streamUrl: `/api/user/local-tracks/${encodeURIComponent(track.id)}/stream`
});

const parseSyncedLyrics = (value) => String(value || '')
    .split(/\r?\n/)
    .map((line) => {
        const match = line.match(/^\[(\d{1,3}):(\d{2}(?:\.\d{1,3})?)\]\s*(.*)$/);
        if (!match) return null;
        return {
            time: (Number(match[1]) * 60) + Number(match[2]),
            text: match[3].trim()
        };
    })
    .filter((line) => line && line.text);

const trackUserHistory = (userId, track) => {
    if (!track?.videoId) return;
    const db = getDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return;
    if (!user.history) user.history = [];
    if (!user.recentlyPlayed) user.recentlyPlayed = [];
    const spotifyId = normalizeChoiceValue(track.spotifyId || track?.spotify?.spotifyId || '');
    const playEntry = {
        videoId: track.videoId,
        spotifyId,
        localTrackId: track.localTrackId || '',
        source: track.source || '',
        streamUrl: track.streamUrl || '',
        title: track.title,
        artist: track.artist || track.uploaderName,
        thumb: track.thumbnail || track.thumb,
        durationMs: Number(track.durationMs) || 0,
        playedAt: new Date().toISOString()
    };
    user.history.unshift(playEntry);
    if (user.history.length > 500) user.history.pop();
    user.recentlyPlayed = [
        playEntry,
        ...user.recentlyPlayed.filter((t) => {
            const currentSpotifyId = normalizeChoiceValue(t?.spotifyId || '');
            if (spotifyId && currentSpotifyId) {
                return currentSpotifyId !== spotifyId;
            }
            return t.videoId !== track.videoId;
        })
    ].slice(0, 20);
    saveDB(db);
};

// --- Music Discovery Config ---

const SPOTIFY_GENRE_SEED_ALIASES = {
    rap: ['rap', 'hip-hop', 'hip hop'],
    drill: ['drill', 'hip-hop', 'rap'],
    'r&b': ['r-n-b', 'soul', 'pop'],
    afro: ['afrobeat', 'dancehall', 'world-music'],
    pop: ['pop'],
    electro: ['electronic', 'edm', 'dance'],
    house: ['house'],
    techno: ['techno'],
    trap: ['trap', 'hip-hop', 'rap'],
    dancehall: ['dancehall', 'reggae'],
    amapiano: ['amapiano', 'house', 'afrobeat'],
    latino: ['latin', 'latino', 'reggaeton']
};
const YT_POSITIVE_HINTS = ['official audio', 'audio', 'topic', 'provided to youtube by', 'visualizer'];
const YT_NEGATIVE_HINTS = ['reaction', 'performance', 'lyrics', 'paroles', 'live', 'karaoke', 'cover', 'slowed', 'sped up', 'remix', 'type beat', 'concert', 'reverb', 'nightcore', 'mashup', 'edit', 'fan made', 'amv', 'flow edit', 'roblox', '8d', 'bass boosted', 'boosted', 'clean version', 'clean', 'instrumental', 'audio edit', '1 hour', 'loop', 'clip officiel', 'official video', 'video officiel', 'music video'];
const YT_STRONG_NEGATIVE_HINTS = ['slowed', 'sped up', 'remix', 'karaoke', 'cover', 'nightcore', 'mashup', 'reverb', 'amv', 'flow edit', 'roblox', '8d', 'bass boosted', 'boosted', 'instrumental', 'audio edit', '1 hour', 'loop'];
const TRACK_VIDEO_OVERRIDES = {
    'maes|distant': {
        videoId: 'C7cdnKXqKOU',
        titleKeys: ['distant'],
        blockedVideoIds: ['8T2MzWwQfPc']
    },
    'saif|le taf du loup': {
        videoId: 'hcxU8oRu6pc',
        titleKeys: ['le taf du loup'],
        blockedVideoIds: ['EiX9G4LKGsc']
    },
    'pato|ice o lator': {
        videoId: 'LRBsPjdNIS4',
        titleKeys: ['ice o lator'],
        blockedVideoIds: ['URvmrzv5JmU']
    }
};

// --- BASE FETCH UTILITY ---
const fetchFull = async (url, options = {}) => {
    try {
        const response = await fetch(url, options);
        const body = await response.text();
        return { status: response.status, body };
    } catch (err) {
        throw new Error(`fetchFull Error (${url}): ${err.message}`);
    }
};


// --- UTILITIES ---

const normalizeChoiceValue = (value) => typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ')
    : '';

const normalizeStoredArtist = (artist) => {
    if (!artist) return null;

    if (typeof artist === 'string') {
        const name = normalizeChoiceValue(artist);
        if (!name) return null;
        return {
            spotifyId: '',
            name,
            imageUrl: '',
            spotifyUrl: '',
            genres: [],
            popularity: 0,
            followers: 0,
            source: 'legacy'
        };
    }

    if (typeof artist !== 'object') return null;

    const name = normalizeChoiceValue(artist.name || artist.label || '');
    if (!name) return null;

    const genres = Array.isArray(artist.genres)
        ? artist.genres.map(normalizeChoiceValue).filter(Boolean).slice(0, 5)
        : [];

    return {
        spotifyId: normalizeChoiceValue(artist.spotifyId || artist.id || ''),
        name,
        imageUrl: normalizeChoiceValue(artist.imageUrl || artist.image || ''),
        spotifyUrl: normalizeChoiceValue(artist.spotifyUrl || artist.url || ''),
        genres,
        popularity: Number.isFinite(artist.popularity) ? artist.popularity : 0,
        followers: Number.isFinite(artist.followers) ? artist.followers : 0,
        source: normalizeChoiceValue(artist.source || (artist.spotifyId ? 'spotify' : 'custom')) || 'custom'
    };
};

const getArtistIdentity = (artist) => {
    const normalized = normalizeStoredArtist(artist);
    if (!normalized) return '';
    return (normalized.spotifyId || normalized.name).toLowerCase();
};

const mergeUniqueArtists = (...artistGroups) => {
    const merged = [];
    const seen = new Set();

    artistGroups.flat().forEach((artist) => {
        const normalized = normalizeStoredArtist(artist);
        if (!normalized) return;
        const identity = getArtistIdentity(normalized);
        if (!identity || seen.has(identity)) return;
        seen.add(identity);
        merged.push(normalized);
    });

    return merged;
};

const ensureUserMusicState = (user) => {
    if (!user) return null;

    if (typeof user.musicOnboardingCompleted !== 'boolean') {
        user.musicOnboardingCompleted = false;
    }

    if (!user.musicPreferences || typeof user.musicPreferences !== 'object') {
        user.musicPreferences = { genres: [], artists: [] };
    }

    if (!Array.isArray(user.musicPreferences.genres)) {
        user.musicPreferences.genres = [];
    }

    user.musicPreferences.genres = user.musicPreferences.genres
        .map((genre) => MUSIC_GENRE_MAP[normalizeChoiceValue(genre).toLowerCase()] || null)
        .filter(Boolean)
        .slice(0, 3);

    user.musicPreferences.artists = Array.isArray(user.musicPreferences.artists)
        ? mergeUniqueArtists(user.musicPreferences.artists)
        : [];

    user.followedArtists = Array.isArray(user.followedArtists)
        ? mergeUniqueArtists(user.followedArtists)
        : [];

    if (!Object.prototype.hasOwnProperty.call(user, 'musicPreferencesUpdatedAt')) {
        user.musicPreferencesUpdatedAt = null;
    }

    user.followedArtists = mergeUniqueArtists(user.followedArtists, user.musicPreferences.artists);

    return user;
};

const getUserById = (db, userId) => db.users.find((user) => user.id === userId);

const normalizeFixedChoices = (values, lookupMap, requiredError, invalidError, duplicateError) => {
    if (!Array.isArray(values) || values.length !== 3) {
        throw new Error(requiredError);
    }

    const canonicalValues = values.map((value) => {
        const normalized = normalizeChoiceValue(value).toLowerCase();
        return lookupMap[normalized] || null;
    });

    if (canonicalValues.some((value) => !value)) {
        throw new Error(invalidError);
    }

    if (new Set(canonicalValues.map((value) => value.toLowerCase())).size !== 3) {
        throw new Error(duplicateError);
    }

    return canonicalValues;
};

const normalizeArtistSelections = (values) => {
    if (!Array.isArray(values) || values.length < 3) {
        throw new Error('Vous devez choisir au moins 3 artistes.');
    }

    const artists = values.map(normalizeStoredArtist);
    if (artists.some((artist) => !artist || !artist.name)) {
        throw new Error('Un ou plusieurs artistes sont invalides.');
    }

    if (new Set(artists.map((artist) => getArtistIdentity(artist))).size !== artists.length) {
        throw new Error('Les artistes doivent etre differents.');
    }

    return artists;
};

const getPublicMusicPreferences = (user) => {
    const safeUser = ensureUserMusicState(user);
    return {
        completed: safeUser.musicOnboardingCompleted,
        genres: [...safeUser.musicPreferences.genres],
        artists: safeUser.musicPreferences.artists.map((artist) => ({ ...artist })),
        followedArtists: safeUser.followedArtists.map((artist) => ({ ...artist })),
        spotifyEnabled: spotify.hasSpotifyConfig()
    };
};

const getArtistSearchTerm = (artist) => {
    const normalized = normalizeStoredArtist(artist);
    return normalized?.name || '';
};

const extractVideoId = (item = {}) => {
    const rawValue = item.videoId || item.id || item.url || '';
    if (!rawValue) return '';
    if (rawValue.startsWith('/watch?v=')) {
        const videoId = rawValue.replace('/watch?v=', '').split('&')[0];
        return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : '';
    }
    if (rawValue.includes('v=')) {
        const videoId = rawValue.split('v=')[1].split('&')[0];
        return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : '';
    }
    const normalizedValue = String(rawValue).trim();
    return /^[A-Za-z0-9_-]{11}$/.test(normalizedValue) ? normalizedValue : '';
};

const normalizeComparisonValue = (value) => normalizeChoiceValue(
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const canonicalizeSpotifySeed = (value) => normalizeComparisonValue(value).replace(/\s+/g, '');

const parseDurationToSeconds = (value) => {
    if (Number.isFinite(value)) return value;

    if (typeof value === 'string' && value.includes(':')) {
        return value
            .split(':')
            .map((part) => Number.parseInt(part, 10))
            .filter(Number.isFinite)
            .reduce((total, part) => (total * 60) + part, 0);
    }

    return 0;
};

const artistNeedsSpotifySync = (artist) => {
    const normalized = normalizeStoredArtist(artist);
    if (!normalized?.name) return false;

    return !normalized.spotifyId || !normalized.imageUrl || normalized.source !== 'spotify';
};

const cleanUserIdentityArtists = async (user) => {
    // Temporarily disabled to prevent timeouts during homepage load
    return false;
};

const syncUserSpotifyArtists = async (user) => {
    if (!spotify.hasSpotifyConfig()) return false;

    ensureUserMusicState(user);

    // Run deep clean first for Urban users to fix "Pato/Saif" issues
    const wasCleaned = await cleanUserIdentityArtists(user);

    const preferenceArtists = mergeUniqueArtists(user.musicPreferences.artists);
    const followedArtists = mergeUniqueArtists(user.followedArtists, preferenceArtists);

    if (!wasCleaned && ![...preferenceArtists, ...followedArtists].some(artistNeedsSpotifySync)) {
        return false;
    }

    const enrichedPreferences = await spotify.enrichArtists(preferenceArtists);
    const followedOnly = followedArtists.filter((artist) => !enrichedPreferences.some(
        (preferenceArtist) => getArtistIdentity(preferenceArtist) === getArtistIdentity(artist)
    ));
    const enrichedFollowedOnly = await spotify.enrichArtists(followedOnly);

    user.musicPreferences.artists = mergeUniqueArtists(enrichedPreferences);
    user.followedArtists = mergeUniqueArtists(user.musicPreferences.artists, enrichedFollowedOnly);
    return true;
};

const buildSpotifyGenreSeeds = async (genres, artistSeedCount = 0) => {
    if (!spotify.hasSpotifyConfig()) return [];

    const availableSeeds = await spotify.getAvailableGenreSeeds();
    const availableSeedMap = new Map(
        availableSeeds.map((seed) => [canonicalizeSpotifySeed(seed), seed])
    );
    const maxGenreSeeds = Math.max(0, 5 - Math.min(Math.max(artistSeedCount, 0), 5));
    const resolvedSeeds = [];

    (Array.isArray(genres) ? genres : []).forEach((genre) => {
        if (resolvedSeeds.length >= maxGenreSeeds) return;

        const normalizedGenre = normalizeChoiceValue(genre).toLowerCase();
        const seedCandidates = [
            ...(SPOTIFY_GENRE_SEED_ALIASES[normalizedGenre] || []),
            normalizedGenre
        ];

        for (const candidate of seedCandidates) {
            const matchedSeed = availableSeedMap.get(canonicalizeSpotifySeed(candidate));
            if (matchedSeed && !resolvedSeeds.includes(matchedSeed)) {
                resolvedSeeds.push(matchedSeed);
                break;
            }
        }
    });

    return resolvedSeeds;
};

const getSpotifyClientError = (error, fallbackMessage) => {
    if (error instanceof spotify.SpotifyApiError) {
        if (error.status === 401 || error.status === 403) {
            return 'Spotify refuse temporairement cette ressource. NeonWave utilise un fallback local pour continuer.';
        }
        if (error.status === 429) {
            return 'Spotify limite temporairement les requetes. Reessaie dans un instant.';
        }
    }

    return error?.message || fallbackMessage;
};

const getTrackPrimaryArtistName = (spotifyTrack) => Array.isArray(spotifyTrack?.artists)
    ? normalizeChoiceValue(spotifyTrack.artists[0]?.name || spotifyTrack.artists[0] || '')
    : '';

const stripTrackQueryDecorators = (title) => normalizeChoiceValue(title)
    .replace(/\s*[\(\[]?(feat|ft)\.?\s+[^)\]]*[\)\]]?/gi, '')
    .replace(/\s*[\(\[]?(clip officiel|official video|video officiel|music video|lyrics|paroles|official audio|audio officiel|visualizer)[^)\]]*[\)\]]?/gi, '')
    .replace(/\s*-\s*(clip officiel|official video|video officiel|music video|lyrics|paroles|official audio|audio officiel|visualizer|radio edit|edit|version|explicit|clean)$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeTrackTitleForMatching = (title, artist = '') => {
    const rawTitle = normalizeChoiceValue(title);
    if (!rawTitle) return '';

    const cleanedTitle = stripTrackQueryDecorators(stripBracketedSearchNoise(rawTitle)) || stripTrackQueryDecorators(rawTitle) || rawTitle;
    const normalizedArtist = normalizeComparisonValue(artist);
    const normalizedCleanedTitle = normalizeComparisonValue(cleanedTitle);

    if (!normalizedArtist || !normalizedCleanedTitle) {
        return cleanedTitle;
    }

    const artistPrefixPattern = new RegExp(`^${normalizedArtist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i');
    const compactCleanedTitle = cleanedTitle.replace(/^[\s\-–—:|]+/, '').trim();
    if (!compactCleanedTitle) {
        return cleanedTitle;
    }

    const separatorMatch = compactCleanedTitle.match(/^\s*[^-–—:|]+\s*[-–—:|]\s*(.+)$/);
    if (separatorMatch) {
        const leftPart = normalizeComparisonValue(compactCleanedTitle.split(/[-–—:|]/)[0] || '');
        const rightPart = normalizeChoiceValue(separatorMatch[1] || '');
        if (leftPart && rightPart && (leftPart === normalizedArtist || artistPrefixPattern.test(`${leftPart} `))) {
            return rightPart;
        }
    }

    return cleanedTitle;
};

const buildComparisonTokens = (value) => {
    const stopTokens = new Set(['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'est', 'the', 'and', 'feat', 'ft']);
    return normalizeComparisonValue(value)
        .split(' ')
        .filter((token) => token && (!stopTokens.has(token) || /\d/.test(token)))
        .filter((token) => token.length > 2 || /\d/.test(token));
};

const stripBracketedSearchNoise = (value) => normalizeChoiceValue(value)
    .replace(/\s*[\(\[][^\)\]]*[\)\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildSearchQueryVariants = (query) => {
    const normalizedQuery = normalizeChoiceValue(query);
    if (!normalizedQuery) return [];

    const unquotedQuery = normalizeChoiceValue(normalizedQuery.replace(/["'`]+/g, ' '));
    const strippedDecorators = stripTrackQueryDecorators(unquotedQuery || normalizedQuery);
    const bracketlessQuery = stripBracketedSearchNoise(unquotedQuery || normalizedQuery);
    const dashParts = (unquotedQuery || normalizedQuery)
        .split(/\s+-\s+/)
        .map(normalizeChoiceValue)
        .filter(Boolean);

    const variants = [
        normalizedQuery,
        unquotedQuery,
        strippedDecorators,
        bracketlessQuery
    ];

    if (dashParts.length === 2) {
        variants.push(`${dashParts[1]} ${dashParts[0]}`);
    }

    const seen = new Set();
    return variants
        .map(normalizeChoiceValue)
        .filter(Boolean)
        .filter((variant) => {
            const key = variant.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 4);
};

const buildSpotifyTrackQueries = (spotifyTrack) => {
    const primaryArtist = getTrackPrimaryArtistName(spotifyTrack);
    const title = normalizeChoiceValue(spotifyTrack?.name || spotifyTrack?.title || '');
    const albumName = normalizeChoiceValue(spotifyTrack?.album?.name || '');
    const simplifiedTitle = stripTrackQueryDecorators(title);
    const variants = [];
    const titleOptions = [title];

    if (simplifiedTitle && simplifiedTitle.toLowerCase() !== title.toLowerCase()) {
        titleOptions.push(simplifiedTitle);
    }

    titleOptions.forEach((titleOption) => {
        variants.push([`"${titleOption}"`, primaryArtist].filter(Boolean).join(' '));
        variants.push([primaryArtist, titleOption].filter(Boolean).join(' - '));
        variants.push([primaryArtist, titleOption].filter(Boolean).join(' '));
        variants.push([titleOption, primaryArtist].filter(Boolean).join(' '));
        variants.push([primaryArtist, titleOption, 'official video'].filter(Boolean).join(' '));
        variants.push([primaryArtist, titleOption, 'clip officiel'].filter(Boolean).join(' '));
        if (titleOption.replace(/\s+/g, '').length > 5) {
            variants.push(`"${titleOption}"`);
        }
        if (albumName) {
            variants.push([`"${titleOption}"`, albumName, primaryArtist].filter(Boolean).join(' '));
        }
    });

    const normalizedTitle = normalizeComparisonValue(title);
    const isShortOrAmbiguousTitle = normalizedTitle.replace(/\s+/g, '').length <= 5 || buildComparisonTokens(title).length <= 1;
    if (isShortOrAmbiguousTitle) {
        variants.push([primaryArtist, title, 'topic'].filter(Boolean).join(' '));
    }

    const seen = new Set();
    return variants
        .map(normalizeChoiceValue)
        .filter(Boolean)
        .filter((query) => {
            const key = query.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 7);
};

const parseCandidateViewCount = (value) => {
    if (Number.isFinite(value)) {
        return Math.max(0, Math.round(value));
    }

    const normalized = normalizeChoiceValue(value).toLowerCase();
    if (!normalized) return 0;

    const suffixMatch = normalized.match(/([\d.,]+)\s*([kmb])/i);
    if (suffixMatch) {
        const numeric = Number.parseFloat(suffixMatch[1].replace(',', '.'));
        if (!Number.isFinite(numeric)) return 0;

        const multiplier = suffixMatch[2].toLowerCase() === 'b'
            ? 1_000_000_000
            : (suffixMatch[2].toLowerCase() === 'm' ? 1_000_000 : 1_000);
        return Math.round(numeric * multiplier);
    }

    const digits = normalized.replace(/[^0-9]/g, '');
    return Number.parseInt(digits || '0', 10) || 0;
};

const getCandidateViewCount = (candidate) => parseCandidateViewCount(
    candidate?.views
    ?? candidate?.viewCount
    ?? candidate?.view_count
    ?? candidate?.viewCountText?.simpleText
    ?? ''
);

const getCandidatePopularityBoost = (viewCount) => {
    if (!Number.isFinite(viewCount) || viewCount <= 0) return 0;
    if (viewCount >= 50_000_000) return 22;
    if (viewCount >= 10_000_000) return 18;
    if (viewCount >= 2_000_000) return 14;
    if (viewCount >= 500_000) return 10;
    if (viewCount >= 100_000) return 6;
    if (viewCount >= 25_000) return 3;
    return 0;
};

const compareCandidateAnalyses = (left, right) => {
    const leftScore = Number.isFinite(left?.score) ? left.score : Number.NEGATIVE_INFINITY;
    const rightScore = Number.isFinite(right?.score) ? right.score : Number.NEGATIVE_INFINITY;
    if (rightScore !== leftScore) return rightScore - leftScore;

    const leftStrong = hasStrongTitleAlignment(left) ? 1 : 0;
    const rightStrong = hasStrongTitleAlignment(right) ? 1 : 0;
    if (rightStrong !== leftStrong) return rightStrong - leftStrong;

    const leftArtist = left?.primaryArtistMatch ? 1 : 0;
    const rightArtist = right?.primaryArtistMatch ? 1 : 0;
    if (rightArtist !== leftArtist) return rightArtist - leftArtist;

    const leftViews = Number.isFinite(left?.viewCount) ? left.viewCount : 0;
    const rightViews = Number.isFinite(right?.viewCount) ? right.viewCount : 0;
    if (rightViews !== leftViews) return rightViews - leftViews;

    const leftDurationDiff = Number.isFinite(left?.durationDifference) ? left.durationDifference : Number.POSITIVE_INFINITY;
    const rightDurationDiff = Number.isFinite(right?.durationDifference) ? right.durationDifference : Number.POSITIVE_INFINITY;
    return leftDurationDiff - rightDurationDiff;
};

const compareMostViewedCandidateAnalyses = (left, right) => {
    const leftStrong = hasStrongTitleAlignment(left) ? 1 : 0;
    const rightStrong = hasStrongTitleAlignment(right) ? 1 : 0;
    if (rightStrong !== leftStrong) return rightStrong - leftStrong;

    const leftArtist = left?.primaryArtistMatch ? 1 : 0;
    const rightArtist = right?.primaryArtistMatch ? 1 : 0;
    if (rightArtist !== leftArtist) return rightArtist - leftArtist;

    const leftViews = Number.isFinite(left?.viewCount) ? left.viewCount : 0;
    const rightViews = Number.isFinite(right?.viewCount) ? right.viewCount : 0;
    if (rightViews !== leftViews) return rightViews - leftViews;

    const leftExact = left?.exactTitleMatch ? 1 : 0;
    const rightExact = right?.exactTitleMatch ? 1 : 0;
    if (rightExact !== leftExact) return rightExact - leftExact;

    return compareCandidateAnalyses(left, right);
};

const analyzeYTCandidate = (candidate, spotifyTrack) => {
    const candidateTitle = normalizeComparisonValue(candidate?.title || '');
    const candidateArtist = normalizeComparisonValue(candidate?.uploaderName || candidate?.artist || '');
    const candidateCombined = normalizeComparisonValue([
        candidate?.title || '',
        candidate?.uploaderName || candidate?.artist || ''
    ].join(' '));
    const expectedTitle = normalizeComparisonValue(spotifyTrack?.name || spotifyTrack?.title || '');
    const expectedArtists = Array.isArray(spotifyTrack?.artists)
        ? spotifyTrack.artists
            .map((artist) => normalizeComparisonValue(artist?.name || artist))
            .filter(Boolean)
        : [];
    const primaryArtist = expectedArtists[0] || '';

    if (!candidateTitle || !expectedTitle) {
        return {
            candidate,
            score: Number.NEGATIVE_INFINITY,
            exactTitleMatch: false,
            titleSequenceMatch: false,
            titleCoverage: 0,
            primaryArtistMatch: false,
            shortOrAmbiguousTitle: false
        };
    }

    const expectedTitleCompact = expectedTitle.replace(/\s+/g, '');
    const candidateTitleCompact = candidateTitle.replace(/\s+/g, '');
    const titleTokens = buildComparisonTokens(expectedTitle);
    const matchedTitleTokens = titleTokens.filter((token) => candidateCombined.includes(token));
    const titleCoverage = titleTokens.length ? matchedTitleTokens.length / titleTokens.length : 0;
    const exactTitleMatch = candidateTitle === expectedTitle;
    const titleSequenceMatch = candidateTitle.includes(expectedTitle) || candidateCombined.includes(expectedTitle);
    const compactTitleMatch = Boolean(expectedTitleCompact) && candidateTitleCompact.includes(expectedTitleCompact);
    const primaryArtistMatch = Boolean(primaryArtist) && (
        candidateArtist.includes(primaryArtist) ||
        candidateTitle.includes(primaryArtist) ||
        candidateCombined.includes(primaryArtist)
    );
    const matchedArtistCount = expectedArtists.filter((artistName) => (
        candidateArtist.includes(artistName) ||
        candidateTitle.includes(artistName) ||
        candidateCombined.includes(artistName)
    )).length;
    const shortOrAmbiguousTitle = expectedTitleCompact.length <= 5 || titleTokens.length <= 1;
    const hasPositiveHint = YT_POSITIVE_HINTS.some((hint) => candidateCombined.includes(hint));
    const hasNegativeHint = YT_NEGATIVE_HINTS.some((hint) => candidateCombined.includes(hint) && !expectedTitle.includes(hint));
    const hasStrongNegativeHint = YT_STRONG_NEGATIVE_HINTS.some((hint) => candidateCombined.includes(hint) && !expectedTitle.includes(hint));
    const viewCount = getCandidateViewCount(candidate);
    let durationDifference = Number.NaN;

    let score = 0;

    if (exactTitleMatch) {
        score += 140;
    } else if (titleSequenceMatch) {
        score += 96;
    } else if (compactTitleMatch) {
        score += 82;
    }

    matchedTitleTokens.forEach(() => {
        score += shortOrAmbiguousTitle ? 18 : 11;
    });

    if (titleTokens.length) {
        if (titleCoverage >= 1) score += 44;
        else if (titleCoverage >= 0.8) score += 28;
        else if (titleCoverage >= 0.5) score += 10;
        else if (titleCoverage === 0) score -= 110;
        else score -= 42;
    }

    if (primaryArtistMatch) {
        score += 48;
    } else if (primaryArtist) {
        score -= shortOrAmbiguousTitle ? 130 : 36;
    }

    if (matchedArtistCount > 1) {
        score += (matchedArtistCount - 1) * 10;
    }

    if (hasPositiveHint) {
        score += 10;
    }

    if (hasNegativeHint) {
        score -= 22;
    }

    if (hasStrongNegativeHint) {
        score -= 150;
    }

    if (primaryArtistMatch && hasStrongTitleAlignment({
        exactTitleMatch,
        titleSequenceMatch: titleSequenceMatch || compactTitleMatch,
        titleCoverage
    })) {
        score += getCandidatePopularityBoost(viewCount);
    }

    const ytDuration = parseDurationToSeconds(candidate?.duration || candidate?.durationText || 0);
    const spotifyDuration = Math.round((spotifyTrack?.durationMs || 0) / 1000);
    if (ytDuration > 0 && spotifyDuration > 0) {
        durationDifference = Math.abs(ytDuration - spotifyDuration);
        if (durationDifference <= 4) score += 18;
        else if (durationDifference <= 10) score += 10;
        else if (durationDifference <= 20) score += 4;
        else if (durationDifference >= 90) score -= 140;
        else if (durationDifference >= 60) score -= 80;
        else if (durationDifference >= 35) score -= 24;
    }

    if (!extractVideoId(candidate)) {
        score -= 200;
    }

    if (shortOrAmbiguousTitle && !primaryArtistMatch) {
        score -= 80;
    }

    if (shortOrAmbiguousTitle && !exactTitleMatch && !titleSequenceMatch && titleCoverage < 1) {
        score -= 55;
    }

    return {
        candidate,
        score,
        exactTitleMatch,
        titleSequenceMatch: titleSequenceMatch || compactTitleMatch,
        titleCoverage,
        primaryArtistMatch,
        shortOrAmbiguousTitle,
        hasNegativeHint,
        hasStrongNegativeHint,
        viewCount,
        durationDifference
    };
};

const scoreYTCandidate = (candidate, spotifyTrack) => analyzeYTCandidate(candidate, spotifyTrack).score;

const isSelectableYTCandidate = (analysis) => {
    if (!analysis) return false;

    const minimumScore = analysis.shortOrAmbiguousTitle ? 110 : 72;
    const strongTitleMatch = hasStrongTitleAlignment(analysis);
    const hasTightDurationMatch = Number.isFinite(analysis.durationDifference) && analysis.durationDifference <= 8;

    if (analysis.score < minimumScore) return false;
    if (!strongTitleMatch) return false;
    if (analysis.hasStrongNegativeHint) return false;
    if (analysis.hasNegativeHint && !analysis.primaryArtistMatch) return false;
    if (Number.isFinite(analysis.durationDifference) && analysis.durationDifference >= 45) return false;
    if (analysis.shortOrAmbiguousTitle && !analysis.primaryArtistMatch && !hasTightDurationMatch) return false;
    if (!analysis.primaryArtistMatch && analysis.titleCoverage < 1) return false;

    return true;
};

const pickBestYTCandidate = (candidates, spotifyTrack) => {
    const ranked = (Array.isArray(candidates) ? candidates : [])
        .map((candidate) => analyzeYTCandidate(candidate, spotifyTrack))
        .filter((entry) => Number.isFinite(entry.score))
        .sort(compareCandidateAnalyses);
    const eligible = ranked.filter((entry) => isSelectableYTCandidate(entry));
    if (!eligible.length) return null;

    return eligible.sort(compareMostViewedCandidateAnalyses)[0] || null;
};

const hasStrongTitleAlignment = (analysis) => Boolean(
    analysis && (analysis.exactTitleMatch || analysis.titleSequenceMatch || analysis.titleCoverage >= 1)
);

const buildTrackOverrideKey = (title = '', artist = '') => {
    const normalizedTitle = normalizeComparisonValue(title);
    const normalizedArtist = normalizeComparisonValue(artist.split(',')[0] || artist);
    if (!normalizedTitle || !normalizedArtist) return '';
    return `${normalizedArtist}|${normalizedTitle}`;
};

const getTrackVideoOverride = ({ title = '', artist = '', spotifyId = '' } = {}) => {
    const directKey = buildTrackOverrideKey(title, artist);
    if (directKey && TRACK_VIDEO_OVERRIDES[directKey]) {
        return TRACK_VIDEO_OVERRIDES[directKey];
    }

    const normalizedTitle = normalizeComparisonValue(title);
    if (normalizedTitle) {
        const titleMatch = Object.values(TRACK_VIDEO_OVERRIDES).find((override) => (
            Array.isArray(override.titleKeys) && override.titleKeys.includes(normalizedTitle)
        ));
        if (titleMatch) {
            return titleMatch;
        }
    }

    const normalizedSpotifyId = normalizeChoiceValue(spotifyId);
    if (!normalizedSpotifyId) return null;

    return Object.values(TRACK_VIDEO_OVERRIDES).find((override) => (
        normalizeChoiceValue(override.spotifyId || '') === normalizedSpotifyId
    )) || null;
};

const isBlockedVideoForTrack = (trackInfo, videoId) => {
    const override = getTrackVideoOverride(trackInfo);
    const normalizedVideoId = extractVideoId({ videoId });
    if (!override || !normalizedVideoId) return false;
    return Array.isArray(override.blockedVideoIds) && override.blockedVideoIds.includes(normalizedVideoId);
};

const isSafeStoredTrackAnalysis = (analysis) => {
    if (!analysis) return false;
    if (!analysis.primaryArtistMatch) return false;
    if (!hasStrongTitleAlignment(analysis)) return false;
    if (analysis.hasStrongNegativeHint) return false;
    if (analysis.hasNegativeHint) return false;
    if (Number.isFinite(analysis.durationDifference) && analysis.durationDifference >= 30) return false;
    const popularityBonus = analysis.viewCount >= 500_000 ? 10 : (analysis.viewCount >= 100_000 ? 6 : 0);
    return analysis.score >= ((analysis.shortOrAmbiguousTitle ? 135 : 118) - popularityBonus);
};

const isSafeResolveAnalysis = (analysis, { sourceLabel = '' } = {}) => {
    if (!analysis) return false;
    if (!hasStrongTitleAlignment(analysis)) return false;
    if (analysis.hasStrongNegativeHint) return false;
    if (analysis.hasNegativeHint && !analysis.primaryArtistMatch) return false;
    if (Number.isFinite(analysis.durationDifference) && analysis.durationDifference >= 30) return false;

    const normalizedSource = String(sourceLabel || '').toLowerCase();
    const isBroadSource = normalizedSource.includes('broad') || normalizedSource.includes('all');
    const popularityBonus = analysis.viewCount >= 1_000_000
        ? 12
        : (analysis.viewCount >= 250_000 ? 8 : (analysis.viewCount >= 100_000 ? 4 : 0));
    const minimumScore = (isBroadSource
        ? (analysis.shortOrAmbiguousTitle ? 145 : 128)
        : (analysis.shortOrAmbiguousTitle ? 130 : 108)) - popularityBonus;

    if (analysis.score < minimumScore) return false;
    if (isBroadSource && !analysis.primaryArtistMatch) return false;
    if (analysis.shortOrAmbiguousTitle && !analysis.primaryArtistMatch) return false;
    if (!analysis.primaryArtistMatch && analysis.titleCoverage < 1) return false;

    return true;
};

const buildTrackReferenceFromMetadata = ({ spotifyId = '', title = '', artist = '', durationMs = 0 } = {}) => {
    const normalizedArtistLabel = normalizeChoiceValue(artist);
    const normalizedTitle = normalizeTrackTitleForMatching(title, normalizedArtistLabel) || normalizeChoiceValue(title);
    const artistNames = normalizeChoiceValue(artist)
        .split(',')
        .map(normalizeChoiceValue)
        .filter(Boolean);

    return {
        spotifyId: normalizeChoiceValue(spotifyId),
        name: normalizedTitle,
        title: normalizedTitle,
        durationMs: Number.isFinite(durationMs) ? durationMs : 0,
        artists: artistNames.map((name) => ({ name }))
    };
};

const buildTrackResolutionCacheKey = (trackReference = {}) => {
    const spotifyId = normalizeChoiceValue(trackReference?.spotifyId || '');
    if (spotifyId) {
        return `spotify:${spotifyId}`;
    }

    const title = normalizeComparisonValue(trackReference?.name || trackReference?.title || '');
    const artist = Array.isArray(trackReference?.artists)
        ? trackReference.artists.map((item) => normalizeComparisonValue(item?.name || item)).filter(Boolean).join('|')
        : normalizeComparisonValue(trackReference?.artist || '');

    if (!title) return '';
    return `meta:${title}|${artist}`;
};

const findStoredPlayableTrack = (trackReference, db = getDB()) => {
    const referenceTitle = normalizeChoiceValue(trackReference?.name || trackReference?.title || '');
    if (!referenceTitle) return null;

    const dedupedCandidates = [];
    const seen = new Set();
    const databases = [db];
    const supplementalDbPaths = [
        path.join(__dirname, '..', 'database.json'),
        path.join(__dirname, 'database.json')
    ];

    supplementalDbPaths
        .filter((dbPath, index, paths) => paths.indexOf(dbPath) === index)
        .filter((dbPath) => dbPath !== DB_PATH && fs.existsSync(dbPath))
        .forEach((dbPath) => {
            try {
                databases.push(JSON.parse(fs.readFileSync(dbPath, 'utf8')));
            } catch (error) {
                console.warn(`Track lookup supplemental DB warning (${dbPath}):`, error.message);
            }
        });

    databases.forEach((currentDb) => {
        const users = Array.isArray(currentDb?.users) ? currentDb.users : [];
        users.forEach((user) => {
            const playlistTracks = Array.isArray(user?.playlists)
                ? user.playlists.flatMap((playlist) => Array.isArray(playlist?.tracks) ? playlist.tracks : [])
                : [];
            const candidateGroups = [
                ...(Array.isArray(user?.history) ? user.history : []),
                ...(Array.isArray(user?.recentlyPlayed) ? user.recentlyPlayed : []),
                ...(Array.isArray(user?.likedTracks) ? user.likedTracks : []),
                ...playlistTracks
            ];

            candidateGroups.forEach((item) => {
                const videoId = extractVideoId(item);
                if (!videoId) return;
                if (isBlockedVideoForTrack(trackReference, videoId)) return;

                const titleKey = normalizeComparisonValue(item?.title || item?.name || '');
                const artistKey = normalizeComparisonValue(item?.artist || item?.uploaderName || '');
                const identity = `${videoId}:${titleKey}:${artistKey}`;
                if (!titleKey || seen.has(identity)) return;

                seen.add(identity);
                dedupedCandidates.push({
                    title: item?.title || item?.name || '',
                    uploaderName: item?.artist || item?.uploaderName || '',
                    videoId,
                    thumbnail: item?.thumb || item?.thumbnail || ''
                });
            });
        });
    });
    const safeMatches = dedupedCandidates
        .map((candidate) => analyzeYTCandidate(candidate, trackReference))
        .filter((analysis) => Number.isFinite(analysis.score))
        .sort(compareCandidateAnalyses)
        .filter((analysis) => isSafeStoredTrackAnalysis(analysis))
        .map((analysis) => analysis.candidate)
        .slice(0, 8);

    return safeMatches;
};

const isDefinitiveYTCandidate = (analysis) => Boolean(
    analysis &&
    analysis.primaryArtistMatch &&
    (analysis.exactTitleMatch || analysis.titleCoverage >= 1) &&
    analysis.score >= 135
);

const formatSpotifyTrackPayload = (track, fallbackImage = '') => {
    const artists = Array.isArray(track.artists) ? track.artists : [];
    const artistNames = artists.map(a => normalizeChoiceValue(a?.name || a));

    // Ensure we use the best available Spotify image
    const spotifyImage = track.imageUrl || track.album?.imageUrl || (Array.isArray(track.album?.images) && track.album.images.length > 0 ? track.album.images[0].url : '');

    return {
        id: track.spotifyId || track.id,
        videoId: null, // No video ID yet (Lazy resolution at playback)
        title: track.name || 'Sans titre',
        artist: artistNames.join(', ') || 'Artiste inconnu',
        album: track.album?.name || '',
        thumbnail: spotifyImage || track.thumb || fallbackImage || '',
        duration: Math.round((track.durationMs || track.duration_ms || 0) / 1000),
        spotifyId: track.spotifyId || track.id,
        source: 'spotify',
        artists: artists
    };
};

const mapSpotifyTracksToPlayablePayload = async (tracks, fallbackImage = '') => {
    return (tracks || []).map((track) => formatSpotifyTrackPayload(track, fallbackImage));
};

const mergePlayableItems = (...groups) => {
    const mergedItems = [];
    const seenVideoIds = new Set();
    const seenSpotifyIds = new Set();

    groups.flat().forEach((item) => {
        const videoId = extractVideoId(item);
        const spotifyId = normalizeChoiceValue(item?.spotifyId || item?.spotify?.spotifyId || '');

        // In the new "Lazy" world, we allow items with NO videoId if they have a spotifyId
        if (!videoId && !spotifyId) return;

        // Deduplication
        if (videoId && seenVideoIds.has(videoId)) return;
        if (spotifyId && seenSpotifyIds.has(spotifyId)) {
            // Priority: If we already saw this Spotify ID but the new item has better quality (Spotify source), swap it?
            // For now, first one wins, and usually Spotify items come first in our routes.
            return;
        }

        if (videoId) seenVideoIds.add(videoId);
        if (spotifyId) seenSpotifyIds.add(spotifyId);
        
        mergedItems.push({ ...item, videoId: videoId || null });
    });

    return mergedItems;
};

const mergeSpotifyTracks = (...groups) => {
    const mergedTracks = [];
    const seen = new Set();

    groups.flat().forEach((track) => {
        const spotifyId = normalizeChoiceValue(track?.spotifyId || track?.id || '');
        const identity = spotifyId || `${normalizeChoiceValue(track?.name || '')}:${(track?.artists || []).map((artist) => normalizeChoiceValue(artist?.name || artist)).join('|')}`;
        if (!identity || seen.has(identity)) return;
        seen.add(identity);
        mergedTracks.push(track);
    });

    return mergedTracks;
};

const getArtistSpotifyAlbumTrackFallback = async (profile) => {
    const artistId = normalizeChoiceValue(profile?.artist?.spotifyId || '');
    const artistName = normalizeChoiceValue(profile?.artist?.name || '');
    const discography = profile?.discography || {};

    if (!artistId && !artistName) {
        return [];
    }

    const albumCandidates = [
        ...(Array.isArray(discography.popular) ? discography.popular : []),
        ...(Array.isArray(discography.albums) ? discography.albums : []),
        ...(Array.isArray(discography.singles) ? discography.singles : [])
    ]
        .filter((album) => normalizeChoiceValue(album?.spotifyId || ''))
        .filter((album, index, items) => {
            const currentId = normalizeChoiceValue(album.spotifyId || '');
            return items.findIndex((candidate) => normalizeChoiceValue(candidate?.spotifyId || '') === currentId) === index;
        })
        .slice(0, 5);

    if (!albumCandidates.length) {
        return [];
    }

    const albumResults = await Promise.allSettled(
        albumCandidates.map((album) => spotify.getAlbum(album.spotifyId))
    );

    const spotifyTracks = [];
    const seenTrackIds = new Set();

    albumResults.forEach((result) => {
        if (result.status !== 'fulfilled' || !Array.isArray(result.value?.tracks)) return;

        result.value.tracks.forEach((track) => {
            const trackArtists = Array.isArray(track?.artists) ? track.artists : [];
            const belongsToArtist = trackArtists.some((artist) => {
                const trackArtistId = normalizeChoiceValue(artist?.spotifyId || '');
                const trackArtistName = normalizeChoiceValue(artist?.name || '');
                return (artistId && trackArtistId === artistId)
                    || (artistName && normalizeComparisonValue(trackArtistName) === normalizeComparisonValue(artistName));
            });

            if (!belongsToArtist) return;

            const trackId = normalizeChoiceValue(track?.spotifyId || `${track?.name || ''}:${track?.album?.spotifyId || ''}`);
            if (!trackId || seenTrackIds.has(trackId)) return;

            seenTrackIds.add(trackId);
            spotifyTracks.push(track);
        });
    });

    return spotifyTracks.slice(0, 10);
};

const getPreferenceFallbackRecommendations = async (preferences) => {
    if (!spotify.hasSpotifyConfig()) return [];

    try {
        const preferenceArtists = Array.isArray(preferences?.artists)
            ? preferences.artists
            : [];
        const artistSeeds = (preferences?.artists || [])
            .map((artist) => artist.spotifyId)
            .filter(Boolean)
            .slice(0, 5);

        // Map raw genres (e.g. "Rap") to Spotify canonical seeds (e.g. "hip-hop")
        const genreSeeds = await buildSpotifyGenreSeeds(preferences?.genres || [], artistSeeds.length);

        let spotifyTracks = [];

        if (artistSeeds.length === 0 && genreSeeds.length === 0) {
            spotifyTracks = await spotify.getTopTracks('FR', { limit: 20 });
        } else {
            spotifyTracks = await spotify.getRecommendations({
                seedArtists: artistSeeds.slice(0, 3),
                seedGenres: genreSeeds,
                limit: 20
            });
        }

        if (spotifyTracks.length < 6 && preferenceArtists.length > 0) {
            const artistTrackResults = await Promise.allSettled(
                preferenceArtists.slice(0, 4).map(async (artist) => {
                    const spotifyId = normalizeChoiceValue(artist?.spotifyId || '');
                    const artistName = normalizeChoiceValue(artist?.name || '');

                    if (spotifyId) {
                        const topTracks = await spotify.getArtistTopTracks(spotifyId, { artistName });
                        if (topTracks.length) {
                            return topTracks;
                        }
                    }

                    if (!artistName) return [];

                    const searchedTracks = await spotify.searchTracks(artistName, { limit: 10 });
                    return searchedTracks.filter((track) => {
                        const artists = Array.isArray(track?.artists) ? track.artists : [];
                        return artists.some((trackArtist) => (
                            normalizeComparisonValue(trackArtist?.name || trackArtist) === normalizeComparisonValue(artistName)
                        ));
                    });
                })
            );

            spotifyTracks = mergeSpotifyTracks(
                spotifyTracks,
                ...artistTrackResults.map((result) => result.status === 'fulfilled' ? result.value : [])
            );
        }

        if (spotifyTracks.length < 6) {
            const chartTracks = await spotify.getTopTracks('FR', { limit: 20 });
            spotifyTracks = mergeSpotifyTracks(spotifyTracks, chartTracks);
        }

        return await mapSpotifyTracksToPlayablePayload(spotifyTracks.slice(0, 20));
    } catch (err) {
        console.error('Spotify fallback recommendations error:', err);
        return [];
    }
};



// --- Helper: Get client IP ---
// Client IP helper moved to top


// --- Anti-VPN Check via ip-api.com (free, no key) ---
const checkVPN = (ip) => {
    return new Promise((resolve) => {
        // Skip for localhost/private IPs
        if (ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '::1') {
            return resolve({ isVPN: false });
        }
        const url = `http://ip-api.com/json/${ip}?fields=status,proxy,hosting,isp,org`;
        const req = http.get(url, { timeout: 5000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    const isVPN = result.proxy === true || result.hosting === true;
                    console.log(`🛡️ VPN Check [${ip}]: proxy=${result.proxy}, hosting=${result.hosting}, isp=${result.isp} → ${isVPN ? '🚫 BLOCKED' : '✅ OK'}`);
                    resolve({ isVPN, details: result });
                } catch { resolve({ isVPN: false }); }
            });
        });
        req.on('error', () => resolve({ isVPN: false }));
        req.on('timeout', () => { req.destroy(); resolve({ isVPN: false }); });
    });
};

// --- HTTP Helpers ---
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (Apple) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
];

const fetchYouTube = (url, headers = {}, redirectCount = 0) => {
    if (redirectCount > 5) return Promise.reject(new Error('Trop de redirections'));
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    return new Promise((resolve, reject) => {
        const options = {
            headers: { 
                'User-Agent': ua, 
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8', 
                'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3', 
                'Referer': 'https://www.google.com/',
                ...headers 
            },
            timeout: 10000, rejectUnauthorized: false
        };
        const req = https.get(url, options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(fetchYouTube(res.headers.location, headers, redirectCount + 1));
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.on('error', reject);
    });
};

const youtubeVideoMetadataCache = new Map();
const YOUTUBE_METADATA_TTL = 6 * 60 * 60 * 1000;
const trackResolutionCache = new Map();
const TRACK_RESOLUTION_TTL = 12 * 60 * 60 * 1000;

const fetchYouTubeVideoMetadata = async (videoId) => {
    const normalizedVideoId = extractVideoId({ videoId });
    if (!normalizedVideoId) return null;

    const cached = youtubeVideoMetadataCache.get(normalizedVideoId);
    if (cached && (Date.now() - cached.cachedAt) < YOUTUBE_METADATA_TTL) {
        return cached.value;
    }

    const watchUrl = `https://www.youtube.com/watch?v=${normalizedVideoId}`;
    const extractPlayerResponse = (html) => {
        const match = html.match(/var ytInitialPlayerResponse\s*=\s*(\{.*?\});/s)
            || html.match(/ytInitialPlayerResponse\s*=\s*(\{.*?\});/s);
        if (!match) return null;

        try {
            return JSON.parse(match[1]);
        } catch (_) {
            return null;
        }
    };

    let response = await fetchYouTube(watchUrl);
    let playerResponse = extractPlayerResponse(response.body);

    if (!playerResponse && (response.body.includes('consent') || response.body.includes('CONSENT'))) {
        response = await fetchYouTube(watchUrl, {
            'Cookie': 'CONSENT=YES+cb.20240408-01-p0.fr+FX+999; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQwNDA4LjAxX3AxGgJmciACGgYIgJnsBhAB',
            'Referer': 'https://www.youtube.com/'
        });
        playerResponse = extractPlayerResponse(response.body);
    }

    if (!playerResponse?.videoDetails) {
        youtubeVideoMetadataCache.set(normalizedVideoId, {
            cachedAt: Date.now(),
            value: null
        });
        return null;
    }

    const metadata = {
        videoId: normalizedVideoId,
        title: normalizeChoiceValue(playerResponse.videoDetails.title || ''),
        uploaderName: normalizeChoiceValue(playerResponse.videoDetails.author || ''),
        duration: Number.parseInt(playerResponse.videoDetails.lengthSeconds || '0', 10) || 0
    };

    youtubeVideoMetadataCache.set(normalizedVideoId, {
        cachedAt: Date.now(),
        value: metadata
    });

    return metadata;
};

// --- YouTube Scraper (PRIMARY search engine — Piped instances are unreliable) ---
const scrapeYouTube = async (query, { audioHint = true, musicOnly = true } = {}) => {
    const cleanQuery = query.toLowerCase().replace(/\s+(audio|official|lyrics|lyrics|paroles)$/g, '').trim();
    console.log(`🚀 YT Scraper: "${cleanQuery}"`);
    try {
        await new Promise(r => setTimeout(r, 100 + Math.random() * 400)); // Small jitter
        const searchTerms = [cleanQuery, audioHint ? 'audio' : ''].filter(Boolean).join(' ');
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerms)}${musicOnly ? '&sp=EgIQAQ%253D%253D' : ''}`;
        const { status, body } = await fetchYouTube(searchUrl);
        
        const regexes = [
            /var ytInitialData = (\{.*?\});/s,
            /window\["ytInitialData"\] = (\{.*?\});/s,
            /ytInitialData = (\{.*?\});/s
        ];
        
        let match = null;
        for (let r of regexes) {
            match = body.match(r);
            if (match) break;
        }

        if (!match) {
            console.warn(`   YT Scraper: No initial match. status=${status}, bodyLen=${body.length}. Checking consent...`);
            // Handle GDPR consent page
            // Handle GDPR consent page
            if (body.includes('consent') || body.includes('CONSENT')) {
                console.warn('   YT Scraper: Consent page detected, retrying with consent cookie...');
                const retryUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerms)}${musicOnly ? '&sp=EgIQAQ%253D%253D' : ''}`;
                const { status: st2, body: body2 } = await fetchYouTube(retryUrl, {
                    'Cookie': 'CONSENT=YES+cb.20240408-01-p0.fr+FX+999; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQwNDA4LjAxX3AxGgJmciACGgYIgJnsBhAB',
                    'Referer': 'https://www.youtube.com/'
                });
                console.warn(`   YT Scraper: Retry status=${st2}, bodyLen=${body2.length}`);
                for (let r of regexes) {
                    match = body2.match(r);
                    if (match) break;
                }
            }
            if (!match) {
                console.warn(`   YT Scraper: Extract failed! snippet: ${body.substring(0, 500)}`);
                throw new Error('Could not extract ytInitialData from YouTube');
            }
        }
        
        const data = JSON.parse(match[1]);
        const items = [];
        
        // Try multiple content paths (YouTube changes structure sometimes)
        let contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
        
        if (!contents) {
            // Try alternative path
            const sections = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
            for (const section of sections) {
                contents = section?.itemSectionRenderer?.contents;
                if (contents && contents.some(c => c.videoRenderer)) break;
            }
        }
        
        if (!contents) {
            console.warn('   YT Scraper: No video contents found in response');
            return { items: [] };
        }

        for (let item of contents) {
            if (item.videoRenderer) {
                const v = item.videoRenderer;
                if (!v.videoId) continue;
                
                let uploaderUrl = '';
                if (v.ownerText?.runs?.[0]?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url) {
                    uploaderUrl = v.ownerText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url;
                }

                // Parse duration text to seconds
                const durationText = v.lengthText?.simpleText || '0:00';
                const durationParts = durationText.split(':').map(Number);
                let durationSec = 0;
                if (durationParts.length === 3) durationSec = durationParts[0]*3600 + durationParts[1]*60 + durationParts[2];
                else if (durationParts.length === 2) durationSec = durationParts[0]*60 + durationParts[1];

                items.push({
                    title: v.title?.runs?.[0]?.text || 'Untitled',
                    url: `/watch?v=${v.videoId}`,
                    videoId: v.videoId,
                    uploaderName: v.ownerText?.runs?.[0]?.text || 'Unknown Artist',
                    uploaderUrl: uploaderUrl,
                    thumbnail: v.thumbnail?.thumbnails?.slice(-1)[0]?.url || v.thumbnail?.thumbnails?.[0]?.url || '',
                    duration: durationSec,
                    durationText: durationText,
                    views: parseInt(v.viewCountText?.simpleText?.replace(/[^0-9]/g, '') || '0', 10),
                    type: 'stream'
                });
            }
        }
        console.log(`   YT Scraper: ✅ ${items.length} results`);
        return { items };
    } catch (e) {
        console.error('   YT Scraper Error:', e.message);
        return { items: [] };
    }
};

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

// --- Piped API (secondary fallback, with health-check cache) ---
const pipedHealthCache = new Map(); // url -> { healthy: bool, checkedAt: number }
const PIPED_HEALTH_TTL = 10 * 60 * 1000; // 10 minutes

const isPipedHealthy = (url) => {
    const cached = pipedHealthCache.get(url);
    if (!cached) return true; // assume healthy if never checked
    if (Date.now() - cached.checkedAt > PIPED_HEALTH_TTL) return true; // expired, retry
    return cached.healthy;
};

const markPipedHealth = (url, healthy) => {
    pipedHealthCache.set(url, { healthy, checkedAt: Date.now() });
};

const tryPipedFetch = async (queryPath) => {
    let healthyInstances = PIPED_INSTANCES.filter(isPipedHealthy);
    if (healthyInstances.length === 0) {
        // If all marked unhealthy, reset cache and try all
        pipedHealthCache.clear();
        healthyInstances = [...PIPED_INSTANCES];
    }
    
    // Randomize to distribute load
    const shuffled = [...healthyInstances].sort(() => Math.random() - 0.5);

    // Try max 3 instances
    for (let i = 0; i < Math.min(3, shuffled.length); i++) {
        const baseUrl = shuffled[i];
        try {
            const { status, body } = await fetchFull(`${baseUrl}${queryPath}`);
            if (status === 200) {
                const parsed = JSON.parse(body);
                if (parsed && (Array.isArray(parsed.items) || Array.isArray(parsed.audioStreams))) {
                    markPipedHealth(baseUrl, true);
                    return parsed;
                }
            }
            markPipedHealth(baseUrl, false);
        } catch (err) {
            markPipedHealth(baseUrl, false);
        }
    }
    return null;
};

// ═══════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════
const SEARCH_FILTERS = {
    all: 'all',
    music: 'music_songs',
    podcasts: 'music_podcasts'
};

const normalizeSearchFilter = (value) => SEARCH_FILTERS[value] || SEARCH_FILTERS.all;

const fetchSearchItems = async (query, filter = 'music') => {
    if (!query) return [];
    
    // PRIMARY: Try Piped API (faster and bypasses local CAPTCHA)
    try {
        const normalizedFilter = normalizeSearchFilter(filter);
        const filterSegment = normalizedFilter === 'all' ? '' : `&filter=${normalizedFilter}`;
        const pipedData = await tryPipedFetch(`/search?q=${encodeURIComponent(query)}${filterSegment}`);
        if (pipedData && Array.isArray(pipedData.items) && pipedData.items.length > 0) {
            return pipedData.items;
        }
    } catch (err) {
        console.warn('Piped search failed:', err.message);
    }

    // SECONDARY: Fallback to YouTube scraper
    try {
        const data = await scrapeYouTube(query);
        if (data.items && data.items.length > 0) {
            return data.items;
        }
    } catch (err) {
        console.warn('YouTube scraper fallback failed:', err.message);
    }

    return [];
};

const buildTrackResolutionQueries = (trackReference) => {
    const primaryArtist = getTrackPrimaryArtistName(trackReference);
    const title = normalizeChoiceValue(trackReference?.name || trackReference?.title || '');
    const candidateQueries = [
        ...buildSpotifyTrackQueries(trackReference),
        ...buildSearchQueryVariants([primaryArtist, title, 'official video'].filter(Boolean).join(' ')),
        ...buildSearchQueryVariants([primaryArtist, title, 'clip officiel'].filter(Boolean).join(' ')),
        ...buildSearchQueryVariants([primaryArtist, title].filter(Boolean).join(' ')),
        ...buildSearchQueryVariants([title, primaryArtist].filter(Boolean).join(' ')),
        ...buildSearchQueryVariants(title)
    ];

    const seen = new Set();
    return candidateQueries
        .map(normalizeChoiceValue)
        .filter(Boolean)
        .filter((query) => {
            const key = query.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 10);
};

const resolveTrackReferenceToVideo = async (trackReference, { currentVideoId = '' } = {}) => {
    const normalizedTrackReference = buildTrackReferenceFromMetadata({
        spotifyId: trackReference?.spotifyId || '',
        title: trackReference?.name || trackReference?.title || '',
        artist: Array.isArray(trackReference?.artists)
            ? trackReference.artists.map((artist) => normalizeChoiceValue(artist?.name || artist)).filter(Boolean).join(', ')
            : normalizeChoiceValue(trackReference?.artist || ''),
        durationMs: Number.isFinite(trackReference?.durationMs) ? trackReference.durationMs : 0
    });

    if (!normalizedTrackReference?.name) {
        return { videoId: '', resolvedMatch: null, trackReference: normalizedTrackReference };
    }

    const resolutionCacheKey = buildTrackResolutionCacheKey(normalizedTrackReference);
    const cachedResolution = resolutionCacheKey ? trackResolutionCache.get(resolutionCacheKey) : null;
    if (
        cachedResolution
        && (Date.now() - cachedResolution.cachedAt) < TRACK_RESOLUTION_TTL
        && extractVideoId({ videoId: cachedResolution.videoId })
        && !isBlockedVideoForTrack(normalizedTrackReference, cachedResolution.videoId)
    ) {
        return {
            videoId: cachedResolution.videoId,
            resolvedMatch: cachedResolution.resolvedMatch || null,
            trackReference: normalizedTrackReference
        };
    }

    const directOverride = getTrackVideoOverride(normalizedTrackReference);
    if (directOverride?.videoId) {
        if (resolutionCacheKey) {
            trackResolutionCache.set(resolutionCacheKey, {
                cachedAt: Date.now(),
                videoId: directOverride.videoId,
                resolvedMatch: {
                    sourceLabel: 'override',
                    score: Number.POSITIVE_INFINITY,
                    candidate: {
                        videoId: directOverride.videoId,
                        title: normalizedTrackReference.name,
                        uploaderName: getTrackPrimaryArtistName(normalizedTrackReference)
                    }
                }
            });
        }
        return {
            videoId: directOverride.videoId,
            resolvedMatch: {
                sourceLabel: 'override',
                score: Number.POSITIVE_INFINITY,
                candidate: {
                    videoId: directOverride.videoId,
                    title: normalizedTrackReference.name,
                    uploaderName: getTrackPrimaryArtistName(normalizedTrackReference)
                }
            },
            trackReference: normalizedTrackReference
        };
    }

    const candidateMap = new Map();
    let resolvedMatch = null;

    const mergeCandidates = (items, sourceLabel, currentQuery) => {
        (items || []).forEach((item) => {
            const candidateVideoId = extractVideoId(item);
            if (!candidateVideoId) return;
            if (isBlockedVideoForTrack(normalizedTrackReference, candidateVideoId)) return;

            const analysis = analyzeYTCandidate(item, normalizedTrackReference);
            if (!Number.isFinite(analysis.score)) return;

            const nextEntry = {
                ...analysis,
                sourceLabel,
                query: currentQuery,
                candidate: {
                    ...item,
                    videoId: candidateVideoId
                }
            };
            const existing = candidateMap.get(candidateVideoId);
            if (!existing || compareCandidateAnalyses(nextEntry, existing) < 0) {
                candidateMap.set(candidateVideoId, nextEntry);
            }
        });

        const currentBest = pickBestYTCandidate(
            Array.from(candidateMap.values()).map((entry) => entry.candidate),
            normalizedTrackReference
        );

        if (currentBest && isDefinitiveYTCandidate(currentBest)) {
            const matchVideoId = extractVideoId(currentBest.candidate);
            resolvedMatch = candidateMap.get(matchVideoId) || currentBest;
        }
    };

    const normalizedCurrentVideoId = extractVideoId({ videoId: currentVideoId });
    if (normalizedCurrentVideoId && !isBlockedVideoForTrack(normalizedTrackReference, normalizedCurrentVideoId)) {
        try {
            const currentMetadata = await fetchYouTubeVideoMetadata(normalizedCurrentVideoId);
            if (currentMetadata?.title) {
                mergeCandidates([{ ...currentMetadata, videoId: normalizedCurrentVideoId }], 'current-video', 'current-video');
            }
        } catch (error) {
            console.warn(`Current video verification failed for ${normalizedCurrentVideoId}:`, error.message);
        }
    }

    const storedTrackMatches = findStoredPlayableTrack(normalizedTrackReference);
    if (Array.isArray(storedTrackMatches) && storedTrackMatches.length) {
        mergeCandidates(storedTrackMatches, 'local-db', 'local-db');

        const storedBestMatch = pickBestYTCandidate(storedTrackMatches, normalizedTrackReference);
        if (storedBestMatch && isSafeResolveAnalysis(storedBestMatch, { sourceLabel: 'local-db' })) {
            const storedVideoId = extractVideoId(storedBestMatch.candidate || {});
            if (storedVideoId) {
                if (resolutionCacheKey) {
                    trackResolutionCache.set(resolutionCacheKey, {
                        cachedAt: Date.now(),
                        videoId: storedVideoId,
                        resolvedMatch: storedBestMatch
                    });
                }

                return {
                    videoId: storedVideoId,
                    resolvedMatch: storedBestMatch,
                    trackReference: normalizedTrackReference
                };
            }
        }
    }

    const queries = buildTrackResolutionQueries(normalizedTrackReference);

    for (const currentQuery of queries.slice(0, 3)) {
        try {
            const { items } = await scrapeYouTube(currentQuery);
            mergeCandidates(items, 'yt-scraper', currentQuery);
            if (resolvedMatch && isSafeResolveAnalysis(resolvedMatch, { sourceLabel: resolvedMatch?.sourceLabel })) {
                break;
            }
        } catch (error) {
            console.error('   YT Scraper failed:', error.message);
        }
    }

    if (!resolvedMatch || !isSafeResolveAnalysis(resolvedMatch, { sourceLabel: resolvedMatch?.sourceLabel })) {
        for (const currentQuery of queries.slice(0, 3)) {
        try {
            const pipedData = await tryPipedFetch(`/search?q=${encodeURIComponent(currentQuery)}&filter=music_videos`);
            mergeCandidates(pipedData?.items || [], 'piped', currentQuery);
                if (resolvedMatch && isSafeResolveAnalysis(resolvedMatch, { sourceLabel: resolvedMatch?.sourceLabel })) {
                    break;
                }
        } catch (error) {
            console.error('   Piped fallback failed:', error.message);
        }
        }
    }

    if (!resolvedMatch || !isSafeResolveAnalysis(resolvedMatch, { sourceLabel: resolvedMatch?.sourceLabel })) {
        for (const currentQuery of queries.slice(0, 2)) {
            try {
                const pipedData = await tryPipedFetch(`/search?q=${encodeURIComponent(currentQuery)}`);
                mergeCandidates(pipedData?.items || [], 'piped-all', currentQuery);
            } catch (error) {
                console.error('   Broad Piped fallback failed:', error.message);
            }

            try {
                const { items } = await scrapeYouTube(currentQuery, { audioHint: false, musicOnly: false });
                mergeCandidates(items, 'yt-broad', currentQuery);
            } catch (error) {
                console.error('   Broad YT fallback failed:', error.message);
            }
        }
    }

    if (!resolvedMatch) {
        const bestMatch = pickBestYTCandidate(
            Array.from(candidateMap.values()).map((entry) => entry.candidate),
            normalizedTrackReference
        );
        if (bestMatch) {
            const matchVideoId = extractVideoId(bestMatch.candidate);
            const candidateEntry = candidateMap.get(matchVideoId) || bestMatch;
            if (isSafeResolveAnalysis(candidateEntry, { sourceLabel: candidateEntry?.sourceLabel })) {
                resolvedMatch = candidateEntry;
            }
        }
    }

    const resolvedVideoId = extractVideoId(resolvedMatch?.candidate || {});
    const verificationQueue = Array.from(candidateMap.values())
        .filter((entry) => (
            extractVideoId(entry?.candidate || {}) === resolvedVideoId
            || isSafeResolveAnalysis(entry, { sourceLabel: entry?.sourceLabel })
        ))
        .sort(compareMostViewedCandidateAnalyses);

    const verifiedCandidates = [];
    for (const candidateEntry of verificationQueue.slice(0, 4)) {
        const candidateVideoId = extractVideoId(candidateEntry?.candidate || {});
        if (!candidateVideoId) continue;

        try {
            const metadata = await fetchYouTubeVideoMetadata(candidateVideoId);
            if (!metadata?.title) continue;

            const verifiedCandidate = {
                ...candidateEntry.candidate,
                ...metadata
            };
            const verifiedAnalysis = analyzeYTCandidate(verifiedCandidate, normalizedTrackReference);
            const verifiedEntry = {
                ...candidateEntry,
                ...verifiedAnalysis,
                candidate: verifiedCandidate
            };

            if (!isSafeResolveAnalysis(verifiedEntry, { sourceLabel: verifiedEntry?.sourceLabel })) {
                continue;
            }

            verifiedCandidates.push(verifiedEntry);
        } catch (verificationError) {
            console.warn(`   Candidate verification failed for ${candidateVideoId}:`, verificationError.message);
        }
    }

    if (verifiedCandidates.length) {
        verifiedCandidates.sort(compareMostViewedCandidateAnalyses);
        resolvedMatch = verifiedCandidates[0];
    } else if (!resolvedMatch || !isSafeResolveAnalysis(resolvedMatch, { sourceLabel: resolvedMatch?.sourceLabel })) {
        resolvedMatch = null;
    }

    if (resolutionCacheKey && resolvedMatch?.candidate) {
        const resolvedVideoIdForCache = extractVideoId(resolvedMatch.candidate);
        if (resolvedVideoIdForCache) {
            trackResolutionCache.set(resolutionCacheKey, {
                cachedAt: Date.now(),
                videoId: resolvedVideoIdForCache,
                resolvedMatch
            });
        }
    }

    return {
        videoId: extractVideoId(resolvedMatch?.candidate || {}),
        resolvedMatch,
        trackReference: normalizedTrackReference
    };
};

// ─── Music Search ───


// Middleware setup moved to top


// Middlewares moved to top


// ═══════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════

app.get('/api/setup/status', (req, res) => {
    const db = getDB();
    res.json({
        required: isSetupRequired(db),
        users: db.users.length,
        spotifyEnabled: spotify.hasSpotifyConfig()
    });
});

app.post('/api/setup/owner', async (req, res) => {
    const { username, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!username || !normalizedEmail || !password) {
        return res.status(400).json({ error: 'Pseudo, email et mot de passe sont requis.' });
    }
    if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ error: 'Email invalide.' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ error: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caracteres.` });
    }
    if (username.length < 2 || username.length > 24) {
        return res.status(400).json({ error: 'Le pseudo doit faire entre 2 et 24 caracteres.' });
    }

    const db = getDB();
    if (!isSetupRequired(db)) {
        return res.status(409).json({ error: 'NeonWave est deja configure.' });
    }

    const clientIP = getClientIP(req);
    const owner = {
        id: createUserId('owner'),
        username: username.trim(),
        email: normalizedEmail,
        password: await hashPassword(password),
        role: 'OWNER',
        banned: false,
        lastIP: clientIP,
        createdAt: new Date().toISOString(),
        history: [],
        favorites: [],
        likedTracks: [],
        playlists: [],
        localTracks: [],
        sharedPlaylists: [],
        ...createDefaultMusicState()
    };

    db.users.push(owner);
    db.setupCompleted = true;
    saveDB(db);

    console.log(`Initial owner created: ${owner.email} (${clientIP})`);
    res.json(issueAuthSession(res, owner, { rememberMe: true }));
});

// --- Register (open) ---
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) return res.status(400).json({ error: 'Email invalide.' });
    if (password && password.length < MIN_PASSWORD_LENGTH) return res.status(400).json({ error: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caracteres.` });
    if (!username || !email || !password) return res.status(400).json({ error: 'Tous les champs sont requis.' });
    if (username.length < 2 || username.length > 24) return res.status(400).json({ error: 'Le pseudo doit faire entre 2 et 24 caractères.' });

    const db = getDB();
    if (isSetupRequired(db)) {
        return res.status(403).json({ error: 'Configuration initiale requise avant les inscriptions.' });
    }
    if (!PUBLIC_REGISTRATION_ENABLED) {
        return res.status(403).json({ error: 'Les inscriptions publiques sont fermees.' });
    }
    if (db.users.find(u => u.email.toLowerCase() === normalizedEmail)) {
        return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    }

    // Check IP ban
    const clientIP = getClientIP(req);
    if (db.bannedIPs.includes(clientIP)) {
        return res.status(403).json({ error: 'Votre adresse IP a été bannie.' });
    }

    // Anti-VPN check
    const vpnCheck = await checkVPN(clientIP);
    if (vpnCheck.isVPN) {
        return res.status(403).json({ error: 'VPN/Proxy détecté. Désactivez votre VPN pour créer un compte.' });
    }

    const newUser = {
        id: createUserId('user'),
        username: username.trim(),
        email: normalizedEmail,
        password: await hashPassword(password),
        role: 'USER',
        banned: false,
        lastIP: clientIP,
        createdAt: new Date().toISOString(),
        history: [],
        favorites: [],
        likedTracks: [],
        playlists: [],
        localTracks: [],
        sharedPlaylists: [],
        ...createDefaultMusicState()
    };

    db.users.push(newUser);
    saveDB(db);

    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '30d' });
    
    // Secure Cookie - Default 7 days after register
    res.cookie('token', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'Lax', 
        maxAge: 7 * 24 * 60 * 60 * 1000 
    });

    console.log(`✅ New user registered: ${newUser.email} (${clientIP})`);
    res.json({ token, user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role } });
});

// --- Login ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const db = getDB();
    if (isSetupRequired(db)) {
        return res.status(403).json({ error: 'Configuration initiale requise.' });
    }
    const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
    
    if (!user) return res.status(401).json({ error: 'Identifiants invalides.' });

    const passwordWasHashed = isPasswordHash(user.password);
    const isMatch = await verifyPassword(password, user.password);

    if (isMatch && !passwordWasHashed) {
        user.password = await hashPassword(password);
        saveDB(db);
        console.log(`🛡️  Account upgraded to bcrypt: ${user.email}`);
    }

    if (!isMatch) return res.status(401).json({ error: 'Identifiants invalides.' });

    // Check if banned
    if (user.banned) return res.status(403).json({ error: 'Votre compte a été banni.' });

    const clientIP = getClientIP(req);

    // Check IP ban
    if (db.bannedIPs.includes(clientIP)) {
        return res.status(403).json({ error: 'Votre adresse IP a été bannie.' });
    }

    // Anti-VPN check
    const vpnCheck = await checkVPN(clientIP);
    if (vpnCheck.isVPN) {
        return res.status(403).json({ error: 'VPN/Proxy détecté. Désactivez votre VPN pour vous connecter.' });
    }

    // Update last IP
    user.lastIP = clientIP;
    saveDB(db);

    const { rememberMe } = req.body;
    const expiresIn = rememberMe ? '30d' : '7d';
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn });
    
    // Set cookie age: 30 days if rememberMe, else 7 days (standard)
    const maxAge = (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000;

    res.cookie('token', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', // Use secure cookies only in production (HTTPS)
        sameSite: 'Lax', // More lenient than 'Strict' for development
        maxAge: maxAge
    });

    console.log(`🔑 Login: ${user.email} (${clientIP}) [RememberMe: ${!!rememberMe}]`);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
});

// --- Get Current User ---
app.get('/api/auth/me', authenticate, (req, res) => {
    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Compte introuvable' });
    
    res.json({ 
        user: { 
            id: user.id, 
            username: user.username, 
            email: user.email, 
            role: user.role 
        } 
    });
});

// ═══════════════════════════════════════════════════════════════
app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax'
    });
    res.json({ success: true });
});

// MUSIC ROUTES
// ═══════════════════════════════════════════════════════════════

app.get('/api/music/search', authenticate, async (req, res) => {
    const query = normalizeChoiceValue(req.query.q || '');
    const filter = req.query.filter || 'all';
    const searchQueries = buildSearchQueryVariants(query);
    console.log(`🔍 Search: ${query} (filter: ${filter})`);
    
    try {
        let spotifyItems = [];
        let spotifyTracks = [];
        if (spotify.hasSpotifyConfig() && (filter === 'all' || filter === 'music')) {
            // Priority: Spotify Search
            console.log('   Using Spotify search priority...');
            for (const currentQuery of searchQueries) {
                try {
                    const currentTracks = await spotify.searchTracks(currentQuery, { limit: 10 });
                    spotifyTracks = mergeSpotifyTracks(spotifyTracks, currentTracks);
                    if (spotifyTracks.length >= 12) {
                        break;
                    }
                } catch (spotifyError) {
                    console.warn(`   Spotify variant search failed for "${currentQuery}":`, spotifyError.message);
                }
            }
            spotifyItems = await mapSpotifyTracksToPlayablePayload(spotifyTracks.slice(0, 12));
        }

        // Fallback: Piped/YouTube search
        console.log('   Using Piped/YouTube fallback search...');
        const fallbackFilter = filter === 'all' ? 'music' : filter;
        let fallbackItems = [];
        for (const currentQuery of searchQueries) {
            try {
                const variantItems = await fetchSearchItems(currentQuery, fallbackFilter);
                fallbackItems = mergePlayableItems(fallbackItems, variantItems);
                if (fallbackItems.length >= 12) {
                    break;
                }
            } catch (fallbackError) {
                console.warn(`   Fallback variant search failed for "${currentQuery}":`, fallbackError.message);
            }
        }
        const items = mergePlayableItems(spotifyItems, fallbackItems).slice(0, 18);
        res.json({
            items,
            filter: normalizeSearchFilter(filter),
            source: spotifyItems.length && fallbackItems.length
                ? 'hybrid'
                : spotifyItems.length
                    ? 'spotify'
                    : 'piped'
        });
    } catch (err) {
        console.error('Final search error:', err);
        res.status(500).json({ error: 'Service indisponible. Réessayez plus tard.' });
    }
});

app.post('/api/music/history', authenticate, (req, res) => {
    const track = req.body;
    if (!track?.videoId) return res.status(400).json({ error: 'Track invalide.' });
    trackUserHistory(req.user.id, track);
    res.json({ success: true });
});

app.get('/api/user/recently-played', authenticate, (req, res) => {
    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    res.json(user?.recentlyPlayed || []);
});

app.get('/api/music/recommendations/daily-mix', authenticate, async (req, res) => {
    try {
        const db = getDB();
        const user = db.users.find(u => u.id === req.user.id);
        if (!user) return res.status(404).json({ error: 'User non trouvé' });

        const hour = new Date().getHours();
        let moodGenres = [];
        let mixName = "Mix du Jour";

        if (hour >= 5 && hour < 11) {
            moodGenres = ['pop', 'acoustic', 'afrobeat'];
            mixName = "Mix Matinal";
        } else if (hour >= 11 && hour < 17) {
            moodGenres = ['hip-hop', 'rap', 'trap'];
            mixName = "Mix Énergie";
        } else if (hour >= 17 && hour < 22) {
            moodGenres = ['r-n-b', 'soul', 'jazz', 'dancehall'];
            mixName = "Mix Chill du Soir";
        } else {
            moodGenres = ['ambient', 'lo-fi', 'deep-house'];
            mixName = "Mix Nocturne";
        }

        // Mix user preferences with time mood
        const userGenres = (user.musicPreferences?.genres || []).map(g => g.toLowerCase());
        const seeds = [...new Set([...moodGenres, ...userGenres.slice(0, 2)])];

        const spotifyTracks = await spotify.getRecommendations({ seedGenres: seeds, limit: 12 });
        const items = await mapSpotifyTracksToPlayablePayload(spotifyTracks);

        res.json({ items, title: mixName });
    } catch (err) {
        console.error('Daily mix error:', err);
        res.status(500).json({ error: 'Impossible de générer le mix.' });
    }
});

app.get('/api/music/trending', authenticate, async (req, res) => {
    try {
        if (!spotify.hasSpotifyConfig()) {
            return res.json({ items: [] });
        }

        // Get Top Tracks or Featured Playlists from Spotify
        const spotifyTracks = await spotify.getTopTracks('FR', { limit: 12 });
        const items = await mapSpotifyTracksToPlayablePayload(spotifyTracks);

        res.json({
            items,
            title: "Le Top du Moment — NeonWave",
            spotifyEnabled: true
        });
    } catch (err) {
        console.error('Trending Spotify error:', err);
        res.status(500).json({ error: 'Impossible de charger les tendances.' });
    }
});

app.get('/api/music/recommendations/discovery', authenticate, async (req, res) => {
    try {
        const db = getDB();
        const user = db.users.find(u => u.id === req.user.id);
        if (!user) return res.status(404).json({ error: 'User non trouvé' });

        const history = user.recentlyPlayed || [];
        const trackSeeds = history
            .filter(t => t.spotifyId) // only tracks that came from Spotify resolve
            .slice(0, 3)
            .map(t => t.spotifyId);

        const artistSeeds = (user.musicPreferences?.artists || [])
            .map(a => a.spotifyId)
            .filter(Boolean)
            .slice(0, 2);

        const spotifyTracks = await spotify.getRecommendations({ 
            seedTracks: trackSeeds, 
            seedArtists: artistSeeds,
            limit: 12 
        });
        const items = await mapSpotifyTracksToPlayablePayload(spotifyTracks);

        res.json({ items, title: "Découvertes Hebdomadaires" });
    } catch (err) {
        console.error('Discovery error:', err);
        res.status(500).json({ error: 'Découvertes indisponibles.' });
    }
});

app.get('/api/spotify/search', authenticate, async (req, res) => {
    try {
        const query = normalizeChoiceValue(req.query.q || '');
        const filter = normalizeChoiceValue(req.query.filter || 'all').toLowerCase();

        if (query.length < 2) {
            return res.json({ items: [], filter, spotifyEnabled: spotify.hasSpotifyConfig() });
        }

        if (filter === 'podcasts') {
            return res.json({ items: [], filter, spotifyEnabled: spotify.hasSpotifyConfig() });
        }

        let prioritizedTracks = [];
        const bestArtistMatch = await spotify.findBestArtistMatch(query, { limit: 8 });
        const isExactArtistQuery = bestArtistMatch
            && normalizeComparisonValue(bestArtistMatch.name) === normalizeComparisonValue(query);

        if (isExactArtistQuery) {
            try {
                const artistProfile = await spotify.getArtistProfile(bestArtistMatch.spotifyId, { name: bestArtistMatch.name });
                prioritizedTracks = Array.isArray(artistProfile?.topTracks) ? artistProfile.topTracks : [];
            } catch (artistProfileError) {
                console.warn('Spotify search artist-priority warning:', artistProfileError);
            }
        }

        const searchedTracks = await spotify.searchTracks(query, { limit: 10 });
        const filteredTracks = isExactArtistQuery
            ? searchedTracks.filter((track) => (track.artists || []).some((artist) => {
                const artistId = normalizeChoiceValue(artist?.spotifyId || artist?.id || '');
                const artistName = normalizeChoiceValue(artist?.name || artist);
                return artistId === bestArtistMatch.spotifyId
                    || normalizeComparisonValue(artistName) === normalizeComparisonValue(bestArtistMatch.name);
            }))
            : searchedTracks;

        const spotifyTracks = mergeSpotifyTracks(
            prioritizedTracks,
            filteredTracks
        ).slice(0, 10);
        const items = await mapSpotifyTracksToPlayablePayload(spotifyTracks);

        res.json({
            items,
            filter,
            spotifyEnabled: spotify.hasSpotifyConfig()
        });
    } catch (error) {
        console.error('Spotify search error:', error);
        res.status(error.status || 500).json({ error: getSpotifyClientError(error, 'Recherche Spotify impossible.') });
    }
});

app.get('/api/spotify/search-albums', authenticate, async (req, res) => {
    try {
        const query = normalizeChoiceValue(req.query.q || '');
        if (query.length < 2) {
            return res.json({ items: [] });
        }

        const items = await spotify.searchAlbums(query, { limit: 10 });
        res.json({ items, spotifyEnabled: spotify.hasSpotifyConfig() });
    } catch (error) {
        console.error('Spotify album search error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Recherche album impossible.' });
    }
});

app.get('/api/spotify/albums/:id', authenticate, async (req, res) => {
    try {
        const albumId = normalizeChoiceValue(req.params.id || '');
        if (!albumId) {
            return res.status(400).json({ error: 'Album Spotify invalide.' });
        }

        const album = await spotify.getAlbum(albumId);
        const tracks = await mapSpotifyTracksToPlayablePayload(album.tracks || [], album.imageUrl || '');

        res.json({
            item: {
                ...album,
                tracks
            },
            spotifyEnabled: spotify.hasSpotifyConfig()
        });
    } catch (error) {
        console.error('Spotify album details error:', error);
        res.status(error.status || 500).json({ error: getSpotifyClientError(error, 'Impossible de charger cet album.') });
    }
});

app.get('/api/music/resolve/:spotifyId', authenticate, async (req, res) => {
    const spotifyId = req.params.spotifyId;
    console.log(`🔍 Resolving Spotify track: ${spotifyId}`);

    try {
        const requestTitle = normalizeChoiceValue(req.query.title || '');
        const requestArtist = normalizeChoiceValue(req.query.artist || '');
        const requestDurationMs = Number.parseInt(req.query.durationMs || '0', 10) || 0;

        let track = null;
        let resolvedArtistLabel = requestArtist;

        if (requestTitle) {
            track = {
                spotifyId,
                name: requestTitle,
                artists: requestArtist ? requestArtist.split(',').map((artistName) => ({ name: normalizeChoiceValue(artistName) })).filter((artist) => artist.name) : [],
                durationMs: requestDurationMs
            };
        } else {
            track = await spotify.getTrack(spotifyId);

            if (!track && requestTitle && requestArtist) {
                console.warn(`⚠️ Spotify API failed for ${spotifyId}. Using metadata fallback.`);
                track = {
                    spotifyId,
                    name: requestTitle,
                    artists: [{ name: requestArtist }],
                    durationMs: requestDurationMs
                };
            }
        }

        if (!track) return res.status(404).json({ error: 'Morceau introuvable sur Spotify.' });

        if (Array.isArray(track.artists) && track.artists.length) {
            resolvedArtistLabel = track.artists.map((artist) => normalizeChoiceValue(artist?.name || artist)).filter(Boolean).join(', ');
        }

        const trackReference = buildTrackReferenceFromMetadata({
            spotifyId,
            title: track.name || requestTitle || '',
            artist: resolvedArtistLabel || requestArtist || '',
            durationMs: Number.isFinite(track.durationMs) ? track.durationMs : requestDurationMs
        });
        const { videoId: resolvedVideoId, resolvedMatch, trackReference: normalizedTrack } = await resolveTrackReferenceToVideo(trackReference, {
            currentVideoId: req.query.currentVideoId || ''
        });

        if (!resolvedVideoId) {
            console.warn(`❌ No stream found for ${normalizedTrack.name} by ${resolvedArtistLabel}`);
            return res.status(404).json({ error: 'Aucun flux trouvé.' });
        }

        console.log(`Resolved ${normalizedTrack.name} -> ${resolvedVideoId} via ${resolvedMatch?.sourceLabel || 'unknown'} (score: ${resolvedMatch?.score || 'n/a'})`);
        return res.json({
            videoId: resolvedVideoId,
            title: normalizedTrack.name || track.name || requestTitle || 'Sans titre',
            artist: resolvedArtistLabel || requestArtist || 'Artiste inconnu',
            duration: Math.round((normalizedTrack.durationMs || track.durationMs || 0) / 1000)
        });
    } catch (err) {
        console.error('Resolution error:', err);
        res.status(500).json({ error: 'Erreur lors de la résolution du morceau.' });
    }
});

app.get('/api/music/resolve-by-metadata', authenticate, async (req, res) => {
    const title = normalizeChoiceValue(req.query.title || '');
    const artist = normalizeChoiceValue(req.query.artist || '');
    const durationMs = Number.parseInt(req.query.durationMs || '0', 10) || 0;

    if (!title) {
        return res.status(400).json({ error: 'Titre requis.' });
    }

    try {
        const trackReference = buildTrackReferenceFromMetadata({
            title,
            artist,
            durationMs
        });
        const { videoId, resolvedMatch, trackReference: normalizedTrack } = await resolveTrackReferenceToVideo(trackReference, {
            currentVideoId: req.query.currentVideoId || ''
        });

        if (!videoId) {
            console.warn(`❌ No metadata stream found for ${normalizedTrack.name} by ${artist}`);
            return res.status(404).json({ error: 'Aucun flux trouvé.' });
        }

        console.log(`Resolved metadata ${normalizedTrack.name} -> ${videoId} via ${resolvedMatch?.sourceLabel || 'unknown'} (score: ${resolvedMatch?.score || 'n/a'})`);
        return res.json({
            videoId,
            title: normalizedTrack.name || title,
            artist: artist || getTrackPrimaryArtistName(normalizedTrack) || 'Artiste inconnu',
            duration: Math.round((normalizedTrack.durationMs || durationMs || 0) / 1000)
        });
    } catch (error) {
        console.error('Metadata resolution error:', error);
        return res.status(500).json({ error: 'Erreur lors de la résolution du morceau.' });
    }
});

const streamUrlCache = new Map(); // videoId -> { url, expires }

app.get('/api/music/streams/:id', authenticate, async (req, res) => {
    const videoId = req.params.id;
    console.log(`🎵 Stream request for: ${videoId}`);

    const db = getDB();
    const p = db.users.map(u => u.history).flat().find(h => h?.videoId === videoId);
    if (p) trackUserHistory(req.user.id, p);

    try {
        let audioUrl = '';
        const cached = streamUrlCache.get(videoId);
        if (cached && cached.expires > Date.now()) {
            audioUrl = cached.url;
            console.log(`💾 Serving cached stream URL for: ${videoId}`);
        } else {
            console.log(`🎬 Resolving YouTube stream via yt-dlp for: ${videoId}`);
            audioUrl = await new Promise((resolve, reject) => {
                const { exec } = require('child_process');
                exec(`python -m yt_dlp -g -f bestaudio "${videoId}"`, (err, stdout, stderr) => {
                    if (err) {
                        return reject(new Error(stderr || err.message));
                    }
                    resolve(stdout.trim());
                });
            });
            
            // Parse expire parameter
            const urlObj = new URL(audioUrl);
            const expireParam = urlObj.searchParams.get('expire');
            const expires = expireParam ? (parseInt(expireParam, 10) * 1000) - 60000 : Date.now() + 3600000;
            streamUrlCache.set(videoId, { url: audioUrl, expires });
            console.log(`✅ YouTube stream extracted and cached (expires in ${Math.round((expires - Date.now()) / 1000)}s)`);
        }

        // Set up headers to forward range request
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
        if (req.headers.range) {
            headers['Range'] = req.headers.range;
            console.log(`⏩ Forwarding Range request: ${req.headers.range}`);
        }

        const proxyReq = https.get(audioUrl, { headers }, (proxyRes) => {
            res.status(proxyRes.statusCode);
            if (proxyRes.headers['content-type']) res.setHeader('Content-Type', proxyRes.headers['content-type']);
            if (proxyRes.headers['content-length']) res.setHeader('Content-Length', proxyRes.headers['content-length']);
            if (proxyRes.headers['content-range']) res.setHeader('Content-Range', proxyRes.headers['content-range']);
            if (proxyRes.headers['accept-ranges']) res.setHeader('Accept-Ranges', proxyRes.headers['accept-ranges']);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error('Proxy request error:', err);
            if (!res.headersSent) res.status(500).send('Stream proxy failed');
        });

    } catch (err) {
        console.error('YouTube stream resolve failed:', err.message);
        if (!res.headersSent) res.status(500).json({ error: 'Stream error - ' + err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// USER DATA ROUTES
// ═══════════════════════════════════════════════════════════════

app.get('/api/spotify/artists/defaults', authenticate, async (req, res) => {
    try {
        const items = await spotify.getDefaultArtists(MUSIC_ARTIST_OPTIONS);
        res.json({ items, spotifyEnabled: spotify.hasSpotifyConfig() });
    } catch (error) {
        console.error('Spotify default artists error:', error);
        res.status(error.status || 500).json({ error: getSpotifyClientError(error, 'Impossible de charger les artistes.') });
    }
});

app.get('/api/spotify/search-artists', authenticate, async (req, res) => {
    try {
        const query = normalizeChoiceValue(req.query.q || '');
        if (query.length < 2) {
            return res.json({ items: [] });
        }

        const items = await spotify.searchArtists(query, { limit: 8 });
        res.json({ items, spotifyEnabled: spotify.hasSpotifyConfig() });
    } catch (error) {
        console.error('Spotify artist search error:', error);
        res.status(error.status || 500).json({ error: getSpotifyClientError(error, 'Recherche artiste impossible.') });
    }
});

app.get('/api/spotify/artist-profile', authenticate, async (req, res) => {
    try {
        const spotifyId = normalizeChoiceValue(req.query.spotifyId || '');
        const name = normalizeChoiceValue(req.query.name || '');
        if (!spotifyId && !name) {
            return res.status(400).json({ error: 'Artiste Spotify invalide.' });
        }

        const profile = await spotify.getArtistProfile(spotifyId, { name });
        let topTracks = await mapSpotifyTracksToPlayablePayload(
            profile.topTracks || [],
            profile.artist?.imageUrl || ''
        );
        const discography = profile.discography || { popular: [], albums: [], singles: [] };
        const appearsOn = Array.isArray(profile.appearsOn) ? profile.appearsOn : [];

        if (!topTracks.length) {
            const fallbackSpotifyTracks = await getArtistSpotifyAlbumTrackFallback(profile);
            if (fallbackSpotifyTracks.length) {
                topTracks = await mapSpotifyTracksToPlayablePayload(
                    fallbackSpotifyTracks,
                    profile.artist?.imageUrl || ''
                );
            }
        }

        res.json({
            item: {
                ...profile,
                topTracks,
                discography,
                appearsOn
            },
            spotifyEnabled: spotify.hasSpotifyConfig()
        });
    } catch (error) {
        console.error('Spotify artist profile error:', error);
        res.status(error.status || 500).json({ error: getSpotifyClientError(error, 'Impossible de charger cet artiste.') });
    }
});







app.get('/api/spotify/artists/:id/related', authenticate, async (req, res) => {
    try {
        const artistId = normalizeChoiceValue(req.params.id || '');
        const fallbackName = normalizeChoiceValue(req.query.name || '');
        const fallbackGenres = typeof req.query.genres === 'string'
            ? req.query.genres.split(',').map(normalizeChoiceValue).filter(Boolean)
            : [];
        const selectedGenres = typeof req.query.selectedGenres === 'string'
            ? req.query.selectedGenres.split(',').map(normalizeChoiceValue).filter(Boolean)
            : [];

        const items = await spotify.getRelatedArtists(artistId, {
            spotifyId: artistId,
            name: fallbackName,
            genres: fallbackGenres,
            selectedGenres
        });

        res.json({ items, spotifyEnabled: spotify.hasSpotifyConfig() });
    } catch (error) {
        console.error('Spotify related artists error:', error);
        res.status(error.status || 500).json({ error: getSpotifyClientError(error, 'Impossible de charger les artistes similaires.') });
    }
});

app.get('/api/user/music-preferences', authenticate, async (req, res) => {
    try {
        const db = getDB();
        const user = getUserById(db, req.user.id);
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

        try {
            const wasSynced = await syncUserSpotifyArtists(user);
            if (wasSynced) {
                saveDB(db);
            }
        } catch (syncError) {
            console.error('Music preferences sync warning:', syncError);
        }

        res.json(getPublicMusicPreferences(user));
    } catch (error) {
        console.error('Music preferences load error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Impossible de charger les preferences.' });
    }
});

app.post('/api/user/music-preferences', authenticate, async (req, res) => {
    try {
        const genres = normalizeFixedChoices(
            req.body?.genres,
            MUSIC_GENRE_MAP,
            'Vous devez choisir exactement 3 styles.',
            'Un ou plusieurs styles sont invalides.',
            'Les 3 styles doivent etre differents.'
        );

        const rawArtists = normalizeArtistSelections(req.body?.artists);
        let artists = rawArtists;

        try {
            artists = await spotify.enrichArtists(rawArtists);
        } catch (enrichError) {
            console.error('Music preferences enrich warning:', enrichError);
        }

        if (spotify.hasSpotifyConfig() && artists.some((artist) => !artist.spotifyId)) {
            throw new Error('Choisissez uniquement des artistes Spotify valides pour lancer vos recommandations.');
        }

        const db = getDB();
        const user = getUserById(db, req.user.id);
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

        ensureUserMusicState(user);
        user.musicPreferences = { genres, artists };
        user.followedArtists = mergeUniqueArtists(user.followedArtists, artists);
        user.musicOnboardingCompleted = true;
        user.musicPreferencesUpdatedAt = new Date().toISOString();

        saveDB(db);
        res.json(getPublicMusicPreferences(user));
    } catch (error) {
        res.status(400).json({ error: error.message || 'Preferences invalides.' });
    }
});

app.post('/api/user/followed-artists/toggle', authenticate, (req, res) => {
    try {
        const artist = normalizeStoredArtist(req.body?.artist);
        if (!artist?.name) {
            return res.status(400).json({ error: 'Artiste invalide.' });
        }

        const db = getDB();
        const user = getUserById(db, req.user.id);
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

        ensureUserMusicState(user);

        const identity = getArtistIdentity(artist);
        const index = user.followedArtists.findIndex((existingArtist) => getArtistIdentity(existingArtist) === identity);
        const isSelectedInPreferences = user.musicPreferences.artists.some((existingArtist) => getArtistIdentity(existingArtist) === identity);

        let followed = false;
        if (index === -1) {
            user.followedArtists = mergeUniqueArtists(user.followedArtists, [artist]);
            followed = true;
        } else if (isSelectedInPreferences) {
            user.followedArtists[index] = normalizeStoredArtist(artist);
            followed = true;
        } else {
            user.followedArtists.splice(index, 1);
            followed = false;
        }

        saveDB(db);
        res.json({
            followed,
            followedArtists: user.followedArtists.map((followedArtist) => ({ ...followedArtist }))
        });
    } catch (error) {
        res.status(400).json({ error: error.message || 'Impossible de modifier l abonnement.' });
    }
});

app.get('/api/user/recommendations', authenticate, async (req, res) => {
    const db = getDB();
    const user = getUserById(db, req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    try {
        try {
            const wasSynced = await syncUserSpotifyArtists(user);
            if (wasSynced) {
                saveDB(db);
            }
        } catch (syncError) {
            console.error('Recommendations sync warning:', syncError);
        }

        const preferences = getPublicMusicPreferences(user);
        if (!preferences.completed) {
            return res.json({ items: [] });
        }

        const artistSeeds = preferences.artists
            .map((artist) => artist.spotifyId || artist.name)
            .filter(Boolean);
        const genreSeeds = preferences.genres || [];

        const artistIds = preferences.artists
            .map((artist) => artist.spotifyId)
            .filter(Boolean);

        let recommendationItems = [];

        if (spotify.hasSpotifyConfig() && artistIds.length > 0) {
            try {
                // Pass user genres to deep recommendations for policing
                const spotifyTracks = await spotify.getDeepArtistRecommendations(artistIds, 20, preferences.genres || []);
                recommendationItems = await mapSpotifyTracksToPlayablePayload(spotifyTracks);
            } catch (spotifyError) {
                console.error('Spotify deep recommendation warning:', spotifyError);
            }
        }

        if (recommendationItems.length < 6) {
            const fallbackItems = await getPreferenceFallbackRecommendations(preferences);
            recommendationItems = mergePlayableItems(recommendationItems, fallbackItems);
        }

        res.json({
            items: recommendationItems.slice(0, 12),
            seeds: {
                artists: artistSeeds,
                genres: genreSeeds
            }
        });
    } catch (error) {
        console.error('Recommendations error:', error);
        res.status(500).json({ error: 'Impossible de charger les recommandations.' });
    }
});

app.get('/api/user/favorites', authenticate, (req, res) => {
    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    const favorites = [...new Set((user?.favorites || [])
        .map((favoriteKey) => normalizeChoiceValue(favoriteKey))
        .filter(Boolean))];

    if (user && JSON.stringify(user.favorites || []) !== JSON.stringify(favorites)) {
        user.favorites = favorites;
        saveDB(db);
    }

    res.json(favorites);
});

app.post('/api/user/favorites', authenticate, (req, res) => {
    const videoId = normalizeChoiceValue(req.body?.videoId || '');
    if (!videoId) return res.status(400).json({ error: 'ID requis' });
    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user.favorites) user.favorites = [];
    const index = user.favorites.indexOf(videoId);
    if (index === -1) user.favorites.push(videoId);
    else user.favorites.splice(index, 1);
    saveDB(db);
    res.json({ favorites: user.favorites });
});

app.patch('/api/user/profile', authenticate, async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Mot de passe requis' });
    if (password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ error: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caracteres.` });
    }
    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Compte introuvable' });
    user.password = await hashPassword(password);
    saveDB(db);
    res.json({ success: true });
});

app.get('/api/user/history', authenticate, (req, res) => {
    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    res.json(user?.history || []);
});



// ─── Playlists ───
app.get('/api/user/local-tracks', authenticate, (req, res) => {
    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    res.json((user?.localTracks || []).map(getLocalTrackPublicPayload));
});

app.post('/api/user/local-tracks', authenticate, (req, res) => {
    const { filename, mimeType, data, title, artist, durationMs } = req.body || {};
    const normalizedMime = normalizeChoiceValue(mimeType).toLowerCase();
    const extension = LOCAL_AUDIO_TYPES.get(normalizedMime);
    const encoded = String(data || '').includes(',')
        ? String(data || '').split(',').pop()
        : String(data || '');

    if (!extension) {
        return res.status(400).json({ error: 'Format audio non supporte. Utilise MP3, M4A, WAV, OGG ou FLAC.' });
    }
    if (!encoded) {
        return res.status(400).json({ error: 'Fichier audio manquant.' });
    }

    let buffer;
    try {
        buffer = Buffer.from(encoded, 'base64');
    } catch {
        return res.status(400).json({ error: 'Fichier audio illisible.' });
    }

    if (!buffer.length || buffer.length > MAX_LOCAL_TRACK_BYTES) {
        return res.status(400).json({ error: 'Le fichier doit faire moins de 50 MB.' });
    }

    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Compte introuvable.' });
    if (!Array.isArray(user.localTracks)) user.localTracks = [];

    const id = createUserId('local');
    const safeBase = sanitizeFileStem(title || filename || id);
    const storedFileName = `${id}-${safeBase}${extension}`;
    const userDir = getLocalTrackUserDir(user.id);
    fs.mkdirSync(userDir, { recursive: true });
    fs.writeFileSync(path.join(userDir, storedFileName), buffer);

    const cleanTitle = normalizeChoiceValue(title || String(filename || '').replace(/\.[^.]+$/, '')) || 'Titre local';
    const cleanArtist = normalizeChoiceValue(artist || 'Bibliotheque locale');
    const track = {
        id,
        fileName: storedFileName,
        title: cleanTitle,
        artist: cleanArtist,
        thumb: '',
        mimeType: normalizedMime,
        size: buffer.length,
        durationMs: Number.isFinite(Number(durationMs)) ? Math.max(0, Math.round(Number(durationMs))) : 0,
        addedAt: new Date().toISOString()
    };

    user.localTracks.unshift(track);
    saveDB(db);
    res.json(getLocalTrackPublicPayload(track));
});

app.get('/api/user/local-tracks/:id/stream', authenticate, (req, res) => {
    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    const track = (user?.localTracks || []).find((item) => item.id === req.params.id);
    if (!track) return res.status(404).json({ error: 'Titre local introuvable.' });

    const filePath = path.join(getLocalTrackUserDir(user.id), track.fileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier audio introuvable.' });

    res.setHeader('Content-Type', track.mimeType || 'audio/mpeg');
    res.sendFile(filePath);
});

app.delete('/api/user/local-tracks/:id', authenticate, (req, res) => {
    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Compte introuvable.' });
    const track = (user.localTracks || []).find((item) => item.id === req.params.id);
    user.localTracks = (user.localTracks || []).filter((item) => item.id !== req.params.id);
    (user.playlists || []).forEach((playlist) => {
        playlist.tracks = (playlist.tracks || []).filter((item) => item.videoId !== req.params.id);
    });
    if (track?.fileName) {
        const filePath = path.join(getLocalTrackUserDir(user.id), track.fileName);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    saveDB(db);
    res.json({ success: true });
});

app.get('/api/music/lyrics', authenticate, async (req, res) => {
    const title = normalizeChoiceValue(req.query.title || '');
    const artist = normalizeChoiceValue(req.query.artist || '');
    const duration = Math.round(Number(req.query.duration || 0));

    if (!title) return res.status(400).json({ error: 'Titre requis.' });

    const params = new URLSearchParams({
        track_name: title,
        artist_name: artist
    });
    if (Number.isFinite(duration) && duration > 0) {
        params.set('duration', String(duration));
    }

    try {
        const response = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
            headers: { 'User-Agent': 'NeonWave/1.0.1 local-desktop' }
        });
        if (!response.ok) {
            return res.status(404).json({ error: 'Paroles introuvables pour ce titre.' });
        }

        const lyrics = await response.json();
        res.json({
            source: 'LRCLIB',
            title,
            artist,
            plainLyrics: lyrics?.plainLyrics || '',
            syncedLyrics: lyrics?.syncedLyrics || '',
            syncedLines: parseSyncedLyrics(lyrics?.syncedLyrics || '')
        });
    } catch (error) {
        console.error('Lyrics fetch error:', error);
        res.status(502).json({ error: 'Impossible de recuperer les paroles maintenant.' });
    }
});

app.get('/api/user/playlists', authenticate, (req, res) => {
    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    res.json(user?.playlists || []);
});

app.post('/api/user/playlists', authenticate, (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Nom requis' });
    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user.playlists) user.playlists = [];
    const playlist = { id: 'pl-' + Date.now(), name: name.trim(), tracks: [], createdAt: new Date().toISOString() };
    user.playlists.push(playlist);
    saveDB(db);
    res.json(playlist);
});

app.delete('/api/user/playlists/:id', authenticate, (req, res) => {
    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user.playlists) return res.json({ success: true });
    user.playlists = user.playlists.filter(p => p.id !== req.params.id);
    saveDB(db);
    res.json({ success: true });
});

app.post('/api/user/playlists/:id/share', authenticate, (req, res) => {
    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    const playlist = (user?.playlists || []).find(p => p.id === req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist introuvable' });

    if (!playlist.shareToken) {
        playlist.shareToken = createUserId('share');
        playlist.sharedAt = new Date().toISOString();
    }

    saveDB(db);
    res.json({
        shareToken: playlist.shareToken,
        shareUrl: `/share/${encodeURIComponent(playlist.shareToken)}`
    });
});

app.patch('/api/user/playlists/:id/reorder', authenticate, (req, res) => {
    const order = Array.isArray(req.body?.order)
        ? req.body.order.map(normalizeChoiceValue).filter(Boolean)
        : [];
    if (!order.length) return res.status(400).json({ error: 'Nouvel ordre requis.' });

    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    const playlist = (user?.playlists || []).find(p => p.id === req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist introuvable' });

    const keyForTrack = (track) => normalizeChoiceValue(track.videoId || track.spotifyId || track.id || '');
    const byKey = new Map((playlist.tracks || []).map((track) => [keyForTrack(track), track]));
    const reordered = order.map((key) => byKey.get(key)).filter(Boolean);
    const remaining = (playlist.tracks || []).filter((track) => !order.includes(keyForTrack(track)));

    playlist.tracks = [...reordered, ...remaining];
    saveDB(db);
    res.json(playlist);
});

app.post('/api/user/playlists/:id/tracks', authenticate, (req, res) => {
    const { videoId, spotifyId, title, artist, thumb, source, streamUrl, durationMs } = req.body;
    if (!videoId) return res.status(400).json({ error: 'ID requis' });
    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    const playlist = (user.playlists || []).find(p => p.id === req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist introuvable' });
    const normalizedSpotifyId = normalizeChoiceValue(spotifyId || '');
    const existingTrack = playlist.tracks.find((track) => (
        track.videoId === videoId
        || (normalizedSpotifyId && normalizeChoiceValue(track?.spotifyId || '') === normalizedSpotifyId)
    ));
    if (existingTrack) {
        existingTrack.videoId = videoId;
        existingTrack.spotifyId = normalizedSpotifyId;
        existingTrack.title = title;
        existingTrack.artist = artist;
        existingTrack.thumb = thumb;
        existingTrack.source = source || existingTrack.source || '';
        existingTrack.streamUrl = streamUrl || existingTrack.streamUrl || '';
        existingTrack.durationMs = Number(durationMs) || existingTrack.durationMs || 0;
    } else {
        playlist.tracks.push({
            videoId,
            spotifyId: normalizedSpotifyId,
            title,
            artist,
            thumb,
            source: source || '',
            streamUrl: streamUrl || '',
            durationMs: Number(durationMs) || 0,
            addedAt: new Date().toISOString()
        });
    }
    saveDB(db);
    res.json(playlist);
});

app.delete('/api/user/playlists/:id/tracks/:videoId', authenticate, (req, res) => {
    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    const playlist = (user.playlists || []).find(p => p.id === req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist introuvable' });
    playlist.tracks = playlist.tracks.filter(t => t.videoId !== req.params.videoId);
    saveDB(db);
    res.json(playlist);
});

// ─── Liked Tracks ───
app.get('/api/playlists/shared/:token', (req, res) => {
    const db = getDB();
    const shared = db.users
        .flatMap((user) => (user.playlists || []).map((playlist) => ({ playlist, user })))
        .find(({ playlist }) => playlist.shareToken === req.params.token);

    if (!shared) return res.status(404).json({ error: 'Playlist partagee introuvable.' });

    res.json({
        name: shared.playlist.name,
        owner: shared.user.username || shared.user.email,
        tracks: (shared.playlist.tracks || []).map((track) => ({
            title: track.title,
            artist: track.artist,
            thumb: track.thumb,
            videoId: track.videoId,
            spotifyId: track.spotifyId,
            source: track.source || (String(track.videoId || '').startsWith('local-') ? 'local' : 'stream')
        })),
        sharedAt: shared.playlist.sharedAt || ''
    });
});

app.get('/share/:token', (req, res) => {
    const db = getDB();
    const shared = db.users
        .flatMap((user) => (user.playlists || []).map((playlist) => ({ playlist, user })))
        .find(({ playlist }) => playlist.shareToken === req.params.token);

    if (!shared) {
        res.status(404).send('<!doctype html><title>NeonWave</title><body style="background:#080b14;color:white;font-family:Inter,Arial;padding:40px;">Playlist introuvable.</body>');
        return;
    }

    const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const tracks = (shared.playlist.tracks || [])
        .map((track, index) => `<li><span>${index + 1}</span><div><strong>${escapeHtml(track.title)}</strong><em>${escapeHtml(track.artist || 'Artiste inconnu')}</em></div></li>`)
        .join('');

    res.send(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(shared.playlist.name)} - NeonWave</title>
<style>body{margin:0;background:radial-gradient(circle at top,#1b2458,#070914 55%);color:white;font-family:Inter,Arial,sans-serif;padding:40px}main{max-width:760px;margin:auto}.badge{color:#8ab4ff;text-transform:uppercase;font-size:12px;letter-spacing:.16em;font-weight:800}h1{font-size:44px;margin:10px 0}p{color:#b8c2dd}ol{padding:0;list-style:none;display:grid;gap:10px}li{display:grid;grid-template-columns:42px 1fr;gap:12px;align-items:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:14px}li span{color:#8ab4ff;font-weight:800}li strong,li em{display:block}li em{color:#9aa7c7;font-style:normal;font-size:14px;margin-top:4px}</style>
</head><body><main><div class="badge">NeonWave Playlist</div><h1>${escapeHtml(shared.playlist.name)}</h1><p>Partage par ${escapeHtml(shared.user.username || shared.user.email)} - ${shared.playlist.tracks?.length || 0} titre(s)</p><ol>${tracks}</ol></main></body></html>`);
});

app.get('/api/user/liked-tracks', authenticate, (req, res) => {
    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    const seenTrackIds = new Set();
    const likedTracks = (user?.likedTracks || []).reduce((tracks, track) => {
        const normalizedVideoId = normalizeChoiceValue(track?.videoId || '');
        const normalizedSpotifyId = normalizeChoiceValue(track?.spotifyId || '');
        const primaryId = normalizedVideoId || normalizedSpotifyId;

        if (!primaryId || seenTrackIds.has(primaryId)) {
            return tracks;
        }

        seenTrackIds.add(primaryId);
        tracks.push({
            ...track,
            videoId: normalizedVideoId,
            spotifyId: normalizedSpotifyId
        });
        return tracks;
    }, []);

    if (user && JSON.stringify(user.likedTracks || []) !== JSON.stringify(likedTracks)) {
        user.likedTracks = likedTracks;
        saveDB(db);
    }

    res.json(likedTracks);
});

app.post('/api/user/liked-tracks', authenticate, (req, res) => {
    const { videoId, spotifyId, title, artist, thumb } = req.body;
    const normalizedVideoId = normalizeChoiceValue(videoId || '');
    const normalizedSpotifyId = normalizeChoiceValue(spotifyId || '');
    if (!normalizedVideoId && !normalizedSpotifyId) {
        return res.status(400).json({ error: 'ID requis' });
    }
    const db = getDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user.likedTracks) user.likedTracks = [];
    if (!user.favorites) user.favorites = [];
    const seenTrackIds = new Set();
    user.likedTracks = user.likedTracks.reduce((tracks, track) => {
        const currentVideoId = normalizeChoiceValue(track?.videoId || '');
        const currentSpotifyId = normalizeChoiceValue(track?.spotifyId || '');
        const primaryId = currentVideoId || currentSpotifyId;

        if (!primaryId || seenTrackIds.has(primaryId)) {
            return tracks;
        }

        seenTrackIds.add(primaryId);
        tracks.push({
            ...track,
            videoId: currentVideoId,
            spotifyId: currentSpotifyId
        });
        return tracks;
    }, []);

    const idx = user.likedTracks.findIndex((track) => {
        const currentVideoId = normalizeChoiceValue(track?.videoId || '');
        const currentSpotifyId = normalizeChoiceValue(track?.spotifyId || '');

        return (
            (normalizedVideoId && currentVideoId === normalizedVideoId)
            || (normalizedSpotifyId && currentSpotifyId === normalizedSpotifyId)
        );
    });

    const favoriteKeys = [normalizedVideoId, normalizedSpotifyId].filter(Boolean);
    if (idx === -1) {
        user.likedTracks.push({
            videoId: normalizedVideoId,
            spotifyId: normalizedSpotifyId,
            title,
            artist,
            thumb,
            likedAt: new Date().toISOString()
        });
        favoriteKeys.forEach((favoriteKey) => {
            if (!user.favorites.includes(favoriteKey)) {
                user.favorites.push(favoriteKey);
            }
        });
    } else {
        user.likedTracks.splice(idx, 1);
        user.favorites = user.favorites.filter((favoriteKey) => !favoriteKeys.includes(favoriteKey));
    }
    saveDB(db);
    res.json({ likedTracks: user.likedTracks, favorites: user.favorites });
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════

// List all users
app.get('/api/admin/users', authenticate, requireAdmin, (req, res) => {
    const db = getDB();
    res.json(db.users.map(({ password, ...u }) => u));
});

// Create user (admin)
app.post('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
    const { email, password, role } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const requestedRole = normalizeChoiceValue(role || 'USER').toUpperCase();
    if (!VALID_ADMIN_CREATED_ROLES.has(requestedRole)) {
        return res.status(400).json({ error: 'Role invalide.' });
    }
    if (requestedRole === 'ADMIN' && req.user.role !== 'OWNER') {
        return res.status(403).json({ error: 'Seul le proprietaire peut creer un administrateur.' });
    }
    if (!isValidEmail(normalizedEmail)) return res.status(400).json({ error: 'Email invalide.' });
    if (password && password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ error: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caracteres.` });
    }
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });
    const db = getDB();
    if (db.users.find(u => u.email.toLowerCase() === normalizedEmail)) {
        return res.status(409).json({ error: 'Email déjà utilisé.' });
    }
    const newUser = {
        id: createUserId('user'),
        username: normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password: await hashPassword(password),
        role: requestedRole,
        banned: false,
        lastIP: '',
        createdAt: new Date().toISOString(),
        history: [],
        favorites: [],
        likedTracks: [],
        playlists: [],
        localTracks: [],
        sharedPlaylists: [],
        ...createDefaultMusicState()
    };
    db.users.push(newUser);
    saveDB(db);
    res.json({ success: true, user: { id: newUser.id, email: newUser.email, role: newUser.role } });
});

// Delete user
app.delete('/api/admin/users/:id', authenticate, requireAdmin, (req, res) => {
    const db = getDB();
    const target = db.users.find(u => u.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    if (target.role === 'OWNER') return res.status(403).json({ error: 'Impossible de supprimer le propriétaire.' });
    db.users = db.users.filter(u => u.id !== req.params.id);
    saveDB(db);
    res.json({ success: true });
});

// Ban user
app.post('/api/admin/ban/:userId', authenticate, requireAdmin, (req, res) => {
    const db = getDB();
    const target = db.users.find(u => u.id === req.params.userId);
    if (!target) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    if (target.role === 'OWNER') return res.status(403).json({ error: 'Impossible de bannir le propriétaire.' });
    target.banned = true;
    
    // Optionally also ban their last IP
    if (req.body.banIP && target.lastIP && !db.bannedIPs.includes(target.lastIP)) {
        db.bannedIPs.push(target.lastIP);
    }
    
    saveDB(db);
    console.log(`🚫 User banned: ${target.email} ${req.body.banIP ? `(+ IP ${target.lastIP})` : ''}`);
    res.json({ success: true });
});

// Unban user
app.post('/api/admin/unban/:userId', authenticate, requireAdmin, (req, res) => {
    const db = getDB();
    const target = db.users.find(u => u.id === req.params.userId);
    if (!target) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    target.banned = false;
    saveDB(db);
    console.log(`✅ User unbanned: ${target.email}`);
    res.json({ success: true });
});

// List banned IPs
app.get('/api/admin/banned-ips', authenticate, requireAdmin, (req, res) => {
    const db = getDB();
    res.json(db.bannedIPs || []);
});

// Ban an IP
app.post('/api/admin/ban-ip', authenticate, requireAdmin, (req, res) => {
    const ip = normalizeChoiceValue(req.body?.ip || '');
    if (!ip) return res.status(400).json({ error: 'Adresse IP requise.' });
    if (!isValidIP(ip)) return res.status(400).json({ error: 'Adresse IP invalide.' });
    const db = getDB();
    if (!db.bannedIPs.includes(ip)) {
        db.bannedIPs.push(ip);
        saveDB(db);
    }
    console.log(`🚫 IP banned: ${ip}`);
    res.json({ success: true });
});

// Unban an IP  
app.delete('/api/admin/ban-ip/:ip', authenticate, requireAdmin, (req, res) => {
    const db = getDB();
    db.bannedIPs = db.bannedIPs.filter(i => i !== req.params.ip);
    saveDB(db);
    console.log(`✅ IP unbanned: ${req.params.ip}`);
    res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════
// CATCH-ALL
// ═══════════════════════════════════════════════════════════════
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
    console.log(`\n🌊 NeonWave PORTABLE (Ultra-Resilient): ${PORT}\n`);
});

module.exports = {
    app,
    server
};
