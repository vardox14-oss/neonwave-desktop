const Auth = {
    async getSetupStatus() {
        const response = await fetch('/api/setup/status');
        if (!response.ok) throw new Error('Impossible de lire l etat de configuration');
        return response.json();
    },

    async setupOwner(username, email, password) {
        const response = await fetch('/api/setup/owner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Erreur de configuration');
        }

        const data = await response.json();
        localStorage.removeItem('token');
        localStorage.setItem('user', JSON.stringify(data.user));
        return data;
    },

    async login(email, password, rememberMe = false) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, rememberMe })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Erreur de connexion');
            }

            const data = await response.json();
            localStorage.removeItem('token');
            localStorage.setItem('user', JSON.stringify(data.user));
            return data;
        } catch (err) {
            console.error('Login error:', err);
            throw err;
        }
    },

    async register(username, email, password) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Erreur d'inscription");
            }

            const data = await response.json();
            localStorage.removeItem('token');
            localStorage.setItem('user', JSON.stringify(data.user));
            return data;
        } catch (err) {
            console.error('Register error:', err);
            throw err;
        }
    },

    async logout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch {}
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    },

    async checkAuth() {
        try {
            const headers = { 'Content-Type': 'application/json' };
            const response = await fetch('/api/auth/me', { headers });
            if (!response.ok) throw new Error();
            const data = await response.json();
            localStorage.removeItem('token');
            localStorage.setItem('user', JSON.stringify(data.user));
            return true;
        } catch (err) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            if (!window.location.pathname.includes('login')) {
                window.location.href = 'login.html';
            }
            return false;
        }
    },

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    getAuthHeaders() {
        return { 'Content-Type': 'application/json' };
    }
};

// Global helper for authenticated API calls
const NW = {
    async fetchWithAuth(url, options = {}) {
        const headers = Auth.getAuthHeaders();
        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...(options.headers || {})
            }
        });
        if (response.status === 401) {
            Auth.logout();
        }
        return response;
    }
};

window.NW = NW;

// Auto-check auth on script load
if (!window.location.pathname.includes('login')) {
    Auth.checkAuth();
}
