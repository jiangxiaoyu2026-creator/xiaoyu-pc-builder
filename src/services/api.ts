const API_BASE = '/api';

// 确保 endpoint 以 / 结尾（用于 POST 请求） - 被移除，因为 FastAPI 路由参数不兼容多余斜杠

export class ApiService {
    private static clearAuthState() {
        try {
            localStorage.removeItem('xiaoyu_token');
            localStorage.removeItem('xiaoyu_user');
            localStorage.removeItem('xiaoyu_current_user');
        } catch { /* localStorage not available */ }

        try {
            window.dispatchEvent(new Event('xiaoyu-auth-expired'));
        } catch { /* window not available */ }
    }

    private static async handleResponse(response: Response) {
        if (response.status === 401 || response.status === 403) {
            this.clearAuthState();
        }

        if (!response.ok) {
            let message = response.statusText;
            try {
                const data = await response.clone().json();
                message = data.detail || data.message || message;
            } catch { /* response body is not JSON */ }
            throw new Error(`API Error ${response.status}: ${message}`);
        }

        return response.json();
    }

    private static safeGetToken(): string | null {
        try {
            return localStorage.getItem('xiaoyu_token');
        } catch {
            return null;
        }
    }

    private static getHeaders() {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        const token = this.safeGetToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    static async get(endpoint: string) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    static async post(endpoint: string, data: any) {
        const url = `${API_BASE}${endpoint}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(response);
    }

    static async postFile(endpoint: string, formData: FormData) {
        const url = `${API_BASE}${endpoint}`;
        const token = this.safeGetToken();
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: formData
        });
        return this.handleResponse(response);
    }

    static async login(form_data: { username: string, password: string }) {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form_data)
        });

        const result = await this.handleResponse(response);
        if (result.access_token) {
            try {
                localStorage.setItem('xiaoyu_token', result.access_token);
                localStorage.setItem('xiaoyu_user', JSON.stringify(result.user));
            } catch { /* localStorage not available */ }
        }
        return result;
    }

    static async logout() {
        try {
            localStorage.removeItem('xiaoyu_token');
            localStorage.removeItem('xiaoyu_user');
            localStorage.removeItem('xiaoyu_current_user');
        } catch { /* localStorage not available */ }
    }

    static async delete(endpoint: string) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    static async put(endpoint: string, data: any) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(response);
    }
}
