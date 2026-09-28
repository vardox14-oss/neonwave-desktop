const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../src/server.js'), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const original = { videoId: '9Et9XGVMmUw', title: "Saïf - L'avalanche", uploaderName: '84 City', duration: 125 };
const stored = { ...original, videoId: '6O8kvPpiQy8', title: "L'avalanche", uploaderName: 'Saïf' };
const track = { title: "L'avalanche", artist: 'Saïf', durationMs: 125000 };

function harness({ metadata = original, storedTracks = [stored], searchTracks = [] } = {}) {
    const routes = new Map();
    const context = vm.createContext({
        console: { log() {}, warn() {}, error() {} },
        normalizeChoiceValue: value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '',
        trackResolutionCache: new Map(), TRACK_RESOLUTION_TTL: 1000,
        fetchYouTubeVideoMetadata: async () => metadata,
        findStoredPlayableTrack: () => storedTracks,
        buildTrackResolutionQueries: () => ['Saif avalanche'],
        localYouTube: { searchMusicSongs: async () => searchTracks, searchVideos: async () => [] },
        scrapeYouTube: async () => ({ items: [] }), tryPipedFetch: async () => ({ items: [] }),
        spotify: { hasSpotifyConfig: () => false },
        app: { get: (route, handler) => routes.set(route, handler) },
    });
    vm.runInContext(
        section('const YT_POSITIVE_HINTS', '// --- BASE FETCH UTILITY') +
        section('const extractVideoId', 'const findStoredPlayableTrack') +
        section('const isDefinitiveYTCandidate', 'const formatSpotifyTrackPayload') +
        section('const resolveTrackReferenceToVideo', '// ─── Music Search') +
        section("app.get('/api/music/resolve-by-metadata'", 'const resolvePipedStreamUrl') +
        '\nglobalThis.resolve = input => resolveTrackReferenceToVideo(buildTrackReferenceFromMetadata(input));', context);
    return { context, routes };
}

test('stored labels cannot substitute Avalanche II for the 125-second original', async () => {
    const { context } = harness({ metadata: { ...stored, title: "Saïf - L'avalanche II", duration: 222 } });
    const result = await context.resolve(track);
    assert.equal(result.videoId, '');
    assert.equal(context.trackResolutionCache.size, 0);
});

test('a missing stored video is rejected', async () => {
    const { context } = harness({ metadata: null });
    assert.equal((await context.resolve(track)).videoId, '');
});

test('public metadata for a numbered sequel is rejected even without duration', async () => {
    const { context } = harness({ metadata: { ...stored, title: "Saïf - L'avalanche II", duration: 0 } });
    assert.equal((await context.resolve({ ...track, durationMs: 0 })).videoId, '');
});

test('a verified stored recording remains playable', async () => {
    const { context } = harness({ storedTracks: [original] });
    assert.equal((await context.resolve(track)).videoId, original.videoId);
});

test('a search result is not cached when final video verification fails', async () => {
    const { context } = harness({ metadata: null, storedTracks: [], searchTracks: [original] });
    assert.equal((await context.resolve(track)).videoId, '');
    assert.equal(context.trackResolutionCache.size, 0);
});

test('metadata route preserves Spotify identity and accepts seconds or milliseconds', async () => {
    for (const durationQuery of [{ duration: '125' }, { durationMs: '125000', duration: '222' }]) {
        const { context, routes } = harness({ storedTracks: [original] });
        let body;
        await routes.get('/api/music/resolve-by-metadata')({ query: {
            title: track.title, artist: track.artist, spotifyId: '2nLICdL8sEOEPOTZSDXGPQ', ...durationQuery,
        } }, { json: value => { body = value; }, status: code => { throw new Error(`HTTP ${code}`); } });
        assert.equal(body.duration, 125);
        assert.equal(body.spotifyId, '2nLICdL8sEOEPOTZSDXGPQ');
        assert.equal(context.trackResolutionCache.has('spotify:2nLICdL8sEOEPOTZSDXGPQ'), true);
    }
});
