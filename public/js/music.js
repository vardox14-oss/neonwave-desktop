const Music = {
    favorites: [],
    preferences: null,
    followedArtists: [],
    spotifyEnabled: false,
    artistRegistry: {},
    searchFilter: 'all',
    lastSearchQuery: '',
    currentAlbum: null,
    recentAlbums: [],
    currentArtistProfile: null,
    artistReturnView: 'home',
    artistDiscographyFilter: 'popular',
    albumReturnView: 'search',
    _searchRequestToken: 0,
    _contexts: {},
    _artistHomeBound: false,

    async init() {
        this.normalizeStaticCopy();

        try {
            const res = await fetch('/api/user/favorites', { headers: Auth.getAuthHeaders() });
            if (res.ok) this.favorites = await res.json();
        } catch (err) {
            console.error('Fav fetch error:', err);
        }

        if (typeof Playlists !== 'undefined') {
            await Playlists.init();
        }

        this.bindArtistHomeEvents();
        this.bindSearchFilters();
        this.bindMobileSearch();
        await this.loadHomeFeed();
    },

    normalizeStaticCopy() {
        const searchTitle = document.querySelector('#searchView .section-title');
        if (searchTitle) {
            searchTitle.innerHTML = 'Resultats pour <span id="searchTerm" style="color:var(--accent-bright);">...</span>';
        }

        const libraryTitle = document.getElementById('libraryViewTitle');
        if (libraryTitle) {
            libraryTitle.textContent = 'Titres likes';
        }
    },

    bindSearchFilters() {
        if (this._searchFiltersBound) return;

        const buttons = Array.from(document.querySelectorAll('[data-search-filter]'));
        if (!buttons.length) return;

        buttons.forEach((button) => {
            button.addEventListener('click', async () => {
                const filter = button.dataset.searchFilter || 'all';
                await this.setSearchFilter(filter);
            });
        });

        this._searchFiltersBound = true;
        this.updateSearchFilterButtons();
    },

    bindMobileSearch() {
        const mobileSearchInput = document.getElementById('mobileSearchInput');
        if (!mobileSearchInput) return;

        mobileSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            // Optional: You could add a debounce here if needed
            this.search(query);
        });

        // Sync with desktop search input if needed
        const desktopSearchInput = document.getElementById('searchInput');
        if (desktopSearchInput) {
            mobileSearchInput.addEventListener('change', () => {
                desktopSearchInput.value = mobileSearchInput.value;
            });
        }
    },

    updateSearchFilterButtons() {
        document.querySelectorAll('[data-search-filter]').forEach((button) => {
            button.classList.toggle('active', button.dataset.searchFilter === this.searchFilter);
        });
    },

    async setSearchFilter(filter) {
        this.searchFilter = filter || 'all';
        this.updateSearchFilterButtons();

        const searchInput = document.getElementById('searchInput');
        const typedQuery = searchInput?.value.trim() || this.lastSearchQuery || '';
        const fallbackQueries = {
            all: 'top hits 2026',
            music: 'top hits 2026',
            podcasts: 'podcast musique',
            albums: this.preferences?.artists?.[0]?.name || 'Drake'
        };
        const query = typedQuery || fallbackQueries[this.searchFilter] || 'top hits 2026';

        if (searchInput && !typedQuery) {
            searchInput.value = query;
        }

        await this.search(query, this.searchFilter);
    },

    bindArtistHomeEvents() {
        if (this._artistHomeBound) return;
        const container = document.getElementById('followedArtistsGrid');
        if (!container) return;

        container.addEventListener('click', async (event) => {
            const followBtn = event.target.closest('.artist-follow-btn');
            if (!followBtn) return;

            event.preventDefault();
            event.stopPropagation();

            const artistKey = followBtn.dataset.artistKey;
            if (!artistKey) return;

            followBtn.disabled = true;
            try {
                await this.toggleFollowArtist(artistKey);
            } catch (error) {
                console.error('Artist follow error:', error);
            } finally {
                followBtn.disabled = false;
            }
        });

        this._artistHomeBound = true;
    },

    async loadHomeFeed() {
        const preferences = await this.fetchPreferences();
        
        // Load Premium Sections
        if (typeof Player !== 'undefined') {
            Player.loadRecentlyPlayed();
        }

        if (!preferences) {
            await this.getTrending();
            this.renderFollowedArtistsSection();
            return;
        }

        this.renderFollowedArtistsSection();

        if (preferences.completed) {
            await this.getRecommendations();
            return;
        }

        await this.getTrending();
        if (typeof MusicOnboarding !== 'undefined') {
            await MusicOnboarding.open();
        }
    },

    async startRadio(track) {
        if (!track) return;
        try {
            if (typeof Playlists !== 'undefined' && Playlists.showToast) {
                Playlists.showToast(`📻 Generation d'une radio basee sur ${track.title}...`);
            }

            const query = new URLSearchParams({
                seed_tracks: track.spotifyId || '',
                limit: 20
            });
            const response = await fetch(`/api/music/recommendations?${query}`, {
                headers: Auth.getAuthHeaders()
            });
            const data = await response.json();
            
            if (response.ok && data.items?.length > 0) {
                if (typeof Player !== 'undefined') {
                    Player.queue = [track, ...data.items];
                    Player.queueIndex = 0;
                    Player.renderQueue();
                    Player.playFromQueue(0);
                }
            }
        } catch (err) {
            console.error('Radio error:', err);
        }
    },

    async viewAlbum(albumId, albumName) {
        if (!albumId) return;
        try {
            // Switch to search view or a dedicated album view if exists
            // For now, let's trigger a search for the album or use the album API
            const response = await fetch(`/api/spotify/albums/${albumId}`, {
                headers: Auth.getAuthHeaders()
            });
            const data = await response.json();
            
            if (response.ok) {
                // If there's a dedicated album view element, show it.
                // Otherwise, render tracks in search results and switch view.
                const searchInput = document.getElementById('searchInput');
                if (searchInput) searchInput.value = albumName || data.name;
                
                const container = document.getElementById('searchResults');
                if (container) {
                    this.renderTracks(data.tracks || [], container);
                    document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));
                    document.getElementById('searchView').classList.remove('hidden');
                }
            }
        } catch (err) {
            console.error('View album error:', err);
        }
    },

    normalizeArtist(artist) {
        if (!artist) return null;

        if (typeof artist === 'string') {
            const name = artist.trim();
            return name ? {
                spotifyId: '',
                name,
                imageUrl: '',
                spotifyUrl: '',
                genres: [],
                popularity: 0,
                followers: 0,
                source: 'legacy'
            } : null;
        }

        const name = (artist.name || '').trim();
        if (!name) return null;

        return {
            spotifyId: (artist.spotifyId || artist.id || '').trim(),
            name,
            imageUrl: (artist.imageUrl || artist.image || '').trim(),
            spotifyUrl: (artist.spotifyUrl || artist.url || '').trim(),
            genres: Array.isArray(artist.genres) ? artist.genres.filter(Boolean).slice(0, 5) : [],
            popularity: Number.isFinite(artist.popularity) ? artist.popularity : 0,
            followers: Number.isFinite(artist.followers) ? artist.followers : 0,
            source: (artist.source || '').trim() || 'custom'
        };
    },

    getArtistIdentity(artist) {
        const normalized = this.normalizeArtist(artist);
        if (!normalized) return '';
        return (normalized.spotifyId || normalized.name).toLowerCase();
    },

    registerArtist(artist) {
        const normalized = this.normalizeArtist(artist);
        if (!normalized) return '';
        const key = encodeURIComponent(this.getArtistIdentity(normalized));
        this.artistRegistry[key] = normalized;
        return key;
    },

    getArtistByKey(key) {
        return this.artistRegistry[key] || null;
    },

    mergeArtists(...groups) {
        const merged = [];
        const seen = new Set();

        groups.flat().forEach((artist) => {
            const normalized = this.normalizeArtist(artist);
            if (!normalized) return;

            const identity = this.getArtistIdentity(normalized);
            if (!identity || seen.has(identity)) return;

            seen.add(identity);
            merged.push(normalized);
            this.registerArtist(normalized);
        });

        return merged;
    },

    updatePreferencesFromPayload(data) {
        const artists = this.mergeArtists(Array.isArray(data?.artists) ? data.artists : []);
        const followedArtists = this.mergeArtists(Array.isArray(data?.followedArtists) ? data.followedArtists : [], artists);

        this.spotifyEnabled = Boolean(data?.spotifyEnabled);
        this.followedArtists = followedArtists;
        this.preferences = {
            completed: Boolean(data?.completed),
            genres: Array.isArray(data?.genres) ? data.genres : [],
            artists,
            followedArtists,
            spotifyEnabled: this.spotifyEnabled
        };

        return this.preferences;
    },

    async fetchPreferences() {
        try {
            const response = await fetch('/api/user/music-preferences', {
                headers: Auth.getAuthHeaders()
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Impossible de charger les preferences.');
            }

            const preferences = this.updatePreferencesFromPayload(data);
            this.notifySidebarUpdate();
            return preferences;
        } catch (error) {
            console.error('Music preferences error:', error);
            return null;
        }
    },

    async fetchDefaultArtists() {
        const response = await fetch('/api/spotify/artists/defaults', {
            headers: Auth.getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Impossible de charger les artistes.');
        }

        this.spotifyEnabled = Boolean(data.spotifyEnabled);
        return this.mergeArtists(Array.isArray(data.items) ? data.items : []);
    },

    async searchArtistsCatalog(query) {
        const response = await fetch(`/api/spotify/search-artists?q=${encodeURIComponent(query)}`, {
            headers: Auth.getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Recherche artiste impossible.');
        }

        this.spotifyEnabled = Boolean(data.spotifyEnabled);
        return this.mergeArtists(Array.isArray(data.items) ? data.items : []);
    },

    async searchAlbumsCatalog(query) {
        const response = await fetch(`/api/spotify/search-albums?q=${encodeURIComponent(query)}`, {
            headers: Auth.getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Recherche album impossible.');
        }

        this.spotifyEnabled = Boolean(data.spotifyEnabled);
        return Array.isArray(data.items) ? data.items : [];
    },

    async loadRelatedArtists(artist, options = {}) {
        const normalizedArtist = this.normalizeArtist(artist);
        if (!normalizedArtist) return [];

        const selectedGenres = Array.isArray(options.selectedGenres)
            ? options.selectedGenres.filter(Boolean)
            : [];

        const query = new URLSearchParams({
            name: normalizedArtist.name,
            genres: (normalizedArtist.genres || []).join(','),
            selectedGenres: selectedGenres.join(',')
        });

        const artistId = normalizedArtist.spotifyId || 'fallback';
        const response = await fetch(`/api/spotify/artists/${encodeURIComponent(artistId)}/related?${query.toString()}`, {
            headers: Auth.getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Impossible de charger les artistes similaires.');
        }

        this.spotifyEnabled = Boolean(data.spotifyEnabled);
        return this.mergeArtists(Array.isArray(data.items) ? data.items : []);
    },

    async savePreferences(genres, artists) {
        const response = await fetch('/api/user/music-preferences', {
            method: 'POST',
            headers: Auth.getAuthHeaders(),
            body: JSON.stringify({ genres, artists })
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Impossible de sauvegarder les preferences.');
        }

        const preferences = this.updatePreferencesFromPayload(data);
        this.renderFollowedArtistsSection();
        this.notifySidebarUpdate();
        return preferences;
    },

    isArtistFollowed(artistOrKey) {
        const artist = typeof artistOrKey === 'string' ? this.getArtistByKey(artistOrKey) : artistOrKey;
        const identity = this.getArtistIdentity(artist);
        return Boolean(identity) && this.followedArtists.some((followedArtist) => this.getArtistIdentity(followedArtist) === identity);
    },

    syncFollowedArtists(followedArtists) {
        const normalizedArtists = this.mergeArtists(followedArtists, this.preferences?.artists || []);
        this.followedArtists = normalizedArtists;

        if (this.preferences) {
            this.preferences.followedArtists = normalizedArtists;
        }

        this.renderFollowedArtistsSection();
        this.notifySidebarUpdate();
    },

    notifySidebarUpdate() {
        if (typeof Playlists !== 'undefined' && typeof Playlists.renderSidebar === 'function') {
            Playlists.renderSidebar();
        }
    },

    rememberAlbum(album) {
        if (!album) return;

        const normalizedAlbum = {
            spotifyId: (album.spotifyId || album.id || '').trim(),
            name: (album.name || 'Album').trim() || 'Album',
            imageUrl: (album.imageUrl || album.image || '').trim(),
            artists: Array.isArray(album.artists) ? album.artists.filter(Boolean) : [],
            releaseDate: (album.releaseDate || '').trim(),
            totalTracks: Number.isFinite(album.totalTracks) ? album.totalTracks : (Array.isArray(album.tracks) ? album.tracks.length : 0)
        };

        const identity = normalizedAlbum.spotifyId || `${normalizedAlbum.name}:${normalizedAlbum.artists.join(',')}`.toLowerCase();
        if (!identity) return;

        this.recentAlbums = [
            normalizedAlbum,
            ...this.recentAlbums.filter((item) => {
                const itemIdentity = item.spotifyId || `${item.name}:${(item.artists || []).join(',')}`.toLowerCase();
                return itemIdentity !== identity;
            })
        ].slice(0, 6);

        this.notifySidebarUpdate();
    },

    openArtistSearch(artistKey) {
        this.openArtistProfileByKey(artistKey);
    },

    formatCompactNumber(value) {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue) || numericValue <= 0) {
            return '0';
        }

        try {
            return new Intl.NumberFormat('fr-FR', {
                notation: 'compact',
                maximumFractionDigits: 1
            }).format(numericValue);
        } catch (_) {
            return String(numericValue);
        }
    },

    formatReleaseYear(value) {
        const normalizedValue = String(value || '').trim();
        if (!normalizedValue) return 'Date inconnue';
        return normalizedValue.split('-')[0] || normalizedValue;
    },

    async fetchArtistProfile(artistOrKey) {
        const artist = typeof artistOrKey === 'string' ? this.getArtistByKey(artistOrKey) : artistOrKey;
        const normalizedArtist = this.normalizeArtist(artist);
        if (!normalizedArtist || (!normalizedArtist.spotifyId && !normalizedArtist.name)) {
            throw new Error('Artiste invalide.');
        }

        const params = new URLSearchParams();
        if (normalizedArtist.spotifyId) params.set('spotifyId', normalizedArtist.spotifyId);
        if (normalizedArtist.name) params.set('name', normalizedArtist.name);

        const response = await fetch(`/api/spotify/artist-profile?${params.toString()}`, {
            headers: Auth.getAuthHeaders()
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Impossible de charger cet artiste.');
        }

        this.spotifyEnabled = Boolean(data.spotifyEnabled);

        const profileArtist = this.mergeArtists([data?.item?.artist, normalizedArtist])[0] || normalizedArtist;
        const relatedArtists = this.mergeArtists(Array.isArray(data?.item?.relatedArtists) ? data.item.relatedArtists : []);

        return {
            ...data.item,
            artist: profileArtist,
            relatedArtists,
            topTracks: Array.isArray(data?.item?.topTracks) ? data.item.topTracks : [],
            discography: data?.item?.discography || { popular: [], albums: [], singles: [] },
            appearsOn: Array.isArray(data?.item?.appearsOn) ? data.item.appearsOn : []
        };
    },

    artistProfileSkeleton() {
        return `
            <div class="artist-profile-shell">
                <section class="artist-profile-hero is-loading">
                    <div class="artist-profile-topbar">
                        <div class="skeleton" style="height:38px;width:96px;border-radius:999px;"></div>
                    </div>
                    <div class="artist-profile-hero-content">
                        <div class="skeleton artist-profile-avatar-skeleton"></div>
                        <div class="artist-profile-copy">
                            <div class="skeleton" style="height:16px;width:120px;border-radius:999px;margin-bottom:16px;"></div>
                            <div class="skeleton" style="height:54px;width:280px;margin-bottom:12px;"></div>
                            <div class="skeleton" style="height:18px;width:220px;margin-bottom:24px;"></div>
                            <div class="skeleton" style="height:44px;width:240px;border-radius:999px;"></div>
                        </div>
                    </div>
                </section>
                <div class="artist-profile-section">
                    ${this.skeletonRows(5)}
                </div>
            </div>
        `;
    },

    async openArtistProfileByKey(artistKey) {
        await this.openArtistProfile(artistKey);
    },

    async openArtistProfile(artistOrKey) {
        const container = document.getElementById('artistViewContent');
        if (!container) return;

        // Logic Fix: If we get a string that is NOT in the registry, treat it as a raw name
        // This allows clicking on names in cards to work even without an internal key.
        let artist = typeof artistOrKey === 'string' ? (this.getArtistByKey(artistOrKey) || artistOrKey) : artistOrKey;
        const normalizedArtist = this.normalizeArtist(artist);
        if (!normalizedArtist) return;

        const activeView = this.getActiveView();
        this.artistReturnView = activeView === 'artist' ? (this.artistReturnView || 'home') : activeView;
        this.currentArtistProfile = null;
        this.artistDiscographyFilter = 'popular';
        container.innerHTML = this.artistProfileSkeleton();

        if (typeof showView === 'function') {
            showView('artist');
        }

        try {
            const profile = await this.fetchArtistProfile(normalizedArtist);
            this.currentArtistProfile = profile;
            if (!(typeof Player !== 'undefined' && Player.currentTrack?.thumb)) {
                this.setAmbientArtwork(profile.artist?.imageUrl || '');
            }
            this.renderArtistProfile(profile);
        } catch (error) {
            container.innerHTML = `
                <div class="artist-profile-shell">
                    <div style="padding:48px;text-align:center;color:var(--danger);font-weight:700;">
                        ${this.escapeHtml(error.message || 'Impossible de charger cet artiste.')}
                    </div>
                </div>
            `;
        }
    },

    goBackFromArtist() {
        if (typeof showView === 'function') {
            showView(this.artistReturnView || 'home');
        }
    },

    setArtistDiscographyFilter(filter) {
        this.artistDiscographyFilter = filter || 'popular';
        document.querySelectorAll('[data-artist-discography-filter]').forEach((button) => {
            button.classList.toggle('active', button.dataset.artistDiscographyFilter === this.artistDiscographyFilter);
        });
        this.renderArtistDiscography();
    },

    renderArtistDiscography() {
        const container = document.getElementById('artistDiscographyGrid');
        if (!container || !this.currentArtistProfile) return;

        const discography = this.currentArtistProfile.discography || {};
        let items = discography.popular || [];

        if (this.artistDiscographyFilter === 'albums') {
            items = discography.albums || [];
        } else if (this.artistDiscographyFilter === 'singles') {
            items = discography.singles || [];
        }

        if (!items.length) {
            container.innerHTML = '<div style="grid-column:1/-1;padding:24px 0;color:var(--text-secondary);">Aucune sortie disponible pour ce filtre.</div>';
            return;
        }

        container.innerHTML = items.map((album, index) => this.buildAlbumCardMarkup(album, index, {
            metaOverride: `${this.formatReleaseYear(album.releaseDate)} - ${album.type === 'single' ? 'Single' : 'Album'}`
        })).join('');
    },

    updateArtistFollowButtons(artistOrKey) {
        const artist = typeof artistOrKey === 'string' ? this.getArtistByKey(artistOrKey) : artistOrKey;
        const normalizedArtist = this.normalizeArtist(artist);
        if (!normalizedArtist) return;

        const artistKey = this.registerArtist(normalizedArtist);
        const isFollowed = this.isArtistFollowed(normalizedArtist);

        document.querySelectorAll(`button[data-artist-key="${artistKey}"]`).forEach((button) => {
            button.classList.toggle('is-following', isFollowed);
            button.textContent = isFollowed ? 'Abonne' : 'S abonner';
        });
    },

    async handleArtistFollowClick(artistKey, button) {
        if (button) button.disabled = true;
        try {
            await this.toggleFollowArtist(artistKey);
            this.updateArtistFollowButtons(artistKey);
        } catch (error) {
            console.error('Artist follow button error:', error);
        } finally {
            if (button) button.disabled = false;
        }
    },

    playArtistTopTracks(startIndex = 0) {
        const profileTracks = Array.isArray(this.currentArtistProfile?.topTracks)
            ? this.currentArtistProfile.topTracks
            : [];
        const playableTracks = profileTracks.filter((track) => track.videoId);

        if (!playableTracks.length || typeof Player === 'undefined') return;

        Player.queue = playableTracks.map((track) => ({
            id: track.videoId,
            title: track.title || track.name || 'Sans titre',
            artist: track.artist || track.uploaderName || 'Artiste inconnu',
            thumb: track.thumbnail || this.currentArtistProfile?.artist?.imageUrl || ''
        }));
        Player.renderQueue();
        Player.playFromQueue(Math.min(startIndex, Math.max(playableTracks.length - 1, 0)));
    },

    renderArtistProfile(profile) {
        const container = document.getElementById('artistViewContent');
        if (!container || !profile) return;

        const artistProfile = this.normalizeArtist(profile.artist);
        const artistKey = this.registerArtist(artistProfile);
        const isFollowed = this.isArtistFollowed(artistProfile);
        const topTracks = Array.isArray(profile.topTracks) ? profile.topTracks : [];
        const relatedArtists = Array.isArray(profile.relatedArtists) ? profile.relatedArtists : [];
        const appearsOn = Array.isArray(profile.appearsOn) ? profile.appearsOn : [];
        const heroImage = this.escapeHtml(artistProfile.imageUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&auto=format&fit=crop');
        const genres = artistProfile.genres?.length ? artistProfile.genres.join(' - ') : '';
        const followersLabel = artistProfile.followers
            ? `${this.formatCompactNumber(artistProfile.followers)} abonnes`
            : '';
        const popularityLabel = artistProfile.popularity
            ? `Popularite ${this.escapeHtml(String(artistProfile.popularity))}/100`
            : '';
        const heroMeta = [followersLabel, genres, popularityLabel].filter(Boolean);
        const infoCards = [
            genres ? `
                <article class="artist-about-card">
                    <span class="artist-about-label">Genres</span>
                    <strong>${this.escapeHtml(genres)}</strong>
                </article>
            ` : '',
            followersLabel ? `
                <article class="artist-about-card">
                    <span class="artist-about-label">Followers</span>
                    <strong>${this.escapeHtml(followersLabel)}</strong>
                </article>
            ` : '',
            artistProfile.popularity ? `
                <article class="artist-about-card">
                    <span class="artist-about-label">Popularite</span>
                    <strong>${this.escapeHtml(String(artistProfile.popularity))}/100</strong>
                </article>
            ` : ''
        ].filter(Boolean);

        container.innerHTML = `
            <div class="artist-profile-shell">
                <section class="artist-profile-hero">
                    <div class="artist-profile-hero-backdrop" style="background-image:linear-gradient(180deg, rgba(6,10,18,0.08), rgba(6,10,18,0.9)), url('${heroImage}')"></div>
                    <div class="artist-profile-topbar">
                        <button type="button" class="artist-back-btn" onclick="Music.goBackFromArtist()">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M15 18l-6-6 6-6"/></svg>
                            Retour
                        </button>
                    </div>
                    <div class="artist-profile-hero-content">
                        <div class="artist-profile-avatar">
                            <img src="${heroImage}" alt="${this.escapeHtml(artistProfile.name)}" loading="lazy">
                        </div>
                        <div class="artist-profile-copy">
                            <div class="artist-profile-kicker">Profil Officiel</div>
                            <h1 class="artist-profile-name">${this.escapeHtml(artistProfile.name)}</h1>
                            ${heroMeta.length
                                ? `<div class="artist-profile-meta">${heroMeta.map((item) => `<span>${this.escapeHtml(item)}</span>`).join('')}</div>`
                                : ''}
                            <div class="artist-profile-actions">
                                <button type="button" class="btn-glow" onclick="Music.playArtistTopTracks(0)" ${topTracks.some((track) => track.videoId) ? '' : 'disabled'}>
                                    Lecture
                                </button>
                                <button type="button" class="artist-profile-follow-btn${isFollowed ? ' is-following' : ''}" data-artist-key="${artistKey}" onclick="Music.handleArtistFollowClick('${artistKey}', this)">
                                    ${isFollowed ? 'Abonne' : 'S abonner'}
                                </button>
                                ${artistProfile.spotifyUrl ? '' : ''}
                            </div>
                        </div>
                    </div>
                </section>

                <section class="artist-profile-section">
                    <div class="artist-section-head">
                        <h2 class="section-title">Titres populaires</h2>
                    </div>
                    <div id="artistTopTracks" class="track-list" data-display="rows"></div>
                </section>

                <section class="artist-profile-section">
                    <div class="artist-section-head">
                        <h2 class="section-title">Discographie</h2>
                    </div>
                    <div class="artist-discography-filters">
                        <button type="button" class="artist-filter-chip active" data-artist-discography-filter="popular" onclick="Music.setArtistDiscographyFilter('popular')">Sorties populaires</button>
                        <button type="button" class="artist-filter-chip" data-artist-discography-filter="albums" onclick="Music.setArtistDiscographyFilter('albums')">Albums</button>
                        <button type="button" class="artist-filter-chip" data-artist-discography-filter="singles" onclick="Music.setArtistDiscographyFilter('singles')">Singles et EP</button>
                    </div>
                    <div id="artistDiscographyGrid" class="album-grid artist-release-grid"></div>
                </section>

                ${relatedArtists.length ? `
                    <section class="artist-profile-section">
                        <div class="artist-section-head">
                            <h2 class="section-title">Les fans aiment aussi</h2>
                        </div>
                        <div class="artist-circle-grid artist-profile-related-grid">
                            ${relatedArtists.map((artist) => this.buildArtistCard(artist, { openProfile: true })).join('')}
                        </div>
                    </section>
                ` : ''}

                ${appearsOn.length ? `
                    <section class="artist-profile-section">
                        <div class="artist-section-head">
                            <h2 class="section-title">Apparait sur</h2>
                        </div>
                        <div class="album-grid artist-release-grid">
                            ${appearsOn.map((album, index) => this.buildAlbumCardMarkup(album, index, {
                                metaOverride: `${this.formatReleaseYear(album.releaseDate)} - ${album.type === 'single' ? 'Single' : 'Album'}`
                            })).join('')}
                        </div>
                    </section>
                ` : ''}

                ${infoCards.length ? `
                    <section class="artist-profile-section">
                        <div class="artist-section-head">
                            <h2 class="section-title">Plus d infos</h2>
                        </div>
                        <div class="artist-about-grid">
                            ${infoCards.join('')}
                        </div>
                    </section>
                ` : ''}
            </div>
        `;

        const topTracksContainer = document.getElementById('artistTopTracks');
        if (topTracksContainer) {
            this.renderTracks(topTracks, topTracksContainer);
        }

        this.setArtistDiscographyFilter('popular');
    },

    async toggleFollowArtist(artistOrKey) {
        const artist = typeof artistOrKey === 'string' ? this.getArtistByKey(artistOrKey) : artistOrKey;
        const normalizedArtist = this.normalizeArtist(artist);
        if (!normalizedArtist) {
            throw new Error('Artiste invalide.');
        }

        const response = await fetch('/api/user/followed-artists/toggle', {
            method: 'POST',
            headers: Auth.getAuthHeaders(),
            body: JSON.stringify({ artist: normalizedArtist })
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Impossible de modifier l abonnement.');
        }

        this.syncFollowedArtists(Array.isArray(data.followedArtists) ? data.followedArtists : []);

        if (typeof MusicOnboarding !== 'undefined') {
            MusicOnboarding.onFollowStateChange(this.followedArtists);
        }

        return Boolean(data.followed);
    },

    updateHomeSection(title) {
        const titleEl = document.getElementById('homeSectionTitle');
        if (titleEl) titleEl.textContent = title;
    },

    renderFollowedArtistsSection() {
        const section = document.getElementById('artistHomeSection');
        const container = document.getElementById('followedArtistsGrid');
        if (!section || !container) return;

        if (!this.followedArtists.length) {
            section.classList.add('hidden');
            container.innerHTML = '';
            return;
        }

        section.classList.remove('hidden');
        container.innerHTML = this.followedArtists
            .map((artist) => this.buildArtistCard(artist, {
                showFollow: true,
                showSpotifyLink: false
            }))
            .join('');
    },

    buildArtistCard(artist, options = {}) {
        const normalizedArtist = this.normalizeArtist(artist);
        if (!normalizedArtist) return '';

        const artistKey = this.registerArtist(normalizedArtist);
        const isSelected = Boolean(options.selected);
        const selectable = Boolean(options.selectable);
        const openProfile = options.openProfile !== false && !selectable;
        const isFollowed = this.isArtistFollowed(normalizedArtist);
        const initials = this.getArtistInitials(normalizedArtist.name);
        const genres = normalizedArtist.genres?.length ? normalizedArtist.genres.slice(0, 2).join(' - ') : '';

        return `
            <article class="artist-circle-card${selectable ? ' selectable' : ''}${isSelected ? ' selected' : ''}${openProfile ? ' profile-link' : ''}" data-artist-key="${artistKey}" ${openProfile ? `onclick="Music.openArtistProfileByKey('${artistKey}')"` : ''}>
                <div class="artist-circle-avatar">
                    ${normalizedArtist.imageUrl
                        ? `<img src="${this.escapeHtml(normalizedArtist.imageUrl)}" alt="${this.escapeHtml(normalizedArtist.name)}" loading="lazy">`
                        : `<div class="artist-circle-initials">${this.escapeHtml(initials)}</div>`}
                </div>
                <div class="artist-card-name">${this.escapeHtml(normalizedArtist.name)}</div>
                <div class="artist-card-meta">${this.escapeHtml(genres || 'Artiste')}</div>
                <div class="artist-card-actions">
                    ${options.showFollow
                        ? `<button type="button" class="artist-follow-btn${isFollowed ? ' is-following' : ''}" data-artist-key="${artistKey}" onclick="event.stopPropagation(); Music.handleArtistFollowClick('${artistKey}', this)">${isFollowed ? 'Abonne' : 'S abonner'}</button>`
                        : ''}
                    ${options.showSpotifyLink && normalizedArtist.spotifyUrl
                        ? `<a class="artist-spotify-link" href="${this.escapeHtml(normalizedArtist.spotifyUrl)}" target="_blank" rel="noreferrer" onclick="event.stopPropagation()">Voir sur Spotify</a>`
                        : ''}
                </div>
                ${selectable
                    ? `<div class="artist-select-indicator">${isSelected ? 'Selectionne' : 'Cliquer pour choisir'}</div>`
                    : ''}
            </article>
        `;
    },

    getArtistInitials(name) {
        return (name || '')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() || '')
            .join('') || 'A';
    },

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    getTrackId(track) {
        if (!track) return null;

        const url = track.url || '';
        if (url) {
            if (url.includes('v=')) {
                return url.split('v=')[1].split('&')[0];
            }

            const cleaned = url.split('/').pop();
            return cleaned || url;
        }

        const id = track.videoId || track.id || null;
        if (id === 'undefined' || id === 'null') return null;
        return id;
    },

    formatTrackDuration(value) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }

        const numericValue = Number(value);
        if (!Number.isFinite(numericValue) || numericValue <= 0) {
            return '--';
        }

        const totalSeconds = numericValue > 10000 ? Math.round(numericValue / 1000) : Math.round(numericValue);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    },

    normalizeTrackKey(value) {
        const normalized = String(value || '').trim();
        if (!normalized || normalized === 'undefined' || normalized === 'null') {
            return '';
        }
        return normalized;
    },

    isYouTubeTrackId(value) {
        return /^[A-Za-z0-9_-]{11}$/.test(this.normalizeTrackKey(value));
    },

    isSpotifyTrackId(value) {
        return /^[A-Za-z0-9]{22}$/.test(this.normalizeTrackKey(value));
    },

    getPlayableTrackId(track) {
        if (!track) return null;

        const videoId = this.normalizeTrackKey(track.videoId);
        if (this.isYouTubeTrackId(videoId)) {
            return videoId;
        }

        const fallbackId = this.normalizeTrackKey(track.id);
        if (this.isYouTubeTrackId(fallbackId) || this.isSpotifyTrackId(fallbackId)) {
            return fallbackId;
        }

        const spotifyId = this.normalizeTrackKey(track.spotifyId);
        if (spotifyId) {
            return spotifyId;
        }

        return fallbackId || null;
    },

    getTrackArtistLabel(track) {
        if (Array.isArray(track?.artists)) {
            const names = track.artists
                .map((artist) => typeof artist === 'string' ? artist : artist?.name)
                .filter(Boolean);
            if (names.length) {
                return names.join(', ');
            }
        }

        return track?.uploaderName || track?.artist || 'Artiste inconnu';
    },

    getTrackDurationMs(track) {
        const durationMs = Number(track?.durationMs || track?.duration_ms);
        if (Number.isFinite(durationMs) && durationMs > 0) {
            return Math.round(durationMs);
        }

        const duration = Number(track?.duration);
        if (Number.isFinite(duration) && duration > 0) {
            return duration > 10000 ? Math.round(duration) : Math.round(duration * 1000);
        }

        return 0;
    },

    getTrackDurationLabel(track) {
        const textValue = track?.durationLabel || track?.durationText;
        if (typeof textValue === 'string' && textValue.trim()) {
            return textValue.trim();
        }

        if (typeof track?.duration === 'string' && track.duration.trim()) {
            return track.duration.trim();
        }

        const durationMs = this.getTrackDurationMs(track);
        return durationMs > 0 ? this.formatTrackDuration(durationMs) : '--';
    },

    setAmbientArtwork(artworkUrl = '') {
        const root = document.documentElement;
        const safeUrl = String(artworkUrl || '').trim().replace(/"/g, '%22');
        const hasArtwork = Boolean(safeUrl);

        root.style.setProperty('--ambient-image', hasArtwork ? `url("${safeUrl}")` : 'none');
        root.style.setProperty('--ambient-opacity', hasArtwork ? '0.82' : '0');
        document.body.classList.toggle('has-ambient-artwork', hasArtwork);
    },

    syncNowPlayingVisuals(track) {
        const artworkUrl = track?.thumb || this.currentAlbum?.imageUrl || '';
        this.setAmbientArtwork(artworkUrl);
    },

    buildTrackMetaLine(track) {
        const parts = [];
        const artist = track.original?.uploaderName || track.original?.artist || track.artist || '';
        const uploaded = track.original?.uploadedDate || track.original?.releaseDate || '';
        const source = track.original?.source || (track.original?.album ? 'Album' : 'Lecture');

        if (artist) parts.push(artist);
        if (source) parts.push(source);
        if (uploaded) parts.push(uploaded);

        return parts.filter(Boolean).join(' - ') || 'Artiste inconnu';
    },

    createTrackContext(tracks) {
        return (tracks || [])
            .filter((track) => track.playable !== false) // skip tracks explicitly marked unplayable
            .map((track) => {
            const playbackId = this.getPlayableTrackId(track);
            if (!playbackId) return null;

            const videoId = this.isYouTubeTrackId(track.videoId)
                ? this.normalizeTrackKey(track.videoId)
                : (this.isYouTubeTrackId(track.id) ? this.normalizeTrackKey(track.id) : '');
            const spotifyId = this.normalizeTrackKey(
                track.spotifyId || (this.isSpotifyTrackId(track.id) ? track.id : '')
            );
            const isLocalSource = track.source === 'local' || String(playbackId).startsWith('local-');
            const rawTitle = track.title || track.name || 'Sans titre';
            const rawArtist = this.getTrackArtistLabel(track);
            const thumb = track.thumbnail || track.thumb || track.imageUrl || (isLocalSource
                ? ''
                : videoId
                ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
                : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop');
            const durationMs = this.getTrackDurationMs(track);

            return {
                id: playbackId,
                videoId,
                localTrackId: track.localTrackId || (track.source === 'local' ? playbackId : ''),
                source: isLocalSource ? 'local' : (track.source || ''),
                streamUrl: track.streamUrl || '',
                title: rawTitle,
                artist: rawArtist,
                thumb,
                spotifyId,
                searchQuery: track.pipedQuery || [rawArtist, rawTitle, 'audio'].filter(Boolean).join(' '),
                duration: this.getTrackDurationLabel(track),
                durationLabel: this.getTrackDurationLabel(track),
                durationMs,
                album: typeof track.album === 'object'
                    ? (track.album?.name || '')
                    : (track.album || track.albumName || ''),
                artists: Array.isArray(track.artists) ? track.artists : [],
                playable: true,
                meta: this.buildTrackMetaLine({
                    original: track,
                    title: rawTitle,
                    artist: rawArtist
                }),
                original: track
            };
        }).filter(Boolean);
    },

    getContextTrack(containerId, index) {
        return this._contexts?.[containerId]?.[index] || null;
    },

    syncFavoritesFromLikes() {
        if (typeof Playlists === 'undefined') {
            return this.favorites;
        }

        this.favorites = [...new Set(
            (Playlists.likedTracks || []).flatMap((track) => ([
                this.normalizeTrackKey(track?.videoId || ''),
                this.normalizeTrackKey(track?.spotifyId || '')
            ])).filter(Boolean)
        )];

        return this.favorites;
    },

    isFavoriteTrack(trackOrId, spotifyId = '') {
        if (typeof Playlists !== 'undefined' && typeof Playlists.isLiked === 'function') {
            if (typeof trackOrId === 'object') {
                return Playlists.isLiked(trackOrId);
            }

            return Playlists.isLiked({
                id: trackOrId,
                videoId: trackOrId,
                spotifyId
            });
        }

        const ids = typeof trackOrId === 'object'
            ? [trackOrId?.videoId, trackOrId?.id, trackOrId?.spotifyId]
            : [trackOrId, spotifyId];

        return ids
            .map((value) => this.normalizeTrackKey(value))
            .filter(Boolean)
            .some((value) => this.favorites.includes(value));
    },

    toggleFavoriteFromContext(containerId, index) {
        const track = this.getContextTrack(containerId, index);
        if (!track) return;
        this.toggleFavorite(track.id, track.title, track.artist, track.thumb, track.spotifyId || '');
    },

    showContextMenuFromContext(event, containerId, index) {
        const track = this.getContextTrack(containerId, index);
        if (!track) return;
        this.showContextMenu(event, track.id, track.title, track.artist, track.thumb, track.spotifyId || '', track);
    },

    skeletonRows(count) {
        return `
            <div class="track-list-shell">
                <div class="track-list-header">
                    <span>#</span>
                    <span>Titre</span>
                    <span class="track-col-meta">Source</span>
                    <span>Duree</span>
                    <span></span>
                </div>
                ${Array(count).fill(0).map(() => `
                    <div class="track-row is-skeleton">
                        <div class="skeleton" style="height:14px;width:16px;"></div>
                        <div class="track-row-main">
                            <div class="skeleton track-row-thumb-skeleton"></div>
                            <div class="track-row-copy">
                                <div class="skeleton" style="height:14px;width:180px;margin-bottom:8px;"></div>
                                <div class="skeleton" style="height:12px;width:120px;"></div>
                            </div>
                        </div>
                        <div class="skeleton track-col-meta" style="height:12px;width:90px;"></div>
                        <div class="skeleton" style="height:12px;width:42px;"></div>
                        <div class="skeleton" style="height:12px;width:20px;"></div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    async search(query, filter = this.searchFilter) {
        const resultsEl = document.getElementById('searchResults');
        const albumResultsEl = document.getElementById('albumResults');
        const searchTermEl = document.getElementById('searchTerm');
        const searchSummaryEl = document.getElementById('searchSummary');
        const searchSpotlight = document.getElementById('searchSpotlight');
        const searchSongsMetaEl = document.getElementById('searchSongsMeta');
        const searchAlbumsMetaEl = document.getElementById('searchAlbumsMeta');
        const searchAlbumsSection = document.getElementById('searchAlbumsSection');
        const normalizedQuery = (query || '').trim();
        const requestToken = ++this._searchRequestToken;
        this.lastSearchQuery = normalizedQuery;
        this.searchFilter = filter || 'all';
        this.updateSearchFilterButtons();

        if (searchTermEl) searchTermEl.textContent = normalizedQuery;
        if (searchSummaryEl) {
            searchSummaryEl.textContent = normalizedQuery
                ? `Recherche active pour "${normalizedQuery}". Les titres montent en tete et les albums restent accessibles juste en dessous.`
                : 'Tape un titre, un artiste ou un album pour lancer la recherche.';
        }
        if (typeof showView === 'function') {
            showView('search');
        }

        if (!normalizedQuery) {
            if (resultsEl) resultsEl.innerHTML = '';
            if (albumResultsEl) albumResultsEl.innerHTML = '';
            return;
        }

        if (this.searchFilter === 'albums') {
            if (resultsEl) resultsEl.classList.add('hidden');
            if (searchSpotlight) searchSpotlight.classList.add('is-albums-only');
            if (searchSongsMetaEl) searchSongsMetaEl.textContent = '';
            if (searchAlbumsMetaEl) searchAlbumsMetaEl.textContent = 'Recherche album';
            if (albumResultsEl) {
                albumResultsEl.classList.remove('hidden');
                albumResultsEl.innerHTML = this.albumSkeletonGrid(8);
            }
            if (searchAlbumsSection) searchAlbumsSection.classList.remove('hidden');

            try {
                const albums = await this.searchAlbumsCatalog(normalizedQuery);
                if (requestToken !== this._searchRequestToken) return;
                this.renderAlbums(albums, albumResultsEl);
                if (searchAlbumsMetaEl) {
                    searchAlbumsMetaEl.textContent = `${albums.length} album${albums.length !== 1 ? 's' : ''}`;
                }
            } catch (err) {
                if (requestToken !== this._searchRequestToken) return;
                if (albumResultsEl) {
                    albumResultsEl.innerHTML = `<div style="grid-column:1/-1;padding:48px;text-align:center;color:var(--danger);">Erreur: ${err.message}</div>`;
                }
            }
            return;
        }

        if (albumResultsEl) {
            albumResultsEl.classList.add('hidden');
            albumResultsEl.innerHTML = '';
        }
        if (searchSpotlight) searchSpotlight.classList.remove('is-albums-only');
        if (resultsEl) {
            resultsEl.classList.remove('hidden');
            resultsEl.innerHTML = this.skeletonRows(8);
        }
        if (searchSongsMetaEl) searchSongsMetaEl.textContent = 'Chargement des titres';
        if (searchAlbumsMetaEl) searchAlbumsMetaEl.textContent = '';
        if (searchAlbumsSection) searchAlbumsSection.classList.remove('hidden');

        try {
            const trackRequest = fetch(`/api/music/search?q=${encodeURIComponent(normalizedQuery)}&filter=${encodeURIComponent(this.searchFilter)}`, {
                headers: Auth.getAuthHeaders()
            }).then(async (response) => {
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Erreur de recherche');
                }
                return data;
            });

            const shouldLoadAlbums = this.searchFilter === 'all' || this.searchFilter === 'music';
            const albumRequest = shouldLoadAlbums
                ? this.searchAlbumsCatalog(normalizedQuery).catch((error) => {
                    console.warn('Album search fallback:', error);
                    return [];
                })
                : Promise.resolve([]);

            const [data, albums] = await Promise.all([trackRequest, albumRequest]);
            if (requestToken !== this._searchRequestToken) return;
            const items = Array.isArray(data.items) ? data.items : [];

            this.renderTracks(items, resultsEl);
            if (!(typeof Player !== 'undefined' && Player.currentTrack?.thumb)) {
                this.setAmbientArtwork(this.getContextTrack('searchResults', 0)?.thumb || '');
            }

            if (searchSongsMetaEl) {
                searchSongsMetaEl.textContent = `${items.length} titre${items.length !== 1 ? 's' : ''}`;
            }

            if (shouldLoadAlbums) {
                if (albumResultsEl) {
                    albumResultsEl.classList.remove('hidden');
                }
                this.renderAlbums(albums, albumResultsEl);
                if (searchAlbumsMetaEl) {
                    searchAlbumsMetaEl.textContent = `${albums.length} album${albums.length !== 1 ? 's' : ''}`;
                }
            } else if (searchAlbumsSection) {
                searchAlbumsSection.classList.add('hidden');
            }
        } catch (err) {
            if (requestToken !== this._searchRequestToken) return;
            if (resultsEl) resultsEl.innerHTML = `<div style="grid-column:1/-1;padding:48px;text-align:center;color:var(--danger);">Erreur: ${err.message}</div>`;
        }
    },

    albumSkeletonGrid(count) {
        return Array(count).fill(0).map(() => `
            <div class="album-card" style="pointer-events:none;">
                <div class="skeleton" style="aspect-ratio:1/1;margin-bottom:12px;border-radius:18px;"></div>
                <div class="skeleton" style="height:14px;width:72%;margin-bottom:8px;border-radius:4px;"></div>
                <div class="skeleton" style="height:12px;width:45%;border-radius:4px;"></div>
            </div>
        `).join('');
    },

    albumDetailSkeleton() {
        return `
            <div class="album-detail-shell">
                <div class="album-detail-hero">
                    <div class="skeleton album-detail-cover-skeleton"></div>
                    <div class="album-detail-copy">
                        <div class="skeleton" style="height:18px;width:120px;border-radius:999px;margin-bottom:16px;"></div>
                        <div class="skeleton" style="height:44px;width:72%;margin-bottom:12px;"></div>
                        <div class="skeleton" style="height:18px;width:54%;margin-bottom:20px;"></div>
                        <div class="skeleton" style="height:14px;width:80%;margin-bottom:24px;"></div>
                        <div class="skeleton" style="height:42px;width:180px;border-radius:999px;"></div>
                    </div>
                </div>
                <div class="album-tracklist">
                    ${Array(6).fill(0).map(() => `
                        <div class="album-track-row" style="pointer-events:none;">
                            <div class="skeleton" style="height:16px;width:24px;"></div>
                            <div class="album-track-main">
                                <div class="skeleton" style="height:14px;width:62%;margin-bottom:8px;"></div>
                                <div class="skeleton" style="height:12px;width:38%;"></div>
                            </div>
                            <div class="skeleton" style="height:12px;width:44px;"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    buildAlbumCardMarkup(album, index = 0, options = {}) {
        const title = this.escapeHtml(album.name || 'Album');
        const artistName = this.escapeHtml((album.artists || []).join(', ') || 'Artiste inconnu');
        const imageUrl = this.escapeHtml(album.imageUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop');
        const releaseDate = this.escapeHtml(options.metaOverride || album.releaseDate || 'Date inconnue');
        const totalTracks = Number.isFinite(album.totalTracks) && album.totalTracks > 0 ? `${album.totalTracks} titres` : 'Album';
        const albumQuery = encodeURIComponent(`${(album.artists || [album.name])[0] || album.name} ${album.name}`);
        const clickAction = album.spotifyId
            ? `Music.openAlbum('${album.spotifyId}')`
            : `Music.openAlbumSearch('${albumQuery}')`;

        return `
            <article class="album-card animate-fade" style="animation-delay:${index * 0.04}s" onclick="${clickAction}">
                <div class="album-cover">
                    <img src="${imageUrl}" alt="${title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop'">
                </div>
                <div class="album-title">${title}</div>
                <div class="album-artist">${artistName}</div>
                <div class="album-meta">
                    <span>${releaseDate}</span>
                    <span>${this.escapeHtml(totalTracks)}</span>
                </div>
            </article>
        `;
    },

    renderAlbums(albums, container) {
        if (!container) return;

        if (!albums || albums.length === 0) {
            container.innerHTML = '<div style="grid-column:1/-1;padding:48px;text-align:center;color:var(--text-muted);font-size:0.9rem;">Aucun album trouve.</div>';
            return;
        }

        container.innerHTML = albums.map((album, index) => this.buildAlbumCardMarkup(album, index)).join('');
    },

    getActiveView() {
        return ['artist', 'album', 'search', 'library', 'playlist', 'home']
            .find((view) => {
                const element = document.getElementById(`${view}View`);
                return element && !element.classList.contains('hidden');
            }) || 'home';
    },

    formatDurationMs(durationMs) {
        const totalSeconds = Math.max(0, Math.round((durationMs || 0) / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    },

    async fetchAlbumDetails(spotifyId) {
        const response = await fetch(`/api/spotify/albums/${encodeURIComponent(spotifyId)}`, {
            headers: Auth.getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Impossible de charger cet album.');
        }

        this.spotifyEnabled = Boolean(data.spotifyEnabled);
        return data.item || null;
    },

    async openAlbum(spotifyId) {
        const albumViewContent = document.getElementById('albumViewContent');
        if (!spotifyId || !albumViewContent) return;

        const activeView = this.getActiveView();
        this.albumReturnView = activeView === 'album' ? (this.albumReturnView || 'search') : activeView;
        this.currentAlbum = null;
        albumViewContent.innerHTML = this.albumDetailSkeleton();

        if (typeof showView === 'function') {
            showView('album');
        }

        try {
            const album = await this.fetchAlbumDetails(spotifyId);
            this.currentAlbum = album;
            this.rememberAlbum(album);
            if (!(typeof Player !== 'undefined' && Player.currentTrack?.thumb)) {
                this.setAmbientArtwork(album?.imageUrl || '');
            }
            this.renderAlbumView(album);
        } catch (error) {
            albumViewContent.innerHTML = `
                <div class="album-detail-shell">
                    <div style="padding:48px;text-align:center;color:var(--danger);font-weight:600;">
                        ${this.escapeHtml(error.message || 'Impossible de charger cet album.')}
                    </div>
                </div>
            `;
        }
    },

    async openAlbumSearch(encodedQuery) {
        const searchInput = document.getElementById('searchInput');
        const albumQuery = decodeURIComponent(encodedQuery || '').trim();
        if (!albumQuery) return;

        if (searchInput) {
            searchInput.value = albumQuery;
        }

        this.searchFilter = 'music';
        this.updateSearchFilterButtons();
        await this.search(albumQuery, 'music');
    },

    goBackFromAlbum() {
        if (typeof showView === 'function') {
            showView(this.albumReturnView || 'search');
        }
    },

    renderAlbumView(album) {
        const container = document.getElementById('albumViewContent');
        if (!container || !album) return;

        const cover = this.escapeHtml(album.imageUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop');
        const title = this.escapeHtml(album.name || 'Album');
        const artistNames = this.escapeHtml((album.artists || []).join(', ') || 'Artiste inconnu');
        const releaseYear = this.escapeHtml((album.releaseDate || '').split('-')[0] || 'Date inconnue');
        const genres = Array.isArray(album.genres) ? album.genres.filter(Boolean).slice(0, 4) : [];
        const tracks = Array.isArray(album.tracks) ? album.tracks : [];
        const playableTracks = tracks.filter((track) => Boolean(this.getPlayableTrackId(track)));
        const totalRuntime = tracks.reduce((sum, track) => sum + this.getTrackDurationMs(track), 0);

        container.innerHTML = `
            <div class="album-detail-shell">
                <div class="album-detail-topbar">
                    <button type="button" class="album-back-btn" onclick="Music.goBackFromAlbum()">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M15 18l-6-6 6-6"/></svg>
                        Retour
                    </button>
                </div>

                <section class="album-detail-hero">
                    <div class="album-detail-cover">
                        <img src="${cover}" alt="${title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop'">
                    </div>

                    <div class="album-detail-copy">
                        <div class="album-detail-kicker">Album complet</div>
                        <h1 class="album-detail-title">${title}</h1>
                        <div class="album-detail-artist">${artistNames}</div>
                        <div class="album-detail-meta">
                            <span>${releaseYear}</span>
                            <span>${tracks.length} titres</span>
                            <span>${this.formatDurationMs(totalRuntime)}</span>
                        </div>
                        ${genres.length
                            ? `<div class="album-detail-tags">${genres.map((genre) => `<span class="album-tag">${this.escapeHtml(genre)}</span>`).join('')}</div>`
                            : ''}
                        <div class="album-detail-actions">
                            <button type="button" class="btn-glow" onclick="Music.playAlbumFromTrack(0)" ${playableTracks.length ? '' : 'disabled'}>
                                Lire l'album
                            </button>
                            ${album.spotifyUrl ? '' : ''}
                        </div>
                    </div>
                </section>

                <section class="album-tracklist">
                    <div class="album-tracklist-header">
                        <span>Titres</span>
                        <span>${playableTracks.length}/${tracks.length} disponibles dans le lecteur</span>
                    </div>

                    ${tracks.length
                        ? tracks.map((track, index) => `
                            <button
                                type="button"
                                class="album-track-row"
                                onclick="Music.playAlbumFromTrack(${index})"
                                ${this.getPlayableTrackId(track) ? '' : 'disabled'}
                            >
                                <span class="album-track-index">${track.trackNumber || index + 1}</span>
                                <div class="album-track-main">
                                    <div class="album-track-name">${this.escapeHtml(track.name || track.title || 'Titre')}</div>
                                    <div class="album-track-meta">
                                        <span class="artist-link" data-artist="${this.escapeHtml(this.getTrackArtistLabel(track))}" onclick="event.stopPropagation(); Music.openArtistProfile(this.getAttribute('data-artist'))">${this.escapeHtml(this.getTrackArtistLabel(track))}</span>
                                    </div>
                                </div>
                                <span class="album-track-duration">${this.escapeHtml(this.getTrackDurationLabel(track))}</span>
                            </button>
                        `).join('')
                        : '<div style="padding:32px;color:var(--text-muted);">Aucun titre disponible pour cet album.</div>'}
                </section>
            </div>
        `;
    },

    playAlbumFromTrack(startIndex = 0) {
        if (typeof Player === 'undefined' || !this.currentAlbum?.tracks?.length) return;

        const playableTracks = this.currentAlbum.tracks
            .map((track, index) => ({ track, index, playbackId: this.getPlayableTrackId(track) }))
            .filter(({ playbackId }) => Boolean(playbackId));

        if (!playableTracks.length) return;

        const selectedTrack = this.currentAlbum.tracks[startIndex];
        const selectedPlaybackId = this.getPlayableTrackId(selectedTrack);
        let queueIndex = playableTracks.findIndex(({ track, index, playbackId }) => {
            if (!selectedTrack) return false;
            return (selectedTrack.spotifyId && track.spotifyId === selectedTrack.spotifyId)
                || (selectedTrack.videoId && track.videoId === selectedTrack.videoId)
                || (selectedPlaybackId && playbackId === selectedPlaybackId)
                || index === startIndex;
        });

        if (queueIndex === -1) {
            queueIndex = 0;
        }

        Player.queue = playableTracks.map(({ track, playbackId }) => ({
            id: playbackId,
            videoId: this.isYouTubeTrackId(track.videoId) ? this.normalizeTrackKey(track.videoId) : '',
            spotifyId: this.normalizeTrackKey(track.spotifyId || (this.isSpotifyTrackId(track.id) ? track.id : '')),
            title: track.name || track.title || 'Sans titre',
            artist: this.getTrackArtistLabel(track),
            thumb: track.thumbnail || track.thumb || track.imageUrl || this.currentAlbum.imageUrl || '',
            searchQuery: [this.getTrackArtistLabel(track), track.name || track.title || 'Sans titre', 'audio'].filter(Boolean).join(' '),
            original: track
        }));
        Player.renderQueue();
        Player.playFromQueue(queueIndex);
    },

    async getRecommendations() {
        const resultsEl = document.getElementById('popularTracks');
        if (!resultsEl) return;

        this.updateHomeSection('Recommande pour vous');
        resultsEl.innerHTML = this.skeletonGrid(12);

        try {
            const response = await fetch('/api/user/recommendations', {
                headers: Auth.getAuthHeaders()
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Impossible de charger les recommandations.');

            const items = Array.isArray(data.items) ? data.items : [];
            if (!items.length) {
                resultsEl.innerHTML = '<div style="grid-column:1/-1;padding:48px;text-align:center;color:var(--text-muted);font-size:0.9rem;">Aucune recommandation suffisamment pertinente n a ete trouvee pour tes artistes pour le moment.</div>';
                return;
            }

            this.renderTracks(items, resultsEl);
            if (!(typeof Player !== 'undefined' && Player.currentTrack?.thumb)) {
                const firstTrack = this.getContextTrack('popularTracks', 0);
                this.setAmbientArtwork(firstTrack?.thumb || '');
            }
        } catch (error) {
            console.error('Recommendations error:', error);
            resultsEl.innerHTML = '<div style="grid-column:1/-1;padding:48px;text-align:center;color:var(--text-muted);font-size:0.9rem;">Impossible de charger tes recommandations personnalisees.</div>';
        }
    },

    async getTrending() {
        const resultsEl = document.getElementById('popularTracks');
        if (!resultsEl) return;

        this.updateHomeSection('Concu specialement pour vous');
        resultsEl.innerHTML = this.skeletonGrid(10);

        try {
            const response = await fetch('/api/music/trending', {
                headers: Auth.getAuthHeaders()
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erreur de chargement');

            if (data.title) this.updateHomeSection(data.title);
            this.renderTracks((data.items || []).slice(0, 10), resultsEl);
            if (!(typeof Player !== 'undefined' && Player.currentTrack?.thumb)) {
                const firstTrack = this.getContextTrack('popularTracks', 0);
                this.setAmbientArtwork(firstTrack?.thumb || '');
            }
        } catch (err) {
            console.error('Trending error:', err);
            resultsEl.innerHTML = '<div style="grid-column:1/-1;padding:48px;text-align:center;color:var(--text-muted);font-size:0.9rem;">Impossible de charger la selection du moment.</div>';
        }
    },

    async toggleFavorite(videoId, title, artist, thumb, spotifyId = '') {
        const favoriteIds = [...new Set([videoId, spotifyId].map((value) => this.normalizeTrackKey(value)).filter(Boolean))];
        const buttonSelectors = favoriteIds.map((favoriteId) => `.fav-btn-${favoriteId}`).join(', ');

        // Micro-interaction: Add animation class
        if (buttonSelectors) {
            document.querySelectorAll(buttonSelectors).forEach((btn) => {
                btn.classList.add('animating');
                setTimeout(() => btn.classList.remove('animating'), 400);
            });
        }

        if (typeof Playlists !== 'undefined') {
            await Playlists.toggleLike({
                id: videoId,
                spotifyId,
                title: title || videoId,
                artist: artist || '',
                thumb: thumb || ''
            });
            this.syncFavoritesFromLikes();
        } else {
            const favoriteKey = this.normalizeTrackKey(videoId || spotifyId);
            const index = this.favorites.indexOf(favoriteKey);
            if (index === -1) this.favorites.push(favoriteKey);
            else this.favorites.splice(index, 1);
            await fetch('/api/user/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...Auth.getAuthHeaders() },
                body: JSON.stringify({ videoId: favoriteKey })
            });
        }

        if (buttonSelectors) {
            document.querySelectorAll(buttonSelectors).forEach((btn) => {
                const isFav = this.isFavoriteTrack({ id: videoId, videoId, spotifyId });
                btn.classList.toggle('active', isFav);
                btn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
                btn.setAttribute('title', isFav ? 'Retirer des likes' : 'Liker');
                const svg = btn.querySelector('svg');
                if (svg) {
                    svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
                }
            });
        }

        if (typeof NowPlayingPanel !== 'undefined' && typeof NowPlayingPanel.updateFavoriteState === 'function') {
            NowPlayingPanel.updateFavoriteState(Player?.currentTrack || null);
        }
    },

    toggleVolume() {
        if (typeof Player !== 'undefined' && typeof Player.toggleMute === 'function') {
            Player.toggleMute();
        }
    },

    showContextMenu(e, trackId, title, artist, thumb, spotifyId = '', trackOptions = {}) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof Playlists !== 'undefined') {
            Playlists.showAddToPlaylistMenu(e, {
                ...trackOptions,
                id: trackId,
                spotifyId,
                title,
                artist,
                thumb
            });
        }
    },

    closeContextMenu() {
        const menu = document.getElementById('trackContextMenu');
        if (menu) menu.remove();
    },

    skeletonGrid(count) {
        return Array(count).fill(0).map(() => `
            <div class="track-card" style="pointer-events:none;">
                <div class="skeleton" style="aspect-ratio:1/1;margin-bottom:12px;border-radius:var(--radius-sm);"></div>
                <div class="skeleton" style="height:14px;width:80%;margin-bottom:8px;border-radius:4px;"></div>
                <div class="skeleton" style="height:12px;width:50%;border-radius:4px;"></div>
            </div>
        `).join('');
    },

    playContext(containerId, index) {
        const tracks = this._contexts[containerId];
        if (typeof Player !== 'undefined' && tracks) {
            Player.queue = [...tracks];
            Player.renderQueue();
            Player.playFromQueue(index);
        }
    },

    renderTracks(tracks, container) {
        if (!tracks || tracks.length === 0) {
            container.innerHTML = '<div style="grid-column:1/-1;padding:48px;text-align:center;color:var(--text-muted);font-size:0.9rem;">Aucun resultat trouve.</div>';
            return;
        }

        const contextTracks = this.createTrackContext(tracks);

        if (!contextTracks.length) {
            container.innerHTML = '<div style="grid-column:1/-1;padding:48px;text-align:center;color:var(--text-muted);font-size:0.9rem;">Aucun resultat trouve.</div>';
            return;
        }

        this._contexts[container.id] = contextTracks;
        if (typeof Player !== 'undefined' && typeof Player.prefetchTrackList === 'function') {
            Player.prefetchTrackList(contextTracks);
        }

        const displayMode = container.dataset.display || 'grid';
        if (displayMode === 'rows') {
            this.renderTrackRows(contextTracks, container);
            return;
        }

        container.innerHTML = contextTracks.map((track, index) => {
            const isFav = this.isFavoriteTrack(track);

            return `
                <div class="track-card animate-fade" style="animation-delay:${index * 0.05}s"
                     onclick="Music.playContext('${container.id}', ${index})"
                     oncontextmenu="Music.showContextMenuFromContext(event, '${container.id}', ${index})">
                    <div class="thumb">
                        <img src="${this.escapeHtml(track.thumb)}" alt="${this.escapeHtml(track.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop'">
                        <button class="track-favorite-btn fav-toggle-btn fav-btn-${this.escapeHtml(track.id)} ${isFav ? 'active' : ''}"
                            onclick="event.stopPropagation(); Music.toggleFavoriteFromContext('${container.id}', ${index})"
                            title="${isFav ? 'Retirer des likes' : 'Liker'}"
                            aria-pressed="${isFav ? 'true' : 'false'}">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                        </button>
                        <div class="play-overlay">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="white"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                        </div>
                    </div>
                    <div class="title">${this.escapeHtml(track.title)}</div>
                    <div class="artist" data-artist="${this.escapeHtml(track.artist || 'Artiste inconnu')}" onclick="event.stopPropagation(); Music.openArtistProfile(this.getAttribute('data-artist'))">
                        <span class="artist-link">${this.escapeHtml(track.artist || 'Artiste inconnu')}</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderTrackRows(contextTracks, container) {
        container.innerHTML = `
            <div class="track-list-shell">
                <div class="track-list-header">
                    <span>#</span>
                    <span>Titre</span>
                    <span>Duree</span>
                    <span></span>
                </div>
                ${contextTracks.map((track, index) => {
                    const isFav = this.isFavoriteTrack(track);
                    const artistDisplay = Array.isArray(track.artists) ? track.artists.map(a => a.name || a).join(', ') : (track.artist || 'Artiste inconnu');

                    return `
                        <article class="track-row animate-fade"
                            style="animation-delay:${index * 0.03}s"
                            onclick="Music.playContext('${container.id}', ${index})"
                            oncontextmenu="Music.showContextMenuFromContext(event, '${container.id}', ${index})">
                            <div class="track-row-index">${index + 1}</div>
                            <div class="track-row-main">
                                <div class="track-row-thumb">
                                    <img src="${this.escapeHtml(track.thumb)}" alt="${this.escapeHtml(track.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop'">
                                </div>
                                <div class="track-row-copy">
                                    <div class="track-row-title">${this.escapeHtml(track.title)}</div>
                                    <div class="track-row-meta artist-link" data-artist="${this.escapeHtml(artistDisplay)}" onclick="event.stopPropagation(); Music.openArtistProfile(this.getAttribute('data-artist'))">${this.escapeHtml(artistDisplay)}</div>
                                </div>
                            </div>
                            <div class="track-row-duration">${this.escapeHtml(track.durationLabel || this.getTrackDurationLabel(track))}</div>
                            <div class="track-row-actions">
                                <button class="track-row-favorite fav-toggle-btn fav-btn-${this.escapeHtml(track.id)} ${isFav ? 'active' : ''}"
                                    onclick="event.stopPropagation(); Music.toggleFavoriteFromContext('${container.id}', ${index})"
                                    title="${isFav ? 'Retirer des likes' : 'Liker'}"
                                    aria-pressed="${isFav ? 'true' : 'false'}">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                    </svg>
                                </button>
                                <button class="track-row-menu" onclick="event.stopPropagation(); Music.showContextMenuFromContext(event, '${container.id}', ${index})" title="Plus">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                                </button>
                            </div>
                        </article>
                    `;
                }).join('')}
            </div>
        `;
    }
};
