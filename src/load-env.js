const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

const UNSAFE_JWT_SECRET_PATTERNS = [
    /^neonwave-secret-2026$/i,
    /change[-_ ]?me/i,
    /super[-_ ]?secret/i
];

const uniquePaths = (paths = []) => {
    const seen = new Set();

    return paths
        .filter(Boolean)
        .map((currentPath) => path.resolve(currentPath))
        .filter((currentPath) => {
            if (seen.has(currentPath)) return false;
            seen.add(currentPath);
            return true;
        });
};

const isUnsafeJwtSecret = (value) => {
    if (typeof value !== 'string') return true;
    const trimmedValue = value.trim();
    return trimmedValue.length < 32 || UNSAFE_JWT_SECRET_PATTERNS.some((pattern) => pattern.test(trimmedValue));
};

const upsertEnvValue = (envPath, key, value) => {
    if (!envPath) return;

    fs.mkdirSync(path.dirname(envPath), { recursive: true });
    const existingContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const line = `${key}=${JSON.stringify(value)}`;
    const matcher = new RegExp(`^\\s*${key}\\s*=.*$`, 'm');
    const nextContent = matcher.test(existingContent)
        ? existingContent.replace(matcher, line)
        : `${existingContent.trimEnd()}${existingContent.trim() ? '\n' : ''}${line}\n`;

    fs.writeFileSync(envPath, nextContent);
};

const ensureRuntimeJwtSecret = (envPath = '') => {
    if (!isUnsafeJwtSecret(process.env.JWT_SECRET)) return false;

    const generatedSecret = crypto.randomBytes(48).toString('hex');
    process.env.JWT_SECRET = generatedSecret;
    upsertEnvValue(envPath, 'JWT_SECRET', generatedSecret);
    return true;
};

const initializeEnv = ({ appDataPath = '', baseDir = process.cwd(), resourcesPath = process.resourcesPath || '' } = {}) => {
    const appDataEnvPath = appDataPath ? path.join(appDataPath, '.env') : '';
    const bundledCandidates = uniquePaths([
        resourcesPath ? path.join(resourcesPath, '.env') : '',
        path.join(baseDir, '.env'),
        path.join(baseDir, '..', '.env')
    ]);

    if (appDataEnvPath && !fs.existsSync(appDataEnvPath)) {
        const bootstrapSource = bundledCandidates.find((candidatePath) => fs.existsSync(candidatePath));
        if (bootstrapSource) {
            fs.mkdirSync(path.dirname(appDataEnvPath), { recursive: true });
            fs.copyFileSync(bootstrapSource, appDataEnvPath);
        }
    }

    const loadCandidates = uniquePaths([
        appDataEnvPath,
        ...bundledCandidates
    ]);

    const loadedPaths = [];

    loadCandidates.forEach((candidatePath) => {
        if (!fs.existsSync(candidatePath)) return;
        const result = dotenv.config({ path: candidatePath, override: false });
        if (!result.error) {
            loadedPaths.push(candidatePath);
        }
    });

    const jwtSecretPath = appDataEnvPath || loadedPaths[0] || '';
    const generatedJwtSecret = ensureRuntimeJwtSecret(jwtSecretPath);

    return {
        appDataEnvPath,
        generatedJwtSecret,
        loadedPaths
    };
};

module.exports = {
    initializeEnv
};
