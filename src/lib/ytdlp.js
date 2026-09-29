// --- Extraction audio via yt-dlp (moteur principal) ---
// yt-dlp gère les contournements YouTube que youtubei.js ne couvre pas
// (client android_vr, n-signature, throttling) et récupère en entier même
// les reuploads bridées. Le binaire est téléchargé au premier lancement.

const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const { spawn } = require('child_process');

const BINARY_NAME = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const BINARY_URL = process.platform === 'win32'
    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
    : (process.platform === 'darwin'
        ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos'
        : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp');

const getBinaryDir = () => path.join(__dirname, '..', '..', 'data');
const getBinaryPath = () => {
    const bundledPath = path.join(__dirname, '..', '..', 'data', BINARY_NAME);
    if (fs.existsSync(bundledPath)) return bundledPath;
    const appDataPath = process.env.NEONWAVE_APPDATA_PATH ? path.join(process.env.NEONWAVE_APPDATA_PATH, BINARY_NAME) : null;
    if (appDataPath && fs.existsSync(appDataPath)) return appDataPath;
    return bundledPath;
};

let ensurePromise = null;

const downloadBinary = (destination, url = BINARY_URL, redirects = 0) => new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Trop de redirections'));

    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const tempPath = `${destination}.download`;
    const file = fs.createWriteStream(tempPath);

    https.get(url, { headers: { 'User-Agent': 'NeonWave' } }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            file.close();
            fs.rmSync(tempPath, { force: true });
            return resolve(downloadBinary(destination, response.headers.location, redirects + 1));
        }
        if (response.statusCode !== 200) {
            file.close();
            fs.rmSync(tempPath, { force: true });
            return reject(new Error(`Téléchargement yt-dlp: HTTP ${response.statusCode}`));
        }
        response.pipe(file);
        file.on('finish', () => file.close(() => {
            try {
                fs.renameSync(tempPath, destination);
                if (process.platform !== 'win32') fs.chmodSync(destination, 0o755);
                resolve(destination);
            } catch (error) {
                reject(error);
            }
        }));
    }).on('error', (error) => {
        file.close();
        fs.rmSync(tempPath, { force: true });
        reject(error);
    });
});

// Localise un yt-dlp système (PATH) sinon télécharge le binaire dédié.
const ensureBinary = () => {
    if (ensurePromise) return ensurePromise;

    ensurePromise = (async () => {
        const localPath = getBinaryPath();
        if (fs.existsSync(localPath)) return localPath;

        console.log('⬇️  Téléchargement de yt-dlp (première utilisation)...');
        await downloadBinary(localPath);
        console.log('✅ yt-dlp installé');
        return localPath;
    })();

    ensurePromise.catch(() => { ensurePromise = null; });
    return ensurePromise;
};

const runYtdlp = (args, { capture = 'buffer' } = {}) => new Promise((resolve, reject) => {
    ensureBinary().then((binaryPath) => {
        console.log(`[yt-dlp exec] ${binaryPath} ${args.join(' ')}`);
        const child = spawn(binaryPath, args, { windowsHide: true });
        const stdoutChunks = [];
        let stderr = '';

        child.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
        child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
        child.on('error', reject);
        child.on('close', (code) => {
            if (code !== 0) {
                console.error(`[yt-dlp error] exit code ${code}, stderr: ${stderr}`);
                return reject(new Error(`yt-dlp code ${code}: ${stderr.split('\n').filter(Boolean).slice(-1)[0] || ''}`));
            }
            const buffer = Buffer.concat(stdoutChunks);
            resolve(capture === 'text' ? buffer.toString('utf8').trim() : buffer);
        });
    }).catch(reject);
});

const getNodePath = () => {
    if (fs.existsSync('C:\\Program Files\\nodejs\\node.exe')) return 'C:\\Program Files\\nodejs\\node.exe';
    return 'node';
};

const getCookiesPath = () => {
    const candidates = [
        path.join(__dirname, '..', '..', 'data', 'cookies.txt'),
        path.join(process.cwd(), 'data', 'cookies.txt'),
        path.join(process.env.NEONWAVE_APPDATA_PATH || '', 'cookies.txt')
    ];
    for (const p of candidates) {
        if (p && fs.existsSync(p)) return p;
    }
    return null;
};

// Détecte si le proxy Tor SOCKS5 est disponible (port 9050 local).
const isTorAvailable = () => {
    const net = require('net');
    return new Promise((resolve) => {
        const sock = net.createConnection({ host: '127.0.0.1', port: 9050 }, () => {
            sock.destroy();
            resolve(true);
        });
        sock.on('error', () => resolve(false));
        sock.setTimeout(500, () => { sock.destroy(); resolve(false); });
    });
};

const BGUTIL_PLUGIN_DIR = (() => {
    const p = path.join(require('os').homedir(), '.config', 'yt-dlp', 'plugins', 'bgutil-ytdlp-pot-provider.zip');
    return require('fs').existsSync(p) ? path.join(require('os').homedir(), '.config', 'yt-dlp', 'plugins') : null;
})();

// Télécharge l'audio complet d'une vidéo (M4A / AAC 100% natif iOS AVPlayer).
const downloadAudio = async (videoId) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const tempFile = path.join(os.tmpdir(), `nw-${videoId}-${Date.now()}.m4a`);
    const cookiesFile = getCookiesPath();
    const useTor = await isTorAvailable();
    if (useTor) console.log(`   🧅 Tor disponible — routage yt-dlp via socks5h://127.0.0.1:9050`);
    const args = [
        '-v',
        '--no-playlist',
        '--no-warnings',
        '--no-progress',
        '--js-runtimes', `node:${getNodePath()}`,
        ...(useTor ? ['--proxy', 'socks5h://127.0.0.1:9050'] : []),
        ...(BGUTIL_PLUGIN_DIR ? ['--plugin-dirs', BGUTIL_PLUGIN_DIR] : []),
        ...(cookiesFile ? ['--cookies', cookiesFile] : []),
        '-f', '140/bestaudio[ext=m4a]/bestaudio',
        '-o', tempFile,
        url
    ];
    try {
        await runYtdlp(args, { capture: 'text' });

        if (fs.existsSync(tempFile)) {
            const buffer = await fs.promises.readFile(tempFile);
            fs.promises.unlink(tempFile).catch(() => {});
            const isWebm = buffer.length > 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
            return {
                buffer,
                mimeType: isWebm ? 'audio/webm' : 'audio/mp4'
            };
        }
    } catch (err) {
        fs.promises.unlink(tempFile).catch(() => {});
        throw err;
    }
    return null;
};

// Télécharge une version légère du clip (360p mp4 progressif, très compatible
// avec <video>) pour l'afficher en fond. itag 18 = mp4 avc1+aac progressif.
const getVideoArgs = () => {
    const cookiesFile = getCookiesPath();
    return [
        '--no-playlist',
        '--no-warnings',
        '--no-progress',
        ...(cookiesFile ? ['--cookies', cookiesFile] : ['--extractor-args', 'youtube:player_client=android_vr,web']),
        '-f', '18/best[height<=480][ext=mp4]/best[height<=480]'
    ];
};

const downloadVideo = async (videoId) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const buffer = await runYtdlp([...getVideoArgs(), '-o', '-', url]);
    if (!buffer || buffer.length === 0) return null;
    return { buffer, mimeType: 'video/mp4' };
};

module.exports = {
    ensureBinary,
    downloadAudio,
    downloadVideo,
    getBinaryPath
};
