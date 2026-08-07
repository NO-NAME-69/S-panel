/**
 * S Panel - Toast Notifications
 */

const Toast = {
    container: null,

    init() {
        this.container = document.getElementById('toast-container');
    },

    show(type, title, message, duration = 4000) {
        if (!this.container) this.init();

        const icons = {
            success: 'check-circle',
            error: 'alert-circle',
            warning: 'alert-triangle',
            info: 'info'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i data-lucide="${icons[type] || 'info'}" class="toast-icon"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close" onclick="Toast.remove(this.parentElement)">
                <i data-lucide="x"></i>
            </button>
        `;

        this.container.appendChild(toast);
        lucide.createIcons({ nameAttr: 'data-lucide', node: toast });

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => this.remove(toast), duration);
        }

        return toast;
    },

    remove(toast) {
        if (!toast || !toast.parentElement) return;
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    },

    success(title, message) {
        return this.show('success', title, message);
    },

    error(title, message) {
        return this.show('error', title, message, 6000);
    },

    warning(title, message) {
        return this.show('warning', title, message, 5000);
    },

    info(title, message) {
        return this.show('info', title, message);
    }
};
