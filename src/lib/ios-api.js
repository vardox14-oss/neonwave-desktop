const crypto = require('node:crypto');
const fs = require('node:fs');
const jwt = require('jsonwebtoken');

function installIOSAPI(app, deps, options = {}) {
    const env = options.env || process.env;
    const request = options.fetch || fetch;
    const pending = new Map();
    const tickets = new Map();
    const appleChallenges = new Map();
    let appleKeys = { keys: [], expires: 0 };
    const now = options.now || Date.now;
    const random = () => crypto.randomBytes(32).toString('base64url');
    const hash = value => crypto.createHash('sha256').update(value).digest('base64url');
    const validProof = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43,128}$/.test(value);
    const clean = map => { for (const [key, entry] of map) if (entry.expires < now()) map.delete(key); };
    const cookie = { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/ios/auth/google' };
    const googleConfig = () => {
        try {
            const url = new URL(env.GOOGLE_IOS_REDIRECT_URI);
            if (url.protocol !== 'https:' && !(env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname))) return null;
            if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
            return { clientId: env.GOOGLE_CLIENT_ID, secret: env.GOOGLE_CLIENT_SECRET, redirect: url.href };
        } catch { return null; }
    };
    const appleConfigured = () => Boolean(env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY && /^[a-fA-F0-9]{64}$/.test(env.APPLE_TOKEN_ENCRYPTION_KEY || ''));
    const callback = (res, state, values) => res.redirect(`neonwave://auth?${new URLSearchParams({ state, ...values })}`);
    const appleSecret = () => jwt.sign({}, env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'), {
        algorithm: 'ES256', keyid: env.APPLE_KEY_ID, issuer: env.APPLE_TEAM_ID,
        audience: 'https://appleid.apple.com', subject: env.APPLE_CLIENT_ID, expiresIn: '5m'
    });
    const encrypt = value => {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(env.APPLE_TOKEN_ENCRYPTION_KEY, 'hex'), iv);
        const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
        return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
    };
    const decrypt = value => {
        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(env.APPLE_TOKEN_ENCRYPTION_KEY, 'hex'), Buffer.from(value.iv, 'base64'));
        decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
        return Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]).toString('utf8');
    };
    const verifyApple = async token => {
        const decoded = jwt.decode(token, { complete: true });
        if (!decoded || decoded.header.alg !== 'RS256' || !decoded.header.kid) throw new Error('Invalid Apple token');
        if (appleKeys.expires < now() || !appleKeys.keys.some(key => key.kid === decoded.header.kid)) {
            const response = await request('https://appleid.apple.com/auth/keys', { signal: AbortSignal.timeout(15000) });
            if (!response.ok) throw new Error('Apple keys unavailable');
            const body = await response.json();
            appleKeys = { keys: Array.isArray(body.keys) ? body.keys : [], expires: now() + 3600000 };
        }
        const key = appleKeys.keys.find(key => key.kid === decoded.header.kid && key.kty === 'RSA');
        if (!key) throw new Error('Unknown Apple key');
        const payload = jwt.verify(token, crypto.createPublicKey({ key, format: 'jwk' }), { algorithms: ['RS256'], issuer: 'https://appleid.apple.com', audience: env.APPLE_CLIENT_ID, clockTolerance: 5 });
        if (!payload.sub || !payload.exp) throw new Error('Incomplete Apple token');
        return payload;
    };
    function identityUser(provider, identity, req, db) {
        if (deps.isSetupRequired(db)) throw new Error('setup_required');
        const ip = deps.getClientIP(req);
        if (db.bannedIPs.includes(ip)) throw new Error('account_unavailable');
        const key = `${provider}Sub`;
        let user = db.users.find(user => user[key] === identity.sub);
        if (!user) {
            if (!deps.isValidEmail(identity.email)) throw new Error('unverified_email');
            if (db.users.some(user => user.email.toLowerCase() === identity.email.toLowerCase())) throw new Error('email_exists');
            if (env.ALLOW_PUBLIC_REGISTRATION === 'false') throw new Error('registration_closed');
            user = { id: deps.createUserId(), [key]: identity.sub, email: identity.email.toLowerCase(), username: String(identity.name || identity.email.split('@')[0]).slice(0, 24), password: null, role: 'USER', banned: false, createdAt: new Date().toISOString(), history: [], favorites: [], likedTracks: [], playlists: [], localTracks: [], sharedPlaylists: [], ...deps.createDefaultMusicState() };
            db.users.push(user);
        }
        if (user.banned) throw new Error('account_unavailable');
        user.lastIP = ip;
        return user;
    }
    const publicErrors = new Set(['setup_required', 'account_unavailable', 'unverified_email', 'email_exists', 'registration_closed']);
    app.use('/api/ios/auth', deps.limiter, (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer'); next(); });
    app.get('/api/ios/auth/providers', (_req, res) => res.json({ google: Boolean(googleConfig()), apple: appleConfigured(), registration: env.ALLOW_PUBLIC_REGISTRATION !== 'false' }));
    app.get('/api/ios/auth/google', (req, res) => {
        const config = googleConfig();
        if (!config) return res.status(503).json({ error: 'Connexion Google indisponible.' });
        if (!validProof(req.query.challenge) || !validProof(req.query.state)) return res.status(400).json({ error: 'Requête de connexion invalide.' });
        clean(pending);
        if (pending.size >= 1000) return res.status(429).json({ error: 'Réessayez plus tard.' });
        const state = random(), verifier = random();
        pending.set(state, { verifier, appState: req.query.state, challenge: req.query.challenge, expires: now() + 600000 });
        res.cookie('nw_ios_oauth', state, { ...cookie, maxAge: 600000 });
        res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirect, response_type: 'code', scope: 'openid email profile', state, code_challenge: hash(verifier), code_challenge_method: 'S256', prompt: 'select_account' })}`);
    });
    app.get('/api/ios/auth/google/callback', async (req, res) => {
        const state = typeof req.query.state === 'string' ? req.query.state : '';
        const entry = pending.get(state);
        res.clearCookie('nw_ios_oauth', cookie);
        if (!entry || entry.expires < now() || req.cookies?.nw_ios_oauth !== state) return res.status(400).json({ error: 'Cette demande de connexion a expiré.' });
        pending.delete(state);
        if (req.query.error) return callback(res, entry.appState, { error: 'cancelled' });
        const config = googleConfig();
        if (!config || typeof req.query.code !== 'string') return callback(res, entry.appState, { error: 'provider_error' });
        try {
            const response = await request('https://oauth2.googleapis.com/token', {
                method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(15000),
                body: new URLSearchParams({ code: req.query.code, client_id: config.clientId, client_secret: config.secret, redirect_uri: config.redirect, grant_type: 'authorization_code', code_verifier: entry.verifier })
            });
            if (!response.ok) throw new Error('provider_error');
            const tokens = await response.json();
            if (!tokens.access_token) throw new Error('provider_error');
            const userResponse = await request('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(15000) });
            if (!userResponse.ok) throw new Error('provider_error');
            const identity = await userResponse.json();
            if (!identity.sub || identity.email_verified !== true) throw new Error('unverified_email');
            const db = deps.getDB();
            const user = identityUser('google', identity, req, db);
            deps.saveDB(db);
            clean(tickets);
            const ticket = random();
            tickets.set(ticket, { userID: user.id, challenge: entry.challenge, expires: now() + 60000 });
            callback(res, entry.appState, { ticket });
        } catch (error) { callback(res, entry.appState, { error: publicErrors.has(error.message) ? error.message : 'provider_error' }); }
    });
    app.post('/api/ios/auth/exchange', (req, res) => {
        const { ticket, verifier } = req.body || {};
        const entry = typeof ticket === 'string' ? tickets.get(ticket) : null;
        if (!entry || entry.expires < now() || !validProof(verifier) || hash(verifier) !== entry.challenge) return res.status(401).json({ error: 'Connexion expirée ou invalide. Réessayez.' });
        tickets.delete(ticket);
        const db = deps.getDB();
        const user = db.users.find(user => user.id === entry.userID);
        if (!user || user.banned || db.bannedIPs.includes(deps.getClientIP(req))) return res.status(403).json({ error: 'Compte indisponible.' });
        res.json(deps.issueAuthSession(res, user, { rememberMe: true }));
    });
    app.post('/api/ios/auth/apple/challenge', (_req, res) => {
        if (!appleConfigured()) return res.status(503).json({ error: 'Connexion Apple indisponible.' });
        clean(appleChallenges);
        if (appleChallenges.size >= 1000) return res.status(429).json({ error: 'Réessayez plus tard.' });
        const id = random(), nonce = random();
        appleChallenges.set(id, { nonce, expires: now() + 600000 });
        res.json({ id, nonce });
    });
    app.post('/api/ios/auth/apple', async (req, res) => {
        const { challengeID, identityToken, authorizationCode, username } = req.body || {};
        const challenge = typeof challengeID === 'string' ? appleChallenges.get(challengeID) : null;
        if (!appleConfigured() || !challenge || challenge.expires < now() || typeof identityToken !== 'string' || typeof authorizationCode !== 'string') return res.status(401).json({ error: 'Connexion Apple expirée. Réessayez.' });
        appleChallenges.delete(challengeID);
        try {
            const identity = await verifyApple(identityToken);
            const expected = crypto.createHash('sha256').update(challenge.nonce).digest('hex');
            if (identity.nonce !== expected || ![true, 'true'].includes(identity.email_verified)) throw new Error('unverified_email');
            const response = await request('https://appleid.apple.com/auth/token', {
                method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(15000),
                body: new URLSearchParams({ client_id: env.APPLE_CLIENT_ID, client_secret: appleSecret(), code: authorizationCode, grant_type: 'authorization_code' })
            });
            if (!response.ok) throw new Error('provider_error');
            const tokens = await response.json();
            const exchangedIdentity = await verifyApple(tokens.id_token);
            if (exchangedIdentity.sub !== identity.sub || !tokens.refresh_token) throw new Error('provider_error');
            const db = deps.getDB();
            const user = identityUser('apple', { ...identity, name: typeof username === 'string' ? username : '' }, req, db);
            user.appleRefreshToken = encrypt(tokens.refresh_token);
            deps.saveDB(db);
            res.json(deps.issueAuthSession(res, user, { rememberMe: true }));
        } catch (error) {
            const message = error.message === 'email_exists' ? 'Cet e-mail possède déjà un compte. Connectez-vous avec votre mot de passe.' : 'La connexion Apple a échoué. Réessayez.';
            res.status(401).json({ error: message });
        }
    });
    app.get('/api/ios/library', deps.authenticate, (req, res) => {
        const user = deps.getDB().users.find(user => user.id === req.user.id);
        if (!user) return res.status(401).json({ error: 'Compte introuvable.' });
        // This iOS catalog exposes only files owned by the account. No stream-ripping resolver.
        res.setHeader('Cache-Control', 'private, no-store');
        res.json({ tracks: (user.localTracks || []).map(deps.getLocalTrackPublicPayload) });
    });
    app.delete('/api/ios/account', deps.authenticate, async (req, res) => {
        let db = deps.getDB();
        const user = db.users.find(user => user.id === req.user.id);
        if (!user) return res.status(401).json({ error: 'Compte introuvable.' });
        if (user.role === 'OWNER') return res.status(409).json({ error: 'Transférez la propriété du serveur à un autre administrateur avant de supprimer ce compte.' });
        if (user.appleRefreshToken) {
            try {
                if (!appleConfigured()) throw new Error('Apple unavailable');
                const response = await request('https://appleid.apple.com/auth/revoke', {
                    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(15000),
                    body: new URLSearchParams({ client_id: env.APPLE_CLIENT_ID, client_secret: appleSecret(), token: decrypt(user.appleRefreshToken), token_type_hint: 'refresh_token' })
                });
                if (!response.ok) throw new Error('Revocation failed');
            } catch { return res.status(503).json({ error: 'Apple est temporairement indisponible. Réessayez la suppression dans quelques minutes.' }); }
        }
        // Re-read after asynchronous revocation so concurrent user changes are preserved.
        db = deps.getDB();
        try {
            fs.rmSync(deps.getLocalTrackUserDir(user.id), { recursive: true, force: true });
            db.users = db.users.filter(account => account.id !== user.id);
            deps.saveDB(db);
            // The existing atomic writer keeps the previous database as .bak.
            // Rotate again so the account is also removed from that recovery copy.
            deps.saveDB(db);
            res.json({ success: true });
        } catch { res.status(500).json({ error: 'La suppression n’a pas pu aboutir. Réessayez.' }); }
    });
}

module.exports = { installIOSAPI };
