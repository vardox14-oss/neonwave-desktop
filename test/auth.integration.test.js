const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const test = require('node:test');

const projectRoot = path.join(__dirname, '..');

const getAvailablePort = () => new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
        const { port } = probe.address();
        probe.close((error) => error ? reject(error) : resolve(port));
    });
});

const waitForServer = async (baseUrl, child, getOutput) => {
    const deadline = Date.now() + 10000;

    while (Date.now() < deadline) {
        if (child.exitCode !== null) {
            throw new Error(`Server exited early.\n${getOutput()}`);
        }

        try {
            const response = await fetch(baseUrl);
            if (response.ok) return;
        } catch {}

        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Server did not become ready.\n${getOutput()}`);
};

const requestJson = async (baseUrl, route, options = {}) => {
    const response = await fetch(`${baseUrl}${route}`, {
        ...options,
        headers: {
            'content-type': 'application/json',
            ...(options.headers || {})
        }
    });
    const body = await response.json();
    return { response, body };
};

test('first run setup creates the owner account before normal auth opens', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neonwave-setup-test-'));
    const databasePath = path.join(tempDir, 'database.json');
    const port = await getAvailablePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    const output = [];

    const child = spawn(process.execPath, ['src/server.js'], {
        cwd: projectRoot,
        env: {
            ...process.env,
            PORT: String(port),
            JWT_SECRET: 'integration-test-secret',
            SPOTIFY_CLIENT_ID: '',
            SPOTIFY_CLIENT_SECRET: '',
            NEONWAVE_DB_PATH: databasePath
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.on('data', (chunk) => output.push(chunk.toString()));
    child.stderr.on('data', (chunk) => output.push(chunk.toString()));

    try {
        await waitForServer(baseUrl, child, () => output.join(''));

        const setupStatusBefore = await requestJson(baseUrl, '/api/setup/status');
        assert.equal(setupStatusBefore.response.status, 200);
        assert.equal(setupStatusBefore.body.required, true);

        const blockedLogin = await requestJson(baseUrl, '/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'owner@neonwave.app',
                password: 'NeonWave2026!'
            })
        });
        assert.equal(blockedLogin.response.status, 403);

        const blockedRegistration = await requestJson(baseUrl, '/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                username: 'EarlyUser',
                email: 'early@test.local',
                password: 'EarlyUser123!'
            })
        });
        assert.equal(blockedRegistration.response.status, 403);

        const ownerSetup = await requestJson(baseUrl, '/api/setup/owner', {
            method: 'POST',
            body: JSON.stringify({
                username: 'Owner',
                email: 'owner@test.local',
                password: 'OwnerPass123!'
            })
        });
        assert.equal(ownerSetup.response.status, 200);
        assert.equal(ownerSetup.body.user.role, 'OWNER');
        assert.ok(ownerSetup.body.token);

        const setupStatusAfter = await requestJson(baseUrl, '/api/setup/status');
        assert.equal(setupStatusAfter.response.status, 200);
        assert.equal(setupStatusAfter.body.required, false);

        const duplicateSetup = await requestJson(baseUrl, '/api/setup/owner', {
            method: 'POST',
            body: JSON.stringify({
                username: 'SecondOwner',
                email: 'second@test.local',
                password: 'OwnerPass123!'
            })
        });
        assert.equal(duplicateSetup.response.status, 409);

        const ownerLogin = await requestJson(baseUrl, '/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'owner@test.local',
                password: 'OwnerPass123!'
            })
        });
        assert.equal(ownerLogin.response.status, 200);

        const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
        assert.equal(database.users.length, 1);
        assert.equal(database.users[0].role, 'OWNER');
        assert.match(database.users[0].password, /^\$2[aby]\$/);
        assert.equal(database.setupCompleted, true);
    } finally {
        child.kill();
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test('authentication and password storage work end to end', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neonwave-test-'));
    const databasePath = path.join(tempDir, 'database.json');
    const port = await getAvailablePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    const ownerPassword = 'LegacyOwner123!';
    const output = [];
    const currentWeekStart = new Date();
    currentWeekStart.setHours(0, 0, 0, 0);
    currentWeekStart.setDate(currentWeekStart.getDate() - ((currentWeekStart.getDay() + 6) % 7));
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const recapPlayDate = (day, hour) => {
        const date = new Date(previousWeekStart);
        date.setDate(date.getDate() + day);
        date.setHours(hour, 0, 0, 0);
        return date.toISOString();
    };

    fs.writeFileSync(databasePath, JSON.stringify({
        users: [{
            id: 'owner-test',
            username: 'Owner',
            email: 'owner@test.local',
            password: ownerPassword,
            role: 'OWNER',
            banned: false,
            lastIP: '',
            createdAt: new Date().toISOString(),
            history: [
                {
                    videoId: 'maes-track-one',
                    title: 'Distant',
                    artist: 'Maes',
                    thumb: 'https://example.test/maes.jpg',
                    durationMs: 180000,
                    playedAt: recapPlayDate(1, 10)
                },
                {
                    videoId: 'maes-track-two',
                    title: 'Magie',
                    artist: 'Maes',
                    thumb: 'https://example.test/maes.jpg',
                    durationMs: 240000,
                    playedAt: recapPlayDate(3, 16)
                },
                {
                    videoId: 'maes-track-one',
                    title: 'Distant',
                    artist: 'Maes',
                    thumb: 'https://example.test/maes.jpg',
                    durationMs: 180000,
                    playedAt: recapPlayDate(5, 20)
                },
                {
                    videoId: 'booba-track-one',
                    title: 'DKR',
                    artist: 'Booba',
                    thumb: 'https://example.test/booba.jpg',
                    durationMs: 120000,
                    playedAt: recapPlayDate(6, 14)
                }
            ],
            favorites: [],
            likedTracks: [],
            playlists: []
        }],
        bannedIPs: []
    }, null, 2));

    const child = spawn(process.execPath, ['src/server.js'], {
        cwd: projectRoot,
        env: {
            ...process.env,
            PORT: String(port),
            JWT_SECRET: 'integration-test-secret',
            SPOTIFY_CLIENT_ID: '',
            SPOTIFY_CLIENT_SECRET: '',
            NEONWAVE_DB_PATH: databasePath
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.on('data', (chunk) => output.push(chunk.toString()));
    child.stderr.on('data', (chunk) => output.push(chunk.toString()));

    try {
        await waitForServer(baseUrl, child, () => output.join(''));

        const ownerLogin = await requestJson(baseUrl, '/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'owner@test.local',
                password: ownerPassword
            })
        });
        assert.equal(ownerLogin.response.status, 200);
        assert.ok(ownerLogin.body.token);

        const weeklyRecap = await requestJson(baseUrl, '/api/user/weekly-recap', {
            headers: {
                authorization: `Bearer ${ownerLogin.body.token}`
            }
        });
        assert.equal(weeklyRecap.response.status, 200);
        assert.equal(weeklyRecap.body.hasData, true);
        assert.equal(weeklyRecap.body.totalPlays, 4);
        assert.equal(weeklyRecap.body.totalMinutes, 12);
        assert.equal(weeklyRecap.body.topArtist.name, 'Maes');
        assert.equal(weeklyRecap.body.topArtist.plays, 3);
        assert.match(weeklyRecap.body.topArtist.thumb, /^https:\/\/cdn-images\.dzcdn\.net\/images\/artist\//);
        assert.equal(weeklyRecap.body.topTrack.title, 'Distant');
        assert.equal(weeklyRecap.body.topTrack.plays, 2);

        const migratedDb = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
        assert.match(migratedDb.users[0].password, /^\$2[aby]\$/);
        assert.notEqual(migratedDb.users[0].password, ownerPassword);

        const registration = await requestJson(baseUrl, '/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                username: 'Listener',
                email: 'listener@test.local',
                password: 'Listener123!'
            })
        });
        assert.equal(registration.response.status, 200);

        const userLogin = await requestJson(baseUrl, '/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'listener@test.local',
                password: 'Listener123!'
            })
        });
        assert.equal(userLogin.response.status, 200);
        assert.ok(userLogin.body.token);

        const passwordUpdate = await requestJson(baseUrl, '/api/user/profile', {
            method: 'PATCH',
            headers: {
                authorization: `Bearer ${userLogin.body.token}`
            },
            body: JSON.stringify({ password: 'UpdatedListener123!' })
        });
        assert.equal(passwordUpdate.response.status, 200);

        const oldPasswordLogin = await requestJson(baseUrl, '/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'listener@test.local',
                password: 'Listener123!'
            })
        });
        assert.equal(oldPasswordLogin.response.status, 401);

        const newPasswordLogin = await requestJson(baseUrl, '/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'listener@test.local',
                password: 'UpdatedListener123!'
            })
        });
        assert.equal(newPasswordLogin.response.status, 200);

        const adminCreate = await requestJson(baseUrl, '/api/admin/users', {
            method: 'POST',
            headers: {
                authorization: `Bearer ${ownerLogin.body.token}`
            },
            body: JSON.stringify({
                email: 'created-by-admin@test.local',
                password: 'AdminCreated123!',
                role: 'USER'
            })
        });
        assert.equal(adminCreate.response.status, 200);

        const invalidRoleCreate = await requestJson(baseUrl, '/api/admin/users', {
            method: 'POST',
            headers: {
                authorization: `Bearer ${ownerLogin.body.token}`
            },
            body: JSON.stringify({
                email: 'invalid-role@test.local',
                password: 'AdminCreated123!',
                role: 'OWNER'
            })
        });
        assert.equal(invalidRoleCreate.response.status, 400);

        const invalidIPBan = await requestJson(baseUrl, '/api/admin/ban-ip', {
            method: 'POST',
            headers: {
                authorization: `Bearer ${ownerLogin.body.token}`
            },
            body: JSON.stringify({ ip: 'not-an-ip' })
        });
        assert.equal(invalidIPBan.response.status, 400);

        const adminAccount = await requestJson(baseUrl, '/api/admin/users', {
            method: 'POST',
            headers: {
                authorization: `Bearer ${ownerLogin.body.token}`
            },
            body: JSON.stringify({
                email: 'admin@test.local',
                password: 'AdminAccount123!',
                role: 'ADMIN'
            })
        });
        assert.equal(adminAccount.response.status, 200);

        const adminLogin = await requestJson(baseUrl, '/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'admin@test.local',
                password: 'AdminAccount123!'
            })
        });
        assert.equal(adminLogin.response.status, 200);

        const adminCreatingAdmin = await requestJson(baseUrl, '/api/admin/users', {
            method: 'POST',
            headers: {
                authorization: `Bearer ${adminLogin.body.token}`
            },
            body: JSON.stringify({
                email: 'second-admin@test.local',
                password: 'SecondAdmin123!',
                role: 'ADMIN'
            })
        });
        assert.equal(adminCreatingAdmin.response.status, 403);

        const adminCreatedLogin = await requestJson(baseUrl, '/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'created-by-admin@test.local',
                password: 'AdminCreated123!'
            })
        });
        assert.equal(adminCreatedLogin.response.status, 200);

        const finalDb = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
        finalDb.users.forEach((user) => {
            assert.match(user.password, /^\$2[aby]\$/);
        });
    } finally {
        child.kill();
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test('local tracks and playlist management work end to end', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neonwave-library-test-'));
    const databasePath = path.join(tempDir, 'database.json');
    const port = await getAvailablePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    const output = [];

    const child = spawn(process.execPath, ['src/server.js'], {
        cwd: projectRoot,
        env: {
            ...process.env,
            PORT: String(port),
            JWT_SECRET: 'integration-test-secret',
            SPOTIFY_CLIENT_ID: '',
            SPOTIFY_CLIENT_SECRET: '',
            NEONWAVE_DB_PATH: databasePath
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.on('data', (chunk) => output.push(chunk.toString()));
    child.stderr.on('data', (chunk) => output.push(chunk.toString()));

    try {
        await waitForServer(baseUrl, child, () => output.join(''));

        const setup = await requestJson(baseUrl, '/api/setup/owner', {
            method: 'POST',
            body: JSON.stringify({
                username: 'LibraryOwner',
                email: 'library@test.local',
                password: 'LibraryOwner123!'
            })
        });
        assert.equal(setup.response.status, 200);
        const authorization = `Bearer ${setup.body.token}`;

        const fakeMp3 = Buffer.from('ID3-neonwave-test-audio').toString('base64');
        const imported = await requestJson(baseUrl, '/api/user/local-tracks', {
            method: 'POST',
            headers: { authorization },
            body: JSON.stringify({
                filename: 'Artist - Personal Song.mp3',
                mimeType: 'audio/mpeg',
                data: `data:audio/mpeg;base64,${fakeMp3}`,
                title: 'Personal Song',
                artist: 'Artist',
                durationMs: 123000
            })
        });
        assert.equal(imported.response.status, 200);
        assert.equal(imported.body.source, 'local');
        assert.match(imported.body.id, /^local-/);

        const stream = await fetch(`${baseUrl}${imported.body.streamUrl}`, {
            headers: { authorization }
        });
        assert.equal(stream.status, 200);
        assert.equal(Buffer.from(await stream.arrayBuffer()).toString(), 'ID3-neonwave-test-audio');

        const playlist = await requestJson(baseUrl, '/api/user/playlists', {
            method: 'POST',
            headers: { authorization },
            body: JSON.stringify({ name: 'Studio Mix' })
        });
        assert.equal(playlist.response.status, 200);

        const addLocal = await requestJson(baseUrl, `/api/user/playlists/${playlist.body.id}/tracks`, {
            method: 'POST',
            headers: { authorization },
            body: JSON.stringify(imported.body)
        });
        assert.equal(addLocal.response.status, 200);

        const addRemote = await requestJson(baseUrl, `/api/user/playlists/${playlist.body.id}/tracks`, {
            method: 'POST',
            headers: { authorization },
            body: JSON.stringify({
                videoId: 'abcdefghijk',
                title: 'Remote Song',
                artist: 'Remote Artist'
            })
        });
        assert.equal(addRemote.response.status, 200);

        const reordered = await requestJson(baseUrl, `/api/user/playlists/${playlist.body.id}/reorder`, {
            method: 'PATCH',
            headers: { authorization },
            body: JSON.stringify({ order: ['abcdefghijk', imported.body.id] })
        });
        assert.equal(reordered.response.status, 200);
        assert.equal(reordered.body.tracks[0].videoId, 'abcdefghijk');

        const share = await requestJson(baseUrl, `/api/user/playlists/${playlist.body.id}/share`, {
            method: 'POST',
            headers: { authorization },
            body: JSON.stringify({})
        });
        assert.equal(share.response.status, 200);
        assert.match(share.body.shareUrl, /^\/share\/share-/);

        const sharedPayload = await requestJson(baseUrl, `/api/playlists/shared/${share.body.shareToken}`);
        assert.equal(sharedPayload.response.status, 200);
        assert.equal(sharedPayload.body.name, 'Studio Mix');
        assert.equal(sharedPayload.body.tracks.length, 2);
    } finally {
        child.kill();
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
