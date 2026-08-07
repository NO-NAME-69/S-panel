/**
 * S Panel - API Client
 * Fetch wrapper with JWT authentication.
 */

const API = {
    baseUrl: '',
    token: localStorage.getItem('spanel_token'),

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('spanel_token', token);
        } else {
            localStorage.removeItem('spanel_token');
        }
    },

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    },

    async request(method, url, data = null, options = {}) {
        const config = {
            method,
            headers: this.getHeaders(),
        };

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        if (options.formData) {
            delete config.headers['Content-Type'];
            config.body = options.formData;
        }

        try {
            const response = await fetch(`${this.baseUrl}${url}`, config);

            if (response.status === 401) {
                if (url === '/api/auth/login') {
                    const result = await response.json();
                    throw new Error(result.detail || 'Invalid username or password');
                } else {
                    this.setToken(null);
                    window.location.hash = '';
                    Auth.showLogin();
                    throw new Error('Session expired. Please login again.');
                }
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.detail || `Request failed with status ${response.status}`);
            }

            return result;
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Unable to connect to server');
            }
            throw error;
        }
    },

    get(url) {
        return this.request('GET', url);
    },

    post(url, data) {
        return this.request('POST', url, data);
    },

    put(url, data) {
        return this.request('PUT', url, data);
    },

    delete(url) {
        return this.request('DELETE', url);
    },

    upload(url, formData) {
        return this.request('POST', url, null, { formData });
    }
};
