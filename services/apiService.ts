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

  async getCurrentUser(): Promise<AuthResponse['user']> {
    // Read token fresh from localStorage
    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: headers,
    });
    return this.handleResponse(response);
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

  // Upload asset image
  async uploadAssetImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/assets/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        // Don't set Content-Type - let browser set it with boundary
      },
      body: formData,
    });

    const data = await this.handleResponse(response);
    return data.imagePath; // Returns the image path
  }

  // Tickets
  async getTickets(page: number = 1, limit: number = 50, filters?: any): Promise<any> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    
    const response = await fetch(`${API_BASE_URL}/tickets?${params}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }
  
  // Get all tickets (for compatibility - will fetch in batches)
  async getAllTickets(): Promise<any[]> {
    let allTickets: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const result = await this.getTickets(page, 100);
      const tickets = result.tickets || result;
      allTickets = [...allTickets, ...tickets];
      
      if (result.pagination) {
        hasMore = result.pagination.hasMore;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    return allTickets;
  }

  async createTicket(ticketData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/tickets`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(ticketData),
    });
    return this.handleResponse(response);
  }

  async createPublicTicket(ticketData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/tickets/public`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  async deleteTicket(ticketId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    await this.handleResponse(response);
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

  async updateSimCard(id: string, simData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/simCards/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(simData),
    });
    return this.handleResponse(response);
  }

  async deleteSimCard(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/simCards/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    await this.handleResponse(response);
  }

  async deleteSubscription(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/subscriptions/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    await this.handleResponse(response);
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
    const logs = await this.handleResponse(response);
    
    // Transform backend format to frontend format
    return logs.map((log: any) => ({
      id: log.id,
      // Map targetType to specific ID fields
      assetId: log.targetType === 'Asset' ? log.targetId : log.assetId,
      ticketId: log.targetType === 'Ticket' ? log.targetId : log.ticketId,
      subscriptionId: log.targetType === 'Subscription' ? log.targetId : log.subscriptionId,
      simCardId: log.targetType === 'SimCard' ? log.targetId : log.simCardId,
      actionType: log.actionType || log.action, // Support both formats
      details: typeof log.details === 'string' ? log.details : this.formatAuditDetails(log),
      changes: log.changes || this.extractChanges(log.details?.changes),
      timestamp: log.timestamp,
      user: log.user || log.userName || log.userId,
      reason: log.reason || log.details?.reason,
    }));
  }

  async createAuditLog(logData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/audit`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(logData)
    });
    return this.handleResponse(response);
  }

  private formatAuditDetails(log: any): string {
    const { action, details } = log;
    
    // If details is a string, return it directly
    if (typeof details === 'string') {
      return details;
    }
    
    // If no details object, return empty string
    if (!details || typeof details !== 'object') {
      return '';
    }
    
    if (action === 'CREATE') {
      return `تم إنشاء ${details.assetName || details.ticketSubject || details.name || 'عنصر'}`;
    } else if (action === 'UPDATE') {
      const changeCount = details.changes ? Object.keys(details.changes).length : 0;
      return `تم تعديل ${changeCount} حقل/حقول`;
    } else if (action === 'DELETE') {
      return `تم حذف ${details.assetName || details.name || 'عنصر'}`;
    }
    
    return details.description || '';
  }

  private extractChanges(changes: any): any[] | undefined {
    if (!changes) return undefined;
    
    return Object.entries(changes).map(([field, change]: [string, any]) => ({
      fieldName: field,        // Frontend expects 'fieldName'
      oldValue: change.from,   // Frontend expects 'oldValue'
      newValue: change.to,     // Frontend expects 'newValue'
    }));
  }
}

export const apiService = new ApiService();
export default apiService;