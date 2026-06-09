(function () {
    const html = document.documentElement;
    const ua = navigator.userAgent || '';
    const isTouchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || isTouchMac;
    const isStandalone = () => (
        window.navigator.standalone === true
        || window.matchMedia('(display-mode: standalone)').matches
        || window.matchMedia('(display-mode: fullscreen)').matches
    );

    let wakeLock = null;
    let pendingBeforeInstallPrompt = null;

    html.classList.toggle('is-ios', isIOS);
    html.classList.toggle('is-standalone', isStandalone());
    html.classList.toggle('is-browser-mode', !isStandalone());

    const isSecureAppOrigin = () => (
        location.protocol === 'https:'
        || location.hostname === 'localhost'
        || location.hostname === '127.0.0.1'
    );

    const registerServiceWorker = () => {
        if (!('serviceWorker' in navigator) || !isSecureAppOrigin()) return;
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .catch((error) => console.warn('PWA service worker registration failed:', error));
        });
    };

    const getInstallDismissedAt = () => Number(localStorage.getItem('nw_pwa_install_dismissed_at') || 0);
    const dismissInstallPrompt = () => {
        localStorage.setItem('nw_pwa_install_dismissed_at', String(Date.now()));
        document.getElementById('pwaInstallSheet')?.remove();
    };

    const shouldShowInstallPrompt = () => {
        if (isStandalone()) return false;
        const dismissedAt = getInstallDismissedAt();
        return !dismissedAt || Date.now() - dismissedAt > 3 * 24 * 60 * 60 * 1000;
    };

    const showIOSInstallSheet = () => {
        if (!isIOS || !shouldShowInstallPrompt() || document.getElementById('pwaInstallSheet')) return;

        const sheet = document.createElement('div');
        sheet.id = 'pwaInstallSheet';
        sheet.className = 'pwa-install-sheet';
        sheet.innerHTML = `
            <div class="pwa-install-card" role="dialog" aria-label="Installer NeonWave sur iPhone">
                <button type="button" class="pwa-install-close" aria-label="Fermer">&times;</button>
                <div class="pwa-install-head">
                    <img src="/icons/icon-180.png" alt="" aria-hidden="true">
                    <div>
                        <div class="pwa-install-kicker">App iPhone</div>
                        <h2>Installer NeonWave</h2>
                    </div>
                </div>
                <p>Ajoute NeonWave a ton ecran d'accueil pour l'ouvrir en plein ecran, comme une vraie app.</p>
                <ol>
                    <li>Touche le bouton <strong>Partager</strong> dans Safari.</li>
                    <li>Choisis <strong>Ajouter a l'ecran d'accueil</strong>.</li>
                    <li>Valide avec <strong>Ajouter</strong>.</li>
                </ol>
                <div class="pwa-install-actions">
                    <button type="button" class="pwa-install-ok">J'ai compris</button>
                    <button type="button" class="pwa-install-later">Plus tard</button>
                </div>
            </div>
        `;

        sheet.querySelector('.pwa-install-close')?.addEventListener('click', dismissInstallPrompt);
        sheet.querySelector('.pwa-install-later')?.addEventListener('click', dismissInstallPrompt);
        sheet.querySelector('.pwa-install-ok')?.addEventListener('click', dismissInstallPrompt);
        document.body.appendChild(sheet);
    };

    const showInstallSheet = async () => {
        if (pendingBeforeInstallPrompt) {
            pendingBeforeInstallPrompt.prompt();
            await pendingBeforeInstallPrompt.userChoice.catch(() => null);
            pendingBeforeInstallPrompt = null;
            return;
        }
        showIOSInstallSheet();
    };

    const requestPlaybackWakeLock = async () => {
        if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                wakeLock = null;
            });
        } catch (error) {
            console.debug('Wake lock unavailable:', error?.message || error);
        }
    };

    const releasePlaybackWakeLock = async () => {
        if (!wakeLock) return;
        try {
            await wakeLock.release();
        } catch {}
        wakeLock = null;
    };

    const getArtwork = (track) => {
        const thumb = track?.thumb || track?.thumbnail || track?.imageUrl || '/icons/icon-512.png';
        const type = /\.webp(?:$|\?)/i.test(thumb)
            ? 'image/webp'
            : (/\.jpe?g(?:$|\?)/i.test(thumb) ? 'image/jpeg' : 'image/png');
        return [
            { src: thumb, sizes: '512x512', type },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ];
    };

    const updateMediaSession = (track) => {
        if (!('mediaSession' in navigator) || !track) return;

        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title || 'NeonWave',
                artist: track.artist || 'Artiste inconnu',
                album: track.album || 'NeonWave',
                artwork: getArtwork(track)
            });
        } catch (error) {
            console.debug('Media Session metadata skipped:', error?.message || error);
        }
    };

    const setPlaybackState = (state) => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = state;
        }
        if (state === 'playing') {
            requestPlaybackWakeLock();
        } else {
            releasePlaybackWakeLock();
        }
    };

    const setPositionState = (position, duration) => {
        if (!('mediaSession' in navigator) || typeof navigator.mediaSession.setPositionState !== 'function') return;
        if (!Number.isFinite(duration) || duration <= 0) return;
        try {
            navigator.mediaSession.setPositionState({
                duration,
                playbackRate: 1,
                position: Math.max(0, Math.min(Number(position) || 0, duration))
            });
        } catch {}
    };

    const bindMediaActions = () => {
        if (!('mediaSession' in navigator)) return;
        const safeSetAction = (action, handler) => {
            try {
                navigator.mediaSession.setActionHandler(action, handler);
            } catch {}
        };

        safeSetAction('play', () => {
            if (!window.Player?.isPlaying) window.Player?.togglePlay?.();
        });
        safeSetAction('pause', () => {
            if (window.Player?.isPlaying) window.Player?.togglePlay?.();
        });
        safeSetAction('previoustrack', () => window.Player?.prevTrack?.());
        safeSetAction('nexttrack', () => window.Player?.nextTrack?.());
        safeSetAction('seekbackward', () => {
            const current = window.Player?.getActiveCurrentTime?.() || 0;
            window.Player?.seekActiveMedia?.(Math.max(0, current - 10));
        });
        safeSetAction('seekforward', () => {
            const current = window.Player?.getActiveCurrentTime?.() || 0;
            window.Player?.seekActiveMedia?.(current + 10);
        });
        safeSetAction('seekto', (details) => {
            if (Number.isFinite(details?.seekTime)) {
                window.Player?.seekActiveMedia?.(details.seekTime);
            }
        });
    };

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        pendingBeforeInstallPrompt = event;
    });

    window.addEventListener('appinstalled', () => {
        html.classList.add('is-standalone');
        html.classList.remove('is-browser-mode');
        dismissInstallPrompt();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && window.Player?.isPlaying) {
            requestPlaybackWakeLock();
        }
    });

    window.NWPWA = {
        isIOS,
        isStandalone,
        bindMediaActions,
        requestPlaybackWakeLock,
        releasePlaybackWakeLock,
        setPlaybackState,
        setPositionState,
        showInstallSheet,
        updateMediaSession
    };

    registerServiceWorker();
    bindMediaActions();

    document.addEventListener('DOMContentLoaded', () => {
        document.body.classList.toggle('pwa-standalone', isStandalone());
        setTimeout(showIOSInstallSheet, 1400);
    });
})();
