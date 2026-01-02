import { AppUser } from '../types';

const API_BASE_URL = 'http://72.62.149.231/api'; // Changed to production server

interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    roles: string[];
    branches: string[];
    isMfaEnabled: boolean;
  };
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'خطأ في الاتصال' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Authentication
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await this.handleResponse(response);
    this.token = data.token;
    localStorage.setItem('authToken', this.token);
    return data;
  }

  async logout(): Promise<void> {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  // Users
  async getUsers(): Promise<AppUser[]> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async createUser(userData: Omit<AppUser, 'id' | 'createdAt' | 'updatedAt'> & { password: string }): Promise<AppUser> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });
    return this.handleResponse(response);
  }

  async updateUser(userId: string, userData: Partial<AppUser>): Promise<AppUser> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });
    return this.handleResponse(response);
  }

  async deleteUser(userId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    await this.handleResponse(response);
  }

  // Assets
  async getAssets(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/assets`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async createAsset(assetData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/assets`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(assetData),
    });
    return this.handleResponse(response);
  }

  async updateAsset(assetId: string, assetData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(assetData),
    });
    return this.handleResponse(response);
  }

  async deleteAsset(assetId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    await this.handleResponse(response);
  }

  // Tickets
  async getTickets(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/tickets`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async createTicket(ticketData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/tickets`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(ticketData),
    });
    return this.handleResponse(response);
  }

  async updateTicket(ticketId: string, ticketData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(ticketData),
    });
    return this.handleResponse(response);
  }

  // SIM Cards
  async getSimCards(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/simCards`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async createSimCard(simData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/simCards`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(simData),
    });
    return this.handleResponse(response);
  }

  // Subscriptions
  async getSubscriptions(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/subscriptions`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async createSubscription(subData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(subData),
    });
    return this.handleResponse(response);
  }

  // Reports
  async getReports(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/reports`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Audit
  async getAuditLogs(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/audit`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }
}

export const apiService = new ApiService();
export default apiService;