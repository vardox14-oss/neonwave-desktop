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
        if (data.token) {
            localStorage.setItem('token', data.token);
        }
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
            if (data.token) {
                localStorage.setItem('token', data.token);
            }
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
            if (data.token) {
                localStorage.setItem('token', data.token);
            }
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
            const headers = Auth.getAuthHeaders();
            const response = await fetch('/api/auth/me', { headers });
            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                localStorage.setItem('last_auth_error', JSON.stringify({
                    status: response.status,
                    statusText: response.statusText,
                    body: errText
                }));
                throw new Error(`Auth verification failed with status ${response.status}: ${errText}`);
            }
            const data = await response.json();
            localStorage.setItem('user', JSON.stringify(data.user));
            return true;
        } catch (err) {
            console.error('checkAuth error:', err);
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
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
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
