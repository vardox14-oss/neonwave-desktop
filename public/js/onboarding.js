const MusicOnboarding = {
    genreOptions: ['Rap', 'Drill', 'R&B', 'Afro', 'Pop', 'Electro', 'House', 'Techno', 'Trap', 'Dancehall', 'Amapiano', 'Latino'],
    currentStep: 'genres',
    selections: {
        genres: [],
        artists: []
    },
    defaultArtists: [],
    searchResults: [],
    relatedArtists: [],
    initialized: false,
    isSaving: false,
    limitTimers: {},
    searchTimer: null,
    requestId: 0,
    relatedRequestId: 0,

    init() {
        if (this.initialized) return;

        this.root = document.getElementById('musicOnboardingOverlay');
        this.titleEl = document.getElementById('musicOnboardingTitle');
        this.subtitleEl = document.getElementById('musicOnboardingSubtitle');
        this.errorEl = document.getElementById('musicOnboardingError');
        this.panel = document.querySelector('.onboarding-panel');
        this.genresStep = document.getElementById('musicGenresStep');
        this.artistsStep = document.getElementById('musicArtistsStep');
        this.genresChoices = document.getElementById('musicGenresChoices');
        this.genresCount = document.getElementById('musicGenresCount');
        this.artistsCount = document.getElementById('musicArtistsCount');
        this.backBtn = document.getElementById('musicOnboardingBack');
        this.nextBtn = document.getElementById('musicOnboardingNext');
        this.searchInput = document.getElementById('musicArtistSearch');
        this.searchState = document.getElementById('musicArtistSearchState');
        this.selectedArtistsSection = document.getElementById('musicSelectedArtistsSection');
        this.selectedArtistsContainer = document.getElementById('musicSelectedArtists');
        this.defaultArtistsContainer = document.getElementById('musicArtistsChoices');
        this.searchResultsSection = document.getElementById('musicArtistSearchResultsSection');
        this.searchResultsContainer = document.getElementById('musicArtistSearchResults');
        this.relatedArtistsSection = document.getElementById('musicRelatedArtistsSection');
        this.relatedArtistsContainer = document.getElementById('musicRelatedArtists');

        if (!this.root || !this.titleEl || !this.nextBtn) return;

        this.backBtn.addEventListener('click', () => this.goBack());
        this.nextBtn.addEventListener('click', () => this.handlePrimaryAction());
        this.genresChoices.addEventListener('click', (event) => this.handleGenreClick(event));
        this.searchInput.addEventListener('input', () => this.handleSearchInput());

        [
            this.selectedArtistsContainer,
            this.defaultArtistsContainer,
            this.searchResultsContainer,
            this.relatedArtistsContainer
        ].forEach((container) => {
            if (!container) return;
            container.addEventListener('click', (event) => this.handleArtistGridClick(event));
        });

        this.renderGenreChoices();
        this.updateCounts();
        this.updateButtons();
        this.initialized = true;
    },

    async open() {
        if (!this.initialized) this.init();
        if (!this.root) return;

        this.selections = { genres: [], artists: [] };
        this.defaultArtists = [];
        this.searchResults = [];
        this.relatedArtists = [];
        this.isSaving = false;
        this.searchInput.value = '';
        this.requestId += 1;
        this.setSearchState('Chargement des artistes...');
        this.clearError();

        this.root.classList.remove('hidden');
        this.root.setAttribute('aria-hidden', 'false');
        this.root.scrollTop = 0;
        if (this.panel) this.panel.scrollTop = 0;

        if (typeof showView === 'function') {
            showView('home');
        }

        this.renderGenreChoices();
        this.renderSelectedArtists();
        this.renderSearchResults();
        this.renderRelatedArtists();
        this.setStep('genres', true);

        try {
            this.defaultArtists = await Music.fetchDefaultArtists();
            this.renderDefaultArtists();
            this.setSearchState(Music.spotifyEnabled ? 'Recherche Spotify active' : 'Mode fallback sans Spotify');
        } catch (error) {
            this.defaultArtists = [];
            this.renderDefaultArtists();
            this.setSearchState('Impossible de charger Spotify');
            this.showError(error.message || 'Impossible de charger les artistes.');
        }
    },

    close() {
        if (!this.root) return;
        this.root.classList.add('hidden');
        this.root.setAttribute('aria-hidden', 'true');
    },

    onFollowStateChange() {
        if (!this.root || this.root.classList.contains('hidden')) return;
        this.renderSelectedArtists();
        this.renderDefaultArtists();
        this.renderSearchResults();
        this.renderRelatedArtists();
    },

    goBack() {
        if (this.isSaving || this.currentStep !== 'artists') return;
        this.setStep('genres');
    },

    setStep(step, immediate = false) {
        this.currentStep = step;
        this.genresStep.classList.toggle('hidden', step !== 'genres');
        this.artistsStep.classList.toggle('hidden', step !== 'artists');
        this.backBtn.classList.toggle('hidden', step !== 'artists');

        this.updateTitle(step, immediate);
        this.updateSubtitle(step);
        this.updateCounts();
        this.updateButtons();
        this.clearLimitState(step === 'genres' ? 'artists' : 'genres');
        this.clearError();

        if (this.panel) this.panel.scrollTop = 0;
    },

    updateTitle(step, immediate = false) {
        const nextTitle = step === 'genres'
            ? 'Quel est votre gout de musique ?'
            : 'Quels artistes ecoutes-tu le plus ?';

        if (immediate || !this.titleEl.textContent) {
            this.titleEl.textContent = nextTitle;
            this.titleEl.className = 'reveal-text active-in';
            return;
        }

        clearTimeout(this.titleTimer);
        this.titleEl.className = 'reveal-text active-out';
        this.titleTimer = setTimeout(() => {
            this.titleEl.textContent = nextTitle;
            this.titleEl.className = 'reveal-text active-in';
        }, 380);
    },

    updateSubtitle(step) {
        this.subtitleEl.textContent = step === 'genres'
            ? 'Choisis les 3 styles qui te ressemblent le plus pour lancer tes premieres recommandations.'
            : 'Recherche, choisis et abonne-toi a des artistes. Selectionne au moins 3 artistes et continue autant que tu veux.';
    },

    updateCounts() {
        this.genresCount.textContent = `${this.selections.genres.length}/3`;
        this.artistsCount.textContent = `${this.selections.artists.length} selectionne${this.selections.artists.length > 1 ? 's' : ''}`;
    },

    updateButtons() {
        if (this.currentStep === 'genres') {
            this.nextBtn.textContent = 'Continuer';
            this.nextBtn.disabled = this.isSaving || this.selections.genres.length !== 3;
            return;
        }

        this.nextBtn.textContent = this.isSaving ? 'Creation...' : 'Creer mes recommandations';
        this.nextBtn.disabled = this.isSaving || this.selections.genres.length !== 3 || this.selections.artists.length < 3;
    },

    renderGenreChoices() {
        const selected = new Set(this.selections.genres);
        this.genresChoices.innerHTML = this.genreOptions.map((option) => {
            const isSelected = selected.has(option);
            return `<button type="button" class="onboarding-chip${isSelected ? ' selected' : ''}" data-value="${this.escapeHtml(option)}">${this.escapeHtml(option)}</button>`;
        }).join('');
    },

    renderDefaultArtists() {
        this.defaultArtistsContainer.innerHTML = this.defaultArtists.length
            ? this.defaultArtists.map((artist) => this.renderArtistCard(artist)).join('')
            : '<div style="grid-column:1/-1;color:var(--text-secondary);font-size:0.86rem;">Aucun artiste par defaut disponible.</div>';
    },

    renderSelectedArtists() {
        const hasSelectedArtists = this.selections.artists.length > 0;
        this.selectedArtistsSection.classList.toggle('hidden', !hasSelectedArtists);
        this.selectedArtistsContainer.innerHTML = hasSelectedArtists
            ? this.selections.artists.map((artist) => this.renderArtistCard(artist)).join('')
            : '';
    },

    renderSearchResults() {
        const hasResults = this.searchResults.length > 0;
        this.searchResultsSection.classList.toggle('hidden', !hasResults);
        this.searchResultsContainer.innerHTML = hasResults
            ? this.searchResults.map((artist) => this.renderArtistCard(artist)).join('')
            : '';
    },

    renderRelatedArtists() {
        const filteredRelated = this.relatedArtists.filter((artist) => !this.isArtistSelected(artist));
        const hasResults = filteredRelated.length > 0;
        this.relatedArtistsSection.classList.toggle('hidden', !hasResults);
        this.relatedArtistsContainer.innerHTML = hasResults
            ? filteredRelated.map((artist) => this.renderArtistCard(artist)).join('')
            : '';
    },

    renderArtistCard(artist) {
        return Music.buildArtistCard(artist, {
            selectable: true,
            selected: this.isArtistSelected(artist),
            showFollow: true,
            showSpotifyLink: Boolean(artist?.spotifyUrl)
        });
    },

    handleGenreClick(event) {
        const chip = event.target.closest('.onboarding-chip');
        if (!chip || this.isSaving) return;

        const value = chip.dataset.value;
        const existingIndex = this.selections.genres.indexOf(value);

        if (existingIndex !== -1) {
            this.selections.genres.splice(existingIndex, 1);
            this.clearLimitState('genres');
            this.clearError();
        } else if (this.selections.genres.length >= 3) {
            this.flashLimit('genres', chip);
            return;
        } else {
            this.selections.genres.push(value);
            this.clearError();
            this.clearLimitState('genres');
        }

        this.renderGenreChoices();
        this.updateCounts();
        this.updateButtons();
    },

    async handleArtistGridClick(event) {
        const followBtn = event.target.closest('.artist-follow-btn');
        if (followBtn) {
            event.preventDefault();
            event.stopPropagation();
            if (this.isSaving) return;

            const artistKey = followBtn.dataset.artistKey;
            if (!artistKey) return;

            followBtn.disabled = true;
            try {
                await Music.toggleFollowArtist(artistKey);
            } catch (error) {
                this.showError(error.message || 'Impossible de modifier l abonnement.');
            } finally {
                followBtn.disabled = false;
            }
            return;
        }

        const link = event.target.closest('.artist-spotify-link');
        if (link) return;

        const card = event.target.closest('.artist-circle-card');
        if (!card || this.isSaving) return;

        const artistKey = card.dataset.artistKey;
        const artist = Music.getArtistByKey(artistKey);
        if (!artist) return;

        this.toggleArtistSelection(artist, card);
    },

    toggleArtistSelection(artist) {
        const identity = Music.getArtistIdentity(artist);
        const existingIndex = this.selections.artists.findIndex((selectedArtist) => Music.getArtistIdentity(selectedArtist) === identity);

        if (existingIndex !== -1) {
            this.selections.artists.splice(existingIndex, 1);
            this.clearError();
            this.clearLimitState('artists');
            this.renderAllArtistSections();
            this.updateCounts();
            this.updateButtons();
            this.refreshRelatedArtists();
            return;
        }

        this.selections.artists.push(Music.normalizeArtist(artist));
        this.clearError();
        this.clearLimitState('artists');
        this.renderAllArtistSections();
        this.updateCounts();
        this.updateButtons();
        this.refreshRelatedArtists();
    },

    renderAllArtistSections() {
        this.renderSelectedArtists();
        this.renderDefaultArtists();
        this.renderSearchResults();
        this.renderRelatedArtists();
    },

    isArtistSelected(artist) {
        const identity = Music.getArtistIdentity(artist);
        return this.selections.artists.some((selectedArtist) => Music.getArtistIdentity(selectedArtist) === identity);
    },

    async refreshRelatedArtists() {
        if (!this.selections.artists.length) {
            this.relatedArtists = [];
            this.renderRelatedArtists();
            return;
        }

        const currentRequest = ++this.relatedRequestId;

        try {
            const results = await Promise.all(
                this.selections.artists.map((artist) => Music.loadRelatedArtists(artist, {
                    selectedGenres: this.selections.genres
                }))
            );

            if (currentRequest !== this.relatedRequestId) return;

            this.relatedArtists = Music.mergeArtists(...results)
                .filter((artist) => !this.isArtistSelected(artist))
                .slice(0, 12);
        } catch (error) {
            if (currentRequest !== this.relatedRequestId) return;
            console.error('Related artists error:', error);
            this.relatedArtists = [];
        }

        this.renderRelatedArtists();
    },

    handleSearchInput() {
        const query = this.searchInput.value.trim();
        clearTimeout(this.searchTimer);

        if (query.length < 2) {
            this.searchResults = [];
            this.renderSearchResults();
            this.setSearchState(Music.spotifyEnabled ? 'Tape au moins 2 lettres' : 'Spotify non configure');
            return;
        }

        const currentRequest = ++this.requestId;
        this.setSearchState('Recherche en cours...');

        this.searchTimer = setTimeout(async () => {
            try {
                const items = await Music.searchArtistsCatalog(query);
                if (currentRequest !== this.requestId) return;
                this.searchResults = items
                    .filter((artist) => !this.defaultArtists.some((defaultArtist) => Music.getArtistIdentity(defaultArtist) === Music.getArtistIdentity(artist)))
                    .slice(0, 8);
                this.renderSearchResults();
                this.setSearchState(this.searchResults.length ? 'Clique pour ajouter un artiste' : 'Aucun artiste trouve');
            } catch (error) {
                if (currentRequest !== this.requestId) return;
                this.searchResults = [];
                this.renderSearchResults();
                this.setSearchState('Recherche indisponible');
                this.showError(error.message || 'Recherche artiste impossible.');
            }
        }, 260);
    },

    setSearchState(message) {
        this.searchState.textContent = message || '';
    },

    flashLimit(type, targetEl) {
        const stepEl = type === 'genres' ? this.genresStep : this.artistsStep;
        const itemLabel = type === 'genres' ? 'styles' : 'artistes';

        stepEl.classList.add('limit-hit');
        if (targetEl && targetEl.classList) {
            targetEl.classList.add('limit-hit');
        }
        this.showError(`Tu peux choisir seulement 3 ${itemLabel}.`);

        clearTimeout(this.limitTimers[type]);
        this.limitTimers[type] = setTimeout(() => {
            stepEl.classList.remove('limit-hit');
            if (targetEl && targetEl.classList) {
                targetEl.classList.remove('limit-hit');
            }
        }, 480);
    },

    clearLimitState(type) {
        const stepEl = type === 'genres' ? this.genresStep : this.artistsStep;
        if (stepEl) stepEl.classList.remove('limit-hit');
    },

    async handlePrimaryAction() {
        if (this.currentStep === 'genres') {
            if (this.selections.genres.length !== 3) return;
            this.setStep('artists');
            return;
        }

        if (this.selections.genres.length !== 3 || this.selections.artists.length < 3) return;

        this.isSaving = true;
        this.clearError();
        this.updateButtons();

        try {
            await Music.savePreferences(this.selections.genres, this.selections.artists);
            this.close();
            if (typeof showView === 'function') {
                showView('home');
            }
            await Music.getRecommendations();
        } catch (error) {
            this.showError(error.message || 'Impossible de sauvegarder tes choix.');
        } finally {
            this.isSaving = false;
            this.updateButtons();
            this.renderAllArtistSections();
        }
    },

    showError(message) {
        this.errorEl.textContent = message || '';
    },

    clearError() {
        this.errorEl.textContent = '';
    },

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
};
