const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { installIOSAPI } = require('../src/lib/ios-api');

const proof = () => crypto.randomBytes(32).toString('base64url');
const hash = value => crypto.createHash('sha256').update(value).digest('base64url');
const json = value => ({ ok: true, json: async () => value });

async function fixture(t, { env = {}, providerFetch, users = [], clock } = {}) {
    const app = express(); app.use(express.json()); app.use(cookieParser());
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'neonwave-ios-'));
    let db = { users: [{ id: 'owner', email: 'owner@test.local', role: 'OWNER' }, ...users], bannedIPs: [] };
    const deps = {
        limiter: (_req, _res, next) => next(), getDB: () => structuredClone(db), saveDB: value => { db = structuredClone(value); },
        isSetupRequired: value => !value.users.some(user => user.role === 'OWNER'), isValidEmail: email => typeof email === 'string' && email.includes('@'),
        getClientIP: () => '127.0.0.1', createUserId: () => crypto.randomUUID(), createDefaultMusicState: () => ({}),
        issueAuthSession: (_res, user) => ({ token: `session-${user.id}`, user: { id: user.id, email: user.email, username: user.username, role: user.role } }),
        authenticate: (req, res, next) => { const id = req.headers.authorization?.replace('Bearer ', ''); if (!id) return res.status(401).json({ error: 'Auth requis' }); req.user = { id }; next(); },
        getLocalTrackPublicPayload: track => ({ id: track.id, title: track.title, artist: track.artist || '', durationMs: 0 }),
        getLocalTrackUserDir: id => path.join(temp, id)
    };
    installIOSAPI(app, deps, { env, fetch: providerFetch || (() => { throw new Error('Unexpected provider request'); }), now: clock });
    const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); fs.rmSync(temp, { recursive: true, force: true }); });
    const request = (route, options = {}) => fetch(`${base}${route}`, { redirect: 'manual', ...options });
    const post = (route, body) => request(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { request, post, db: () => structuredClone(db), temp };
}
const googleEnv = { GOOGLE_CLIENT_ID: 'google-client', GOOGLE_CLIENT_SECRET: 'google-secret', GOOGLE_IOS_REDIRECT_URI: 'https://api.example.test/api/ios/auth/google/callback' };
const googleFetch = identity => async url => {
    if (url === 'https://oauth2.googleapis.com/token') return json({ access_token: 'provider-access' });
    if (url === 'https://openidconnect.googleapis.com/v1/userinfo') return json(identity);
    throw new Error('Unexpected URL');
};
async function googleStart(f, verifier = proof()) {
    const state = proof();
    const start = await f.request(`/api/ios/auth/google?${new URLSearchParams({ state, challenge: hash(verifier) })}`);
    assert.equal(start.status, 302);
    const providerURL = new URL(start.headers.get('location'));
    assert.equal(providerURL.hostname, 'accounts.google.com');
    assert.equal(providerURL.searchParams.get('code_challenge_method'), 'S256');
    return { verifier, state, providerState: providerURL.searchParams.get('state'), cookie: start.headers.get('set-cookie').split(';')[0] };
}
async function googleFinish(f, started) {
    return f.request(`/api/ios/auth/google/callback?state=${started.providerState}&code=provider-code`, { headers: { cookie: started.cookie } });
}

test('iOS reports unconfigured social providers and rejects forged exchange tickets', async t => {
    const f = await fixture(t);
    assert.deepEqual(await (await f.request('/api/ios/auth/providers')).json(), { google: false, apple: false, registration: true });
    assert.equal((await f.post('/api/ios/auth/exchange', { ticket: proof(), verifier: proof() })).status, 401);
    assert.equal((await f.post('/api/ios/auth/apple/challenge', {})).status, 503);
});

test('Google requires browser state binding, native PKCE, and one-use tickets', async t => {
    const f = await fixture(t, { env: googleEnv, providerFetch: googleFetch({ sub: 'google-sub', email: 'new@test.local', name: 'New', email_verified: true }) });
    const started = await googleStart(f);
    assert.equal((await f.request(`/api/ios/auth/google/callback?state=${started.providerState}&code=code`)).status, 400);
    const finish = await googleFinish(f, started);
    const callback = new URL(finish.headers.get('location'));
    assert.equal(callback.protocol, 'neonwave:'); assert.equal(callback.searchParams.get('state'), started.state);
    const ticket = callback.searchParams.get('ticket'); assert.ok(ticket); assert.equal(callback.searchParams.has('token'), false);
    assert.equal((await f.post('/api/ios/auth/exchange', { ticket, verifier: proof() })).status, 401);
    const exchange = await f.post('/api/ios/auth/exchange', { ticket, verifier: started.verifier });
    assert.equal(exchange.status, 200); assert.equal((await exchange.json()).user.role, 'USER');
    assert.equal((await f.post('/api/ios/auth/exchange', { ticket, verifier: started.verifier })).status, 401);
    assert.equal((await googleFinish(f, started)).status, 400);
    assert.equal(f.db().users.filter(user => user.googleSub === 'google-sub').length, 1);
});

test('Google never links an existing password account by matching its email', async t => {
    const f = await fixture(t, { env: googleEnv, users: [{ id: 'existing', role: 'USER', email: 'existing@test.local', password: 'hash' }], providerFetch: googleFetch({ sub: 'attacker', email: 'existing@test.local', email_verified: true }) });
    const finish = await googleFinish(f, await googleStart(f));
    assert.equal(new URL(finish.headers.get('location')).searchParams.get('error'), 'email_exists');
    assert.equal(f.db().users.find(user => user.id === 'existing').googleSub, undefined);
});

test('Google rejects unverified email, expired requests and closed registrations', async t => {
    for (const [verified, registration, expected] of [[false, 'true', 'unverified_email'], [true, 'false', 'registration_closed']]) {
        const f = await fixture(t, { env: { ...googleEnv, ALLOW_PUBLIC_REGISTRATION: registration }, providerFetch: googleFetch({ sub: 'sub', email: 'new@test.local', email_verified: verified }) });
        const response = await googleFinish(f, await googleStart(f));
        assert.equal(new URL(response.headers.get('location')).searchParams.get('error'), expected);
    }
    let clock = Date.now();
    const f = await fixture(t, { env: googleEnv, clock: () => clock });
    const started = await googleStart(f); clock += 600001;
    assert.equal((await googleFinish(f, started)).status, 400);
});

test('native library includes only the authenticated account personal files', async t => {
    const f = await fixture(t, { users: [
        { id: 'a', email: 'a@test.local', role: 'USER', localTracks: [{ id: 'local-a', title: 'My file' }], likedTracks: [{ videoId: 'youtube1234' }] },
        { id: 'b', email: 'b@test.local', role: 'USER', localTracks: [{ id: 'local-b', title: 'Private' }] }
    ] });
    assert.equal((await f.request('/api/ios/library')).status, 401);
    const response = await f.request('/api/ios/library', { headers: { authorization: 'Bearer a' } });
    const data = await response.json(); assert.deepEqual(data.tracks.map(track => track.id), ['local-a']);
    assert.equal((await f.request('/api/ios/library', { headers: { authorization: 'Bearer deleted' } })).status, 401);
});

test('account deletion removes personal files and invalidates native library access', async t => {
    const f = await fixture(t, { users: [{ id: 'a', role: 'USER', email: 'a@test.local' }] });
    fs.mkdirSync(path.join(f.temp, 'a')); fs.writeFileSync(path.join(f.temp, 'a', 'track.mp3'), 'personal audio');
    const response = await f.request('/api/ios/account', { method: 'DELETE', headers: { authorization: 'Bearer a' } });
    assert.equal(response.status, 200); assert.equal(fs.existsSync(path.join(f.temp, 'a')), false);
    assert.equal(f.db().users.some(user => user.id === 'a'), false);
    assert.equal((await f.request('/api/ios/library', { headers: { authorization: 'Bearer a' } })).status, 401);
});

test('Apple verifies issuer, audience and nonce, encrypts refresh tokens, and revokes on deletion', async t => {
    const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const ec = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const jwk = { ...rsa.publicKey.export({ format: 'jwk' }), kid: 'apple-key', alg: 'RS256', use: 'sig' };
    const env = { APPLE_CLIENT_ID: 'app.neonwave.ios', APPLE_TEAM_ID: 'team', APPLE_KEY_ID: 'client-key', APPLE_PRIVATE_KEY: ec.privateKey.export({ type: 'pkcs8', format: 'pem' }), APPLE_TOKEN_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex') };
    const sign = (nonce, audience = env.APPLE_CLIENT_ID) => jwt.sign({ sub: 'apple-sub', email: 'apple@test.local', email_verified: 'true', nonce }, rsa.privateKey, { algorithm: 'RS256', keyid: 'apple-key', audience, issuer: 'https://appleid.apple.com', expiresIn: '5m' });
    let exchangedToken, revoked = false;
    const f = await fixture(t, { env, providerFetch: async (url, options) => {
        if (url.endsWith('/keys')) return json({ keys: [jwk] });
        if (url.endsWith('/token')) return json({ id_token: exchangedToken, refresh_token: 'apple-refresh-sensitive' });
        if (url.endsWith('/revoke')) { assert.equal(options.body.get('token'), 'apple-refresh-sensitive'); revoked = true; return json({}); }
        throw new Error('Unexpected Apple request');
    } });
    const attempt = async (audience, goodNonce) => {
        const challenge = await (await f.post('/api/ios/auth/apple/challenge', {})).json();
        const nonce = crypto.createHash('sha256').update(challenge.nonce).digest('hex');
        exchangedToken = sign(nonce);
        return f.post('/api/ios/auth/apple', { challengeID: challenge.id, identityToken: sign(goodNonce ? nonce : 'wrong', audience), authorizationCode: 'valid-code', username: 'Apple User' });
    };
    assert.equal((await attempt('wrong-audience', true)).status, 401);
    assert.equal((await attempt(env.APPLE_CLIENT_ID, false)).status, 401);
    const response = await attempt(env.APPLE_CLIENT_ID, true);
    assert.equal(response.status, 200); const account = (await response.json()).user;
    const stored = f.db().users.find(user => user.id === account.id);
    assert.equal(JSON.stringify(stored).includes('apple-refresh-sensitive'), false);
    assert.ok(stored.appleRefreshToken.data);
    assert.equal((await f.request('/api/ios/account', { method: 'DELETE', headers: { authorization: `Bearer ${account.id}` } })).status, 200);
    assert.equal(revoked, true);
});
