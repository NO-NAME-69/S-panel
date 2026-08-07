/**
 * S Panel - Authentication
 */

const Auth = {
    init() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    },

    isAuthenticated() {
        return !!API.token;
    },

    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    },

    showApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
    },

    async handleLogin(e) {
        e.preventDefault();

        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');

        errorEl.style.display = 'none';
        btn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';

        try {
            const result = await API.request('POST', '/api/auth/login', { username, password });
            API.setToken(result.token);

            // Update UI with user info
            const avatarEl = document.getElementById('user-avatar');
            const usernameEl = document.getElementById('sidebar-username');
            if (avatarEl) avatarEl.textContent = result.user.username[0].toUpperCase();
            if (usernameEl) usernameEl.textContent = result.user.username;

            this.showApp();
            App.navigate('dashboard');
            Toast.success('Welcome back', `Logged in as ${result.user.username}`);
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.style.display = 'block';
        } finally {
            btn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    },

    async checkSession() {
        if (!API.token) {
            this.showLogin();
            return false;
        }

        try {
            const user = await API.get('/api/auth/me');
            const avatarEl = document.getElementById('user-avatar');
            const usernameEl = document.getElementById('sidebar-username');
            if (avatarEl) avatarEl.textContent = user.username[0].toUpperCase();
            if (usernameEl) usernameEl.textContent = user.username;
            this.showApp();
            return true;
        } catch {
            API.setToken(null);
            this.showLogin();
            return false;
        }
    },

    logout() {
        API.setToken(null);
        this.showLogin();
        Toast.info('Logged out', 'You have been logged out successfully');
    }
};
