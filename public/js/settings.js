// NeonWave Settings & Account Management
const Settings = {
    open() {
        const modal = document.getElementById('settingsModal');
        const user = Auth.getUser();
        if (user) {
            document.getElementById('settingsEmail').value = user.email;
        }
        modal.style.display = 'flex';
    },

    close() {
        document.getElementById('settingsModal').style.display = 'none';
        document.getElementById('passwordForm').reset();
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
