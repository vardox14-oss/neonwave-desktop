// NeonWave — Playlist Manager
const Playlists = {
    playlists: [],
    likedTracks: [],
    localTracks: [],
    importingLocalTracks: false,

    normalizeTrackId(value) {
        const normalized = String(value || '').trim();
        if (!normalized || normalized === 'undefined' || normalized === 'null') {
            return '';
        }
        return normalized;
    },

    isYouTubeTrackId(value) {
        return /^[A-Za-z0-9_-]{11}$/.test(this.normalizeTrackId(value));
    },

    isSpotifyTrackId(value) {
        return /^[A-Za-z0-9]{22}$/.test(this.normalizeTrackId(value));
    },

    getTrackIdentity(track = {}) {
        const directVideoId = this.normalizeTrackId(track.videoId || '');
        const rawId = this.normalizeTrackId(track.id || '');
        const spotifyId = this.normalizeTrackId(
            track.spotifyId
            || (this.isSpotifyTrackId(rawId) ? rawId : '')
        );
        const localId = [directVideoId, rawId, this.normalizeTrackId(track.localTrackId || '')]
            .find((value) => value.startsWith('local-')) || '';
        const videoId = this.isYouTubeTrackId(directVideoId)
            ? directVideoId
            : (this.isYouTubeTrackId(rawId) ? rawId : localId);

        return {
            videoId,
            spotifyId,
            primaryId: videoId || spotifyId
        };
    },

    syncMusicFavoritesCache() {
        if (typeof Music === 'undefined') return;

        Music.favorites = [...new Set(
            this.likedTracks.flatMap((track) => ([
                this.normalizeTrackId(track?.videoId || ''),
                this.normalizeTrackId(track?.spotifyId || '')
            ])).filter(Boolean)
        )];
    },

    updateLikeButtons(trackIds = [], isActive = false) {
        const selectors = [...new Set((trackIds || [])
            .map((trackId) => this.normalizeTrackId(trackId))
            .filter(Boolean)
            .flatMap((trackId) => [`.fav-btn-${trackId}`, `.like-btn-${trackId}`]))];

        if (!selectors.length) return;

        document.querySelectorAll(selectors.join(', ')).forEach((btn) => {
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            btn.setAttribute('title', isActive ? 'Retirer des likes' : 'Liker');
            const svg = btn.querySelector('svg');
            if (svg) {
                svg.setAttribute('fill', isActive ? 'currentColor' : 'none');
            }
        });
    },

    async init() {
        await Promise.all([this.loadPlaylists(), this.loadLikedTracks(), this.loadLocalTracks()]);
        this.renderSidebar();
        this.renderLibraryView();
        this.renderHomeShortcuts();
    },

    async loadPlaylists() {
        try {
            const res = await fetch('/api/user/playlists', { headers: Auth.getAuthHeaders() });
            if (res.ok) this.playlists = await res.json();
        } catch (e) { console.error('Playlist load error', e); }
    },

    async loadLikedTracks() {
        try {
            const res = await fetch('/api/user/liked-tracks', { headers: Auth.getAuthHeaders() });
            if (res.ok) {
                const likedTracks = await res.json();
                const seenTrackIds = new Set();
                this.likedTracks = (likedTracks || []).reduce((tracks, currentTrack) => {
                    const { videoId, spotifyId, primaryId } = this.getTrackIdentity(currentTrack);
                    if (!primaryId || seenTrackIds.has(primaryId)) {
                        return tracks;
                    }

                    seenTrackIds.add(primaryId);
                    tracks.push({
                        ...currentTrack,
                        videoId,
                        spotifyId
                    });
                    return tracks;
                }, []);
                this.syncMusicFavoritesCache();
            }
        } catch (e) { console.error('Liked tracks load error', e); }
    },

    async loadLocalTracks() {
        try {
            const res = await fetch('/api/user/local-tracks', { headers: Auth.getAuthHeaders() });
            if (res.ok) this.localTracks = await res.json();
        } catch (error) {
            console.error('Local tracks load error', error);
        }
    },

    showImportPicker() {
        document.getElementById('localTrackInput')?.click();
    },

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('Lecture du fichier impossible.'));
            reader.readAsDataURL(file);
        });
    },

    parseLocalTrackName(fileName) {
        const clean = String(fileName || '').replace(/\.[^.]+$/, '').trim();
        const parts = clean.split(/\s+-\s+/);
        if (parts.length >= 2) {
            return {
                artist: parts.shift().trim(),
                title: parts.join(' - ').trim()
            };
        }
        return { artist: 'Bibliotheque locale', title: clean || 'Titre local' };
    },

    async getAudioDuration(file) {
        return new Promise((resolve) => {
            const audio = document.createElement('audio');
            const objectUrl = URL.createObjectURL(file);
            const done = (durationMs = 0) => {
                URL.revokeObjectURL(objectUrl);
                resolve(durationMs);
            };
            audio.preload = 'metadata';
            audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0);
            audio.onerror = () => done(0);
            audio.src = objectUrl;
        });
    },

    async importLocalTracks(files) {
        const selectedFiles = Array.from(files || []);
        if (!selectedFiles.length || this.importingLocalTracks) return;
        this.importingLocalTracks = true;

        const status = document.getElementById('localImportStatus');
        try {
            for (let index = 0; index < selectedFiles.length; index += 1) {
                const file = selectedFiles[index];
                if (status) status.textContent = `Import ${index + 1}/${selectedFiles.length} : ${file.name}`;
                const metadata = this.parseLocalTrackName(file.name);
                const [data, durationMs] = await Promise.all([
                    this.readFileAsDataURL(file),
                    this.getAudioDuration(file)
                ]);
                const response = await fetch('/api/user/local-tracks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...Auth.getAuthHeaders() },
                    body: JSON.stringify({
                        filename: file.name,
                        mimeType: file.type || 'audio/mpeg',
                        data,
                        title: metadata.title,
                        artist: metadata.artist,
                        durationMs
                    })
                });
                const track = await response.json();
                if (!response.ok) throw new Error(track.error || `Import impossible pour ${file.name}`);
                this.localTracks.unshift(track);
            }

            this.showToast(`${selectedFiles.length} titre${selectedFiles.length > 1 ? 's' : ''} importe${selectedFiles.length > 1 ? 's' : ''}`);
            this.renderSidebar();
            this.renderLibraryView();
            this.showLocalTracksView();
        } catch (error) {
            this.showToast(error.message || 'Import impossible.');
        } finally {
            this.importingLocalTracks = false;
            if (status) status.textContent = '';
            const input = document.getElementById('localTrackInput');
            if (input) input.value = '';
        }
    },

    isLiked(trackOrVideoId) {
        const identity = typeof trackOrVideoId === 'object'
            ? this.getTrackIdentity(trackOrVideoId)
            : { videoId: this.normalizeTrackId(trackOrVideoId), spotifyId: '' };
        const { videoId, spotifyId } = identity;

        return this.likedTracks.some((track) => {
            const currentVideoId = this.normalizeTrackId(track?.videoId || '');
            const currentSpotifyId = this.normalizeTrackId(track?.spotifyId || '');

            return (
                (videoId && currentVideoId === videoId)
                || (spotifyId && currentSpotifyId === spotifyId)
            );
        });
    },

    async toggleLike(track) {
        const { title, artist, thumb } = track;
        const { videoId, spotifyId, primaryId } = this.getTrackIdentity(track);
        if (!primaryId) return;

        const wasLiked = this.isLiked({ id: primaryId, videoId, spotifyId });
        const matchesIdentity = (currentTrack) => {
            const currentVideoId = this.normalizeTrackId(currentTrack?.videoId || '');
            const currentSpotifyId = this.normalizeTrackId(currentTrack?.spotifyId || '');

            return (
                (videoId && currentVideoId === videoId)
                || (spotifyId && currentSpotifyId === spotifyId)
            );
        };

        // Optimistically update UI
        if (wasLiked) {
            this.likedTracks = this.likedTracks.filter((currentTrack) => !matchesIdentity(currentTrack));
        } else {
            this.likedTracks = this.likedTracks.filter((currentTrack) => !matchesIdentity(currentTrack));
            this.likedTracks.push({ videoId, spotifyId, title, artist, thumb });
        }
        this.syncMusicFavoritesCache();

        // Update all heart buttons for this track
        this.updateLikeButtons([primaryId, videoId, spotifyId], !wasLiked);

        // Refresh library UI if open
        const libView = document.getElementById('libraryView');
        if (libView && !libView.classList.contains('hidden')) {
            const collections = document.getElementById('libraryCollections');
            const favorites = document.getElementById('favoriteTracks');
            
            // If we are looking at the collection list, update it (to refresh counts)
            if (collections && !collections.classList.contains('hidden')) {
                this.renderLibraryView();
            }
            // If we are already looking at the liked tracks list, refresh it
            else if (favorites && !favorites.classList.contains('hidden')) {
                this.renderLikedTracks();
            }
        }
        this.renderSidebar();

        try {
            await fetch('/api/user/liked-tracks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...Auth.getAuthHeaders() },
                body: JSON.stringify({ videoId, spotifyId, title, artist, thumb })
            });
        } catch (e) { console.error('Like sync error', e); }
    },

    async createPlaylist(name) {
        try {
            const res = await fetch('/api/user/playlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...Auth.getAuthHeaders() },
                body: JSON.stringify({ name })
            });
            if (!res.ok) throw new Error('Erreur création');
            const pl = await res.json();
            this.playlists.push(pl);
            this.renderSidebar();
            return pl;
        } catch (e) { alert('Erreur : ' + e.message); return null; }
    },

    async deletePlaylist(id) {
        if (!confirm('Supprimer cette playlist ?')) return;
        await fetch(`/api/user/playlists/${id}`, { method: 'DELETE', headers: Auth.getAuthHeaders() });
        this.playlists = this.playlists.filter(p => p.id !== id);
        this.renderSidebar();
        if (this._currentPlaylistId === id) showView('home');
    },

    async addTrackToPlaylist(playlistId, track) {
        const {
            id: videoId,
            title,
            artist,
            thumb,
            spotifyId = '',
            source = '',
            streamUrl = '',
            durationMs = 0
        } = track;
        try {
            const res = await fetch(`/api/user/playlists/${playlistId}/tracks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...Auth.getAuthHeaders() },
                body: JSON.stringify({ videoId, spotifyId, title, artist, thumb, source, streamUrl, durationMs })
            });
            if (!res.ok) throw new Error('Erreur ajout');
            const pl = await res.json();
            const idx = this.playlists.findIndex(p => p.id === playlistId);
            if (idx !== -1) this.playlists[idx] = pl;
            this.showToast(`Ajouté à "${pl.name}"`);
        } catch (e) { console.error('Add track error', e); }
    },

    async removeTrackFromPlaylist(playlistId, videoId) {
        await fetch(`/api/user/playlists/${playlistId}/tracks/${videoId}`, {
            method: 'DELETE', headers: Auth.getAuthHeaders()
        });
        const pl = this.playlists.find(p => p.id === playlistId);
        if (pl) pl.tracks = pl.tracks.filter(t => t.videoId !== videoId);
        this.renderPlaylistView(playlistId);
    },

    async deleteLocalTrack(trackId) {
        if (!confirm('Supprimer ce titre local de NeonWave ?')) return;
        const response = await fetch(`/api/user/local-tracks/${encodeURIComponent(trackId)}`, {
            method: 'DELETE',
            headers: Auth.getAuthHeaders()
        });
        if (!response.ok) {
            this.showToast('Suppression impossible.');
            return;
        }
        this.localTracks = this.localTracks.filter((track) => track.id !== trackId);
        this.playlists.forEach((playlist) => {
            playlist.tracks = (playlist.tracks || []).filter((track) => track.videoId !== trackId);
        });
        this.renderSidebar();
        this.showLocalTracksView();
    },

    showLocalTracksView() {
        if (typeof showView !== 'undefined') showView('library');
        this.setLibraryChrome(true);

        const collections = document.getElementById('libraryCollections');
        const favorites = document.getElementById('favoriteTracks');
        if (collections) collections.classList.add('hidden');
        if (!favorites) return;
        favorites.classList.remove('hidden');
        favorites.dataset.display = 'rows';

        if (!this.localTracks.length) {
            favorites.innerHTML = `
                <div class="local-library-empty">
                    <div class="local-library-empty-icon">+</div>
                    <h3>Ajoute tes propres sons</h3>
                    <p>MP3, M4A, WAV, OGG ou FLAC. Ils restent stockes localement sur ton PC.</p>
                    <button class="premium-action-btn" onclick="Playlists.showImportPicker()">Importer des titres</button>
                </div>
            `;
            return;
        }

        const tracks = this.localTracks.map((track) => ({
            ...track,
            id: track.id,
            videoId: track.id,
            source: 'local',
            meta: 'Fichier local'
        }));
        const contextTracks = Music.createTrackContext(tracks);
        Music._contexts[favorites.id] = contextTracks;
        favorites.innerHTML = `
            <div class="local-library-toolbar">
                <div>
                    <span class="eyebrow">Collection locale</span>
                    <h2>Mes sons perso</h2>
                    <p>${tracks.length} titre${tracks.length > 1 ? 's' : ''} disponible${tracks.length > 1 ? 's' : ''} hors catalogue</p>
                </div>
                <button class="premium-action-btn" onclick="Playlists.showImportPicker()">+ Importer</button>
            </div>
            <div class="track-list-shell local-track-shell">
                ${contextTracks.map((track, index) => `
                    <article class="track-row local-track-row" onclick="Music.playContext('${favorites.id}', ${index})">
                        <div class="track-row-index">${index + 1}</div>
                        <div class="track-row-main">
                            <div class="track-row-thumb local-track-art">NW</div>
                            <div class="track-row-copy">
                                <div class="track-row-title">${Music.escapeHtml(track.title)}</div>
                                <div class="track-row-meta">${Music.escapeHtml(track.artist)} - Fichier local</div>
                            </div>
                        </div>
                        <div class="track-row-duration">${Music.escapeHtml(track.durationLabel || '--')}</div>
                        <div class="track-row-actions">
                            <button class="track-row-menu" onclick="event.stopPropagation(); Music.showContextMenuFromContext(event, '${favorites.id}', ${index})" title="Options">•••</button>
                            <button class="track-row-menu danger" onclick="event.stopPropagation(); Playlists.deleteLocalTrack('${track.id}')" title="Supprimer">×</button>
                        </div>
                    </article>
                `).join('')}
            </div>
        `;
    },

    async movePlaylistTrack(playlistId, index, delta) {
        const playlist = this.playlists.find((item) => item.id === playlistId);
        if (!playlist) return;
        const targetIndex = index + delta;
        if (targetIndex < 0 || targetIndex >= playlist.tracks.length) return;

        const [track] = playlist.tracks.splice(index, 1);
        playlist.tracks.splice(targetIndex, 0, track);
        this.renderPlaylistView(playlistId);

        const order = playlist.tracks.map((item) => item.videoId || item.spotifyId || item.id).filter(Boolean);
        const response = await fetch(`/api/user/playlists/${playlistId}/reorder`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...Auth.getAuthHeaders() },
            body: JSON.stringify({ order })
        });
        if (!response.ok) {
            await this.loadPlaylists();
            this.renderPlaylistView(playlistId);
            this.showToast('Ordre non enregistre.');
        }
    },

    async sharePlaylist(playlistId) {
        const response = await fetch(`/api/user/playlists/${playlistId}/share`, {
            method: 'POST',
            headers: Auth.getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) {
            this.showToast(data.error || 'Partage impossible.');
            return;
        }

        const shareUrl = new URL(data.shareUrl, window.location.origin).toString();
        try {
            await navigator.clipboard.writeText(shareUrl);
            this.showToast('Lien de playlist copie.');
        } catch {
            window.prompt('Copie ce lien de playlist :', shareUrl);
        }
    },

    showToast(msg) {
        let toast = document.getElementById('nwToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'nwToast';
            toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:var(--bg-elevated);border:1px solid var(--glass-border);color:white;padding:12px 20px;border-radius:10px;font-size:0.85rem;font-weight:600;z-index:9999;backdrop-filter:blur(16px);box-shadow:0 4px 20px rgba(0,0,0,0.4);opacity:0;transition:opacity 0.3s;white-space:nowrap;';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        clearTimeout(toast._t);
        toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
    },

    showCreateModal() {
        const modal = document.getElementById('createPlaylistModal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('newPlaylistName').value = '';
            document.getElementById('newPlaylistName').focus();
        }
    },

    closeCreateModal() {
        const modal = document.getElementById('createPlaylistModal');
        if (modal) modal.style.display = 'none';
    },

    async submitCreatePlaylist() {
        const input = document.getElementById('newPlaylistName');
        const name = input?.value?.trim();
        if (!name) return;
        await this.createPlaylist(name);
        this.closeCreateModal();
    },

    showAddToPlaylistMenu(e, track) {
        e.preventDefault();
        e.stopPropagation();
        Music.closeContextMenu();

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.id = 'trackContextMenu';

        const safeTitle = (track.title || '').replace(/'/g, "\\'");
        const safeArtist = (track.artist || '').replace(/'/g, "\\'");
        const safeSpotifyId = (track.spotifyId || '').replace(/'/g, "\\'");
        const safeSource = (track.source || '').replace(/'/g, "\\'");
        const safeStreamUrl = (track.streamUrl || '').replace(/'/g, "\\'");
        const durationMs = Number(track.durationMs) || 0;

        let playlistItems = this.playlists.map(pl => `
            <div class="context-menu-item" onclick="Playlists.addTrackToPlaylist('${pl.id}', {id:'${track.id}',spotifyId:'${safeSpotifyId}',title:'${safeTitle}',artist:'${safeArtist}',thumb:'${track.thumb}',source:'${safeSource}',streamUrl:'${safeStreamUrl}',durationMs:${durationMs}}); Music.closeContextMenu();">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                ${pl.name} (${pl.tracks.length})
            </div>
        `).join('');

        if (!playlistItems) {
            playlistItems = `<div class="context-menu-item" style="opacity:0.5;pointer-events:none;">Aucune playlist — crées-en une !</div>`;
        }

        const isLiked = this.isLiked(track);
        menu.innerHTML = `
            <div class="context-menu-item" onclick="Player.addToQueue({id:'${track.id}',spotifyId:'${safeSpotifyId}',title:'${safeTitle}',artist:'${safeArtist}',thumb:'${track.thumb}',source:'${safeSource}',streamUrl:'${safeStreamUrl}',durationMs:${durationMs}}); Player.playFromQueue(Player.queue.length-1); Music.closeContextMenu();">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                Lire maintenant
            </div>
            <div class="context-menu-item" onclick="Player.playNext({id:'${track.id}',spotifyId:'${safeSpotifyId}',title:'${safeTitle}',artist:'${safeArtist}',thumb:'${track.thumb}',source:'${safeSource}',streamUrl:'${safeStreamUrl}',durationMs:${durationMs}}); Music.closeContextMenu();">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
                Lire ensuite
            </div>
            <div class="context-menu-item" onclick="Player.addToQueue({id:'${track.id}',spotifyId:'${safeSpotifyId}',title:'${safeTitle}',artist:'${safeArtist}',thumb:'${track.thumb}',source:'${safeSource}',streamUrl:'${safeStreamUrl}',durationMs:${durationMs}}); Music.closeContextMenu();">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg>
                Ajouter à la file
            </div>
            <div class="context-menu-item" onclick="Music.toggleFavorite('${track.id}', '${safeTitle}', '${safeArtist}', '${track.thumb}', '${safeSpotifyId}'); Music.closeContextMenu();">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                ${isLiked ? 'Retirer des likes' : 'Liker'}
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-label">Ajouter à une playlist</div>
            ${playlistItems}
            <div class="context-menu-item" onclick="Playlists.showCreateModal(); Music.closeContextMenu();">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                Nouvelle playlist...
            </div>
        `;

        const x = Math.min(e.clientX, window.innerWidth - 240);
        const y = Math.min(e.clientY, window.innerHeight - 350);
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        document.body.appendChild(menu);

        setTimeout(() => {
            document.addEventListener('click', Music.closeContextMenu, { once: true });
        }, 50);
    },

    renderSidebar() {
        const list = document.getElementById('sidebarLibraryList');
        if (!list) return;

        const likedCount = this.likedTracks.length;
        const followedArtists = typeof Music !== 'undefined' ? (Music.followedArtists || []).slice(0, 5) : [];
        const recentAlbums = typeof Music !== 'undefined' ? (Music.recentAlbums || []).slice(0, 4) : [];
        const escape = (value) => typeof Music !== 'undefined' && typeof Music.escapeHtml === 'function'
            ? Music.escapeHtml(value)
            : String(value || '');

        let html = `
            <section class="library-section">
                <div class="library-section-label">Collection</div>
                <div class="library-item is-featured" onclick="showView('library'); Playlists.renderLikedTracks();">
                    <div class="img-box" style="background:linear-gradient(135deg,#7c3aed,#22d3ee);">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </div>
                    <div class="info">
                        <div class="title" style="color:var(--accent-bright);">Titres likes</div>
                        <div class="subtitle">Playlist personnelle - ${likedCount} titre${likedCount !== 1 ? 's' : ''}</div>
                    </div>
                </div>
                <div class="library-item local-library-entry" onclick="Playlists.showLocalTracksView();">
                    <div class="img-box local-library-icon">NW</div>
                    <div class="info">
                        <div class="title">Sons perso</div>
                        <div class="subtitle">Fichiers locaux - ${this.localTracks.length} titre${this.localTracks.length !== 1 ? 's' : ''}</div>
                    </div>
                    <button class="library-inline-add" onclick="event.stopPropagation(); Playlists.showImportPicker()" title="Importer">+</button>
                </div>
            </section>
        `;

        html += `
            <section class="library-section">
                <div class="library-section-label">Artistes abonnes</div>
                ${followedArtists.length ? followedArtists.map((artist) => {
                    const artistKey = typeof Music !== 'undefined' && typeof Music.registerArtist === 'function'
                        ? Music.registerArtist(artist)
                        : encodeURIComponent((artist.spotifyId || artist.name || '').toLowerCase());
                    const initials = typeof Music !== 'undefined' && typeof Music.getArtistInitials === 'function'
                        ? Music.getArtistInitials(artist.name)
                        : 'A';
                    const meta = Array.isArray(artist.genres) && artist.genres.length
                        ? artist.genres.slice(0, 2).join(' - ')
                        : 'Artiste suivi';

                    return `
                        <div class="library-item library-item-artist" onclick="Music.openArtistSearch('${artistKey}')">
                            <div class="img-box is-round">
                                ${artist.imageUrl
                                    ? `<img src="${escape(artist.imageUrl)}" alt="${escape(artist.name)}">`
                                    : `<span class="library-avatar-fallback">${escape(initials)}</span>`}
                            </div>
                            <div class="info">
                                <div class="title">${escape(artist.name || 'Artiste')}</div>
                                <div class="subtitle">${escape(meta)}</div>
                            </div>
                        </div>
                    `;
                }).join('') : '<div class="library-empty-copy">Abonne-toi a des artistes pendant l onboarding pour les retrouver ici.</div>'}
            </section>
        `;

        html += `
            <section class="library-section">
                <div class="library-section-label">Albums recents</div>
                ${recentAlbums.length ? recentAlbums.map((album) => {
                    const cover = album.imageUrl || '';
                    const albumQuery = encodeURIComponent(`${(album.artists || [album.name])[0] || album.name} ${album.name}`);
                    const clickAction = album.spotifyId
                        ? `Music.openAlbum('${album.spotifyId}')`
                        : `Music.openAlbumSearch('${albumQuery}')`;

                    return `
                        <div class="library-item library-item-album" onclick="${clickAction}">
                            <div class="img-box" style="${cover ? '' : 'background:var(--bg-highlight);'}">
                                ${cover
                                    ? `<img src="${escape(cover)}" alt="${escape(album.name)}">`
                                    : `<svg viewBox="0 0 24 24" width="20" height="20" stroke="var(--text-muted)" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="3"/></svg>`}
                            </div>
                            <div class="info">
                                <div class="title">${escape(album.name || 'Album')}</div>
                                <div class="subtitle">Album - ${escape((album.artists || []).join(', ') || 'Artiste')}</div>
                            </div>
                        </div>
                    `;
                }).join('') : '<div class="library-empty-copy">Ouvre un album depuis la recherche et il sera epingle ici.</div>'}
            </section>
        `;

        html += `
            <section class="library-section">
                <div class="library-section-label">Playlists</div>
                ${this.playlists.length ? this.playlists.map((pl) => {
                    const cover = pl.tracks[0]?.thumb || '';
                    return `
                        <div class="library-item" onclick="Playlists.renderPlaylistView('${pl.id}'); showView('playlist');" style="position:relative;">
                            <div class="img-box" style="${cover ? '' : 'background:var(--bg-highlight);'}">
                                ${cover ? `<img src="${escape(cover)}" alt="${escape(pl.name)}">` : `<svg viewBox="0 0 24 24" width="20" height="20" stroke="var(--text-muted)" stroke-width="2" fill="none"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`}
                            </div>
                            <div class="info">
                                <div class="title">${escape(pl.name)}</div>
                                <div class="subtitle">Playlist - ${pl.tracks.length} titre${pl.tracks.length !== 1 ? 's' : ''}</div>
                            </div>
                            <button onclick="event.stopPropagation(); Playlists.deletePlaylist('${pl.id}')" 
                                style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;opacity:0;transition:opacity 0.2s;position:absolute;right:8px;"
                                onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'"
                                class="pl-delete-btn">
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                    `;
                }).join('') : '<div class="library-empty-copy">Cree une playlist pour la garder ici.</div>'}
            </section>
        `;

        list.innerHTML = html;

        list.querySelectorAll('.library-item').forEach(item => {
            const btn = item.querySelector('.pl-delete-btn');
            if (btn) {
                item.addEventListener('mouseenter', () => btn.style.opacity = '1');
                item.addEventListener('mouseleave', () => btn.style.opacity = '0');
            }
        });
    },

    renderLikedTracks() {
        if (typeof showView !== 'undefined') showView('library');
        const titleEl = document.getElementById('libraryViewTitle');
        if (titleEl) titleEl.textContent = 'Titres likés';
        
        const collections = document.getElementById('libraryCollections');
        const favorites = document.getElementById('favoriteTracks');
        if (collections) collections.classList.add('hidden');
        if (favorites) {
            favorites.classList.remove('hidden');
            if (this.likedTracks.length === 0) {
                favorites.innerHTML = '<div style="grid-column:1/-1;padding:48px;text-align:center;color:var(--text-muted);font-size:0.9rem;">Aucun titre liké. Clique ♥ sur un titre pour l\'ajouter !</div>';
            } else {
                const formatted = this.likedTracks.map(t => ({
                    id: t.videoId || t.spotifyId,
                    videoId: t.videoId || '',
                    spotifyId: t.spotifyId || '',
                    title: t.title,
                    artist: t.artist,
                    thumb: t.thumb,
                    url: t.videoId ? `/watch?v=${t.videoId}` : '',
                    meta: t.artist
                }));
                Music.renderTracks(formatted, favorites);
            }
        }
    },

    setLibraryChrome(isSubView = false) {
        const sortRow = document.querySelector('#libraryView .library-sort-row');
        const mobileFilters = document.querySelector('#libraryView .library-filters-mobile');

        if (sortRow) sortRow.classList.toggle('hidden', isSubView);
        if (mobileFilters) mobileFilters.classList.toggle('hidden', isSubView);
    },

    showLikedTracksView() {
        if (typeof showView !== 'undefined') showView('library');
        this.setLibraryChrome(true);

        const titleEl = document.getElementById('libraryViewTitle');
        if (titleEl) titleEl.textContent = 'Titres likes';

        const collections = document.getElementById('libraryCollections');
        const favorites = document.getElementById('favoriteTracks');
        if (collections) collections.classList.add('hidden');
        if (!favorites) return;

        favorites.dataset.display = 'rows';
        favorites.classList.remove('hidden');

        if (this.likedTracks.length === 0) {
            favorites.innerHTML = "<div style=\"grid-column:1/-1;padding:48px;text-align:center;color:var(--text-muted);font-size:0.9rem;\">Aucun titre like. Clique sur le coeur d'un titre pour l'ajouter.</div>";
            return;
        }

        const formatted = this.likedTracks.map((track) => ({
            id: track.videoId || track.spotifyId,
            videoId: track.videoId || '',
            spotifyId: track.spotifyId || '',
            title: track.title,
            artist: track.artist,
            thumb: track.thumb,
            url: track.videoId ? `/watch?v=${track.videoId}` : '',
            meta: track.artist
        }));

        Music.renderTracks(formatted, favorites);
    },

    renderLikedTracks() {
        this.showLikedTracksView();
        setTimeout(() => this.showLikedTracksView(), 0);
    },

    _currentPlaylistId: null,

    renderPlaylistView(playlistId) {
        this._currentPlaylistId = playlistId;
        const pl = this.playlists.find(p => p.id === playlistId);
        if (!pl) return;

        if (typeof showView !== 'undefined') showView('playlist');
        const titleEl = document.getElementById('playlistViewTitle');
        if (titleEl) titleEl.textContent = pl.name;
        const countEl = document.getElementById('playlistViewMeta');
        if (countEl) countEl.textContent = `${pl.tracks.length} titre${pl.tracks.length !== 1 ? 's' : ''}`;
        const shareBtn = document.getElementById('playlistShareBtn');
        if (shareBtn) shareBtn.onclick = () => this.sharePlaylist(playlistId);
        const playBtn = document.getElementById('playlistPlayBtn');
        if (playBtn) {
            playBtn.onclick = () => {
                if (!pl.tracks.length) return;
                Player.queue = pl.tracks.map((track) => ({
                    ...track,
                    id: track.videoId || track.spotifyId || track.id,
                    source: track.source || (String(track.videoId || '').startsWith('local-') ? 'local' : '')
                }));
                Player.renderQueue();
                Player.playFromQueue(0);
            };
        }

        const container = document.getElementById('playlistTracks');
        if (container) {
            if (pl.tracks.length === 0) {
                container.innerHTML = '<div class="playlist-empty-state"><div class="playlist-empty-icon">♪</div><h3>Cette playlist attend son premier titre</h3><p>Ajoute un titre depuis la recherche ou tes sons perso.</p></div>';
            } else {
                const formatted = pl.tracks.map((t) => ({
                    ...t,
                    id: t.videoId || t.spotifyId || t.id,
                    videoId: t.videoId || '',
                    spotifyId: t.spotifyId || '',
                    title: t.title,
                    artist: t.artist,
                    thumb: t.thumb,
                    source: t.source || (String(t.videoId || '').startsWith('local-') ? 'local' : ''),
                    streamUrl: t.streamUrl || '',
                    durationMs: t.durationMs || 0,
                    meta: t.source === 'local' ? 'Fichier local' : t.artist
                }));
                const contextTracks = Music.createTrackContext(formatted);
                Music._contexts[container.id] = contextTracks;
                container.innerHTML = `
                    <div class="playlist-track-shell">
                        ${contextTracks.map((track, index) => `
                            <article class="playlist-track-row" onclick="Music.playContext('${container.id}', ${index})">
                                <div class="playlist-drag-handle" title="Ordre">${String(index + 1).padStart(2, '0')}</div>
                                <div class="playlist-track-art ${track.source === 'local' ? 'is-local' : ''}">
                                    ${track.thumb ? `<img src="${Music.escapeHtml(track.thumb)}" alt="">` : '<span>NW</span>'}
                                </div>
                                <div class="playlist-track-copy">
                                    <strong>${Music.escapeHtml(track.title)}</strong>
                                    <span>${Music.escapeHtml(track.artist)}${track.source === 'local' ? ' - Local' : ''}</span>
                                </div>
                                <div class="playlist-order-actions">
                                    <button onclick="event.stopPropagation(); Playlists.movePlaylistTrack('${playlistId}', ${index}, -1)" ${index === 0 ? 'disabled' : ''} title="Monter">↑</button>
                                    <button onclick="event.stopPropagation(); Playlists.movePlaylistTrack('${playlistId}', ${index}, 1)" ${index === contextTracks.length - 1 ? 'disabled' : ''} title="Descendre">↓</button>
                                </div>
                                <button class="playlist-remove-btn" onclick="event.stopPropagation(); Playlists.removeTrackFromPlaylist('${playlistId}', '${track.id}')" title="Retirer">×</button>
                            </article>
                        `).join('')}
                    </div>
                `;
            }
        }
    },

    renderLibraryView() {
        const container = document.getElementById('libraryCollections');
        if (!container) return;
        this.setLibraryChrome(false);

        const favorites = document.getElementById('favoriteTracks');
        if (favorites) favorites.classList.add('hidden');
        container.classList.remove('hidden');

        const likedCount = this.likedTracks.length;
        const followedArtists = typeof Music !== 'undefined' ? (Music.followedArtists || []) : [];
        const recentAlbums = typeof Music !== 'undefined' ? (Music.recentAlbums || []) : [];
        const escape = (v) => v ? v.replace(/'/g, "&apos;").replace(/"/g, "&quot;") : '';

        let html = '';

        // 1. Liked Songs Row (Always top)
        html += `
            <div class="lib-row-item" onclick="Playlists.renderLikedTracks();">
                <div class="lib-row-img gradient-liked">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </div>
                <div class="lib-row-info">
                    <div class="lib-row-title">Titres likés</div>
                    <div class="lib-row-meta">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="#1ed760" style="margin-right:4px;"><path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21z"/></svg>
                        Playlist • ${likedCount} titre${likedCount !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>
        `;

        html += `
            <div class="lib-row-item local-library-card" onclick="Playlists.showLocalTracksView();">
                <div class="lib-row-img local-library-icon">NW</div>
                <div class="lib-row-info">
                    <div class="lib-row-title">Sons perso</div>
                    <div class="lib-row-meta">Collection locale - ${this.localTracks.length} titre${this.localTracks.length !== 1 ? 's' : ''}</div>
                </div>
                <button class="premium-action-btn compact" onclick="event.stopPropagation(); Playlists.showImportPicker()">Importer</button>
            </div>
        `;

        // 2. Playlists
        this.playlists.forEach(pl => {
            const cover = pl.tracks[0]?.thumb || '';
            html += `
                <div class="lib-row-item" onclick="Playlists.renderPlaylistView('${pl.id}');">
                    <div class="lib-row-img ${cover ? '' : 'fallback-img'}">
                        ${cover ? `<img src="${cover}" alt="">` : `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`}
                    </div>
                    <div class="lib-row-info">
                        <div class="lib-row-title">${escape(pl.name)}</div>
                        <div class="lib-row-meta">Playlist • ${pl.owner || 'Moi'}</div>
                    </div>
                </div>
            `;
        });

        // 3. Artists
        followedArtists.forEach(artist => {
            html += `
                <div class="lib-row-item" onclick="Music.openArtistSearch('${artist.id || artist.name}')">
                    <div class="lib-row-img is-round">
                        <img src="${artist.imageUrl || 'https://via.placeholder.com/150'}" alt="">
                    </div>
                    <div class="lib-row-info">
                        <div class="lib-row-title">${escape(artist.name)}</div>
                        <div class="lib-row-meta">Artiste</div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    renderHomeShortcuts() {
        const container = document.getElementById('homeShortcutsGrid');
        if (!container) return;

        let html = '';
        const escape = (v) => v ? v.replace(/'/g, "&apos;").replace(/"/g, "&quot;") : '';

        // 1. Liked Songs (Always first if has likes)
        if (this.likedTracks && this.likedTracks.length > 0) {
            html += `
                <div class="shortcut-card" onclick="Playlists.renderLikedTracks()">
                    <div class="thumb lib-row-img gradient-liked" style="display:flex;align-items:center;justify-content:center;">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                    </div>
                    <div class="title">Titres likés</div>
                    <button class="shortcut-play-btn"><svg viewBox="0 0 24 24" width="18" height="18" fill="white"><polygon points="6 3 20 12 6 21 6 3" /></svg></button>
                </div>
            `;
        }

        // 2. Playlists (Limit to fill 8 slots total)
        const limit = 8 - (this.likedTracks && this.likedTracks.length > 0 ? 1 : 0);
        (this.playlists || []).slice(0, limit).forEach(pl => {
            const thumb = pl.coverUrl || 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=150';
            html += `
                <div class="shortcut-card" onclick="Playlists.renderPlaylistView('${pl.id}')">
                    <div class="thumb"><img src="${thumb}" alt="${escape(pl.name)}"></div>
                    <div class="title">${escape(pl.name)}</div>
                    <button class="shortcut-play-btn"><svg viewBox="0 0 24 24" width="18" height="18" fill="white"><polygon points="6 3 20 12 6 21 6 3" /></svg></button>
                </div>
            `;
        });

        // 3. Placeholder if empty
        if (!html) {
            html = '<div style="grid-column: 1/-1; padding: 20px; text-align: center; color: var(--text-muted);">Crée ta première playlist pour la voir ici !</div>';
        }

        container.innerHTML = html;
    }
};
