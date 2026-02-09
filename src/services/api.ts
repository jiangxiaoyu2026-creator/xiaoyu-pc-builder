const API_BASE = '/api';

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
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return response.json();
    }

    static async login(form_data: { username: string, password: string }) {
        // FastAPI OAuth2PasswordRequestForm expects multipart/form-data or x-www-form-urlencoded
        const body = new URLSearchParams();
        body.append('username', form_data.username);
        body.append('password', form_data.password);

        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
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
}
