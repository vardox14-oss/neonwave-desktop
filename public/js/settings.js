// NeonWave Settings & Account Management
const Settings = {
    open() {
        const modal = document.getElementById('settingsModal');
        const user = Auth.getUser();
        if (user) {
            document.getElementById('settingsEmail').value = user.email;
        }
        modal.style.display = 'flex';
        this.refreshSpotifyStatus();
    },

    async refreshSpotifyStatus() {
        const panel = document.getElementById('spotifyConnectPanel');
        const btn = document.getElementById('spotifyConnectBtn');
        const status = document.getElementById('spotifyConnectStatus');
        if (!panel || !btn) return;

        // Fonctionnalité réservée à l'app desktop (fenêtre de connexion Electron)
        if (!window.NeonWaveDesktop || typeof window.NeonWaveDesktop.spotifyStatus !== 'function') {
            panel.style.display = 'none';
            return;
        }
        panel.style.display = '';

        try {
            const state = await window.NeonWaveDesktop.spotifyStatus();
            if (state && state.connected) {
                panel.classList.add('is-connected');
                btn.textContent = 'Déconnecter';
                if (status) status.textContent = state.active
                    ? 'Connecté — les Canvas vidéo s\'affichent en fond. 🎬'
                    : 'Connecté. Activation du token en cours…';
            } else {
                panel.classList.remove('is-connected');
                btn.textContent = 'Connecter Spotify';
                if (status) status.textContent = 'Connecte Spotify pour afficher les Canvas vidéo des morceaux.';
            }
        } catch {
            panel.style.display = 'none';
        }
    },

    async toggleSpotify() {
        const btn = document.getElementById('spotifyConnectBtn');
        const status = document.getElementById('spotifyConnectStatus');
        if (!window.NeonWaveDesktop) return;

        const panel = document.getElementById('spotifyConnectPanel');
        const isConnected = panel && panel.classList.contains('is-connected');

        btn.disabled = true;
        try {
            if (isConnected) {
                await window.NeonWaveDesktop.spotifyDisconnect();
            } else {
                if (status) status.textContent = 'Ouverture de la fenêtre Spotify…';
                await window.NeonWaveDesktop.spotifyConnect();
            }
        } catch (err) {
            console.error('Spotify toggle error:', err);
        } finally {
            btn.disabled = false;
            this.refreshSpotifyStatus();
        }
    },

    close() {
        document.getElementById('settingsModal').style.display = 'none';
        document.getElementById('passwordForm').reset();
    },

    openWeeklyRecapTest() {
        this.close();
        if (typeof Music !== 'undefined' && Music.openWeeklyRecap) {
            Music.openWeeklyRecap({ demo: true });
        }
    },

    async updatePassword(e) {
        e.preventDefault();
        const password = document.getElementById('newPassword').value;
        if (password.length < 6) {
            alert('Le mot de passe doit faire au moins 6 caractères.');
            return;
        }

        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                alert('Mot de passe mis à jour avec succès !');
                this.close();
            } else {
                const data = await res.json();
                alert('Erreur: ' + data.error);
            }
        } catch (err) {
            alert('Erreur de connexion.');
        }
    }
};
