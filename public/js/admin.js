const Admin = {
    escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    },

    sanitizeId(value) {
        return String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
    },

    sanitizeIP(value) {
        return String(value ?? '').replace(/[^0-9a-fA-F:.\-]/g, '');
    },

    async init() {
        this.fetchUsers();
        this.fetchIPs();
    },

    showTab(tabName) {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        event.currentTarget.classList.add('active');
        
        document.getElementById('tabUsers').style.display = tabName === 'users' ? 'block' : 'none';
        document.getElementById('tabIPs').style.display = tabName === 'ips' ? 'block' : 'none';
    },

    // ═══ USERS ═══

    async fetchUsers() {
        const tableBody = document.getElementById('userTableBody');
        try {
            const response = await fetch('/api/admin/users', { headers: Auth.getAuthHeaders() });
            if (!response.ok) throw new Error('Failed to fetch');
            const users = await response.json();
            this.updateStats(users);
            this.renderUsers(users);
        } catch (err) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:48px;color:var(--danger);">Erreur: ${err.message}</td></tr>`;
        }
    },

    updateStats(users) {
        document.getElementById('statTotal').textContent = users.length;
        document.getElementById('statAdmins').textContent = users.filter(u => u.role === 'ADMIN').length;
        document.getElementById('statBanned').textContent = users.filter(u => u.banned).length;
    },

    renderUsers(users) {
        const tableBody = document.getElementById('userTableBody');
        users = users.map((user) => {
            const role = ['OWNER', 'ADMIN', 'USER'].includes(user.role) ? user.role : 'USER';
            return {
                ...user,
                id: this.sanitizeId(user.id),
                username: this.escapeHTML(user.username || ''),
                email: this.escapeHTML(user.email || ''),
                lastIP: this.sanitizeIP(user.lastIP || ''),
                role
            };
        });

        if (users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:48px;color:var(--text-muted);">Aucun utilisateur.</td></tr>';
            return;
        }

        tableBody.innerHTML = users.map(user => {
            const isBanned = user.banned;
            const badgeClass = isBanned ? 'badge-danger' : `badge-${user.role.toLowerCase()}`;
            const badgeText = isBanned ? 'BANNI' : user.role;
            const letter = (user.username || user.email)[0].toUpperCase();

            const actionButtons = user.role === 'OWNER' 
                ? '<span style="color:var(--text-muted);font-size:0.75rem;">Protégé</span>'
                : `
                    ${isBanned 
                        ? `<button onclick="Admin.unbanUser('${user.id}')" style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);color:#10b981;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:0.75rem;font-weight:600;margin-right:8px;transition:all 0.2s;" onmouseover="this.style.background='rgba(16,185,129,0.2)'" onmouseout="this.style.background='rgba(16,185,129,0.1)'">Débannir</button>`
                        : `<button onclick="Admin.banUser('${user.id}')" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:var(--danger);padding:8px 12px;border-radius:8px;cursor:pointer;font-size:0.75rem;font-weight:600;margin-right:8px;transition:all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.2)'" onmouseout="this.style.background='rgba(239,68,68,0.1)'">Bannir Compte</button>`
                    }
                    ${user.lastIP ? `<button onclick="Admin.quickBanIP('${user.lastIP}')" style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);color:#f59e0b;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:0.75rem;font-weight:600;margin-right:8px;transition:all 0.2s;" onmouseover="this.style.background='rgba(245,158,11,0.2)'" onmouseout="this.style.background='rgba(245,158,11,0.1)'">Bannir IP</button>` : ''}
                    <button onclick="Admin.deleteUser('${user.id}')" style="background:transparent;border:1px solid var(--glass-border);color:var(--text-muted);padding:8px 12px;border-radius:8px;cursor:pointer;font-size:0.75rem;font-weight:600;transition:all 0.2s;" onmouseover="this.style.color='white';this.style.borderColor='rgba(255,255,255,0.2)'" onmouseout="this.style.color='var(--text-muted)';this.style.borderColor='var(--glass-border)'">Supprimer</button>
                `;

            return `
                <tr>
                    <td>
                        <div style="display:flex;align-items:center;gap:12px;">
                            <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--accent-glow),var(--accent-bright));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.85rem;flex-shrink:0;">${letter}</div>
                            <div>
                                <div style="font-weight:600;font-size:0.9rem;">${user.username || 'Sans nom'}</div>
                                <div style="font-size:0.7rem;color:var(--text-muted);">${user.email}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge badge-${user.role.toLowerCase()}">${user.role}</span></td>
                    <td style="font-size:0.85rem;font-family:monospace;color:var(--text-secondary);">${user.lastIP || 'Jamais connecté'}</td>
                    <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                    <td style="text-align:right;">${actionButtons}</td>
                </tr>
            `;
        }).join('');
    },

    async banUser(id) {
        if (!confirm("Bannir ce compte ?")) return;
        try {
            const res = await fetch(`/api/admin/ban/${id}`, {
                method: 'POST',
                headers: Auth.getAuthHeaders(),
                body: JSON.stringify({ banIP: false })
            });
            if (res.ok) {
                this.fetchUsers();
            }
        } catch (err) { console.error('Ban error:', err); }
    },

    async quickBanIP(ip) {
        if (!confirm("Bannir cette IP (" + ip + ") ?")) return;
        try {
            const res = await fetch('/api/admin/ban-ip', {
                method: 'POST',
                headers: Auth.getAuthHeaders(),
                body: JSON.stringify({ ip })
            });
            if (res.ok) {
                alert("IP bannie avec succès !");
                this.fetchIPs(); // update the IP list counter
            }
        } catch (err) { console.error('Quick Ban IP error:', err); }
    },

    async unbanUser(id) {
        try {
            const res = await fetch(`/api/admin/unban/${id}`, {
                method: 'POST',
                headers: Auth.getAuthHeaders()
            });
            if (res.ok) this.fetchUsers();
        } catch (err) { console.error('Unban error:', err); }
    },

    async deleteUser(id) {
        if (!confirm('Voulez-vous vraiment supprimer cet utilisateur définitivement ?')) return;
        try {
            const res = await fetch(`/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: Auth.getAuthHeaders()
            });
            if (res.ok) this.fetchUsers();
        } catch (err) { console.error('Delete error:', err); }
    },

    // ═══ BANNED IPS ═══

    async fetchIPs() {
        const tableBody = document.getElementById('ipTableBody');
        try {
            const response = await fetch('/api/admin/banned-ips', { headers: Auth.getAuthHeaders() });
            if (!response.ok) throw new Error('Failed to fetch');
            const ips = await response.json();
            document.getElementById('statIPBans').textContent = ips.length;
            this.renderIPs(ips);
        } catch (err) {
            tableBody.innerHTML = `<tr><td colspan="2" style="text-align:center;padding:48px;color:var(--danger);">Erreur: ${err.message}</td></tr>`;
        }
    },

    renderIPs(ips) {
        const tableBody = document.getElementById('ipTableBody');
        ips = ips.map((ip) => this.sanitizeIP(ip)).filter(Boolean);
        if (ips.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:48px;color:var(--text-muted);">Aucune adresse IP bannie.</td></tr>';
            return;
        }
        tableBody.innerHTML = ips.map(ip => `
            <tr>
                <td style="font-family:monospace;font-size:0.95rem;font-weight:600;color:var(--danger);">${ip}</td>
                <td style="text-align:right;">
                    <button onclick="Admin.unbanIP('${ip}')" style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);color:#10b981;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:0.75rem;font-weight:600;transition:all 0.2s;" onmouseover="this.style.background='rgba(16,185,129,0.2)'" onmouseout="this.style.background='rgba(16,185,129,0.1)'">
                        Débannir IP
                    </button>
                </td>
            </tr>
        `).join('');
    },

    async banIPForm(e) {
        e.preventDefault();
        const input = document.getElementById('banIPInput');
        const ip = input.value.trim();
        if (!ip) return;
        
        try {
            const res = await fetch('/api/admin/ban-ip', {
                method: 'POST',
                headers: Auth.getAuthHeaders(),
                body: JSON.stringify({ ip })
            });
            if (res.ok) {
                input.value = '';
                this.fetchIPs();
            }
        } catch (err) { console.error('Ban IP error:', err); }
    },

    async unbanIP(ip) {
        if (!confirm('Débannir cette IP ?\\n' + ip)) return;
        try {
            const res = await fetch(`/api/admin/ban-ip/${encodeURIComponent(ip)}`, {
                method: 'DELETE',
                headers: Auth.getAuthHeaders()
            });
            if (res.ok) this.fetchIPs();
        } catch (err) { console.error('Unban IP error:', err); }
    }
};
