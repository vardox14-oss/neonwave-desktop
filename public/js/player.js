// NeonWave Player — Full-Featured YouTube IFrame API Edition
const Player = {
    ytPlayer: null,
    localAudio: null,
    activeEngine: 'youtube',
    playerReady: false,
    isPlaying: false,
    currentTrack: null,
    volume: 80,
    previousVolume: 80,
    progressInterval: null,
    pendingTrackId: null,
    pendingSwitchToken: 0,
    playerWaitInterval: null,
    suppressEndedEvent: false,
    recoveryInFlight: false,
    recoveryCooldownMs: 2500,
    lastRecoveryAt: 0,
    lastRecoveryKey: '',
    lastKnownPlaybackAt: 0,
    lastHealthyTrackId: '',
    lastPlaybackPosition: 0,
    lastPlaybackProgressAt: 0,
    playbackErrorTimer: null,
    playbackErrorToken: 0,
    playbackErrorValidationMs: 2000,
    recoveryAttemptsByTrack: new Map(),
    lyricsRequestToken: 0,
    currentLyrics: null,
    activeLyricsIndex: -1,
    resolvedVideoIdCache: new Map(),
    resolutionPromiseCache: new Map(),
    prefetchInFlight: new Set(),

    // --- Queue System ---
    queue: [],
    queueIndex: -1,
    history: [],

    // --- Modes ---
    repeatMode: 'none', // 'none' | 'all' | 'one'
    shuffleOn: false,
    autoplayOn: true,
    shuffleHistory: [], // tracks already shuffled to avoid repeats

    normalizeTrackId(value) {
        const normalized = String(value || '').trim();
        if (!normalized || normalized === 'undefined' || normalized === 'null') {
            return '';
        }
        return normalized;
    },

    isLikelyYouTubeVideoId(value) {
        return /^[A-Za-z0-9_-]{11}$/.test(this.normalizeTrackId(value));
    },

    isLikelySpotifyId(value) {
        return /^[A-Za-z0-9]{22}$/.test(this.normalizeTrackId(value));
    },

    buildResolutionCacheKey(options = {}) {
        const spotifyId = this.normalizeTrackId(options.spotifyId || '');
        if (spotifyId) {
            return `spotify:${spotifyId}`;
        }

        const artistKey = this.normalizeTrackId(options.artist || '').toLowerCase().replace(/\s+/g, ' ');
        const titleKey = this.normalizeTrackId(options.title || '').toLowerCase().replace(/\s+/g, ' ');
        if (!artistKey && !titleKey) {
            return '';
        }

        return `meta:${artistKey}|${titleKey}`;
    },

    getCurrentTrackVideoId() {
        return this.normalizeTrackId(this.currentTrack?.videoId || this.currentTrack?.id || '');
    },

    getRecoveryTrackKey(track = this.currentTrack) {
        if (!track) return '';
        return this.buildResolutionCacheKey(track)
            || this.normalizeTrackId(track.spotifyId || '')
            || this.normalizeTrackId(track.videoId || track.id || '');
    },

    getActivePlayerVideoId() {
        try {
            return this.normalizeTrackId(this.ytPlayer?.getVideoData?.().video_id || '');
        } catch {
            return '';
        }
    },

    getPlaybackPosition() {
        try {
            const position = Number(this.ytPlayer?.getCurrentTime?.());
            return Number.isFinite(position) ? Math.max(0, position) : 0;
        } catch {
            return 0;
        }
    },

    getPlaybackState() {
        try {
            return Number(this.ytPlayer?.getPlayerState?.());
        } catch {
            return NaN;
        }
    },

    cancelPendingPlaybackError() {
        this.playbackErrorToken += 1;
        if (this.playbackErrorTimer) {
            clearTimeout(this.playbackErrorTimer);
            this.playbackErrorTimer = null;
        }
    },

    markPlaybackHealthy(currentTime = null) {
        const activeId = this.getCurrentTrackVideoId();
        const now = Date.now();
        this.lastHealthyTrackId = activeId;
        this.recoveryInFlight = false;

        const playbackPosition = Number(currentTime);
        if (!Number.isFinite(playbackPosition)) return;

        const positionAdvanced = playbackPosition > this.lastPlaybackPosition + 0.05;
        const positionRestarted = playbackPosition + 1 < this.lastPlaybackPosition;
        if (!positionAdvanced && !positionRestarted) return;

        this.lastPlaybackPosition = playbackPosition;
        this.lastPlaybackProgressAt = now;
        this.lastKnownPlaybackAt = now;

        if (playbackPosition >= 10) {
            const recoveryKey = this.getRecoveryTrackKey();
            if (recoveryKey) {
                this.recoveryAttemptsByTrack.delete(recoveryKey);
            }
        }
    },

    shouldIgnorePlaybackError(errorCode, erroredVideoId = '') {
        if (!this.currentTrack) return true;

        const now = Date.now();
        const currentId = this.getCurrentTrackVideoId();
        const pendingId = this.normalizeTrackId(this.pendingTrackId);
        const failedId = this.normalizeTrackId(erroredVideoId);
        const activeIds = new Set([currentId, pendingId].filter(Boolean));

        if (!currentId) return true;

        if (failedId && activeIds.size > 0 && !activeIds.has(failedId)) {
            console.warn('Ignoring stale YouTube error for inactive track:', {
                errorCode,
                failedId,
                currentId,
                pendingId
            });
            return true;
        }

        const sameHealthyTrack = this.lastHealthyTrackId && activeIds.has(this.lastHealthyTrackId);
        const playbackIsAdvancing = this.isPlaying && now - this.lastPlaybackProgressAt < 2500;
        if (sameHealthyTrack && playbackIsAdvancing) {
            console.warn('Ignoring YouTube error because playback is currently healthy:', {
                errorCode,
                failedId: failedId || currentId
            });
            return true;
        }

        if (this.recoveryInFlight) return true;

        const recoveryKey = this.getRecoveryTrackKey();
        if (recoveryKey && this.lastRecoveryKey === recoveryKey && now - this.lastRecoveryAt < this.recoveryCooldownMs) {
            return true;
        }

        return false;
    },

    handlePlaybackError(event = {}) {
        const errorCode = event?.data ?? event?.errorCode ?? 'unknown';
        const erroredVideoId = this.normalizeTrackId(
            event?.videoId
            || this.getActivePlayerVideoId()
            || this.pendingTrackId
            || this.getCurrentTrackVideoId()
        );

        if (this.shouldIgnorePlaybackError(errorCode, erroredVideoId)) {
            return false;
        }

        this.cancelPendingPlaybackError();

        const validationToken = this.playbackErrorToken;
        const failedTrackId = this.getCurrentTrackVideoId();
        const failedSwitchToken = this.pendingSwitchToken;
        const positionAtError = this.getPlaybackPosition();

        this.playbackErrorTimer = setTimeout(() => {
            if (validationToken !== this.playbackErrorToken) return;
            this.playbackErrorTimer = null;

            const trackUnchanged = this.getCurrentTrackVideoId() === failedTrackId;
            const switchUnchanged = this.pendingSwitchToken === failedSwitchToken;
            if (!trackUnchanged || !switchUnchanged) return;

            const currentPosition = this.getPlaybackPosition();
            const playbackState = this.getPlaybackState();
            const playingState = typeof YT !== 'undefined'
                ? YT.PlayerState.PLAYING
                : 1;
            const playbackAdvanced = currentPosition > positionAtError + 0.1;
            const progressIsRecent = Date.now() - this.lastPlaybackProgressAt < this.playbackErrorValidationMs;

            if (playbackState === playingState || playbackAdvanced || progressIsRecent) {
                this.markPlaybackHealthy(currentPosition);
                return;
            }

            this.setPlaying(false);
            this.recoverFromPlaybackError(errorCode, erroredVideoId);
        }, this.playbackErrorValidationMs);

        return true;
    },

    getTrackDurationMs(options = {}) {
        const durationMs = Number(options.durationMs);
        if (Number.isFinite(durationMs) && durationMs > 0) {
            return Math.round(durationMs);
        }

        const duration = Number(options.duration);
        if (!Number.isFinite(duration) || duration <= 0) {
            return 0;
        }

        return duration > 1000 ? Math.round(duration) : Math.round(duration * 1000);
    },

    isLocalTrack(trackOrId, options = {}) {
        const track = typeof trackOrId === 'object' && trackOrId
            ? trackOrId
            : { id: trackOrId, ...options };
        const id = this.normalizeTrackId(track.localTrackId || track.videoId || track.id || '');
        return track.source === 'local'
            || Boolean(track.streamUrl)
            || Boolean(track.localTrackId)
            || id.startsWith('local-');
    },

    getActiveMedia() {
        return this.activeEngine === 'local' ? this.localAudio : this.ytPlayer;
    },

    getActiveCurrentTime() {
        const media = this.getActiveMedia();
        try {
            const value = this.activeEngine === 'local'
                ? Number(media?.currentTime)
                : Number(media?.getCurrentTime?.());
            return Number.isFinite(value) ? Math.max(0, value) : 0;
        } catch {
            return 0;
        }
    },

    getActiveDuration() {
        const media = this.getActiveMedia();
        try {
            const value = this.activeEngine === 'local'
                ? Number(media?.duration)
                : Number(media?.getDuration?.());
            return Number.isFinite(value) ? Math.max(0, value) : 0;
        } catch {
            return 0;
        }
    },

    seekActiveMedia(seconds) {
        const position = Math.max(0, Number(seconds) || 0);
        if (this.activeEngine === 'local') {
            if (this.localAudio) this.localAudio.currentTime = position;
            return;
        }
        this.ytPlayer?.seekTo?.(position, true);
    },

    ensureLocalAudio() {
        if (this.localAudio) return this.localAudio;

        const audio = new Audio();
        audio.preload = 'auto';
        audio.setAttribute('playsinline', '');
        audio.setAttribute('webkit-playsinline', '');
        audio.volume = this.normalizeVolume(this.volume) / 100;
        audio.addEventListener('playing', () => {
            if (this.activeEngine === 'local') this.setPlaying(true);
        });
        audio.addEventListener('pause', () => {
            if (this.activeEngine === 'local' && !audio.ended) this.setPlaying(false);
        });
        audio.addEventListener('ended', () => {
            if (this.activeEngine !== 'local') return;
            this.setPlaying(false);
            this.nextTrack();
        });
        audio.addEventListener('error', () => {
            if (this.activeEngine !== 'local') return;
            this.setPlaying(false);
            if (typeof Playlists !== 'undefined' && Playlists.showToast) {
                Playlists.showToast('Impossible de lire ce fichier local.');
            }
        });

        this.localAudio = audio;
        return audio;
    },

    async playLocalTrack(id, title, artist, thumb, options = {}) {
        const localId = this.normalizeTrackId(options.localTrackId || id);
        const streamUrl = options.streamUrl || `/api/user/local-tracks/${encodeURIComponent(localId)}/stream`;
        const track = {
            ...options,
            id: localId,
            videoId: localId,
            localTrackId: localId,
            source: 'local',
            streamUrl,
            title: title || options.title || 'Titre local',
            artist: artist || options.artist || 'Bibliotheque locale',
            thumb: thumb || options.thumb || '',
            durationMs: this.getTrackDurationMs(options)
        };

        this.activeEngine = 'local';
        this.ytPlayer?.pauseVideo?.();
        this.currentTrack = track;
        this.cancelPendingPlaybackError();
        this.pendingTrackId = localId;
        this.pendingSwitchToken += 1;
        this.recoveryInFlight = false;
        this.lastPlaybackPosition = 0;
        this.lastPlaybackProgressAt = 0;

        this.addToHistory(track);
        this.saveResume(track, 0);
        this.updateNowPlaying(track);
        this.resetProgressUi();
        this.renderQueue();

        if (typeof NW !== 'undefined' && NW.fetchWithAuth) {
            NW.fetchWithAuth('/api/music/history', {
                method: 'POST',
                body: JSON.stringify(track)
            }).catch(() => {});
        }

        const audio = this.ensureLocalAudio();
        audio.pause();
        audio.src = streamUrl;
        audio.currentTime = 0;
        audio.loop = false;
        audio.volume = this.normalizeVolume(this.volume) / 100;
        this.setPlaying(false, { skipDiscordSync: true });

        try {
            await audio.play();
        } catch (error) {
            console.warn('Local audio play failed:', error);
            if (typeof Playlists !== 'undefined' && Playlists.showToast) {
                Playlists.showToast('Clique sur lecture pour demarrer le fichier local.');
            }
        }

        try {
            if (typeof VideoPlayer !== 'undefined') VideoPlayer.syncTrackChange(track);
        } catch (error) {
            console.warn('Local track visual sync failed:', error);
        }
    },

    normalizeVolume(value) {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
            return 80;
        }

        return Math.max(0, Math.min(100, Math.round(numericValue)));
    },

    saveVolumePreference() {
        try {
            localStorage.setItem('nw_player_volume', String(this.normalizeVolume(this.volume)));
            localStorage.setItem('nw_player_previous_volume', String(this.normalizeVolume(this.previousVolume)));
        } catch (error) {
            console.warn('Unable to save volume preference:', error);
        }
    },

    loadVolumePreference() {
        try {
            const savedVolume = localStorage.getItem('nw_player_volume');
            const savedPreviousVolume = localStorage.getItem('nw_player_previous_volume');

            if (savedVolume !== null) {
                this.volume = this.normalizeVolume(savedVolume);
            }

            if (savedPreviousVolume !== null) {
                this.previousVolume = this.normalizeVolume(savedPreviousVolume);
            } else if (this.volume > 0) {
                this.previousVolume = this.volume;
            }
        } catch (error) {
            console.warn('Unable to load volume preference:', error);
        }

        this.updateVolumeControls();
    },

    updateVolumeControls() {
        const volume = this.normalizeVolume(this.volume);
        const isMuted = volume === 0;
        const slider = document.getElementById('volumeSlider');
        const button = document.getElementById('volumeToggleBtn');

        if (slider && String(slider.value) !== String(volume)) {
            slider.value = String(volume);
        }

        if (button) {
            button.setAttribute('title', isMuted ? 'Remettre le son' : 'Couper le son');
            button.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
        }

        const icon = button?.querySelector('svg');
        if (icon) {
            icon.innerHTML = isMuted
                ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="16" y1="8" x2="22" y2="16"></line><line x1="22" y1="8" x2="16" y2="16"></line>'
                : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>';
        }
    },

    setVolume(value, options = {}) {
        const volume = this.normalizeVolume(value);
        this.volume = volume;

        if (volume > 0) {
            this.previousVolume = volume;
        } else if (!Number.isFinite(Number(this.previousVolume)) || Number(this.previousVolume) <= 0) {
            this.previousVolume = 80;
        }

        if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
            try {
                this.ytPlayer.setVolume(volume);
            } catch (error) {
                console.warn('Unable to set player volume:', error);
            }
        }
        if (this.localAudio) {
            this.localAudio.volume = volume / 100;
        }

        this.updateVolumeControls();

        if (options.persist !== false) {
            this.saveVolumePreference();
        }

        return volume;
    },

    toggleMute() {
        if (this.normalizeVolume(this.volume) === 0) {
            this.setVolume(this.normalizeVolume(this.previousVolume || 80) || 80);
            return;
        }

        this.setVolume(0);
    },

    persistResolvedVideoCache() {
        try {
            const serializedEntries = Array.from(this.resolvedVideoIdCache.entries())
                .filter(([, videoId]) => this.isLikelyYouTubeVideoId(videoId))
                .slice(-250);

            localStorage.setItem('nw_resolved_video_cache', JSON.stringify(serializedEntries));
        } catch (error) {
            console.warn('Unable to persist resolved video cache:', error);
        }
    },

    loadResolvedVideoCache() {
        try {
            const rawCache = localStorage.getItem('nw_resolved_video_cache');
            if (!rawCache) return;

            const entries = JSON.parse(rawCache);
            if (!Array.isArray(entries)) return;

            this.resolvedVideoIdCache = new Map(
                entries.filter(([cacheKey, videoId]) => (
                    typeof cacheKey === 'string'
                    && cacheKey
                    && this.isLikelyYouTubeVideoId(videoId)
                ))
            );
        } catch (error) {
            console.warn('Unable to load resolved video cache:', error);
        }
    },

    resetPlaybackRate() {
        if (!this.ytPlayer || typeof this.ytPlayer.setPlaybackRate !== 'function') return;

        try {
            const availableRates = typeof this.ytPlayer.getAvailablePlaybackRates === 'function'
                ? this.ytPlayer.getAvailablePlaybackRates()
                : [];

            if (!availableRates.length || availableRates.includes(1)) {
                this.ytPlayer.setPlaybackRate(1);
            }
        } catch (error) {
            console.warn('Unable to reset playback rate:', error);
        }
    },

    needsStreamResolution(candidateId, options = {}) {
        const directVideoId = this.normalizeTrackId(options.videoId);
        const normalizedCandidateId = this.normalizeTrackId(candidateId);
        const spotifyId = this.normalizeTrackId(
            options.spotifyId
            || (this.isLikelySpotifyId(directVideoId) ? directVideoId : '')
            || (this.isLikelySpotifyId(normalizedCandidateId) ? normalizedCandidateId : '')
        );
        const currentVideoId = this.isLikelyYouTubeVideoId(directVideoId)
            ? directVideoId
            : (this.isLikelyYouTubeVideoId(normalizedCandidateId) && !this.isLikelySpotifyId(normalizedCandidateId)
                ? normalizedCandidateId
                : '');

        if (spotifyId) {
            return true;
        }

        if (currentVideoId) {
            return false;
        }

        return Boolean(
            this.normalizeTrackId(options.title || '')
            || this.normalizeTrackId(options.artist || '')
        );
    },

    async resolvePlayableVideoId(candidateId, options = {}) {
        const directVideoId = this.normalizeTrackId(options.videoId);
        const normalizedCandidateId = this.normalizeTrackId(candidateId);
        const spotifyId = this.normalizeTrackId(
            options.spotifyId
            || (this.isLikelySpotifyId(directVideoId) ? directVideoId : '')
            || (this.isLikelySpotifyId(normalizedCandidateId) ? normalizedCandidateId : '')
        );
        const currentVideoId = this.isLikelyYouTubeVideoId(directVideoId)
            ? directVideoId
            : (this.isLikelyYouTubeVideoId(normalizedCandidateId) && !this.isLikelySpotifyId(normalizedCandidateId)
                ? normalizedCandidateId
                : '');
        const cacheKey = this.buildResolutionCacheKey({ ...options, spotifyId });
        const durationMs = this.getTrackDurationMs(options);

        const cachedVideoId = cacheKey ? this.resolvedVideoIdCache.get(cacheKey) : '';
        if (this.isLikelyYouTubeVideoId(cachedVideoId)) {
            return cachedVideoId;
        }

        const pendingResolution = cacheKey ? this.resolutionPromiseCache.get(cacheKey) : null;
        if (pendingResolution) {
            return pendingResolution;
        }

        const params = new URLSearchParams();
        if (options.title) params.set('title', options.title);
        if (options.artist) params.set('artist', options.artist);
        if (durationMs > 0) params.set('durationMs', String(durationMs));
        if (currentVideoId) params.set('currentVideoId', currentVideoId);

        let requestPath = '';
        if (spotifyId) {
            requestPath = `/api/music/resolve/${spotifyId}${params.toString() ? `?${params.toString()}` : ''}`;
        } else if (this.normalizeTrackId(options.title || '')) {
            requestPath = `/api/music/resolve-by-metadata?${params.toString()}`;
        } else if (currentVideoId) {
            return currentVideoId;
        } else {
            return normalizedCandidateId;
        }

        const resolveRequest = (async () => {
            const requester = typeof NW !== 'undefined' && typeof NW.fetchWithAuth === 'function'
                ? NW.fetchWithAuth(requestPath)
                : fetch(requestPath, { headers: Auth.getAuthHeaders() });

            const response = await requester;
            const data = await response.json();
            if (!response.ok || !this.isLikelyYouTubeVideoId(data?.videoId)) {
                throw new Error(data?.error || 'Impossible de resoudre ce morceau.');
            }

            if (cacheKey) {
                this.resolvedVideoIdCache.set(cacheKey, data.videoId);
                this.persistResolvedVideoCache();
            }

            return data.videoId;
        })();

        if (cacheKey) {
            this.resolutionPromiseCache.set(cacheKey, resolveRequest);
        }

        try {
            return await resolveRequest;
        } finally {
            if (cacheKey) {
                this.resolutionPromiseCache.delete(cacheKey);
            }
        }
    },

    async prefetchQueueTrack(index) {
        const track = this.queue[index];
        if (!track) return;

        const candidateId = this.normalizeTrackId(track.videoId || track.id || '');
        const spotifyId = this.normalizeTrackId(
            track.spotifyId || (this.isLikelySpotifyId(candidateId) ? candidateId : '')
        );
        const durationMs = this.getTrackDurationMs(track);
        const prefetchKey = this.buildResolutionCacheKey({
            ...track,
            spotifyId,
            title: track.title,
            artist: track.artist
        }) || `queue:${index}:${candidateId}`;

        if (!this.needsStreamResolution(candidateId, { ...track, spotifyId })) {
            return;
        }

        if (this.prefetchInFlight.has(prefetchKey)) {
            return;
        }

        this.prefetchInFlight.add(prefetchKey);

        try {
            const resolvedVideoId = await this.resolvePlayableVideoId(candidateId, {
                ...track,
                spotifyId,
                title: track.title || '',
                artist: track.artist || '',
                durationMs
            });

            if (!this.isLikelyYouTubeVideoId(resolvedVideoId) || !this.queue[index]) {
                return;
            }

            this.queue[index] = {
                ...this.queue[index],
                id: resolvedVideoId,
                videoId: resolvedVideoId,
                spotifyId
            };
        } catch (error) {
            console.warn(`Prefetch failed for queue track ${index}:`, error);
        } finally {
            this.prefetchInFlight.delete(prefetchKey);
        }
    },

    prefetchUpcomingTracks(limit = 3) {
        if (!Array.isArray(this.queue) || this.queue.length === 0) return;

        for (let step = 1; step <= limit; step += 1) {
            const index = this.queueIndex + step;
            if (index < 0 || index >= this.queue.length) break;

            const runPrefetch = () => {
                this.prefetchQueueTrack(index).catch((error) => {
                    console.warn(`Upcoming prefetch failed for track ${index}:`, error);
                });
            };

            if (step === 1) {
                runPrefetch();
                continue;
            }

            setTimeout(runPrefetch, step * 150);
        }
    },

    prefetchTrackList(tracks = [], limit = 8) {
        if (!Array.isArray(tracks) || !tracks.length) return;

        tracks.slice(0, limit).forEach((track, index) => {
            const runPrefetch = () => {
                const candidateId = this.normalizeTrackId(track?.videoId || track?.id || '');
                const spotifyId = this.normalizeTrackId(
                    track?.spotifyId || (this.isLikelySpotifyId(candidateId) ? candidateId : '')
                );

                if (!this.needsStreamResolution(candidateId, { ...track, spotifyId })) {
                    return;
                }

                this.resolvePlayableVideoId(candidateId, {
                    ...track,
                    spotifyId,
                    title: track?.title || '',
                    artist: track?.artist || '',
                    durationMs: this.getTrackDurationMs(track)
                }).catch((error) => {
                    console.debug(`Visible track prefetch skipped for "${track?.title || candidateId}":`, error);
                });
            };

            if (index === 0) {
                runPrefetch();
                return;
            }

            setTimeout(runPrefetch, index * 120);
        });
    },

    // ────────────────────────── PLAY ──────────────────────────
    async playTrack(id, title, artist, thumb, options = {}) {
        if (this.isLocalTrack(id, options)) {
            return this.playLocalTrack(id, title, artist, thumb, options);
        }

        this.activeEngine = 'youtube';
        if (this.localAudio) {
            this.localAudio.pause();
        }

        let videoId = this.normalizeTrackId(id);
        const spotifyId = this.normalizeTrackId(
            options.spotifyId || (this.isLikelySpotifyId(videoId) ? videoId : '')
        );
        const durationMs = this.getTrackDurationMs(options);

        if (this.needsStreamResolution(videoId, { ...options, spotifyId })) {
            console.log(`🔍 Resolving stream for track: ${title} (${spotifyId || videoId || 'metadata'})`);
            this.updateNowPlaying({ title, artist, thumb, resolving: true });
            
            try {
                videoId = await this.resolvePlayableVideoId(videoId, { ...options, spotifyId, title, artist, durationMs });
                console.log(`✅ Resolved to canonical YouTube source: ${videoId}`);
            } catch (err) {
                console.error('Failed to resolve track:', err);
                this.clearDiscordPresence();
                if (typeof Playlists !== 'undefined' && Playlists.showToast) {
                    Playlists.showToast(`Source introuvable pour "${title}"`);
                }
                if (this.queueIndex < this.queue.length - 1) {
                    return setTimeout(() => this.playFromQueue(this.queueIndex + 1), 1000);
                }
                return;
            }
        }

        if (!this.isLikelyYouTubeVideoId(videoId)) {
            console.warn('⚠️ Skipping track with no valid ID:', title);
            this.clearDiscordPresence();
            if (typeof Playlists !== 'undefined' && Playlists.showToast) {
                Playlists.showToast(`Lecture impossible pour "${title}"`);
            }
            if (this.queueIndex < this.queue.length - 1) {
                setTimeout(() => this.playFromQueue(this.queueIndex + 1), 100);
            }
            return;
        }

        const track = {
            id: videoId,
            videoId,
            title,
            artist,
            thumb,
            spotifyId,
            durationMs,
            searchQuery: options.searchQuery || '',
            original: options.original || null
        };

        if (this.queueIndex >= 0 && this.queue[this.queueIndex]) {
            const queuedTrack = this.queue[this.queueIndex];
            if (
                this.normalizeTrackId(queuedTrack.spotifyId || '') === spotifyId
                || this.normalizeTrackId(queuedTrack.videoId || queuedTrack.id || '') === this.normalizeTrackId(id)
                || (
                    this.normalizeTrackId(queuedTrack.title || '').toLowerCase() === this.normalizeTrackId(title).toLowerCase()
                    && this.normalizeTrackId(queuedTrack.artist || '').toLowerCase() === this.normalizeTrackId(artist).toLowerCase()
                )
            ) {
                this.queue[this.queueIndex] = {
                    ...queuedTrack,
                    id: videoId,
                    videoId,
                    spotifyId,
                    durationMs
                };
            }
        }

        this.currentTrack = track;
        this.cancelPendingPlaybackError();
        this.pendingTrackId = videoId;
        const switchToken = ++this.pendingSwitchToken;
        this.recoveryInFlight = false;
        this.lastKnownPlaybackAt = 0;
        this.lastHealthyTrackId = '';
        this.lastPlaybackPosition = 0;
        this.lastPlaybackProgressAt = 0;
        this.prefetchUpcomingTracks();

        this.addToHistory(track);
        this.saveResume(track, 0);
        this.updateNowPlaying(track);
        this.resetProgressUi();
        const remainingEl = document.getElementById('timeRemaining');
        if (remainingEl) remainingEl.style.display = 'none';
        
        // Track History on Backend
        if (typeof NW !== 'undefined' && NW.fetchWithAuth) {
            NW.fetchWithAuth('/api/music/history', {
                method: 'POST',
                body: JSON.stringify(track)
            }).catch(() => {});
        }

        this.setPlaying(false, { skipDiscordSync: true });

        // Play via YT
        if (this.playerReady && this.ytPlayer && this.ytPlayer.loadVideoById) {
            this.switchToTrack(videoId, switchToken);
        } else {
            this.waitForPlayer(videoId, switchToken);
        }

        // Sync video panel
        try {
            if (typeof VideoPlayer !== 'undefined') VideoPlayer.syncTrackChange(track);
        } catch (e) { console.warn('Video sync error:', e); }
    },

    switchToTrack(id, switchToken) {
        if (switchToken !== this.pendingSwitchToken) return;
        this.loadAndPlayById(id, 0);
    },

    playFromQueue(index) {
        if (index < 0 || index >= this.queue.length) return;
        this.queueIndex = index;
        const track = this.queue[index];
        this.playTrack(track.videoId || track.id, track.title, track.artist, track.thumb || track.thumbnail, track);
    },

    buildDiscordPresencePayload(status = this.isPlaying ? 'playing' : 'paused') {
        if (!this.currentTrack) return null;

        const position = this.getActiveCurrentTime();
        const duration = this.getActiveDuration();

        return {
            status: status === 'paused' ? 'paused' : 'playing',
            position,
            duration,
            track: {
                title: this.currentTrack.title || '',
                artist: this.currentTrack.artist || '',
                thumb: this.currentTrack.thumb || ''
            }
        };
    },

    syncDiscordPresence(status) {
        if (typeof window === 'undefined') return;

        const bridge = window.NeonWaveDesktop;
        if (!bridge || typeof bridge.setDiscordPresence !== 'function') return;

        const payload = this.buildDiscordPresencePayload(status);
        if (!payload) return;

        Promise.resolve(bridge.setDiscordPresence(payload)).catch(() => {});
    },

    clearDiscordPresence() {
        if (typeof window === 'undefined') return;

        const bridge = window.NeonWaveDesktop;
        if (!bridge || typeof bridge.clearDiscordPresence !== 'function') return;

        Promise.resolve(bridge.clearDiscordPresence()).catch(() => {});
    },

    setQueue(tracks, startIndex = 0) {
        if (!Array.isArray(tracks)) return;
        this.queue = tracks;
        this.playFromQueue(startIndex);
        // Refresh queue UI if needed
        if (typeof Music !== 'undefined' && Music.renderQueue) Music.renderQueue();
    },

    updateNowPlaying(track) {
        if (!track) return;

        // Common Player IDs (Desktop/Mini)
        const commonMap = {
            'nowPlayingTitle': track.title,
            'nowPlayingArtist': (el) => { 
                el.textContent = track.artist || '—';
                el.classList.add('artist-link');
                el.onclick = () => Music.openArtistProfile(track.artist);
            },
            'nowPlayingImg': track.thumb,
            'mpTitle': track.title,
            'mpArtist': (el) => { 
                el.textContent = track.artist || '-';
                el.classList.add('artist-link');
                el.onclick = () => Music.openArtistProfile(track.artist);
            },
            'mpCoverImg': track.thumb,
            'npTitle': track.title,
            'npArtist': (el) => { 
                el.textContent = track.artist || 'Artiste inconnu';
                el.classList.add('artist-link');
                el.onclick = () => Music.openArtistProfile(track.artist);
            },
            'npCreditsArtist': track.artist || '—',
            'mpDiscoverName': track.artist || 'L\'Artiste',
            'mpDiscoverBg': (el) => { el.style.backgroundImage = `url("${track.thumb}")`; },
            'playerThumb': (el) => { const img = el.querySelector('img'); if (img) img.src = track.thumb; }
        };

        Object.keys(commonMap).forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const val = commonMap[id];
            
            try {
                if (typeof val === 'function') {
                    val(el);
                } else if (el.tagName === 'IMG') {
                    if (val) el.src = val;
                } else {
                    el.textContent = val || '';
                }
            } catch (e) {
                console.warn(`Error updating element #${id}:`, e);
            }
        });

        // Update document title
        document.title = `${track.title} — NeonWave`;
        if (window.NWPWA && typeof window.NWPWA.updateMediaSession === 'function') {
            window.NWPWA.updateMediaSession(track);
        }
        this.loadLyricsForTrack(track);

        // Highlight active queue item
        document.querySelectorAll('.queue-item').forEach((el, i) => {
            el.classList.toggle('active', i === this.queueIndex);
        });

        // Sync visual patterns (if any)
        try {
            if (typeof Music !== 'undefined' && typeof Music.syncNowPlayingVisuals === 'function') {
                Music.syncNowPlayingVisuals(track);
            }
            this.updateDynamicBackground(track.thumb);
            if (typeof Karaoke !== 'undefined') {
                Karaoke.update(track);
            }
        } catch (e) { console.warn('Sync error:', e); }
    },

    escapeHTML(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    setLyricsState(message, state = 'loading') {
        const container = document.getElementById('npLyricsContent');
        const source = document.getElementById('npLyricsSource');
        if (!container) return;
        container.dataset.state = state;
        container.innerHTML = `<div class="lyrics-state">${this.escapeHTML(message)}</div>`;
        if (source) source.textContent = state === 'ready' ? 'LRCLIB' : '';
    },

    async loadLyricsForTrack(track) {
        const token = ++this.lyricsRequestToken;
        this.currentLyrics = null;
        this.activeLyricsIndex = -1;
        this.setLyricsState('Recherche des paroles...', 'loading');
        if (typeof Karaoke !== 'undefined') {
            Karaoke.renderLyrics(null);
        }

        const durationSeconds = Math.round((this.getTrackDurationMs(track) || 0) / 1000);
        const params = new URLSearchParams({
            title: track.title || '',
            artist: track.artist || ''
        });
        if (durationSeconds > 0) params.set('duration', String(durationSeconds));

        try {
            const response = await fetch(`/api/music/lyrics?${params.toString()}`, {
                headers: Auth.getAuthHeaders()
            });
            const data = await response.json();
            if (token !== this.lyricsRequestToken) return;
            if (!response.ok) throw new Error(data.error || 'Paroles introuvables.');

            const syncedLines = Array.isArray(data.syncedLines) ? data.syncedLines : [];
            const plainLines = String(data.plainLyrics || '')
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean);
            const lines = syncedLines.length
                ? syncedLines
                : plainLines.map((text) => ({ time: null, text }));

            if (!lines.length) throw new Error('Paroles introuvables.');

            this.currentLyrics = {
                synced: syncedLines.length > 0,
                lines
            };

            const container = document.getElementById('npLyricsContent');
            const source = document.getElementById('npLyricsSource');
            if (!container) return;
            container.dataset.state = 'ready';
            container.innerHTML = lines.map((line, index) => (
                `<p class="lyrics-line" data-lyrics-index="${index}"${line.time !== null ? ` data-time="${line.time}"` : ''}>${this.escapeHTML(line.text)}</p>`
            )).join('');

            // Make sidebar lyrics lines clickable to seek
            container.querySelectorAll('.lyrics-line').forEach(line => {
                line.style.cursor = 'pointer';
                line.addEventListener('click', () => {
                    const time = line.getAttribute('data-time');
                    if (time !== null && time !== undefined) {
                        Player.seekActiveMedia(parseFloat(time));
                    }
                });
            });

            if (source) source.textContent = data.source || 'Paroles';
            if (typeof Karaoke !== 'undefined') {
                Karaoke.renderLyrics(this.currentLyrics);
            }
        } catch (error) {
            if (token !== this.lyricsRequestToken) return;
            this.setLyricsState(error.message || 'Paroles indisponibles.', 'empty');
            if (typeof Karaoke !== 'undefined') {
                Karaoke.renderLyrics(null);
            }
        }
    },

    updateLyricsHighlight(currentTime) {
        if (!this.currentLyrics?.synced || !Array.isArray(this.currentLyrics.lines)) return;
        let nextIndex = -1;
        for (let index = 0; index < this.currentLyrics.lines.length; index += 1) {
            if (Number(this.currentLyrics.lines[index].time) <= currentTime + 0.15) {
                nextIndex = index;
            } else {
                break;
            }
        }
        if (nextIndex === this.activeLyricsIndex) return;
        this.activeLyricsIndex = nextIndex;

        document.querySelectorAll('#npLyricsContent .lyrics-line').forEach((line, index) => {
            line.classList.toggle('active', index === nextIndex);
        });
        const activeLine = document.querySelector(`#npLyricsContent [data-lyrics-index="${nextIndex}"]`);
        activeLine?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });

        if (typeof Karaoke !== 'undefined') {
            Karaoke.highlightLine(nextIndex);
        }
    },

    updateDynamicBackground(imageUrl) {
        if (!imageUrl) return;
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
        img.onload = () => {
            const canvas = document.getElementById('colorCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, 10, 10);
            const data = ctx.getImageData(0, 0, 10, 10).data;
            let r = 0, g = 0, b = 0;
            for (let i = 0; i < data.length; i += 4) {
                r += data[i]; g += data[i+1]; b += data[i+2];
            }
            r = Math.floor(r / (data.length / 4));
            g = Math.floor(g / (data.length / 4));
            b = Math.floor(b / (data.length / 4));
            
            // Brighten up slightly if too dark
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            if (brightness < 40) { r += 30; g += 30; b += 30; }

            const color = `rgba(${r}, ${g}, ${b}, 0.5)`;
            const playerUI = document.getElementById('mobilePlayerUI');
            if (playerUI) playerUI.style.setProperty('--mp-bg-color', color);
        };
    },

    waitForPlayer(id, switchToken = this.pendingSwitchToken) {
        if (this.playerWaitInterval) {
            clearInterval(this.playerWaitInterval);
            this.playerWaitInterval = null;
        }

        const check = setInterval(() => {
            if (this.playerReady && this.ytPlayer && this.ytPlayer.loadVideoById) {
                clearInterval(check);
                if (this.playerWaitInterval === check) {
                    this.playerWaitInterval = null;
                }
                this.switchToTrack(id, switchToken);
            }
        }, 200);
        this.playerWaitInterval = check;
        setTimeout(() => {
            if (this.playerWaitInterval === check) {
                clearInterval(check);
                this.playerWaitInterval = null;
            }
        }, 5000);
    },

    loadAndPlayById(id, startSeconds = 0) {
        if (!id || id === 'undefined' || id === 'null' || !this.ytPlayer || !this.ytPlayer.loadVideoById) {
            if (id && (!this.ytPlayer || !this.ytPlayer.loadVideoById)) return;
            // Invalid ID — trigger recovery
            console.warn('⚠️ Invalid video ID, triggering recovery:', id);
            this.handlePlaybackError({ errorCode: 'invalid-video-id', videoId: id });
            return;
        }

        this.pendingTrackId = id;

        try {
            this.ytPlayer.loadVideoById({
                videoId: id,
                startSeconds,
                suggestedQuality: 'default'
            });
        } catch (error) {
            console.warn('YouTube loadVideoById failed, retrying with raw id:', error);
            this.ytPlayer.loadVideoById(id);
        }

        this.resetPlaybackRate();

        try {
            this.ytPlayer.playVideo();
        } catch (error) {
            console.warn('YouTube playVideo failed:', error);
        }
    },



    extractSearchItemId(item) {
        const raw = item?.videoId || item?.id || item?.url || '';
        if (!raw) return '';
        if (raw.includes('v=')) return raw.split('v=')[1].split('&')[0];
        if (raw.startsWith('/watch?v=')) return raw.replace('/watch?v=', '').split('&')[0];
        const cleaned = String(raw).split('/').pop();
        return cleaned || '';
    },

    normalizeValue(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    },

    scoreFallbackCandidate(item, expectedTrack) {
        let score = 0;
        const title = (item.title || item.name || '').toLowerCase();
        const uploader = (item.uploaderName || item.artist || item.author || '').toLowerCase();

        const expectedArtist = (expectedTrack.artist || '').toLowerCase();
        const expectedTitle = (expectedTrack.title || '').toLowerCase();

        if (title.includes(expectedTitle)) score += 40;
        if (uploader.includes(expectedArtist) || title.includes(expectedArtist)) score += 30;

        const stopWords = new Set(['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'the', 'feat', 'ft']);
        const tokens = expectedTitle.split(' ').filter((token) => token.length > 2 && !stopWords.has(token));
        const matched = tokens.filter((token) => title.includes(token));

        if (tokens.length) {
            const coverage = matched.length / tokens.length;
            if (coverage >= 0.8) score += 28;
            else if (coverage >= 0.5) score += 12;
            else if (coverage === 0) score -= 70;
        }

        if (title.includes('official audio') || uploader.includes('topic')) score += 14;
        if (title.includes('lyrics') || title.includes('paroles')) score -= 20;
        if (title.includes('slowed') || title.includes('sped up') || title.includes('remix') || title.includes('live')) score -= 40;

        return score;
    },

    async recoverFromPlaybackError(errorCode = null, erroredVideoId = '') {
        if (this.shouldIgnorePlaybackError(errorCode, erroredVideoId)) return false;

        const failedTrack = this.currentTrack;
        const failedId = this.getCurrentTrackVideoId();
        const recoveryKey = this.getRecoveryTrackKey(failedTrack) || failedId;
        const attempts = this.recoveryAttemptsByTrack.get(recoveryKey) || 0;

        // Anti-spam to prevent CAPTCHA IP bans
        if (attempts >= 3) {
            console.error('Too many recovery attempts for this track. Auto-skipping to prevent ratelimit.');
            this.recoveryInFlight = false;
            this.lastRecoveryAt = Date.now();
            this.lastRecoveryKey = recoveryKey;
            setTimeout(() => this.playFromQueue(this.queueIndex + 1), 1000);
            return true;
        }

        this.recoveryAttemptsByTrack.set(recoveryKey, attempts + 1);
        if (this.recoveryAttemptsByTrack.size > 100) {
            this.recoveryAttemptsByTrack.clear();
        }

        this.recoveryInFlight = true;
        this.lastRecoveryAt = Date.now();
        this.lastRecoveryKey = recoveryKey;

        const isStillFailedTrack = () => (
            this.getCurrentTrackVideoId() === failedId
            && (this.getRecoveryTrackKey(this.currentTrack) || failedId) === recoveryKey
        );

        // Build multiple search queries for better chances
        const queries = [
            failedTrack.searchQuery || [failedTrack.artist, failedTrack.title, 'audio'].filter(Boolean).join(' '),
            [failedTrack.title, failedTrack.artist, 'official audio'].filter(Boolean).join(' '),
            [failedTrack.title, 'audio'].filter(Boolean).join(' ')
        ];

        try {
            // Small delay to prevent hammering the backend
            await new Promise(r => setTimeout(r, 1000));

            for (const query of queries) {
                if (!isStillFailedTrack()) return true; // user switched track

                const response = await fetch(`/api/music/search?q=${encodeURIComponent(query)}&filter=music`, {
                    headers: Auth.getAuthHeaders()
                });

                if (!response.ok) continue;

                const data = await response.json();
                const items = Array.isArray(data.items) ? data.items : [];

                const alternatives = items
                    .map((item) => ({
                        item,
                        id: this.extractSearchItemId(item),
                        score: this.scoreFallbackCandidate(item, failedTrack)
                    }))
                    .filter((entry) => entry.id && entry.id !== failedId)
                    .sort((left, right) => right.score - left.score);

                const replacementCandidates = alternatives.filter((entry) => entry.score >= 30).slice(0, 5);

                for (const replacement of replacementCandidates) {
                    if (!isStillFailedTrack()) return true;

                    let resolvedId = '';
                    try {
                        resolvedId = await this.resolvePlayableVideoId(replacement.id, {
                            videoId: replacement.item?.videoId || '',
                            spotifyId: replacement.item?.spotifyId || '',
                            title: replacement.item?.title || failedTrack.title,
                            artist: replacement.item?.uploaderName || replacement.item?.artist || failedTrack.artist,
                            durationMs: replacement.item?.durationMs || failedTrack.durationMs || 0,
                            duration: replacement.item?.duration || failedTrack.duration || 0
                        });
                    } catch (resolveError) {
                        console.warn('Recovery candidate resolve failed:', resolveError);
                        continue;
                    }

                    if (!this.isLikelyYouTubeVideoId(resolvedId) || resolvedId === failedId) {
                        continue;
                    }

                    const updatedTrack = {
                        ...failedTrack,
                        id: resolvedId,
                        videoId: resolvedId,
                        spotifyId: this.normalizeTrackId(replacement.item?.spotifyId || failedTrack.spotifyId),
                        durationMs: this.getTrackDurationMs({
                            durationMs: replacement.item?.durationMs || failedTrack.durationMs || 0,
                            duration: replacement.item?.duration || failedTrack.duration || 0
                        }),
                        thumb: replacement.item.thumbnail || replacement.item.thumb || failedTrack.thumb

                    };

                    this.currentTrack = updatedTrack;
                    this.pendingTrackId = resolvedId;

                    if (this.queueIndex >= 0 && this.queue[this.queueIndex]) {
                        this.queue[this.queueIndex] = {
                            ...this.queue[this.queueIndex],
                            id: resolvedId,
                            videoId: resolvedId,
                            spotifyId: this.normalizeTrackId(replacement.item?.spotifyId || this.queue[this.queueIndex].spotifyId),
                            durationMs: this.getTrackDurationMs({
                                durationMs: replacement.item?.durationMs || this.queue[this.queueIndex].durationMs || 0,
                                duration: replacement.item?.duration || this.queue[this.queueIndex].duration || 0
                            }),
                            thumb: replacement.item.thumbnail || replacement.item.thumb || this.queue[this.queueIndex].thumb
                        };
                        this.renderQueue();
                    }

                    this.updateNowPlaying(updatedTrack);
                    this.switchToTrack(resolvedId, ++this.pendingSwitchToken);
                    console.log(`🔄 Recovery success: "${failedTrack.title}" → new ID: ${replacement.id} (score: ${replacement.score})`);
                    return true;
                }
            }

            // All recovery queries failed — auto-skip to next track
            console.warn(`⏭️ Recovery failed for "${failedTrack.title}", auto-skipping...`);
            if (isStillFailedTrack()) {
                setTimeout(() => {
                    if (this.queueIndex < this.queue.length - 1) {
                        this.playFromQueue(this.queueIndex + 1);
                    } else if (this.autoplayOn) {
                        this.autoplayNext();
                    }
                }, 500);
            }
        } catch (error) {
            console.warn('Playback recovery failed:', error);
            // Auto-skip on error too
            setTimeout(() => {
                if (isStillFailedTrack() && this.queueIndex < this.queue.length - 1) {
                    this.playFromQueue(this.queueIndex + 1);
                }
            }, 500);
        } finally {
            this.recoveryInFlight = false;
        }
        return true;
    },


    switchToTrack(id, switchToken = this.pendingSwitchToken) {
        if (!id || !this.ytPlayer) return;
        if (switchToken !== this.pendingSwitchToken) return;
        this.loadAndPlayById(id);
    },


    togglePlay() {
        if (this.activeEngine === 'local') {
            const audio = this.ensureLocalAudio();
            if (!audio.src && this.currentTrack?.streamUrl) {
                audio.src = this.currentTrack.streamUrl;
            }
            if (audio.paused) {
                audio.play().catch((error) => console.warn('Local audio resume failed:', error));
            } else {
                audio.pause();
            }
            return;
        }

        if (!this.playerReady || !this.ytPlayer) {
            if (this.currentTrack?.id) {
                this.waitForPlayer(this.currentTrack.id);
            }
            return;
        }
        if (this.isPlaying) {
            this.ytPlayer.pauseVideo();
        } else {
            this.ytPlayer.playVideo();
        }
    },

    setPlaying(playing, options = {}) {
        this.isPlaying = playing;
        if (playing) {
            this.cancelPendingPlaybackError();
            this.markPlaybackHealthy();
        }
        
        document.getElementById('playIcon').style.display = playing ? 'none' : 'block';
        document.getElementById('pauseIcon').style.display = playing ? 'block' : 'none';
        
        // Sync mp icons
        const mpPlayIcon = document.getElementById('mpPlayIcon');
        const mpPauseIcon = document.getElementById('mpPauseIcon');
        if (mpPlayIcon) mpPlayIcon.style.display = playing ? 'none' : 'block';
        if (mpPauseIcon) mpPauseIcon.style.display = playing ? 'block' : 'none';

        playing ? this.startProgressTracking() : this.stopProgressTracking();
        if (window.NWPWA && typeof window.NWPWA.setPlaybackState === 'function') {
            window.NWPWA.setPlaybackState(playing ? 'playing' : 'paused');
        }

        // Sync video (non-blocking)
        try {
            if (typeof VideoPlayer !== 'undefined') {
                playing ? VideoPlayer.syncPlay() : VideoPlayer.syncPause();
            }
        } catch (e) { console.warn('Video play/pause sync error:', e); }

        if (!options.skipDiscordSync) {
            if (this.currentTrack) {
                this.syncDiscordPresence(playing ? 'playing' : 'paused');
            } else {
                this.clearDiscordPresence();
            }
        }
        if (typeof Karaoke !== 'undefined') {
            Karaoke.updatePlayPauseState(playing);
        }
    },

    resetProgressUi() {
        const progress = document.getElementById('progressSlider');
        const currentTime = document.getElementById('currentTime');
        const duration = document.getElementById('duration');

        if (progress) progress.value = 0;
        if (currentTime) currentTime.textContent = '0:00';
        if (duration) duration.textContent = '0:00';
    },

    nextTrack() {
        if (this.repeatMode === 'one') {
            this.seekActiveMedia(0);
            if (this.activeEngine === 'local') {
                this.localAudio?.play().catch(() => {});
            } else {
                this.ytPlayer?.playVideo?.();
            }
            return;
        }
        if (this.shuffleOn) {
            this.playShuffled();
            return;
        }
        if (this.queueIndex < this.queue.length - 1) {
            this.playFromQueue(this.queueIndex + 1);
        } else if (this.repeatMode === 'all' && this.queue.length > 0) {
            this.playFromQueue(0);
        } else if (this.autoplayOn && this.currentTrack) {
            this.autoplayNext();
        }
    },

    prevTrack() {
        // If > 3s into track, restart; else go to previous
        if (this.getActiveCurrentTime() > 3) {
            this.seekActiveMedia(0);
            return;
        }
        if (this.queueIndex > 0) {
            this.playFromQueue(this.queueIndex - 1);
        }
    },

    playShuffled() {
        if (this.queue.length <= 1) return;
        let available = this.queue.filter((_, i) => i !== this.queueIndex && !this.shuffleHistory.includes(i));
        if (available.length === 0) {
            this.shuffleHistory = [];
            available = this.queue.filter((_, i) => i !== this.queueIndex);
        }
        const pick = available[Math.floor(Math.random() * available.length)];
        const idx = this.queue.indexOf(pick);
        this.shuffleHistory.push(idx);
        if (this.shuffleHistory.length > Math.floor(this.queue.length * 0.7)) this.shuffleHistory.shift();
        this.playFromQueue(idx);
    },

    async autoplayNext() {
        if (!this.currentTrack) return;
        try {
            // Search artist to get their other hits
            const res = await fetch(`/api/music/search?q=${encodeURIComponent(this.currentTrack.artist)}`, {
                headers: Auth.getAuthHeaders()
            });
            if (!res.ok) return;
            const data = await res.json();
            const items = data.items || [];

            // Filter out the current track and obvious duplicates (lyric videos etc.)
            let available = items.filter(t => {
                const tid = t.url ? (t.url.includes('v=') ? t.url.split('v=')[1] : t.url) : null;
                if (!tid || tid === this.currentTrack.id) return false;

                // Exclude if it's basically the same title (e.g. "Song Name (Lyrics)")
                const tTitle = (t.title || '').toLowerCase();
                const cTitle = (this.currentTrack.title || '').toLowerCase();
                if (tTitle.includes(cTitle) || cTitle.includes(tTitle)) return false;

                return true;
            });

            // Fallback to any different track if filtering was too aggressive
            if (available.length === 0) {
                available = items.filter(t => {
                    const tid = t.url ? (t.url.includes('v=') ? t.url.split('v=')[1] : t.url) : null;
                    return tid && tid !== this.currentTrack.id;
                });
            }

            if (available.length > 0) {
                // Pick a somewhat random track among the top results to keep radio varied
                const randomIndex = Math.floor(Math.random() * Math.min(5, available.length));
                const next = available[randomIndex];

                const tid = next.url.includes('v=') ? next.url.split('v=')[1] : next.url;
                this.addToQueue({ id: tid, title: next.title, artist: next.uploaderName || next.artist, thumb: next.thumbnail });
                this.playFromQueue(this.queue.length - 1);
            }
        } catch (err) { console.error('Autoplay failed:', err); }
    },

    // ────────────────────────── QUEUE ──────────────────────────
    addToQueue(track) {
        this.queue.push(track);
        if (this.queue.length === 1) this.queueIndex = 0;
        this.renderQueue();
    },

    playNext(track) {
        this.queue.splice(this.queueIndex + 1, 0, track);
        this.renderQueue();
    },

    removeFromQueue(index) {
        this.queue.splice(index, 1);
        if (index < this.queueIndex) this.queueIndex--;
        if (index === this.queueIndex) {
            if (this.queue[this.queueIndex]) {
                this.playFromQueue(this.queueIndex);
            }
        }
        this.renderQueue();
    },

    clearQueue() {
        this.queue = [];
        this.queueIndex = -1;
        this.renderQueue();
    },

    renderQueue() {
        const container = document.getElementById('queueList');
        const syncNowPlayingQueue = () => {
            if (typeof NowPlayingPanel !== 'undefined' && typeof NowPlayingPanel.renderQueuePreview === 'function') {
                NowPlayingPanel.renderQueuePreview();
            }
        };

        if (!container) {
            syncNowPlayingQueue();
            return;
        }

        if (this.queue.length === 0) {
            container.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:0.85rem;">File d\'attente vide</div>';
            syncNowPlayingQueue();
            return;
        }

        container.innerHTML = this.queue.map((track, i) => `
            <div class="queue-item ${i === this.queueIndex ? 'active' : ''}" onclick="Player.playFromQueue(${i})">
                <img src="${track.thumb}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'">
                <div style="flex:1;min-width:0;">
                    <div style="font-size:0.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${track.title}</div>
                    <div style="font-size:0.7rem;color:var(--text-muted);">${track.artist}</div>
                </div>
                <button onclick="event.stopPropagation(); Player.removeFromQueue(${i})" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;" title="Retirer">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        `).join('');

        syncNowPlayingQueue();
    },

    toggleQueuePanel() {
        const panel = document.getElementById('queuePanel');
        if (!panel) return;
        panel.classList.toggle('open');
    },

    // ────────────────────────── REPEAT / SHUFFLE ──────────────────────────
    toggleRepeat() {
        const modes = ['none', 'all', 'one'];
        this.repeatMode = modes[(modes.indexOf(this.repeatMode) + 1) % 3];
        this.updateRepeatUi();
    },

    updateRepeatUi() {
        const btn = document.getElementById('repeatBtn');
        const mpBtn = document.getElementById('mpRepeatBtn');
        const badge = document.getElementById('loopStatusBadge');
        const color = this.repeatMode === 'none' ? 'var(--text-muted)' : 'var(--accent-bright)';
        const mpColor = this.repeatMode === 'none' ? 'rgba(255,255,255,0.7)' : '#1ed760';

        if (btn) btn.style.color = color;
        if (mpBtn) mpBtn.style.color = mpColor;

        const title = this.repeatMode === 'one' ? 'Répéter: Un seul' : this.repeatMode === 'all' ? 'Répéter: Toute la playlist' : 'Répéter: Désactivé';
        if (btn) btn.title = title;
        if (mpBtn) mpBtn.title = title;

        if (badge) {
            badge.classList.toggle('is-visible', this.repeatMode !== 'none');
            badge.dataset.mode = this.repeatMode;
            badge.textContent = this.repeatMode === 'one' ? 'Titre en boucle' : 'Playlist en boucle';
        }
    },

    toggleShuffle() {
        this.shuffleOn = !this.shuffleOn;
        this.shuffleHistory = [];
        const btn = document.getElementById('shuffleBtn');
        const mpBtn = document.getElementById('mpShuffleBtn');
        
        if (btn) btn.style.color = this.shuffleOn ? 'var(--accent-bright)' : 'var(--text-muted)';
        if (mpBtn) mpBtn.style.color = this.shuffleOn ? '#1ed760' : 'rgba(255,255,255,0.7)';
    },

    // ────────────────────────── HISTORY & UI ──────────────────────────
    async loadRecentlyPlayed() {
        try {
            const tracks = await NW.fetchWithAuth('/api/user/recently-played');
            const container = document.getElementById('recentlyPlayedTracks');
            const section = document.getElementById('recentSection');
            if (container && tracks?.length > 0) {
                section.classList.remove('hidden');
                this.renderTrackGrid(container, tracks);
            }
        } catch (err) { console.error('Failed to load recently played:', err); }
    },


    renderTrackGrid(container, tracks) {
        container.innerHTML = tracks.map(track => `
            <div class="track-card animate-fade" onclick="Player.playTrack(${JSON.stringify(track.videoId || track.id || track.spotifyId || '').replace(/"/g, '&quot;')}, ${JSON.stringify(track.title).replace(/"/g, '&quot;')}, ${JSON.stringify(track.artist).replace(/"/g, '&quot;')}, ${JSON.stringify(track.thumb).replace(/"/g, '&quot;')}, ${JSON.stringify(track).replace(/"/g, '&quot;')})">
                <div class="track-card-thumb">
                    <img src="${track.thumb || track.thumbnail || 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300'}" alt="${track.title}">
                    <button class="play-btn">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="7 4 19 12 7 20 7 4"/></svg>
                    </button>
                </div>
                <div class="track-card-info">
                    <div class="title">${track.title}</div>
                    <div class="artist">${track.artist || track.uploaderName || 'Artiste inconnu'}</div>
                </div>
            </div>
        `).join('');
    },


    hideVideo() {
        if (typeof VideoPlayer !== 'undefined') VideoPlayer.hide();
    },

    addToHistory(track) {
        this.history.unshift({ ...track, playedAt: Date.now() });
        if (this.history.length > 100) this.history.pop();
        localStorage.setItem('nw_history', JSON.stringify(this.history.slice(0, 50)));
    },

    loadHistory() {
        try {
            this.history = JSON.parse(localStorage.getItem('nw_history') || '[]');
        } catch { this.history = []; }
    },

    // ────────────────────────── RESUME ──────────────────────────
    savePlaybackState() {
        if (!this.currentTrack) return;
        const state = {
            track: this.currentTrack,
            time: this.ytPlayer?.getCurrentTime() || 0,
            volume: this.volume || 80,
            timestamp: Date.now()
        };
        localStorage.setItem('nw_last_playback', JSON.stringify(state));
    },

    resumePlaybackState() {
        const saved = localStorage.getItem('nw_last_playback');
        if (!saved) return;
        try {
            const state = JSON.parse(saved);
            if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
                this.currentTrack = state.track;
                this.pendingResumeTime = state.time;
                if (Number.isFinite(Number(state.volume))) {
                    this.setVolume(state.volume, { persist: false });
                }
                this.updateNowPlaying(state.track);
                console.log('🔄 Resume state detected at:', state.time);
            }
        } catch (e) { localStorage.removeItem('nw_last_playback'); }
    },

    saveResume(track, time) {
        localStorage.setItem('nw_resume', JSON.stringify({ ...track, time }));
    },

    loadResume() {
        this.resumePlaybackState();
    },

    // ────────────────────────── PROGRESS ──────────────────────────
    startProgressTracking() {
        this.stopProgressTracking();
        this.progressInterval = setInterval(() => {
            const duration = this.getActiveDuration();
            const currentTime = this.getActiveCurrentTime();
            
            if (duration > 0) {
                if (currentTime > 0) {
                    this.markPlaybackHealthy(currentTime);
                }
                this.updateLyricsHighlight(currentTime);
                if (typeof Karaoke !== 'undefined' && Karaoke.isOpen) {
                    Karaoke.updateLetterHighlight(currentTime);
                }

                const slider = document.getElementById('progressSlider');
                const mpSlider = document.getElementById('mpProgressSlider');
                const curText = document.getElementById('currentTime');
                const mpCurText = document.getElementById('mpCurrentTime');
                const durText = document.getElementById('duration');
                const mpDurText = document.getElementById('mpDuration');
                
                const percent = (currentTime / duration) * 100;
                if (slider) slider.value = percent;
                if (mpSlider) mpSlider.value = percent;
                
                const formattedTime = this.formatTime(currentTime);
                const formattedFull = this.formatTime(duration);
                
                if (curText) curText.textContent = formattedTime;
                if (mpCurText) mpCurText.textContent = formattedTime;
                if (durText) durText.textContent = formattedFull;
                if (mpDurText) mpDurText.textContent = formattedFull;
                if (window.NWPWA && typeof window.NWPWA.setPositionState === 'function') {
                    window.NWPWA.setPositionState(currentTime, duration);
                }

                // Update Remaining Time
                const remainingEl = document.getElementById('timeRemaining');
                if (remainingEl) {
                    const remaining = duration - currentTime;
                    remainingEl.textContent = `(-${this.formatTime(remaining)})`;
                    remainingEl.style.display = 'inline';
                }

                // Periodically save state (every 5s)
                if (Math.floor(currentTime) % 5 === 0 && Math.floor(currentTime) !== this.lastSavedProgress) {
                    this.lastSavedProgress = Math.floor(currentTime);
                    this.savePlaybackState();
                    if (this.currentTrack) this.saveResume(this.currentTrack, currentTime);
                }
            }
        }, 100);
    },

    stopProgressTracking() {
        if (this.progressInterval) { clearInterval(this.progressInterval); this.progressInterval = null; }
    },

    // ────────────────────────── INIT ──────────────────────────
    init() {
        document.getElementById('playBtn')?.addEventListener('click', () => this.togglePlay());
        document.getElementById('prevBtn')?.addEventListener('click', () => this.prevTrack());
        document.getElementById('nextBtn')?.addEventListener('click', () => this.nextTrack());

        const handleScrub = (e) => {
            const duration = this.getActiveDuration();
            if (!duration) return;
            this.seekActiveMedia((e.target.value / 100) * duration);
            this.syncDiscordPresence(this.isPlaying ? 'playing' : 'paused');
        };

        document.getElementById('progressSlider')?.addEventListener('input', handleScrub);
        document.getElementById('mpProgressSlider')?.addEventListener('input', handleScrub);

        document.getElementById('volumeSlider')?.addEventListener('input', (e) => {
            this.setVolume(e.target.value);
        });

        // Load data
        this.loadResolvedVideoCache();
        this.loadVolumePreference();
        this.loadHistory();
        this.loadRecentlyPlayed();
        this.resumePlaybackState();
        this.updateRepeatUi();
        if (window.NWPWA && typeof window.NWPWA.bindMediaActions === 'function') {
            window.NWPWA.bindMediaActions();
        }

        // Check for updates features popup (first start)
        setTimeout(() => this.checkChangelog(), 800);
    },

    async checkChangelog() {
        if (!window.NeonWaveDesktop || typeof window.NeonWaveDesktop.getVersion !== 'function') return;
        try {
            const currentVersion = await window.NeonWaveDesktop.getVersion();
            const lastSeenVersion = localStorage.getItem('nw_last_seen_version');

            if (currentVersion && currentVersion !== lastSeenVersion) {
                const entries = typeof Changelogs !== 'undefined' ? Changelogs[currentVersion] : null;
                if (entries && Array.isArray(entries)) {
                    const modal = document.getElementById('changelogModal');
                    const versionEl = document.getElementById('changelogVersion');
                    const listEl = document.getElementById('changelogList');

                    if (modal && listEl) {
                        if (versionEl) versionEl.textContent = currentVersion;
                        listEl.innerHTML = entries.map(entry => `<li class="changelog-item">${entry}</li>`).join('');
                        modal.classList.remove('hidden');
                    }
                } else {
                    localStorage.setItem('nw_last_seen_version', currentVersion);
                }
            }
        } catch (err) {
            console.error('Failed to check changelog:', err);
        }
    },

    async closeChangelog() {
        const modal = document.getElementById('changelogModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        if (window.NeonWaveDesktop && typeof window.NeonWaveDesktop.getVersion === 'function') {
            try {
                const currentVersion = await window.NeonWaveDesktop.getVersion();
                if (currentVersion) {
                    localStorage.setItem('nw_last_seen_version', currentVersion);
                }
            } catch (err) {
                console.error('Failed to save last seen version:', err);
            }
        }
    },

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
};

// --- Mock YouTube IFrame API via HTML5 Audio (Guarded Fallback) ---
if (!window.YT) {
    window.YT = {
        PlayerState: {
            UNSTARTED: -1,
            ENDED: 0,
            PLAYING: 1,
            PAUSED: 2,
            BUFFERING: 3,
            CUED: 5
        }
    };
}

class MockYTPlayer {
    constructor(elementId, config = {}) {
        this.config = config;
        this.events = config.events || {};
        this.currentVideoId = '';
        this.volume = 100;
        this.muted = false;
        this.readyTriggered = false;
        this._duration = 0;
        this._currentTime = 0;
        this._playerState = -1;
        this._playbackRate = 1;
        this._timeUpdateInterval = null;

        this.container = document.getElementById(elementId);
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = elementId;
            this.container.style.cssText = 'position:fixed;left:-9999px;top:auto;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-10;';
            document.body.appendChild(this.container);
        }

        this.iframe = null;
        this._messageHandler = this._onMessage.bind(this);
        window.addEventListener('message', this._messageHandler);

        setTimeout(() => {
            if (!this.readyTriggered) {
                this.readyTriggered = true;
                if (this.events.onReady) this.events.onReady();
            }
        }, 200);
    }

    _createIframe(videoId, startSeconds = 0) {
        if (this.iframe) this.iframe.remove();
        if (this._timeUpdateInterval) clearInterval(this._timeUpdateInterval);

        const params = new URLSearchParams({
            autoplay: '1', enablejsapi: '1', controls: '0',
            disablekb: '1', fs: '0', modestbranding: '1',
            rel: '0', showinfo: '0', origin: window.location.origin,
            widget_referrer: window.location.origin,
            start: String(Math.floor(startSeconds))
        });

        this.iframe = document.createElement('iframe');
        this.iframe.id = 'mockYtIframe';
        this.iframe.width = '1';
        this.iframe.height = '1';
        this.iframe.style.cssText = 'border:none;position:absolute;';
        this.iframe.allow = 'autoplay; encrypted-media';
        this.iframe.src = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
        this.container.innerHTML = '';
        this.container.appendChild(this.iframe);

        this._timeUpdateInterval = setInterval(() => {
            this._postCommand('getPlayerState');
            this._postCommand('getCurrentTime');
            this._postCommand('getDuration');
        }, 500);

        this.iframe.addEventListener('load', () => {
            this._postCommand('addEventListener', 'onStateChange');
            this._postCommand('addEventListener', 'onError');
            this._postCommand('setVolume', this.volume);
            if (this.muted) this._postCommand('mute');
        });
    }

    _postCommand(func, args) {
        if (!this.iframe?.contentWindow) return;
        try {
            this.iframe.contentWindow.postMessage(JSON.stringify({
                event: 'command', func, args: args !== undefined ? [args] : []
            }), 'https://www.youtube.com');
        } catch {}
    }

    _onMessage(event) {
        if (!event.origin.includes('youtube.com')) return;
        let data;
        try { data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
        if (!data?.info) return;
        const info = data.info;
        if (typeof info.playerState !== 'undefined') {
            const old = this._playerState;
            this._playerState = info.playerState;
            if (old !== info.playerState && this.events.onStateChange) {
                this.events.onStateChange({ data: info.playerState });
            }
        }
        if (typeof info.currentTime === 'number') this._currentTime = info.currentTime;
        if (typeof info.duration === 'number' && info.duration > 0) this._duration = info.duration;
        if (typeof info.volume === 'number') this.volume = info.volume;
        if (typeof info.muted === 'boolean') this.muted = info.muted;
        if (info.videoData?.video_id) this.currentVideoId = info.videoData.video_id;
    }

    loadVideoById(options) {
        let videoId = '', startSeconds = 0;
        if (typeof options === 'object') { videoId = options.videoId; startSeconds = options.startSeconds || 0; }
        else { videoId = options; }
        this.currentVideoId = videoId;
        this._currentTime = 0;
        this._playerState = 3;
        this._createIframe(videoId, startSeconds);
    }

    playVideo() { this._postCommand('playVideo'); }
    pauseVideo() { this._postCommand('pauseVideo'); }
    seekTo(seconds) { this._postCommand('seekTo', seconds); this._currentTime = seconds; }
    setVolume(v) { this.volume = v; this._postCommand('setVolume', v); }
    getVolume() { return this.volume; }
    mute() { this.muted = true; this._postCommand('mute'); }
    unMute() { this.muted = false; this._postCommand('unMute'); }
    isMuted() { return this.muted; }
    getDuration() { return this._duration || 0; }
    getCurrentTime() { return this._currentTime || 0; }
    getPlayerState() { return this._playerState; }
    getVideoData() { return { video_id: this.currentVideoId }; }
    setPlaybackRate(rate) { this._playbackRate = rate; this._postCommand('setPlaybackRate', rate); }
    getAvailablePlaybackRates() { return [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]; }
    destroy() {
        if (this._timeUpdateInterval) clearInterval(this._timeUpdateInterval);
        window.removeEventListener('message', this._messageHandler);
        if (this.iframe) this.iframe.remove();
    }
}

let apiReadyCalled = false;
function onYouTubeIframeAPIReady() {
    if (apiReadyCalled) return;
    
    if (!window.YT.Player) {
        window.YT.Player = MockYTPlayer;
        console.log('🎵 YouTube IFrame API not loaded. Using MockYTPlayer (fallback).');
    } else {
        console.log('🎵 YouTube IFrame API loaded. Using real YT.Player.');
    }
    
    apiReadyCalled = true;
    Player.ytPlayer = new window.YT.Player('ytPlayerFrame', {
        height: '1',
        width: '1',
        playerVars: {
            autoplay: 0, controls: 0, disablekb: 1, fs: 0,
            modestbranding: 1, rel: 0, showinfo: 0, origin: window.location.origin
        },
        events: {
            onStateChange: (event) => {
                if (Player.activeEngine !== 'youtube') return;
                if (event.data === window.YT.PlayerState.PLAYING) {
                    Player.resetPlaybackRate();
                    Player.suppressEndedEvent = false;
                    Player.setPlaying(true);
                } else if (event.data === window.YT.PlayerState.PAUSED) {
                    Player.setPlaying(false);
                } else if (event.data === window.YT.PlayerState.ENDED) {
                    if (Player.suppressEndedEvent) {
                        Player.suppressEndedEvent = false;
                        return;
                    }
                    Player.setPlaying(false);
                    Player.nextTrack(); // Auto-advance
                }
            },
            onReady: () => {
                console.log('🎵 YouTube Player Ready');
                Player.playerReady = true;
                Player.setVolume(Player.volume, { persist: false });
                Player.resetPlaybackRate();
                if (Player.pendingTrackId) {
                    Player.loadAndPlayById(Player.pendingTrackId);
                }
            },
            onError: (event) => {
                if (Player.activeEngine !== 'youtube') return;
                console.error('YouTube playback error:', event?.data, Player.currentTrack);
                Player.handlePlaybackError(event);
            }
        }
    });
}
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

// ────────────────────────── KARAOKE MODE MANAGER ──────────────────────────
window.Karaoke = {
    isOpen: false,

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    open() {
        const overlay = document.getElementById('karaokeOverlay');
        if (!overlay) return;
        
        this.isOpen = true;
        overlay.style.display = 'flex';
        // Force reflow
        overlay.offsetHeight;
        overlay.classList.add('active');
        
        this.update(Player.currentTrack);
        this.updatePlayPauseState(Player.isPlaying);
        
        document.body.style.overflow = 'hidden';
    },

    close() {
        const overlay = document.getElementById('karaokeOverlay');
        if (!overlay) return;
        
        this.isOpen = false;
        overlay.classList.remove('active');
        setTimeout(() => {
            if (!this.isOpen) overlay.style.display = 'none';
        }, 300);
        
        document.body.style.overflow = '';
    },

    update(track) {
        if (!this.isOpen) return;
        
        const coverImg = document.getElementById('karaokeCoverImg');
        const titleEl = document.getElementById('karaokeTitle');
        const artistEl = document.getElementById('karaokeArtist');
        
        if (!track) {
            if (coverImg) coverImg.src = '';
            if (titleEl) titleEl.textContent = 'Rien en lecture';
            if (artistEl) artistEl.textContent = '—';
            this.renderLyrics(null);
            this.updateBackground(null);
            return;
        }
        
        if (coverImg) coverImg.src = track.thumb || 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=500&auto=format&fit=crop';
        if (titleEl) titleEl.textContent = track.title || 'Sans titre';
        if (artistEl) artistEl.textContent = track.artist || 'Artiste inconnu';
        
        this.updateBackground(track.thumb);
        this.renderLyrics(Player.currentLyrics);
    },

    updateBackground(imageUrl) {
        if (!imageUrl) {
            this.setBackgroundColors(20, 24, 38);
            return;
        }
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
        img.onload = () => {
            const canvas = document.getElementById('colorCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, 10, 10);
            const data = ctx.getImageData(0, 0, 10, 10).data;
            let r = 0, g = 0, b = 0;
            for (let i = 0; i < data.length; i += 4) {
                r += data[i]; g += data[i+1]; b += data[i+2];
            }
            r = Math.floor(r / (data.length / 4));
            g = Math.floor(g / (data.length / 4));
            b = Math.floor(b / (data.length / 4));
            
            this.setBackgroundColors(r, g, b);
        };
        img.onerror = () => {
            this.setBackgroundColors(20, 24, 38);
        };
    },

    setBackgroundColors(r, g, b) {
        const overlay = document.getElementById('karaokeOverlay');
        if (!overlay) return;
        
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        if (brightness < 40) {
            r = Math.min(255, r + 45);
            g = Math.min(255, g + 45);
            b = Math.min(255, b + 45);
        } else if (brightness > 200) {
            r = Math.floor(r * 0.7);
            g = Math.floor(g * 0.7);
            b = Math.floor(b * 0.7);
        }
        
        const primary = `rgb(${r}, ${g}, ${b})`;
        const dark = `rgb(${Math.floor(r * 0.1)}, ${Math.floor(g * 0.1)}, ${Math.floor(b * 0.1)})`;
        const light = `rgb(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)})`;
        
        overlay.style.setProperty('--karaoke-color-primary', primary);
        overlay.style.setProperty('--karaoke-color-dark', dark);
        overlay.style.setProperty('--karaoke-color-light', light);
    },

    renderLyrics(lyricsObject) {
        const container = document.getElementById('karaokeLyricsContent');
        if (!container) return;
        
        if (!lyricsObject || !lyricsObject.lines || !lyricsObject.lines.length) {
            const stateMsg = Player.currentLyrics === null ? 'Recherche des paroles...' : 'Paroles indisponibles.';
            container.innerHTML = `<div class="lyrics-state">${stateMsg}</div>`;
            return;
        }
        
        container.innerHTML = lyricsObject.lines.map((line, index) => {
            const isSynced = line.time !== null;
            let content = '';
            if (isSynced) {
                content = line.text.split('').map((char, charIdx) => {
                    if (char === ' ') {
                        return `<span class="lyric-char space" data-char-index="${charIdx}"> </span>`;
                    }
                    return `<span class="lyric-char" data-char-index="${charIdx}">${Player.escapeHTML(char)}</span>`;
                }).join('');
            } else {
                content = Player.escapeHTML(line.text);
            }
            
            // Calculate duration for this line
            let lineDuration = 5; // fallback
            if (isSynced && index < lyricsObject.lines.length - 1) {
                lineDuration = lyricsObject.lines[index + 1].time - line.time;
            }
            
            return `<p class="lyrics-line" data-lyrics-index="${index}"${isSynced ? ` data-time="${line.time}" data-duration="${lineDuration}"` : ''}>${content}</p>`;
        }).join('');
        
        container.querySelectorAll('.lyrics-line').forEach(line => {
            line.addEventListener('click', () => {
                const time = line.getAttribute('data-time');
                if (time !== null && time !== undefined) {
                    Player.seekActiveMedia(parseFloat(time));
                }
            });
        });
        
        this.highlightLine(Player.activeLyricsIndex);
    },

    updateLetterHighlight(currentTime) {
        if (!this.isOpen) return;
        
        const activeLine = document.querySelector('#karaokeLyricsContent .lyrics-line.active');
        if (!activeLine) return;
        
        const startTime = parseFloat(activeLine.getAttribute('data-time'));
        const duration = parseFloat(activeLine.getAttribute('data-duration'));
        if (isNaN(startTime) || isNaN(duration) || duration <= 0) return;
        
        // Offset of 0.22s to align with the active line offset and compensate for YouTube API latency
        const offset = 0.22;
        const elapsed = (currentTime + offset) - startTime;
        const progress = Math.max(0, Math.min(1, elapsed / duration));
        
        const chars = activeLine.querySelectorAll('.lyric-char');
        const totalChars = chars.length;
        if (totalChars === 0) return;
        
        const charsToHighlight = Math.floor(progress * totalChars);
        
        chars.forEach((char, idx) => {
            if (idx <= charsToHighlight) {
                char.classList.add('revealed');
            } else {
                char.classList.remove('revealed');
            }
        });
    },

    highlightLine(activeIndex) {
        if (!this.isOpen) return;
        
        const lines = document.querySelectorAll('#karaokeLyricsContent .lyrics-line');
        lines.forEach((line, index) => {
            line.classList.toggle('active', index === activeIndex);
            line.classList.toggle('past', index < activeIndex);
        });
        
        const activeLine = document.querySelector(`#karaokeLyricsContent [data-lyrics-index="${activeIndex}"]`);
        if (activeLine) {
            activeLine.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    },

    updatePlayPauseState(playing) {
        if (!this.isOpen) return;
        const playIcon = document.getElementById('karaokePlayIcon');
        const pauseIcon = document.getElementById('karaokePauseIcon');
        if (playIcon) playIcon.style.display = playing ? 'none' : 'block';
        if (pauseIcon) pauseIcon.style.display = playing ? 'block' : 'none';
    }
};

// Initialize mock player setup (fallback if real API doesn't load)
setTimeout(onYouTubeIframeAPIReady, 1500);

Player.init();

// Auto-Updater Renderer Logic
document.addEventListener('DOMContentLoaded', () => {
    if (window.NeonWaveDesktop && typeof window.NeonWaveDesktop.onUpdaterStatus === 'function') {
        const overlay = document.getElementById('updaterOverlay');
        const message = document.getElementById('updaterMessage');
        const btn = document.getElementById('updaterBtn');
        const progressCircle = document.getElementById('spinnerProgress');
        const percentLabel = document.getElementById('updaterPercent');
        const title = overlay?.querySelector('.updater-overlay-title');
        const circumference = 251.2;

        const notesContainer = document.getElementById('updaterNotesContainer');
        const notesContent = document.getElementById('updaterNotesContent');

        if (!overlay || !message || !btn) return;

        const setProgress = (value) => {
            const progress = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
            if (percentLabel) percentLabel.textContent = `${progress}%`;
            if (progressCircle) {
                progressCircle.style.strokeDashoffset = String(circumference * (1 - progress / 100));
            }
        };

        const hideOverlay = (delay = 0) => {
            setTimeout(() => overlay.classList.add('hidden'), delay);
        };

        overlay.classList.remove('hidden');
        if (title) title.textContent = 'Recherche de mise à jour';
        message.textContent = 'Recherche de mises à jour...';
        btn.classList.add('hidden');
        if (notesContainer) notesContainer.classList.add('hidden');
        setProgress(0);

        let eventReceived = false;
        const fallbackTimeout = setTimeout(() => {
            if (!eventReceived) {
                message.textContent = 'Votre application est à jour.';
                setProgress(100);
                hideOverlay(1500);
            }
        }, 4000);

        window.NeonWaveDesktop.onUpdaterStatus((status, details) => {
            console.log(`[Updater Status]: ${status}`, details || '');
            eventReceived = true;
            clearTimeout(fallbackTimeout);

            switch (status) {
                case 'checking':
                    overlay.classList.remove('hidden');
                    if (title) title.textContent = 'Recherche de mise à jour';
                    message.textContent = 'Recherche de mises à jour...';
                    btn.classList.add('hidden');
                    if (notesContainer) notesContainer.classList.add('hidden');
                    setProgress(0);
                    break;

                case 'available':
                    overlay.classList.remove('hidden');
                    if (title) title.textContent = 'Mise à jour disponible';
                    message.textContent = 'Mise à jour disponible ! Téléchargement...';
                    btn.classList.add('hidden');
                    setProgress(0);

                    if (details && typeof details === 'object') {
                        const { version, releaseNotes } = details;
                        if (version && title) {
                            title.textContent = `Mise à jour disponible (v${version})`;
                        }
                        if (releaseNotes) {
                            if (notesContainer && notesContent) {
                                notesContent.innerHTML = releaseNotes;
                                notesContainer.classList.remove('hidden');
                            }
                        } else {
                            if (notesContainer) notesContainer.classList.add('hidden');
                        }
                    }
                    break;

                case 'not-available':
                    if (title) title.textContent = 'NeonWave est à jour';
                    message.textContent = 'Votre application est à jour.';
                    setProgress(100);
                    if (notesContainer) notesContainer.classList.add('hidden');
                    hideOverlay(2000);
                    break;

                case 'downloading':
                    overlay.classList.remove('hidden');
                    const progress = typeof details === 'number' ? Math.round(details) : 0;
                    if (title) title.textContent = 'Téléchargement en cours';
                    message.textContent = `Téléchargement : ${progress}%`;
                    btn.classList.add('hidden');
                    setProgress(progress);
                    break;

                case 'downloaded':
                    overlay.classList.remove('hidden');
                    if (title) title.textContent = 'Mise à jour prête';
                    message.textContent = 'Prêt à être installé !';
                    btn.classList.remove('hidden');
                    setProgress(100);

                    if (details && typeof details === 'object') {
                        const { version, releaseNotes } = details;
                        if (version && title) {
                            title.textContent = `Mise à jour prête (v${version})`;
                        }
                        if (releaseNotes) {
                            if (notesContainer && notesContent) {
                                notesContent.innerHTML = releaseNotes;
                                notesContainer.classList.remove('hidden');
                            }
                        } else {
                            if (notesContainer) notesContainer.classList.add('hidden');
                        }
                    }
                    break;

                case 'error':
                    overlay.classList.remove('hidden');
                    if (title) title.textContent = 'Mise à jour indisponible';
                    message.textContent = `Erreur : ${details || 'Échec de la mise à jour'}`;
                    btn.classList.add('hidden');
                    if (notesContainer) notesContainer.classList.add('hidden');
                    setProgress(0);
                    hideOverlay(5000);
                    break;
            }
        });
    }
});
