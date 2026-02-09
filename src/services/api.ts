const API_BASE = '/api';

export class ApiService {
    static async get(endpoint: string) {
        const response = await fetch(`${API_BASE}${endpoint}`);
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return response.json();
    }

    static async post(endpoint: string, data: any) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return response.json();
    }

    static async delete(endpoint: string) {
        const response = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        return response.json();
    }
}
