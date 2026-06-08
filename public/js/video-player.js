// NeonWave — Now Playing Panel + Video Player (integrated)
const NowPlayingPanel = {
    videoShowing: false,
    videoCache: {},

    isMobile() {
        return window.innerWidth <= 768;
    },

    getSessionLabel() {
        try {
            const user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
            return user?.username || user?.email?.split('@')[0] || 'NeonWave';
        } catch (error) {
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
        if (cover) cover.src = artwork;
        if (stage) {
            try { stage.style.setProperty('--np-artwork', `url("${artwork}")`); }
            catch(e) { console.warn("Failed to set artwork property on npStage"); }
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
            if (svg) {
                svg.setAttribute('fill', isActive ? 'currentColor' : 'none');
            }
        });
    },

    togglePanel() {
        const panel = document.getElementById('nowPlayingPanel');
        if (!panel) return;

        if (this.isMobile()) {
            panel.classList.toggle('mobile-active');
            return;
        }

        panel.classList.toggle('visible');
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
        // Disabled
    },

    toggleQueuePreview() {
        const box = document.getElementById('npQueueBox');
        if (!box) return;
        box.classList.toggle('is-open');
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
                candidateIndex !== Player.queueIndex &&
                candidate.id === track.id &&
                candidate.title === track.title &&
                candidate.artist === track.artist
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

    // Show the panel when a track plays
    show(track) {
        const panel = document.getElementById('nowPlayingPanel');
        if (!panel || !track) return;

        if (!this.isMobile()) {
            panel.classList.add('visible');
        }

        this.setArtwork(track);
        const cover = document.getElementById('npCoverImg');
        if (cover) cover.style.display = 'block';

        // Update info
        const credits = document.getElementById('npCreditsArtist');
        const session = document.getElementById('npSessionLabel');
        const caption = document.getElementById('npPanelCaption');
        const title = track.title || 'Sans titre';
        const artist = track.artist || 'Artiste inconnu';

        ['npTitle', 'npTitleAlt'].forEach((id) => {
            const node = document.getElementById(id);
            if (node) node.textContent = title;
        });

        ['npArtist', 'npArtistAlt'].forEach((id) => {
            const node = document.getElementById(id);
            if (node) node.textContent = artist;
        });
        if (credits) credits.textContent = track.artist || '—';
        if (session) session.textContent = this.getSessionLabel();

        if (caption) caption.textContent = this.videoShowing ? 'Lecture video active' : 'Lecture en cours';
        this.updateFavoriteState(track);
        this.renderQueuePreview();

        // Reset video state for new track
        if (this.videoShowing) {
            if (caption) caption.textContent = 'Lecture en cours';
            this.videoShowing = false;
            document.getElementById('videoPlayerFrame').style.opacity = '0';
            document.getElementById('videoPlayerFrame').style.pointerEvents = 'none';
            document.getElementById('npCoverImg').style.display = 'block';
            this.setVideoButtonLabel('Passer a la video');
            document.getElementById('npVideoLabel').textContent = 'Passer à la vidéo';
        }
    },

    // Toggle between cover art and video
    toggleVideo() {
        const videoFrame = document.getElementById('videoPlayerFrame');
        const coverImg = document.getElementById('npCoverImg');
        const caption = document.getElementById('npPanelCaption');
        const label = { set textContent(value) { NowPlayingPanel.setVideoButtonLabel(value); } };

        if (this.videoShowing) {
            // Switch to cover
            videoFrame.style.opacity = '0';
            videoFrame.style.pointerEvents = 'none';
            coverImg.style.display = 'block';
            if (caption) caption.textContent = 'Lecture en cours';
            label.textContent = 'Passer à la vidéo';
            this.videoShowing = false;
            if (VideoPlayer.ytVideo && VideoPlayer.ytVideo.pauseVideo) VideoPlayer.ytVideo.pauseVideo();
        } else {
            // Switch to video
            videoFrame.style.opacity = '1';
            videoFrame.style.pointerEvents = 'auto';
            coverImg.style.display = 'none';
            this.setVideoButtonLabel('Voir la cover');
            if (caption) caption.textContent = 'Lecture video active';
            this.videoShowing = true;
            // Load video for current track
            if (Player.currentTrack) {
                VideoPlayer.loadForTrack(Player.currentTrack);
            }
        }
    }
};

// VideoPlayer — handles the YouTube iframe for video clips
const VideoPlayer = {
    ytVideo: null,
    currentVideoId: null,
    cache: {},

    normalizeValue(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    },

    getVideoIdFromItem(item) {
        const raw = item?.url || item?.videoId || item?.id || '';
        if (!raw) return '';
        if (raw.includes('v=')) return raw.split('v=')[1].split('&')[0];
        return String(raw).split('/').pop() || '';
    },

    scoreVideoCandidate(item, track) {
        const title = this.normalizeValue(item?.title || '');
        const uploader = this.normalizeValue(item?.uploaderName || item?.artist || '');
        const expectedTitle = this.normalizeValue(track?.title || '');
        const expectedArtist = this.normalizeValue(track?.artist || '');
        const tokens = expectedTitle.split(' ').filter((token) => token.length > 2 && !['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'est'].includes(token));
        const matchedTokens = tokens.filter((token) => title.includes(token));
        const coverage = tokens.length ? matchedTokens.length / tokens.length : 0;

        if (!title) return Number.NEGATIVE_INFINITY;

        let score = 0;

        if (title.includes(expectedTitle)) score += 80;
        if (uploader.includes(expectedArtist)) score += 35;
        if (title.includes(expectedArtist)) score += 20;
        if (title.includes('official video') || title.includes('clip officiel')) score += 18;
        if (title.includes('lyrics') || title.includes('paroles') || title.includes('slowed') || title.includes('sped up') || title.includes('remix') || title.includes('live')) score -= 30;
        if (coverage >= 0.8) score += 24;
        else if (coverage >= 0.5) score += 10;
        else if (coverage === 0) score -= 60;

        return score;
    },

    initPlayer() {
        this.ytVideo = new YT.Player('videoPlayerFrame', {
            height: '100%',
            width: '100%',
            playerVars: {
                autoplay: 0, controls: 0, disablekb: 1, fs: 0,
                modestbranding: 1, rel: 0, showinfo: 0, loop: 1,
                mute: 1, playsinline: 1
            },
            events: {
                onReady: () => {
                    console.log('🎥 Video Player Ready');
                    this.ytVideo.mute();
                },
                onStateChange: (event) => {
                    if (event.data === YT.PlayerState.ENDED) {
                        this.ytVideo.seekTo(0, true);
                        this.ytVideo.playVideo();
                    }
                }
            }
        });
    },

    async loadForTrack(track) {
        if (!track) return;

        // Check cache
        if (this.cache[track.id]) {
            this.playVideo(this.cache[track.id]);
            return;
        }

        try {
            const query = `${track.title} ${track.artist} official video`;
            const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`, {
                headers: Auth.getAuthHeaders()
            });
            if (!res.ok) throw new Error('Search failed');
            const data = await res.json();
            const items = data.items || [];

            const rankedItems = items
                .map((item) => ({
                    item,
                    id: this.getVideoIdFromItem(item),
                    score: this.scoreVideoCandidate(item, track)
                }))
                .filter((entry) => entry.id && entry.id !== track.id)
                .sort((left, right) => right.score - left.score);

            let clipId = rankedItems[0]?.score >= 70 ? rankedItems[0].id : null;
            if (!clipId) clipId = track.id;

            this.cache[track.id] = clipId;
            this.playVideo(clipId);
        } catch (err) {
            console.error('Video search failed:', err);
            // Fallback: use track's own ID
            this.playVideo(track.id);
        }
    },

    playVideo(videoId) {
        if (!this.ytVideo || !this.ytVideo.loadVideoById) return;
        this.currentVideoId = videoId;
        this.ytVideo.loadVideoById({ videoId, suggestedQuality: 'small' });
        this.ytVideo.mute();
        if (Player.isPlaying) this.ytVideo.playVideo();
    },

    syncPlay() {
        if (!this.ytVideo || !this.ytVideo.playVideo || !NowPlayingPanel.videoShowing) return;
        this.ytVideo.playVideo();
    },

    syncPause() {
        if (!this.ytVideo || !this.ytVideo.pauseVideo) return;
        this.ytVideo.pauseVideo();
    },

    syncTrackChange(track) {
        NowPlayingPanel.show(track);
        if (NowPlayingPanel.videoShowing) {
            this.loadForTrack(track);
        }
    },

    toggle() {
        NowPlayingPanel.toggleVideo();
    },

    updateToggleBtn() {} // No-op, handled by panel
};

// Cover-only override: keep Spotify-like right panel without video playback.
NowPlayingPanel.show = function showCoverOnly(track) {
    const panel = document.getElementById('nowPlayingPanel');
    if (!panel || !track) return;

    if (!this.isMobile()) {
        panel.classList.add('visible');
    }

    this.videoShowing = false;
    this.setArtwork(track);

    const cover = document.getElementById('npCoverImg');
    const frame = document.getElementById('videoPlayerFrame');
    const credits = document.getElementById('npCreditsArtist');
    const session = document.getElementById('npSessionLabel');
    const caption = document.getElementById('npPanelCaption');
    const title = track.title || 'Sans titre';
    const artist = track.artist || 'Artiste inconnu';

    if (cover) cover.style.display = 'block';
    if (frame) {
        frame.style.opacity = '0';
        frame.style.pointerEvents = 'none';
        frame.innerHTML = '';
    }

    ['npTitle', 'npTitleAlt'].forEach((id) => {
        const node = document.getElementById(id);
        if (node) node.textContent = title;
    });

    ['npArtist', 'npArtistAlt', 'mpArtist'].forEach((id) => {
        const node = document.getElementById(id);
        if (node) node.textContent = artist;
    });

    ['mpTitle'].forEach(id => {
        const node = document.getElementById(id);
        if (node) node.textContent = title;
    });

    const mpCover = document.getElementById('mpCoverImg');
    if (mpCover) mpCover.src = track.thumb;

    const mpDiscover = document.getElementById('mpDiscoverName');
    if (mpDiscover) mpDiscover.textContent = artist;
    
    const mpDiscoverBg = document.getElementById('mpDiscoverBg');
    if (mpDiscoverBg) mpDiscoverBg.style.backgroundImage = `url(${track.thumb})`;

    if (credits) credits.textContent = artist;
    if (session) session.textContent = this.getSessionLabel();
    if (caption) caption.textContent = 'Lecture en cours';

    this.setVideoButtonLabel('Cover');
    this.updateFavoriteState(track);
    this.renderQueuePreview();

    if (VideoPlayer.ytVideo && VideoPlayer.ytVideo.pauseVideo) {
        VideoPlayer.ytVideo.pauseVideo();
    }
};

NowPlayingPanel.toggleVideo = function disableVideoPanel() {
    this.videoShowing = false;

    const cover = document.getElementById('npCoverImg');
    const frame = document.getElementById('videoPlayerFrame');
    const caption = document.getElementById('npPanelCaption');

    if (cover) cover.style.display = 'block';
    if (frame) {
        frame.style.opacity = '0';
        frame.style.pointerEvents = 'none';
        frame.innerHTML = '';
    }
    if (caption) caption.textContent = 'Lecture en cours';

    this.setVideoButtonLabel('Cover');

    if (VideoPlayer.ytVideo && VideoPlayer.ytVideo.pauseVideo) {
        VideoPlayer.ytVideo.pauseVideo();
    }
};

VideoPlayer.syncTrackChange = function syncTrackCoverOnly(track) {
    NowPlayingPanel.show(track);
};
