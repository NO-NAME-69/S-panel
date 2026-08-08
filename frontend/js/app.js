/**
 * S Panel - Main App Router
 */

const App = {
    pages: {
        'dashboard': DashboardPage,
        'websites': WebsitesPage,
        'databases': DatabasesPage,
        'files': FilesPage,
        'terminal': TerminalPage,
        'ssl': SslPage,
        'services': ServicesPage,
        'firewall': FirewallPage,
        'cron': CronPage,
        'docker': DockerPage,
        'software': SoftwarePage,
        'settings': SettingsPage
    },
    currentPage: null,

    async init() {
        Auth.init();
        Toast.init();
        Modal.init();

        const isLoggedIn = await Auth.checkSession();
        if (isLoggedIn) {
            this.setupNavigation();
            this.handleRoute();
        }
    },

    setupNavigation() {
        // Sidebar toggle
        document.getElementById('sidebar-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('collapsed');
        });

        // Mobile menu
        document.getElementById('mobile-menu-btn').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('mobile-open');
        });

        // User dropdown
        const userMenu = document.getElementById('user-dropdown');
        document.getElementById('user-menu-trigger').addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.header-user-menu')) {
                userMenu.classList.remove('show');
            }
        });

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            if (this.currentPage && this.currentPage.render) {
                this.currentPage.render();
            }
        });

        // Hash routing
        window.addEventListener('hashchange', () => this.handleRoute());
        
        // Setup links
        document.querySelectorAll('a[data-page], button[data-page]').forEach(el => {
            el.addEventListener('click', (e) => {
                const isBtn = el.tagName === 'BUTTON';
                if (isBtn) {
                    this.navigate(el.dataset.page);
                }
                document.getElementById('sidebar').classList.remove('mobile-open');
                userMenu.classList.remove('show');
            });
        });
    },

    navigate(pageName) {
        const targetHash = '#' + pageName.replace('#', '');
        if (window.location.hash === targetHash) {
            this.handleRoute();
        } else {
            window.location.hash = targetHash;
        }
    },

    async handleRoute() {
        if (!Auth.isAuthenticated()) return;

        const hash = window.location.hash.replace('#', '') || 'dashboard';
        const pageName = hash.split('?')[0];
        
        if (!this.pages[pageName]) {
            this.navigate('dashboard');
            return;
        }

        // Update UI
        document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
        const activeLink = document.querySelector(`.menu-item[data-page="${pageName}"]`);
        if (activeLink) activeLink.classList.add('active');

        // Update Breadcrumb
        const breadcrumb = document.getElementById('breadcrumb');
        const title = activeLink ? activeLink.querySelector('span').textContent : pageName;
        breadcrumb.innerHTML = `<span class="breadcrumb-item">${title}</span>`;

        // Cleanup previous page
        if (this.currentPage && this.currentPage.destroy) {
            this.currentPage.destroy();
        }

        // Load new page
        this.currentPage = this.pages[pageName];
        
        const contentEl = document.getElementById('page-content');
        contentEl.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading ${title}...</p></div>`;
        
        try {
            await this.currentPage.render();
        } catch (err) {
            if (err.message.includes('Session expired')) return;
            contentEl.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="alert-circle" class="empty-state-icon" style="color:var(--danger);"></i>
                    <h3>Error Loading Page</h3>
                    <p>${err.message}</p>
                    <button class="btn btn-primary" style="margin-top:var(--space-4);" onclick="App.handleRoute()">Try Again</button>
                </div>
            `;
            lucide.createIcons();
        }
    }
};

// Start application
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
