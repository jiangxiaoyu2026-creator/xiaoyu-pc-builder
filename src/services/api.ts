const API_BASE = '/api';

// 确保 endpoint 以 / 结尾（用于 POST 请求） - 被移除，因为 FastAPI 路由参数不兼容多余斜杠

export class ApiService {
    private static getHeaders() {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        const token = localStorage.getItem('xiaoyu_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    static async get(endpoint: string) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return response.json();
    }

    static async post(endpoint: string, data: any) {
        const url = `${API_BASE}${endpoint}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return response.json();
    }

    static async login(form_data: { username: string, password: string }) {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form_data)
        });
        if (!response.ok) throw new Error(`Login failed: ${response.statusText}`);

        const result = await response.json();
        if (result.access_token) {
            localStorage.setItem('xiaoyu_token', result.access_token);
            localStorage.setItem('xiaoyu_user', JSON.stringify(result.user));
        }
        return result;
    }

    static async logout() {
        localStorage.removeItem('xiaoyu_token');
        localStorage.removeItem('xiaoyu_user');
    }

    static async delete(endpoint: string) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return response.json();
    }

    static async put(endpoint: string, data: any) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return response.json();
    }
}
