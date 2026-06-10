const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS_BASE = 'https://accounts.spotify.com/api/token';
const SPOTIFY_MARKET = process.env.SPOTIFY_MARKET || 'FR';
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:5000/callback';
const TOKEN_SAFETY_WINDOW_MS = 60 * 1000;
const RESULT_TTL_MS = 15 * 60 * 1000;

/**
 * Validates if a string is a valid Spotify ID (22 chars, alphanumeric).
 */
const isValidSpotifyId = (id) => {
    if (typeof id !== 'string') return false;
    return /^[A-Za-z0-9]{22}$/.test(id);
};

let tokenCache = {
    accessToken: null,
    expiresAt: 0
};

const resultCache = new Map();

const DEFAULT_FALLBACK_IMAGES = [
    'https://cdn-images.dzcdn.net/images/artist/14c919011b4dc5575aa64bcf7311aa5d/1000x1000-000000-80-0-0.jpg',
    'https://cdn-images.dzcdn.net/images/artist/7601c5c0e2bd16cb585898316fd0dfec/1000x1000-000000-80-0-0.jpg',
    'https://cdn-images.dzcdn.net/images/artist/8d9c407bd25fab0fc961b6abf335e874/1000x1000-000000-80-0-0.jpg',
    'https://cdn-images.dzcdn.net/images/artist/f1a596b126611260994271ce4cb54bb0/1000x1000-000000-80-0-0.jpg'
];

// Verified artist portraits used when Spotify is unavailable or rate-limited.
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

const GENRE_ARTIST_FALLBACKS = {
    rap: ['Ninho', 'SCH', 'Damso', 'Maes', 'Jul'],
    drill: ['Gazo', 'Tiakola', 'Maes', 'Ninho', 'Travis Scott'],
    'r&b': ['The Weeknd', 'Drake', 'Aya Nakamura', 'Burna Boy', 'Damso'],
    afro: ['Burna Boy', 'Aya Nakamura', 'Tiakola', 'Drake', 'The Weeknd'],
    pop: ['The Weeknd', 'Aya Nakamura', 'Drake', 'Burna Boy', 'Jul'],
    electro: ['The Weeknd', 'Drake', 'Travis Scott', 'Aya Nakamura', 'Burna Boy'],
    house: ['The Weeknd', 'Drake', 'Aya Nakamura', 'Burna Boy', 'Jul'],
    techno: ['The Weeknd', 'Travis Scott', 'Drake', 'Burna Boy', 'Aya Nakamura'],
    trap: ['Travis Scott', 'Drake', 'Gazo', 'SCH', 'Damso'],
    dancehall: ['Burna Boy', 'Aya Nakamura', 'Drake', 'Tiakola', 'The Weeknd'],
    amapiano: ['Burna Boy', 'Aya Nakamura', 'Drake', 'Tiakola', 'The Weeknd'],
    latino: ['Aya Nakamura', 'Burna Boy', 'Drake', 'The Weeknd', 'Jul']
};

class SpotifyConfigError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SpotifyConfigError';
        this.status = 503;
    }
}

class SpotifyApiError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.name = 'SpotifyApiError';
        this.status = status;
    }
}

const isSpotifyErrorStatus = (error, statuses = []) => (
    error instanceof SpotifyApiError && (statuses.includes(error.status) || error.status === 429)
);

const isRecoverableSpotifyLookupError = (error) => isSpotifyErrorStatus(error, [400, 403, 404]);

const getCacheEntry = (key) => {
    const cached = resultCache.get(key);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
        resultCache.delete(key);
        return null;
    }
    return cached.value;
};

const setCacheEntry = (key, value, ttlMs = RESULT_TTL_MS) => {
    resultCache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs
    });
    return value;
};

const normalizeText = (value) => typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ')
    : '';

const normalizeLookupKey = (value) => normalizeText(
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const scoreArtistMatch = (query, artist) => {
    const queryKey = normalizeLookupKey(query);
    const artistNameKey = normalizeLookupKey(artist?.name || '');
    if (!queryKey || !artistNameKey) return Number.NEGATIVE_INFINITY;

    let score = 0;
    if (artistNameKey === queryKey) {
        score += 300;
    }

    if (artistNameKey.startsWith(queryKey)) {
        score += 160;
    }

    if (artistNameKey.includes(queryKey)) {
        score += 120;
    }

    const queryTokens = queryKey.split(' ').filter(Boolean);
    const artistTokens = artistNameKey.split(' ').filter(Boolean);

    queryTokens.forEach((token) => {
        if (artistTokens.includes(token)) {
            score += 35;
        } else if (artistNameKey.includes(token)) {
            score += 18;
        }
    });

    if (queryTokens.length === artistTokens.length && queryTokens.every((token) => artistTokens.includes(token))) {
        score += 90;
    }

    score += Math.min(artist?.popularity || 0, 100) * 1.5; // Stronger popularity bias to favor famous rappers over obscure homonyms
    
    // Explicitly favor Rap/French genres if detected
    const genres = (artist?.genres || []).map(g => g.toLowerCase());
    const isRap = genres.some(g => g.includes('rap') || g.includes('hip hop') || g.includes('drill') || g.includes('trap'));
    const isFrench = genres.some(g => g.includes('french') || g.includes('francais'));
    
    if (isRap) score += 50;
    if (isFrench) score += 50;
    if (isRap && isFrench) score += 100;

    return score;
};

const pickBestArtistMatch = (query, artists = [], targetGenre = null) => {
    const rankedArtists = artists
        .map((artist) => ({
            artist,
            score: scoreArtistMatch(query, artist)
        }))
        .filter((entry) => Number.isFinite(entry.score))
        .map(entry => {
            if (targetGenre) {
                const genres = (entry.artist.genres || []).map(g => g.toLowerCase());
                if (genres.some(g => g.includes(targetGenre.toLowerCase()))) {
                    entry.score += 200; // Big boost for matching target genre
                }
            }
            return entry;
        })
        .sort((left, right) => right.score - left.score);

    return rankedArtists[0]?.artist || null;
};

const buildFallbackArtist = (name, index = 0) => {
    const safeName = normalizeText(name);
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
};

const uniqueNames = (items) => {
    const seen = new Set();
    return items.filter((item) => {
        const normalized = normalizeText(item).toLowerCase();
        if (!normalized || seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
    });
};

const buildArtistsFromNames = async (names, excludedName = '') => {
    const cleanedNames = uniqueNames(names)
        .filter((name) => normalizeText(name).toLowerCase() !== normalizeText(excludedName).toLowerCase())
        .slice(0, 12);

    if (!cleanedNames.length) return [];
    return cleanedNames.map((name, index) => buildFallbackArtist(name, index));
};

const getFallbackRelatedArtists = async (fallbackArtist = null) => {
    const artistName = normalizeText(fallbackArtist?.name || '');
    const artistGenres = Array.isArray(fallbackArtist?.genres) ? fallbackArtist.genres.map(normalizeText) : [];
    const selectedGenres = Array.isArray(fallbackArtist?.selectedGenres) ? fallbackArtist.selectedGenres.map(normalizeText) : [];
    const genreSeeds = uniqueNames([...artistGenres, ...selectedGenres]).map((genre) => genre.toLowerCase());

    const suggestions = [];

    if (artistName) {
        suggestions.push(...(RELATED_ARTIST_FALLBACKS[artistName.toLowerCase()] || []));
    }

    genreSeeds.forEach((genre) => {
        suggestions.push(...(GENRE_ARTIST_FALLBACKS[genre] || []));
    });

    if (!suggestions.length) {
        suggestions.push('Ninho', 'SCH', 'Damso', 'Maes', 'Tiakola', 'Drake', 'The Weeknd');
    }

    return buildArtistsFromNames(suggestions, artistName);
};

const normalizeArtist = (artist) => ({
    spotifyId: artist?.id || '',
    name: normalizeText(artist?.name),
    imageUrl: Array.isArray(artist?.images) && artist.images.length > 0 ? (artist.images[0].url || '') : '',
    spotifyUrl: artist?.external_urls?.spotify || '',
    genres: Array.isArray(artist?.genres) ? artist.genres.slice(0, 5) : [],
    popularity: Number.isFinite(artist?.popularity) ? artist.popularity : 0,
    followers: artist?.followers?.total || 0,
    source: 'spotify'
});

const normalizeAlbum = (album) => ({
    spotifyId: album?.id || '',
    name: normalizeText(album?.name),
    imageUrl: Array.isArray(album?.images) && album.images.length > 0 ? (album.images[0].url || '') : '',
    spotifyUrl: album?.external_urls?.spotify || '',
    artists: Array.isArray(album?.artists) ? album.artists.map((artist) => normalizeText(artist?.name)).filter(Boolean) : [],
    releaseDate: normalizeText(album?.release_date || ''),
    totalTracks: Number.isFinite(album?.total_tracks) ? album.total_tracks : 0,
    type: normalizeText(album?.album_type || 'album') || 'album',
    group: normalizeText(album?.album_group || album?.album_type || 'album') || 'album',
    source: 'spotify'
});

const normalizeArtistInput = (artist) => {
    if (!artist) return null;

    if (typeof artist === 'string') {
        const name = normalizeText(artist);
        if (!name) return null;
        return {
            spotifyId: '',
            name,
            imageUrl: '',
            spotifyUrl: '',
            genres: [],
            popularity: 0,
            followers: 0,
            source: 'custom'
        };
    }

    if (typeof artist !== 'object') return null;

    const name = normalizeText(artist.name || artist.label || '');
    if (!name) return null;

    return {
        spotifyId: normalizeText(artist.spotifyId || artist.id || ''),
        name,
        imageUrl: normalizeText(artist.imageUrl || artist.image || ''),
        spotifyUrl: normalizeText(artist.spotifyUrl || artist.url || ''),
        genres: Array.isArray(artist.genres) ? artist.genres.map(normalizeText).filter(Boolean).slice(0, 5) : [],
        popularity: Number.isFinite(artist.popularity) ? artist.popularity : 0,
        followers: Number.isFinite(artist.followers) ? artist.followers : 0,
        source: normalizeText(artist.source || (artist.spotifyId ? 'spotify' : 'custom')) || 'custom'
    };
};

const mergeArtistData = (baseArtist, spotifyArtist) => {
    const normalizedBase = normalizeArtistInput(baseArtist);
    const normalizedSpotify = normalizeArtistInput(spotifyArtist);

    if (!normalizedBase) return normalizedSpotify;
    if (!normalizedSpotify) return normalizedBase;

    return {
        spotifyId: normalizedSpotify.spotifyId || normalizedBase.spotifyId,
        name: normalizedSpotify.name || normalizedBase.name,
        imageUrl: normalizedSpotify.imageUrl || normalizedBase.imageUrl,
        spotifyUrl: normalizedSpotify.spotifyUrl || normalizedBase.spotifyUrl,
        genres: uniqueNames([...(normalizedSpotify.genres || []), ...(normalizedBase.genres || [])]).slice(0, 5),
        popularity: normalizedSpotify.popularity || normalizedBase.popularity || 0,
        followers: normalizedSpotify.followers || normalizedBase.followers || 0,
        source: normalizedSpotify.spotifyId ? 'spotify' : normalizedBase.source || normalizedSpotify.source || 'custom'
    };
};

const normalizeTrackArtist = (artist) => ({
    spotifyId: artist?.id || '',
    name: normalizeText(artist?.name),
    spotifyUrl: artist?.external_urls?.spotify || ''
});

const normalizeTrack = (track, albumOverride = null) => {
    const album = albumOverride
        ? normalizeAlbum(albumOverride)
        : track?.album
            ? normalizeAlbum(track.album)
            : null;

    return {
        spotifyId: track?.id || '',
        name: normalizeText(track?.name),
        imageUrl: album?.imageUrl || '',
        spotifyUrl: track?.external_urls?.spotify || '',
        previewUrl: track?.preview_url || '',
        artists: Array.isArray(track?.artists)
            ? track.artists.map(normalizeTrackArtist).filter((artist) => artist.name)
            : [],
        durationMs: Number.isFinite(track?.duration_ms) ? track.duration_ms : 0,
        popularity: Number.isFinite(track?.popularity) ? track.popularity : 0,
        discNumber: Number.isFinite(track?.disc_number) ? track.disc_number : 0,
        trackNumber: Number.isFinite(track?.track_number) ? track.track_number : 0,
        explicit: Boolean(track?.explicit),
        album,
        source: 'spotify'
    };
};

const searchTracks = async (query, { limit = 10 } = {}) => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];

    if (!hasSpotifyConfig()) {
        return [];
    }

    try {
        const data = await spotifyRequest('/search', {
            params: {
                q: normalizedQuery,
                type: 'track',
                market: SPOTIFY_MARKET,
                limit: Math.min(Math.max(limit, 1), 10)
            },
            cacheKey: `tracks:${normalizedQuery.toLowerCase()}:${limit}`
        });

        return (data?.tracks?.items || [])
            .map((track) => normalizeTrack(track))
            .filter((track) => track.name && track.artists.length);
    } catch (error) {
        if (isSpotifyErrorStatus(error, [403])) {
            return [];
        }
        throw error;
    }
};

const normalizeComparisonKey = (value) => normalizeText(
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const artistMatchesReference = (artists = [], artistId = '', artistName = '') => {
    const normalizedId = normalizeText(artistId);
    const normalizedNameKey = normalizeComparisonKey(artistName);

    return (Array.isArray(artists) ? artists : []).some((artist) => {
        const currentId = normalizeText(artist?.id || artist?.spotifyId || '');
        const currentNameKey = normalizeComparisonKey(artist?.name || '');

        if (normalizedId && currentId && currentId === normalizedId) {
            return true;
        }

        if (normalizedNameKey && currentNameKey && currentNameKey === normalizedNameKey) {
            return true;
        }

        return false;
    });
};

const searchSpotifyTracksByArtist = async (artist, { limit = 20 } = {}) => {
    const normalizedArtist = normalizeArtistInput(artist);
    if (!normalizedArtist?.name) return [];

    const queries = [
        `artist:"${normalizedArtist.name}"`,
        normalizedArtist.name
    ];

    const responses = await Promise.allSettled(
        queries.map((query, index) => spotifyRequest('/search', {
            params: {
                q: query,
                type: 'track',
                market: SPOTIFY_MARKET,
                limit: Math.min(Math.max(limit, 1), 50)
            },
            cacheKey: `artist-track-search:${normalizedArtist.spotifyId || normalizedArtist.name.toLowerCase()}:${index}:${limit}`
        }))
    );

    const seen = new Set();

    return responses
        .flatMap((response) => response.status === 'fulfilled' ? (response.value?.tracks?.items || []) : [])
        .filter((track) => artistMatchesReference(track?.artists, normalizedArtist.spotifyId, normalizedArtist.name))
        .map((track) => normalizeTrack(track))
        .filter((track) => {
            const identity = normalizeText(track?.spotifyId || '');
            if (!identity || seen.has(identity)) return false;
            seen.add(identity);
            return track.name;
        })
        .slice(0, Math.min(Math.max(limit, 1), 50));
};

const searchSpotifyAlbumsByArtist = async (artist, { limit = 20 } = {}) => {
    const normalizedArtist = normalizeArtistInput(artist);
    if (!normalizedArtist?.name) return [];

    const queries = [
        `artist:"${normalizedArtist.name}"`,
        normalizedArtist.name
    ];

    const responses = await Promise.allSettled(
        queries.map((query, index) => spotifyRequest('/search', {
            params: {
                q: query,
                type: 'album',
                market: SPOTIFY_MARKET,
                limit: Math.min(Math.max(limit, 1), 50)
            },
            cacheKey: `artist-album-search:${normalizedArtist.spotifyId || normalizedArtist.name.toLowerCase()}:${index}:${limit}`
        }))
    );

    const seen = new Set();

    return responses
        .flatMap((response) => response.status === 'fulfilled' ? (response.value?.albums?.items || []) : [])
        .filter((album) => artistMatchesReference(album?.artists, normalizedArtist.spotifyId, normalizedArtist.name))
        .map(normalizeAlbum)
        .filter((album) => {
            const identity = normalizeText(album?.spotifyId || `${album?.name || ''}:${album?.releaseDate || ''}`);
            if (!identity || seen.has(identity)) return false;
            seen.add(identity);
            return album.name;
        })
        .sort((left, right) => (right.releaseDate || '').localeCompare(left.releaseDate || ''))
        .slice(0, Math.min(Math.max(limit, 1), 50));
};

const buildTopTracksFromAlbums = async (artist, albumCandidates = [], { limit = 10 } = {}) => {
    const normalizedArtist = normalizeArtistInput(artist);
    if (!normalizedArtist?.name || !Array.isArray(albumCandidates) || !albumCandidates.length) return [];

    // Prioritize main albums over singles, and singles over appears_on features
    const sortedCandidates = [...albumCandidates].sort((a, b) => {
        const groupA = normalizeText(a.group || a.type || 'album').toLowerCase();
        const groupB = normalizeText(b.group || b.type || 'album').toLowerCase();

        const typePriority = { 'album': 1, 'single': 2, 'appears_on': 3 };
        const aPriority = typePriority[groupA] || 4;
        const bPriority = typePriority[groupB] || 4;

        if (aPriority !== bPriority) {
            return aPriority - bPriority;
        }
        return (b.releaseDate || '').localeCompare(a.releaseDate || '');
    });

    const uniqueAlbums = sortedCandidates
        .filter((album, index, items) => {
            const currentId = normalizeText(album?.spotifyId || '');
            if (!currentId) return false;
            return items.findIndex((candidate) => normalizeText(candidate?.spotifyId || '') === currentId) === index;
        })
        .slice(0, 20);

    const loadedAlbums = await getAlbumsIndividually(
        uniqueAlbums.map((album) => album.spotifyId),
        { concurrency: 4 }
    );

    const albumsTracks = loadedAlbums.map((album) => (
        (album.tracks || [])
            .filter((track) => artistMatchesReference(track?.artists, normalizedArtist.spotifyId, normalizedArtist.name))
    ));

    const interleaved = [];
    const seen = new Set();
    let hasMore = true;
    let trackIndex = 0;

    while (hasMore && interleaved.length < Math.min(Math.max(limit, 1), 20)) {
        hasMore = false;
        for (const tracks of albumsTracks) {
            if (trackIndex < tracks.length) {
                hasMore = true;
                const track = tracks[trackIndex];
                const identity = normalizeText(track?.spotifyId || `${track?.name || ''}:${track?.album?.spotifyId || ''}`);
                if (identity && !seen.has(identity)) {
                    seen.add(identity);
                    interleaved.push(track);
                    if (interleaved.length >= limit) {
                        break;
                    }
                }
            }
        }
        if (interleaved.length >= limit) {
            break;
        }
        trackIndex++;
    }

    return interleaved;
};

const hasSpotifyConfig = () => Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);

const getAccessToken = async () => {
    if (!hasSpotifyConfig()) {
        throw new SpotifyConfigError('Spotify n est pas configure. Ajoutez SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET.');
    }

    if (tokenCache.accessToken && tokenCache.expiresAt > Date.now() + TOKEN_SAFETY_WINDOW_MS) {
        return tokenCache.accessToken;
    }

    const body = new URLSearchParams({ grant_type: 'client_credentials' });
    const auth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');

    const response = await fetch(SPOTIFY_ACCOUNTS_BASE, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
    });

    if (!response.ok) {
        const message = await response.text();
        throw new SpotifyApiError(`Token Spotify impossible a recuperer (${response.status}): ${message}`, response.status);
    }

    const payload = await response.json();
    tokenCache = {
        accessToken: payload.access_token,
        expiresAt: Date.now() + ((payload.expires_in || 3600) * 1000)
    };

    return tokenCache.accessToken;
};

const requestSpotifyToken = async (bodyParams) => {
    if (!hasSpotifyConfig()) {
        throw new SpotifyConfigError('Spotify n est pas configure. Ajoutez SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET.');
    }

    const body = new URLSearchParams(bodyParams);
    const auth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');

    const response = await fetch(SPOTIFY_ACCOUNTS_BASE, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
    });

    if (!response.ok) {
        const message = await response.text();
        throw new SpotifyApiError(`Token Spotify impossible a recuperer (${response.status}): ${message}`, response.status);
    }

    return response.json();
};

const buildUserSpotifyAuth = (payload, previousAuth = null) => ({
    accessToken: payload?.access_token || '',
    refreshToken: payload?.refresh_token || previousAuth?.refreshToken || '',
    tokenType: payload?.token_type || 'Bearer',
    scope: payload?.scope || previousAuth?.scope || '',
    expiresAt: Date.now() + ((payload?.expires_in || 3600) * 1000),
    connectedAt: previousAuth?.connectedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
});

const getSpotifyAuthorizeUrl = (state, scopes = ['playlist-read-private', 'playlist-read-collaborative']) => {
    if (!state) {
        throw new SpotifyApiError('Etat Spotify invalide.', 400);
    }

    const url = new URL('https://accounts.spotify.com/authorize');
    url.searchParams.set('client_id', process.env.SPOTIFY_CLIENT_ID || '');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', SPOTIFY_REDIRECT_URI);
    url.searchParams.set('scope', scopes.join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('show_dialog', 'true');
    return url.toString();
};

const exchangeAuthorizationCode = async (code) => {
    const normalizedCode = normalizeText(code);
    if (!normalizedCode) {
        throw new SpotifyApiError('Code Spotify invalide.', 400);
    }

    const payload = await requestSpotifyToken({
        grant_type: 'authorization_code',
        code: normalizedCode,
        redirect_uri: SPOTIFY_REDIRECT_URI
    });

    return buildUserSpotifyAuth(payload);
};

const refreshUserAccessToken = async (refreshToken, previousAuth = null) => {
    const normalizedRefreshToken = normalizeText(refreshToken);
    if (!normalizedRefreshToken) {
        throw new SpotifyApiError('Refresh token Spotify invalide.', 400);
    }

    const payload = await requestSpotifyToken({
        grant_type: 'refresh_token',
        refresh_token: normalizedRefreshToken
    });

    return buildUserSpotifyAuth(payload, {
        ...(previousAuth || {}),
        refreshToken: normalizedRefreshToken
    });
};

const ensureValidUserSpotifyAuth = async (spotifyAuth) => {
    if (!spotifyAuth?.refreshToken && !spotifyAuth?.accessToken) {
        throw new SpotifyApiError('Connexion Spotify requise.', 401);
    }

    if (spotifyAuth?.accessToken && Number.isFinite(spotifyAuth?.expiresAt) && spotifyAuth.expiresAt > Date.now() + TOKEN_SAFETY_WINDOW_MS) {
        return spotifyAuth;
    }

    if (!spotifyAuth?.refreshToken) {
        throw new SpotifyApiError('Connexion Spotify expiree.', 401);
    }

    return refreshUserAccessToken(spotifyAuth.refreshToken, spotifyAuth);
};

const spotifyRequestWithAccessToken = async (accessToken, pathname, { params = {} } = {}) => {
    const normalizedAccessToken = normalizeText(accessToken);
    if (!normalizedAccessToken) {
        throw new SpotifyApiError('Token Spotify utilisateur invalide.', 401);
    }

    const url = new URL(`${SPOTIFY_API_BASE}${pathname}`);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value);
        }
    });

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${normalizedAccessToken}`
        }
    });

    if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        throw new SpotifyApiError(`Spotify limite temporairement les requetes. Retry-After=${retryAfter || 'unknown'}`, 429);
    }

    if (!response.ok) {
        const message = await response.text();
        throw new SpotifyApiError(`Erreur Spotify (${response.status}): ${message}`, response.status);
    }

    return response.json();
};

const spotifyRequest = async (pathname, { params = {}, cacheKey = '', ttlMs = RESULT_TTL_MS } = {}) => {
    const effectiveCacheKey = cacheKey || `${pathname}?${new URLSearchParams(params).toString()}`;
    const cached = getCacheEntry(effectiveCacheKey);
    if (cached) return cached;

    const accessToken = await getAccessToken();
    const url = new URL(`${SPOTIFY_API_BASE}${pathname}`);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value);
        }
    });

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        throw new SpotifyApiError(`Spotify limite temporairement les requetes. Retry-After=${retryAfter || 'unknown'}`, 429);
    }

    if (!response.ok) {
        const message = await response.text();
        console.error(`⚠️ Spotify Request Failed: [${response.status}] ${url.toString()} - ${message.substring(0, 100)}`);
        throw new SpotifyApiError(`Erreur Spotify (${response.status}): ${message}`, response.status);
    }

    const json = await response.json();
    return setCacheEntry(effectiveCacheKey, json, ttlMs);
};

const buildFallbackArtistMatches = async (query, limit = 8) => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];

    const fallbackNames = uniqueNames([
        ...DEFAULT_FALLBACK_ARTIST_NAMES,
        ...Object.keys(RELATED_ARTIST_FALLBACKS),
        ...Object.values(RELATED_ARTIST_FALLBACKS).flat()
    ]).filter((name) => name.toLowerCase().includes(normalizedQuery.toLowerCase()));

    if (fallbackNames.length) {
        return fallbackNames
            .slice(0, Math.min(limit, 8))
            .map((name, index) => buildFallbackArtist(name, index));
    }

    return [buildFallbackArtist(normalizedQuery)];
};

const buildFallbackAlbumMatches = async (query, limit = 8) => {
    const fallbackArtists = await buildFallbackArtistMatches(query, Math.min(limit, 6));
    return fallbackArtists.map((artist, index) => ({
        spotifyId: '',
        name: `${artist.name} Essentials`,
        imageUrl: artist.imageUrl,
        spotifyUrl: artist.spotifyUrl,
        artists: [artist.name],
        releaseDate: '',
        totalTracks: 10 + index,
        type: 'album',
        source: 'fallback'
    }));
};

const searchArtists = async (query, { limit = 8, exact = false } = {}) => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];

    if (!hasSpotifyConfig()) {
        return buildFallbackArtistMatches(normalizedQuery, limit);
    }

    const q = exact ? `artist:${normalizedQuery}` : normalizedQuery;
    try {
        const data = await spotifyRequest('/search', {
            params: {
                q,
                type: 'artist',
                market: SPOTIFY_MARKET,
                limit: Math.min(Math.max(limit, 1), 10)
            },
            cacheKey: `search-artists:${q}:${limit}`
        });

        const artists = (data?.artists?.items || []).map(normalizeArtist);
        return artists.length > 0 ? artists : buildFallbackArtistMatches(normalizedQuery, limit);
    } catch (error) {
        console.warn(`[Spotify] Artist search failed for "${query}", using local fallback:`, error.message);
        return buildFallbackArtistMatches(normalizedQuery, limit);
    }
};

const findBestArtistMatch = async (query, { limit = 10, targetGenre = null } = {}) => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return null;

    const [exactResults, looseResults] = await Promise.allSettled([
        searchArtists(normalizedQuery, { limit, exact: true }),
        searchArtists(normalizedQuery, { limit, exact: false })
    ]);

    const mergedResults = [];
    const seen = new Set();

    [exactResults, looseResults].forEach((result) => {
        if (result.status !== 'fulfilled' || !Array.isArray(result.value)) return;
        result.value.forEach((artist) => {
            const identity = (artist.spotifyId || artist.name).toLowerCase();
            if (!identity || seen.has(identity)) return;
            seen.add(identity);
            mergedResults.push(artist);
        });
    });

    return pickBestArtistMatch(normalizedQuery, mergedResults, targetGenre);
};

const searchAlbums = async (query, { limit = 8 } = {}) => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];

    if (!hasSpotifyConfig()) {
        return buildFallbackAlbumMatches(normalizedQuery, limit);
    }

    try {
        const data = await spotifyRequest('/search', {
            params: {
                q: normalizedQuery,
                type: 'album',
                market: SPOTIFY_MARKET,
                limit: Math.min(Math.max(limit, 1), 10)
            },
            cacheKey: `search-albums:${normalizedQuery.toLowerCase()}:${limit}`
        });

        const albums = (data?.albums?.items || []).map(normalizeAlbum);
        return albums.length > 0 ? albums : buildFallbackAlbumMatches(normalizedQuery, limit);
    } catch (error) {
        console.warn(`[Spotify] Album search failed for "${query}", using local fallback:`, error.message);
        return buildFallbackAlbumMatches(normalizedQuery, limit);
    }
};

const getArtistById = async (artistId) => {
    const normalizedId = normalizeText(artistId);
    if (!normalizedId) return null;

    try {
        const data = await spotifyRequest(`/artists/${encodeURIComponent(normalizedId)}`, {
            cacheKey: `artist:${normalizedId}`
        });

        return normalizeArtist(data);
    } catch (error) {
        if (isSpotifyErrorStatus(error, [400, 403, 404])) {
            return null;
        }
        throw error;
    }
};

const getTrackById = async (trackId) => {
    const normalizedId = normalizeText(trackId);
    if (!normalizedId || !isValidSpotifyId(normalizedId)) return null;

    try {
        const data = await spotifyRequest(`/tracks/${encodeURIComponent(normalizedId)}`, {
            cacheKey: `track:${normalizedId}`
        });

        return normalizeTrack(data);
    } catch (error) {
        if (isSpotifyErrorStatus(error, [400, 403, 404])) {
            return null;
        }
        throw error;
    }
};

const getArtistTopTracks = async (artistId, { artistName = '', albumCandidates = [] } = {}) => {
    const normalizedId = normalizeText(artistId);
    if (!normalizedId) return [];

    try {
        const data = await spotifyRequest(`/artists/${encodeURIComponent(normalizedId)}/top-tracks`, {
            params: { market: SPOTIFY_MARKET },
            cacheKey: `artist-top-tracks:${normalizedId}`
        });

        return (data?.tracks || [])
            .map((track) => normalizeTrack(track))
            .filter((track) => track.name);
    } catch (error) {
        if (isSpotifyErrorStatus(error, [400, 401, 403, 404])) {
            const artistRef = { spotifyId: normalizedId, name: artistName };
            const searchTracks = await searchSpotifyTracksByArtist(artistRef, { limit: 10 });
            if (searchTracks.length) {
                return searchTracks;
            }

            return buildTopTracksFromAlbums(artistRef, albumCandidates, { limit: 10 });
        }
        throw error;
    }
};

const getArtistAlbums = async (artistId, { includeGroups = 'album,single,appears_on', limit = 50, artistName = '' } = {}) => {
    const normalizedId = normalizeText(artistId);
    if (!normalizedId) return [];

    try {
        const data = await spotifyRequest(`/artists/${encodeURIComponent(normalizedId)}/albums`, {
            params: {
                market: SPOTIFY_MARKET,
                include_groups: includeGroups,
                limit: Math.min(Math.max(limit, 1), 50)
            },
            cacheKey: `artist-albums:${normalizedId}:${includeGroups}:${limit}`
        });

        const seen = new Set();

        return (data?.items || [])
            .map(normalizeAlbum)
            .filter((album) => {
                const identity = (album.spotifyId || `${album.name}:${album.releaseDate}`).toLowerCase();
                if (!identity || seen.has(identity)) return false;
                seen.add(identity);
                return album.name;
            })
            .sort((left, right) => (right.releaseDate || '').localeCompare(left.releaseDate || ''));
    } catch (error) {
        if (isSpotifyErrorStatus(error, [400, 401, 403, 404])) {
            return searchSpotifyAlbumsByArtist({ spotifyId: normalizedId, name: artistName }, { limit });
        }
        throw error;
    }
};

const enrichArtists = async (artists, preferredGenres = []) => {
    const normalizedArtists = Array.isArray(artists)
        ? artists.map(normalizeArtistInput).filter(Boolean)
        : [];

    if (!normalizedArtists.length) return [];

    if (!hasSpotifyConfig()) {
        return normalizedArtists.map((artist, index) => mergeArtistData(artist, buildFallbackArtist(artist.name, index)));
    }

    const results = await Promise.allSettled(
        normalizedArtists.map(async (artist, index) => {
            if (artist.spotifyId) {
                try {
                    const spotifyArtist = await getArtistById(artist.spotifyId);
                    if (spotifyArtist) {
                        return mergeArtistData(artist, spotifyArtist);
                    }
                } catch (error) {
                    if (!isRecoverableSpotifyLookupError(error)) {
                        throw error;
                    }
                }
            }

            const bestResolvedArtist = await findBestArtistMatch(artist.name, { limit: 10 });
            const bestMatch = bestResolvedArtist || buildFallbackArtist(artist.name, index);
            return mergeArtistData(artist, bestMatch);
        })
    );

    const enrichedArtists = [];
    const seen = new Set();

    results.forEach((result, index) => {
        const artist = result.status === 'fulfilled' && result.value
            ? result.value
            : normalizedArtists[index];
        const identity = (artist.spotifyId || artist.name).toLowerCase();
        if (!identity || seen.has(identity)) return;
        seen.add(identity);
        enrichedArtists.push(artist);
    });

    return enrichedArtists;
};

const getAvailableGenreSeeds = async () => {
    if (!hasSpotifyConfig()) return [];

    try {
        const data = await spotifyRequest('/recommendations/available-genre-seeds', {
            cacheKey: 'recommendation-genre-seeds',
            ttlMs: 24 * 60 * 60 * 1000
        });

        return Array.isArray(data?.genres) ? data.genres : [];
    } catch (error) {
        if (isSpotifyErrorStatus(error, [400, 401, 403, 404])) {
            return [];
        }
        throw error;
    }
};

const getRecommendations = async ({ seedArtists = [], seedGenres = [], seedTracks = [], limit = 12 } = {}) => {
    if (!hasSpotifyConfig()) return [];

    const normalizedTracks = uniqueNames(seedTracks.filter(isValidSpotifyId)).slice(0, 5);
    const normalizedArtists = uniqueNames(seedArtists.filter(isValidSpotifyId)).slice(0, Math.max(1, 5 - normalizedTracks.length));
    const normalizedGenres = uniqueNames(seedGenres.map(normalizeText)).slice(0, Math.max(0, 5 - normalizedTracks.length - normalizedArtists.length));

    if (!normalizedTracks.length && !normalizedArtists.length && !normalizedGenres.length) {
        return [];
    }

    try {
        const params = {
            // market: SPOTIFY_MARKET,
            limit: Math.min(Math.max(limit, 1), 20)
        };
        if (normalizedTracks.length) params.seed_tracks = normalizedTracks.join(',');
        if (normalizedArtists.length) params.seed_artists = normalizedArtists.join(',');
        if (normalizedGenres.length) params.seed_genres = normalizedGenres.join(',');

        const data = await spotifyRequest('/recommendations', {
            params,
            cacheKey: `recommendations:${normalizedTracks.join('|')}:${normalizedArtists.join('|')}:${normalizedGenres.join('|')}:${limit}`
        });

        return (data?.tracks || [])
            .map((track) => normalizeTrack(track))
            .filter((track) => track.name && track.artists.length);
    } catch (error) {
        if (isSpotifyErrorStatus(error, [400, 401, 403, 404])) {
            return [];
        }
        throw error;
    }
};

const getAlbum = async (albumId) => {
    const normalizedId = normalizeText(albumId);
    if (!normalizedId) {
        throw new SpotifyApiError('Album Spotify invalide.', 400);
    }

    try {
        const data = await spotifyRequest(`/albums/${encodeURIComponent(normalizedId)}`, {
            params: { market: SPOTIFY_MARKET },
            cacheKey: `album:${normalizedId}`
        });

        const album = {
            ...normalizeAlbum(data),
            label: normalizeText(data?.label || ''),
            genres: Array.isArray(data?.genres) ? data.genres.map(normalizeText).filter(Boolean).slice(0, 6) : [],
            copyrights: Array.isArray(data?.copyrights)
                ? data.copyrights
                    .map((copyrightItem) => normalizeText(copyrightItem?.text))
                    .filter(Boolean)
                : []
        };

        if (data?.tracks?.items) {
            album.tracks = data.tracks.items.map((track) => normalizeTrack(track, data));
        }

        return album;
    } catch (error) {
        if (isSpotifyErrorStatus(error, [400, 401, 403, 404])) {
            return null;
        }
        throw error;
    }
};

const getAlbumsIndividually = async (albumIds, { concurrency = 4 } = {}) => {
    if (!Array.isArray(albumIds) || !albumIds.length) return [];

    const validIds = albumIds
        .map((id) => normalizeText(id))
        .filter(isValidSpotifyId)
        .slice(0, 20);
    if (!validIds.length) return [];

    const results = new Array(validIds.length);
    let nextIndex = 0;
    const workerCount = Math.min(Math.max(Number(concurrency) || 1, 1), validIds.length);

    const workers = Array.from({ length: workerCount }, async () => {
        while (nextIndex < validIds.length) {
            const index = nextIndex;
            nextIndex += 1;
            try {
                results[index] = await getAlbum(validIds[index]);
            } catch (error) {
                console.warn(`Spotify album ${validIds[index]} could not be loaded:`, error.message);
                results[index] = null;
            }
        }
    });

    await Promise.all(workers);
    return results.filter(Boolean);
};

const getAlbums = async (albumIds) => {
    if (!Array.isArray(albumIds) || !albumIds.length) return [];

    const validIds = albumIds.map(id => normalizeText(id)).filter(isValidSpotifyId).slice(0, 20);
    if (!validIds.length) return [];

    try {
        const data = await spotifyRequest('/albums', {
            params: {
                ids: validIds.join(','),
                market: SPOTIFY_MARKET
            },
            cacheKey: `albums:${validIds.join(',')}`
        });

        return (data?.albums || []).map((albumData) => {
            if (!albumData) return null;
            const album = {
                ...normalizeAlbum(albumData),
                label: normalizeText(albumData?.label || ''),
                genres: Array.isArray(albumData?.genres) ? albumData.genres.map(normalizeText).filter(Boolean).slice(0, 6) : [],
                copyrights: Array.isArray(albumData?.copyrights)
                    ? albumData.copyrights.map((copyrightItem) => normalizeText(copyrightItem?.text)).filter(Boolean)
                    : []
            };

            if (albumData?.tracks?.items) {
                album.tracks = albumData.tracks.items.map((track) => normalizeTrack(track, albumData));
            }
            return album;
        }).filter(Boolean);
    } catch (error) {
        console.error('getAlbums error:', error);
        return [];
    }
};

const extractSpotifyPlaylistId = (playlistInput) => {
    const normalizedInput = normalizeText(playlistInput);
    if (!normalizedInput) return '';

    const directMatch = normalizedInput.match(/^[A-Za-z0-9]{22}$/);
    if (directMatch) return directMatch[0];

    const uriMatch = normalizedInput.match(/^spotify:playlist:([A-Za-z0-9]{22})$/i);
    if (uriMatch) return uriMatch[1];

    const urlMatch = normalizedInput.match(/spotify\.com\/playlist\/([A-Za-z0-9]{22})/i);
    if (urlMatch) return urlMatch[1];

    return '';
};

const getPlaylist = async (playlistInput, { limit = 50, accessToken = '' } = {}) => {
    const playlistId = extractSpotifyPlaylistId(playlistInput);
    if (!playlistId) {
        throw new SpotifyApiError('Playlist Spotify invalide.', 400);
    }

    const fetchPlaylistMeta = async (withMarket = true) => {
        const params = withMarket ? { market: SPOTIFY_MARKET } : {};
        if (accessToken) {
            return spotifyRequestWithAccessToken(accessToken, `/playlists/${encodeURIComponent(playlistId)}`, { params });
        }

        return spotifyRequest(`/playlists/${encodeURIComponent(playlistId)}`, {
            params,
            cacheKey: `playlist:${playlistId}:${limit}:${withMarket ? SPOTIFY_MARKET : 'nomarket'}`
        });
    };

    let data = await fetchPlaylistMeta(true);

    let playlistTracks = [];

    try {
        const cappedLimit = Math.max(1, Math.min(limit, 100));
        let offset = 0;
        let withMarket = true;

        while (playlistTracks.length < cappedLimit) {
            const params = {
                ...(withMarket ? { market: SPOTIFY_MARKET } : {}),
                limit: Math.min(100, cappedLimit - playlistTracks.length),
                offset,
                additional_types: 'track'
            };
            const tracksPage = accessToken
                ? await spotifyRequestWithAccessToken(accessToken, `/playlists/${encodeURIComponent(playlistId)}/tracks`, { params })
                : await spotifyRequest(`/playlists/${encodeURIComponent(playlistId)}/tracks`, {
                    params,
                    cacheKey: `playlist-items:${playlistId}:${offset}:${cappedLimit}:${withMarket ? SPOTIFY_MARKET : 'nomarket'}`
                });

            const pageTracks = Array.isArray(tracksPage?.items)
                ? tracksPage.items
                    .map((item) => item?.track)
                    .filter((track) => track?.id && normalizeText(track?.name))
                    .map((track) => normalizeTrack(track))
                : [];

            if (!pageTracks.length && withMarket && (tracksPage?.total || data?.tracks?.total || 0) > 0) {
                withMarket = false;
                offset = 0;
                playlistTracks = [];
                data = await fetchPlaylistMeta(false);
                continue;
            }

            playlistTracks.push(...pageTracks);

            if (!tracksPage?.next || !pageTracks.length) {
                break;
            }

            offset += pageTracks.length;
        }
    } catch (error) {
        if (!isRecoverableSpotifyLookupError(error)) {
            throw error;
        }
    }

    if (!playlistTracks.length && Array.isArray(data?.tracks?.items)) {
        playlistTracks = data.tracks.items
            .map((item) => item?.track)
            .filter((track) => track?.id && normalizeText(track?.name))
            .map((track) => normalizeTrack(track))
            .slice(0, Math.max(1, Math.min(limit, 100)));
    }

    return {
        spotifyId: data?.id || playlistId,
        name: normalizeText(data?.name || 'Playlist Spotify'),
        description: normalizeText(
            String(data?.description || '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
        ),
        imageUrl: Array.isArray(data?.images) && data.images.length > 0 ? (data.images[0].url || '') : '',
        spotifyUrl: data?.external_urls?.spotify || '',
        ownerName: normalizeText(data?.owner?.display_name || ''),
        public: data?.public !== false,
        totalTracks: Number.isFinite(data?.tracks?.total) ? data.tracks.total : playlistTracks.length,
        tracks: playlistTracks
    };
};

const getDefaultArtists = async (names) => {
    const normalizedNames = Array.isArray(names) ? names.map(normalizeText).filter(Boolean) : [];
    if (!normalizedNames.length) return [];

    if (!hasSpotifyConfig()) {
        return normalizedNames.map((name, index) => buildFallbackArtist(name, index));
    }

    const results = await Promise.allSettled(
        normalizedNames.map((name) => findBestArtistMatch(name, { limit: 10 }))
    );

    const artists = [];
    const seen = new Set();

    results.forEach((result, index) => {
        const firstArtist = result.status === 'fulfilled' && result.value
            ? result.value
            : buildFallbackArtist(normalizedNames[index], index);
        const identity = (firstArtist.spotifyId || firstArtist.name).toLowerCase();
        if (identity && !seen.has(identity)) {
            seen.add(identity);
            artists.push(firstArtist);
        }
    });

    return artists;
};

const getRelatedArtists = async (artistId, fallbackArtist = null) => {
    const normalizedId = normalizeText(artistId);

    if (!normalizedId || normalizedId === 'fallback' || !hasSpotifyConfig()) {
        return [];
    }

    try {
        const data = await spotifyRequest(`/artists/${encodeURIComponent(normalizedId)}/related-artists`, {
            cacheKey: `related:${normalizedId}`
        });

        const relatedArtists = (data?.artists || [])
            .map(normalizeArtist)
            .filter((artist) => artist.spotifyId !== normalizedId && artist.name);

        if (relatedArtists.length > 0) {
            return relatedArtists;
        }
    } catch (error) {
        if (!isRecoverableSpotifyLookupError(error)) {
            throw error;
        }
    }

    return [];
};

const getArtistProfile = async (artistId, { name = '' } = {}) => {
    const normalizedId = normalizeText(artistId);
    const normalizedName = normalizeText(name);

    if (!normalizedId && !normalizedName) {
        throw new SpotifyApiError('Artiste Spotify invalide.', 400);
    }

    let artist = null;

    if (normalizedId && normalizedId !== 'fallback' && hasSpotifyConfig()) {
        artist = await getArtistById(normalizedId);
    } else if (normalizedName) {
        artist = await findBestArtistMatch(normalizedName, { limit: 10 });
    }

    if (!artist) {
        artist = buildFallbackArtist(normalizedName || normalizedId);
    }

    try {
        if (!artist.spotifyId || !hasSpotifyConfig()) {
            throw new Error('Fallback required due to missing config or ID');
        }

        const discographyItems = await getArtistAlbums(artist.spotifyId, {
            includeGroups: 'album,single,appears_on',
            limit: 20,
            artistName: artist.name
        });

        const [topTracksResult, relatedArtistsResult] = await Promise.allSettled([
            getArtistTopTracks(artist.spotifyId, { artistName: artist.name, albumCandidates: discographyItems }),
            getRelatedArtists(artist.spotifyId, artist)
        ]);

        const topTracks = topTracksResult.status === 'fulfilled' ? topTracksResult.value : [];
        const relatedArtists = relatedArtistsResult.status === 'fulfilled'
            ? relatedArtistsResult.value
            : [];

        const mainReleases = discographyItems.filter((album) => album.group !== 'appears_on');
        const albumReleases = mainReleases.filter((album) => album.group === 'album');
        const singleReleases = mainReleases.filter((album) => album.group === 'single' || album.type === 'single');
        const appearsOn = discographyItems.filter((album) => album.group === 'appears_on');

        return {
            artist,
            topTracks: topTracks.slice(0, 10),
            discography: {
                popular: mainReleases.slice(0, 10),
                albums: albumReleases.slice(0, 36),
                singles: singleReleases.slice(0, 36)
            },
            appearsOn: appearsOn.slice(0, 20),
            relatedArtists: relatedArtists.slice(0, 8)
        };
    } catch (err) {
        console.warn(`[Spotify] Failed to load full profile for artist ${artist?.name || normalizedName || normalizedId}, falling back to local:`, err.message);

        const fallbackAlbums = (artist?.name || normalizedName)
            ? await searchAlbums(artist.name || normalizedName, { limit: 30 })
            : [];

        let relatedArtists = [];
        try {
            relatedArtists = await getRelatedArtists('fallback', artist);
        } catch (e) {}

        return {
            artist,
            topTracks: [],
            discography: {
                popular: fallbackAlbums.slice(0, 10),
                albums: fallbackAlbums.slice(0, 24),
                singles: []
            },
            appearsOn: [],
            relatedArtists: relatedArtists || []
        };
    }
};

const getFeaturedPlaylists = async ({ limit = 12, country = 'FR' } = {}) => {
    return spotifyRequest('/browse/featured-playlists', {
        params: { limit, country },
        cacheKey: `featured-playlists:${country}:${limit}`
    });
};

const trySpotifyFetch = async (endpoint, params = {}) => {
    return spotifyRequest(`/${endpoint}`, { params });
};

const getNewReleases = async ({ limit = 12, country = 'FR' } = {}) => {
    const token = await getAccessToken();
    const query = new URLSearchParams({ limit: String(limit), country });
    const response = await fetch(`${SPOTIFY_API_BASE}/browse/new-releases?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new SpotifyApiError('New releases fetch failed', response.status);
    const data = await response.json();
    return (data.albums?.items || []).map(album => ({
        ...album,
        artists: album.artists,
        album: album
    }));
};

const getTopTracks = async (country = 'FR', { limit = 12 } = {}) => {
    try {
        const featured = await getFeaturedPlaylists({ limit: 1, country });
        if (!featured.playlists.items.length) throw new Error('No playlists');
        const playlistId = featured.playlists.items[0].id;
        const playlist = await getPlaylist(playlistId);
        return playlist.tracks.slice(0, limit);
    } catch (e) {
        const searchRes = await searchTracks('top 50', { limit });
        return searchRes;
    }
};

const getTrack = async (id) => {
    try {
        const data = await trySpotifyFetch(`tracks/${id}`);
        return normalizeTrack(data);
    } catch (e) {
        console.error('Spotify getTrack error:', e);
        return null;
    }
};

module.exports = {
    hasSpotifyConfig,
    searchTracks,
    searchArtists,
    searchAlbums,
    getDefaultArtists,
    getRelatedArtists,
    getArtistProfile,
    getArtistTopTracks,
    getArtistAlbums,
    enrichArtists,
    getAvailableGenreSeeds,
    getRecommendations,
    getTrack,
    getAlbum,
    getAlbums,
    getAlbumsIndividually,
    getPlaylist,
    getArtistById,
    getSpotifyAuthorizeUrl,
    exchangeAuthorizationCode,
    ensureValidUserSpotifyAuth,
    normalizeArtist,
    normalizeTrack,
    findBestArtistMatch,
    buildFallbackArtist,
    getFeaturedPlaylists,
    getNewReleases,
    getTopTracks,
    SpotifyApiError,
    SpotifyConfigError
};

const isArtistDivergent = (artistGenres = [], targetGenres = []) => {
    if (!artistGenres.length || !targetGenres.length) return false;

    const normalizedTarget = targetGenres.map(g => g.toLowerCase());
    const normalizedArtist = artistGenres.map(g => g.toLowerCase());

    const BANNED_GENRES = [
        'children', 'nursery', 'sufi', 'classical', 'nature', 'sound effects', 'speech',
        'religious', 'quran', 'islamic', 'christian', 'gospel', 'spiritual', 'chant'
    ];

    if (normalizedArtist.some(g => BANNED_GENRES.some(b => g.includes(b)))) {
        return true;
    }

    const isTargetUrban = normalizedTarget.some(g => g.includes('rap') || g.includes('hip hop') || g.includes('trap') || g.includes('urban'));
    if (isTargetUrban) {
        const isArtistTraditional = normalizedArtist.some(g => g.includes('traditional') || g.includes('world') || g.includes('folk') || g.includes('ghazal'));
        // Relax: only block if it's traditional AND definitely NOT rap.
        // If it has some rap genres, it's fine.
        if (isArtistTraditional && !normalizedArtist.some(g => g.includes('rap') || g.includes('hop') || g.includes('trap'))) {
            return true;
        }
    }

    return false;
};

const getDeepArtistRecommendations = async (artistIds = [], limit = 20, targetGenres = []) => {
    if (!artistIds.length || !hasSpotifyConfig()) return [];

    try {
        // 0. Seed Policing: Fetch genres for all seeds if not provided, and filter those that don't match target bubble
        const seedArtistData = await Promise.all(
            artistIds.filter(isValidSpotifyId).map(id => getArtistById(id).catch(() => null))
        );

        const validArtistIds = seedArtistData
            .filter(Boolean)
            .filter(artist => !isArtistDivergent(artist.genres || [], targetGenres))
            .map(artist => artist.id);

        // If all seeds were divergent or invalid, we don't proceed with Spotify seeds
        const processedArtistIds = validArtistIds;
        if (!processedArtistIds.length) return [];

        // 1. Get related artists for all primary seeds
        const allRelated = await Promise.all(
            processedArtistIds.map(id => getRelatedArtists(id).catch(() => []))
        );
        
        // 2. Pool related artists and primary artists
        const candidateArtists = [...new Set([
            ...processedArtistIds,
            ...allRelated.flat().map(a => a.spotifyId)
        ])].slice(0, 10);

        // 3. Get recommendations using these seeds
        const spotifyTracks = await getRecommendations({
            seedArtists: processedArtistIds.slice(0, 3).filter(isValidSpotifyId),
            limit: Math.max(limit, 20)
        });

        // 4. Mix in some top tracks from the original artists
        const topTracksPerArtist = await Promise.all(
            artistIds.slice(0, 2).map(id => getArtistTopTracks(id).catch(() => []))
        );

        const mixedResults = [
            ...spotifyTracks,
            ...topTracksPerArtist.flat()
        ].filter((track, index, self) => 
            index === self.findIndex((t) => t.spotifyId === track.spotifyId)
        ).filter(track => {
            // Filter out junk artists that don't match the target bubble
            const allArtistGenres = (track.artists || []).flatMap(a => a.genres || []);
            return !isArtistDivergent(allArtistGenres, targetGenres);
        });

        return mixedResults.sort(() => Math.random() - 0.5).slice(0, limit);
    } catch (err) {
        console.error('Deep recommendation error:', err);
        return [];
    }
};

module.exports.getTrackById = getTrackById;
module.exports.getDeepArtistRecommendations = getDeepArtistRecommendations;
module.exports.isArtistDivergent = isArtistDivergent;
module.exports.isValidSpotifyId = isValidSpotifyId;
