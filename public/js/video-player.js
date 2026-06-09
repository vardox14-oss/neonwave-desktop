// NeonWave - Now Playing panel, cover-only edition.
const NowPlayingPanel = {
    videoShowing: false,

    isMobile() {
        return window.innerWidth <= 768;
    },

    getSessionLabel() {
        try {
            const user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
            return user?.username || user?.email?.split('@')[0] || 'NeonWave';
        } catch {
            return 'NeonWave';
        }
    },

    setVideoButtonLabel(label) {
        const primary = document.getElementById('npVideoLabel');
        const secondary = document.getElementById('npVideoLabelAlt');
        if (primary) primary.textContent = label;
        if (secondary) secondary.textContent = label;
    },

    setArtwork(track) {
        const artwork = track?.thumb || 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=500&auto=format&fit=crop';
        const cover = document.getElementById('npCoverImg');
        const stage = document.getElementById('npStage');
        if (cover) {
            cover.src = artwork;
            cover.style.display = 'block';
            cover.style.opacity = '';
        }
        if (stage) {
            try {
                stage.style.setProperty('--np-artwork', `url("${artwork}")`);
            } catch {}
        }
    },

    ensureFavoriteButtons() {
        const createButton = (id, className) => {
            const button = document.createElement('button');
            button.id = id;
            button.type = 'button';
            button.className = className;
            button.title = 'Liker';
            button.setAttribute('aria-pressed', 'false');
            button.innerHTML = `
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
                </svg>
            `;
            button.addEventListener('click', () => {
                this.toggleFavorite().catch((error) => console.error('Favorite toggle error:', error));
            });
            return button;
        };

        const desktopContainer = document.querySelector('.np-track-info');
        if (desktopContainer && !document.getElementById('npFavoriteBtn')) {
            desktopContainer.appendChild(createButton('npFavoriteBtn', 'np-favorite-btn fav-toggle-btn'));
        }

        const mobileRow = document.querySelector('.mp-track-info-row');
        if (mobileRow && !document.getElementById('mpFavoriteBtn')) {
            const actions = document.createElement('div');
            actions.className = 'mp-track-actions';
            actions.appendChild(createButton('mpFavoriteBtn', 'mp-action-btn fav-toggle-btn'));
            mobileRow.appendChild(actions);
        }
    },

    updateFavoriteState(track = Player?.currentTrack) {
        this.ensureFavoriteButtons();

        const isActive = Boolean(
            track
            && typeof Music !== 'undefined'
            && typeof Music.isFavoriteTrack === 'function'
            && Music.isFavoriteTrack(track)
        );

        ['npFavoriteBtn', 'mpFavoriteBtn'].forEach((id) => {
            const button = document.getElementById(id);
            if (!button) return;

            button.disabled = !track;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            button.setAttribute('title', isActive ? 'Retirer des likes' : 'Liker');

            const svg = button.querySelector('svg');
            if (svg) svg.setAttribute('fill', isActive ? 'currentColor' : 'none');
        });
    },

    togglePanel() {
        const panel = document.getElementById('nowPlayingPanel');
        if (!panel) return;

        if (this.isMobile()) {
            panel.classList.toggle('mobile-active');
        } else {
            panel.classList.toggle('visible');
        }
    },

    closePanel() {
        const panel = document.getElementById('nowPlayingPanel');
        if (!panel) return;

        if (this.isMobile()) {
            panel.classList.remove('mobile-active');
        } else {
            panel.classList.remove('visible');
        }
    },

    async toggleFavorite() {
        const track = Player?.currentTrack;
        if (!track || typeof Music === 'undefined' || typeof Music.toggleFavorite !== 'function') return;

        await Music.toggleFavorite(
            track.videoId || track.id || track.spotifyId || '',
            track.title || '',
            track.artist || '',
            track.thumb || '',
            track.spotifyId || ''
        );

        this.updateFavoriteState(track);
    },

    async shareCurrentTrack() {
        // Disabled.
    },

    toggleQueuePreview() {
        const box = document.getElementById('npQueueBox');
        if (box) box.classList.toggle('is-open');
    },

    renderQueuePreview() {
        const container = document.getElementById('npQueuePreview');
        if (!container || typeof Player === 'undefined') return;

        const nextTracks = Player.queue.filter((_, index) => index !== Player.queueIndex).slice(0, 4);
        if (!nextTracks.length) {
            container.innerHTML = '<div class="np-queue-empty">Lance une musique pour voir la suite.</div>';
            return;
        }

        container.innerHTML = nextTracks.map((track, index) => {
            const queueIndex = Player.queue.findIndex((candidate, candidateIndex) => (
                candidateIndex !== Player.queueIndex
                && candidate.id === track.id
                && candidate.title === track.title
                && candidate.artist === track.artist
            ));

            return `
                <article class="np-queue-item" onclick="Player.playFromQueue(${queueIndex})">
                    <img class="np-queue-thumb" src="${track.thumb || ''}" alt="${track.title || 'Track'}" onerror="this.style.visibility='hidden'">
                    <div class="np-queue-copy">
                        <div class="np-queue-title">${track.title || 'Sans titre'}</div>
                        <div class="np-queue-artist">${track.artist || 'Artiste inconnu'}</div>
                    </div>
                    <div class="np-queue-status">${index === 0 ? 'Suivant' : 'Ensuite'}</div>
                </article>
            `;
        }).join('');
    },

    resetVideoFrame() {
        const frame = document.getElementById('videoPlayerFrame');
        if (!frame) return;
        frame.replaceChildren();
        frame.style.opacity = '0';
        frame.style.pointerEvents = 'none';
    },

    show(track) {
        const panel = document.getElementById('nowPlayingPanel');
        if (!panel || !track) return;

        if (!this.isMobile()) panel.classList.add('visible');

        this.videoShowing = false;
        this.resetVideoFrame();
        this.setArtwork(track);

        const title = track.title || 'Sans titre';
        const artist = track.artist || 'Artiste inconnu';

        ['npTitle', 'npTitleAlt', 'mpTitle'].forEach((id) => {
            const node = document.getElementById(id);
            if (node) node.textContent = title;
        });

        ['npArtist', 'npArtistAlt', 'mpArtist'].forEach((id) => {
            const node = document.getElementById(id);
            if (node) node.textContent = artist;
        });

        const mpCover = document.getElementById('mpCoverImg');
        if (mpCover) {
            mpCover.src = track.thumb || '';
            mpCover.style.opacity = '';
        }

        const mpDiscover = document.getElementById('mpDiscoverName');
        if (mpDiscover) mpDiscover.textContent = artist;

        const mpDiscoverBg = document.getElementById('mpDiscoverBg');
        if (mpDiscoverBg) mpDiscoverBg.style.backgroundImage = track.thumb ? `url(${track.thumb})` : '';

        const credits = document.getElementById('npCreditsArtist');
        if (credits) credits.textContent = artist;

        const session = document.getElementById('npSessionLabel');
        if (session) session.textContent = this.getSessionLabel();

        const caption = document.getElementById('npPanelCaption');
        if (caption) caption.textContent = 'Lecture en cours';

        this.setVideoButtonLabel('Cover');
        this.updateFavoriteState(track);
        this.renderQueuePreview();
    },

    toggleVideo() {
        this.videoShowing = false;
        this.resetVideoFrame();
        this.setVideoButtonLabel('Cover');

        const cover = document.getElementById('npCoverImg');
        if (cover) {
            cover.style.display = 'block';
            cover.style.opacity = '';
        }

        const caption = document.getElementById('npPanelCaption');
        if (caption) caption.textContent = 'Lecture en cours';
    }
};

const VideoPlayer = {
    loadForTrack() {},
    playVideo() {},
    syncPlay() {},
    syncPause() {},
    syncTrackChange(track) {
        NowPlayingPanel.show(track);
    },
    toggle() {
        NowPlayingPanel.toggleVideo();
    },
    updateToggleBtn() {}
};
