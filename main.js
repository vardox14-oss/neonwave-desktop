const { app, BrowserWindow, session, nativeTheme, ipcMain, dialog, shell, crashReporter, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { DiscordPresenceManager, DEFAULT_DISCORD_CLIENT_ID } = require('./src/discord-presence');
const { initializeEnv } = require('./src/load-env');
const spotifySession = require('./src/lib/spotify-session');
const { autoUpdater } = require('electron-updater');

// --- Démarrer le Serveur Express ---
const userDataPath = app.getPath('userData');
const appDataDB = path.join(userDataPath, 'database.json');
const appLogPath = path.join(userDataPath, 'neonwave.log');

crashReporter.start({
    uploadToServer: false
});

const writeAppLog = (message, error = null) => {
    const details = error ? ` ${error.stack || error.message || error}` : '';
    fs.appendFileSync(appLogPath, `[${new Date().toISOString()}] ${message}${details}\n`);
};

process.on('uncaughtException', (error) => {
    writeAppLog('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
    writeAppLog('Unhandled rejection:', error);
});
const projectDB = [
    path.join(__dirname, 'database.json'),
    path.join(__dirname, 'src', 'database.json')
].find((candidatePath) => fs.existsSync(candidatePath));

const shouldBootstrapDatabase = (databasePath) => {
    try {
        const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
        return Array.isArray(database.users) && database.users.length > 0;
    } catch {
        return false;
    }
};

// Migration des données existantes vers AppData
if (!fs.existsSync(appDataDB) && projectDB && shouldBootstrapDatabase(projectDB)) {
    try {
        fs.copyFileSync(projectDB, appDataDB);
        console.log('✅ Base de données migrée vers AppData');
    } catch (e) {
        console.error('❌ Échec de la migration des données:', e);
    }
}

process.env.NEONWAVE_DB_PATH = appDataDB;
process.env.NEONWAVE_APPDATA_PATH = userDataPath;

initializeEnv({
    appDataPath: userDataPath,
    baseDir: __dirname,
    resourcesPath: process.resourcesPath
});

const discordPresence = new DiscordPresenceManager({
    clientId: process.env.DISCORD_CLIENT_ID || DEFAULT_DISCORD_CLIENT_ID
});

// ─── Intégration Spotify (Canvas vidéo de fond) ───
const SPOTIFY_PARTITION = 'persist:spotify';
let spotifyTokenWindow = null;

const setSpotifyCookie = async (spDc) => {
    const ses = session.fromPartition(SPOTIFY_PARTITION);
    await ses.cookies.set({
        url: 'https://open.spotify.com',
        name: 'sp_dc',
        value: spDc,
        domain: '.spotify.com',
        path: '/',
        secure: true,
        httpOnly: true
    });
};

let spotifyWebRequestBound = false;

// Capture le token web-player au niveau réseau (toutes les requêtes de la
// session Spotify, y compris celles des Web Workers que fetch ne voit pas).
const bindSpotifyTokenCapture = () => {
    if (spotifyWebRequestBound) return;
    spotifyWebRequestBound = true;
    const ses = session.fromPartition(SPOTIFY_PARTITION);
    ses.webRequest.onSendHeaders(
        { urls: ['https://*.spotify.com/*', 'https://spclient.wg.spotify.com/*'] },
        (details) => {
            const headers = details.requestHeaders || {};
            const auth = headers.Authorization || headers.authorization;
            if (auth && String(auth).startsWith('Bearer ')) {
                spotifySession.setToken(String(auth).slice(7));
            }
        }
    );
};

// Fenêtre cachée qui maintient une session Spotify vivante -> le token
// web-player est régénéré automatiquement et capté au niveau réseau.
const startSpotifyTokenWindow = async () => {
    const spDc = spotifySession.getSpDc();
    if (!spDc) return;
    if (spotifyTokenWindow && !spotifyTokenWindow.isDestroyed()) return;

    try {
        await setSpotifyCookie(spDc);
    } catch (error) {
        writeAppLog('Spotify cookie set failed:', error);
        return;
    }

    bindSpotifyTokenCapture();

    spotifyTokenWindow = new BrowserWindow({
        show: false,
        webPreferences: {
            partition: SPOTIFY_PARTITION,
            backgroundThrottling: false
        }
    });

    spotifyTokenWindow.loadURL('https://open.spotify.com').catch((error) => {
        writeAppLog('Spotify token window load failed:', error);
    });

    // Recharge la session toutes les 45 min pour renouveler le token avant expiration.
    const refreshTimer = setInterval(() => {
        if (!spotifyTokenWindow || spotifyTokenWindow.isDestroyed()) {
            clearInterval(refreshTimer);
            return;
        }
        spotifyTokenWindow.webContents.reload();
    }, 45 * 60 * 1000);

    spotifyTokenWindow.on('closed', () => {
        clearInterval(refreshTimer);
        spotifyTokenWindow = null;
    });
};

const stopSpotifyTokenWindow = () => {
    if (spotifyTokenWindow && !spotifyTokenWindow.isDestroyed()) {
        spotifyTokenWindow.destroy();
    }
    spotifyTokenWindow = null;
};

ipcMain.on('spotify:token', (_event, token) => {
    if (token) spotifySession.setToken(token);
});

// Ouvre la fenêtre de connexion Spotify et capture le cookie sp_dc.
ipcMain.handle('spotify:connect', async () => {
    const ses = session.fromPartition(SPOTIFY_PARTITION);
    const loginWindow = new BrowserWindow({
        width: 480,
        height: 720,
        title: 'Connexion Spotify',
        autoHideMenuBar: true,
        webPreferences: { partition: SPOTIFY_PARTITION }
    });
    loginWindow.loadURL('https://accounts.spotify.com/login');

    return new Promise((resolve) => {
        let settled = false;
        const finish = (result) => {
            if (settled) return;
            settled = true;
            clearInterval(poll);
            if (!loginWindow.isDestroyed()) loginWindow.close();
            resolve(result);
        };

        const poll = setInterval(async () => {
            try {
                const cookies = await ses.cookies.get({ name: 'sp_dc', domain: '.spotify.com' });
                if (cookies && cookies.length && cookies[0].value) {
                    spotifySession.setSpDc(cookies[0].value);
                    await startSpotifyTokenWindow();
                    finish({ connected: true });
                }
            } catch { /* réessaie */ }
        }, 1500);

        loginWindow.on('closed', () => finish({ connected: spotifySession.isConnected() }));
    });
});

ipcMain.handle('spotify:disconnect', async () => {
    spotifySession.clear();
    stopSpotifyTokenWindow();
    try {
        const ses = session.fromPartition(SPOTIFY_PARTITION);
        await ses.clearStorageData();
    } catch { /* ignore */ }
    return { connected: false };
});

ipcMain.handle('spotify:status', () => ({
    connected: spotifySession.isConnected(),
    active: Boolean(spotifySession.getToken())
}));

ipcMain.handle('discord-presence:set', async (_event, payload) => {
    return discordPresence.setActivity(payload || {});
});

ipcMain.handle('discord-presence:clear', async () => {
    return discordPresence.clearActivity();
});

ipcMain.handle('updater:install', async () => {
    autoUpdater.quitAndInstall();
});

ipcMain.handle('app:version', () => {
    return app.getVersion();
});

let neonWaveServer = null;
let serverStartupPromise = Promise.resolve(false);
let mainWindow = null;
let tray = null;
let isQuitting = false;

try {
    ({ server: neonWaveServer } = require('./src/server.js'));
    serverStartupPromise = new Promise((resolve) => {
        if (neonWaveServer.listening) {
            resolve(true);
            return;
        }

        neonWaveServer.once('listening', () => resolve(true));
        neonWaveServer.once('error', (error) => {
            console.error('Erreur du serveur NeonWave:', error);
            resolve(false);
        });
    });
} catch (err) {
    console.error('Erreur lors du démarrage du serveur NeonWave:', err);
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 850,
        title: "NeonWave",
        backgroundColor: '#0a0a0b',
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            autoplayPolicy: 'no-user-gesture-required',
            preload: path.join(__dirname, 'preload.js') // Optionnel si on veut étendre l'API
        },
        icon: path.join(__dirname, 'public', 'nw.png')
    });
    mainWindow = win;
    setupAutoUpdater(win);

    // On force le thème sombre pour être raccord avec le design Premium
    nativeTheme.themeSource = 'dark';

    // On charge l'URL du serveur Express
    const address = neonWaveServer?.address();
    const port = typeof address === 'object' && address ? address.port : (process.env.PORT || 5000);
    const appUrl = `http://127.0.0.1:${port}`;

    win.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:\/\//i.test(url)) {
            shell.openExternal(url).catch((error) => writeAppLog('External link failed:', error));
        }
        return { action: 'deny' };
    });

    win.webContents.on('will-navigate', (event, url) => {
        if (url.startsWith(appUrl)) return;
        event.preventDefault();
        if (/^https?:\/\//i.test(url)) {
            shell.openExternal(url).catch((error) => writeAppLog('External navigation failed:', error));
        }
    });

    win.loadURL(appUrl);

    win.on('close', (event) => {
        if (isQuitting) return;
        event.preventDefault();
        win.hide();
    });

    win.on('show', () => {
        win.setSkipTaskbar(false);
    });

    win.on('hide', () => {
        win.setSkipTaskbar(true);
    });

    if (process.argv.includes('--devtools')) {
        win.webContents.openDevTools();
    }
}

function createTray() {
    if (tray) return tray;

    const trayIcon = fs.existsSync(path.join(__dirname, 'build', 'icon.ico'))
        ? path.join(__dirname, 'build', 'icon.ico')
        : path.join(__dirname, 'public', 'nw.png');
    tray = new Tray(trayIcon);
    tray.setToolTip('NeonWave - Lecture en arriere-plan');
    tray.setContextMenu(Menu.buildFromTemplate([
        {
            label: 'Ouvrir NeonWave',
            click: () => {
                if (!mainWindow) createWindow();
                mainWindow.show();
                mainWindow.focus();
            }
        },
        { type: 'separator' },
        {
            label: 'Quitter completement',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]));
    tray.on('click', () => {
        if (!mainWindow) createWindow();
        if (mainWindow.isVisible()) {
            mainWindow.focus();
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    });
    return tray;
}

app.whenReady().then(async () => {
    const serverReady = await serverStartupPromise;
    if (!serverReady) {
        dialog.showErrorBox(
            'NeonWave ne peut pas démarrer',
            'Le serveur local n’a pas pu être lancé. Vérifiez que le port configuré est disponible.'
        );
        app.quit();
        return;
    }

    createWindow();
    createTray();

    // Relance la session Spotify si l'utilisateur s'était déjà connecté.
    if (spotifySession.isConnected()) {
        startSpotifyTokenWindow().catch((error) => writeAppLog('Spotify token window init failed:', error));
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
});

app.on('window-all-closed', () => {
    if (isQuitting && process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    isQuitting = true;
    discordPresence.shutdown().catch(() => {});
});

function setupAutoUpdater(win) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
        if (!win.isDestroyed()) win.webContents.send('updater:status', 'checking');
    });

    autoUpdater.on('update-available', (info) => {
        if (!win.isDestroyed()) {
            win.webContents.send('updater:status', 'available', {
                version: info?.version,
                releaseNotes: info?.releaseNotes
            });
        }
    });

    autoUpdater.on('update-not-available', (info) => {
        if (!win.isDestroyed()) win.webContents.send('updater:status', 'not-available');
    });

    autoUpdater.on('error', (err) => {
        if (!win.isDestroyed()) win.webContents.send('updater:status', 'error', err?.message || String(err));
    });

    autoUpdater.on('download-progress', (progressObj) => {
        if (!win.isDestroyed()) win.webContents.send('updater:status', 'downloading', progressObj.percent);
    });

    autoUpdater.on('update-downloaded', (info) => {
        if (!win.isDestroyed()) {
            win.webContents.send('updater:status', 'downloaded', {
                version: info?.version,
                releaseNotes: info?.releaseNotes
            });
        }
    });

    // Check for updates after window is ready
    win.webContents.once('did-finish-load', () => {
        setTimeout(() => {
            autoUpdater.checkForUpdatesAndNotify().catch((err) => {
                console.error('Failed to check for updates:', err);
            });
        }, 1500); // slight delay for visual polish on slide-up
    });
}
