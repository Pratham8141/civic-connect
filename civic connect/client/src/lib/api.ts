// API client functions for the civic grievance platform

const API_BASE_URL = '/api';

// Authentication API
export interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  municipality: string;
  type: 'citizen' | 'admin';
  department?: string;
  createdAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  email?: string;
  phone?: string;
  municipality: string;
  type?: 'citizen' | 'admin';
  department?: string;
}

export interface Grievance {
  id: string;
  title: string;
  description: string;
  category: string;
  municipality: string;
  location?: string;
  authorId: string;
  authorUsername: string;
  timestamp: string;
  upvotes: number;
  downvotes: number;
  status: 'pending' | 'urgent' | 'in-progress' | 'resolved' | 'closed';
  imageUrl?: string;
  updatedAt: string;
  userVote?: 'up' | 'down' | null;
}

export interface Comment {
  id: string;
  grievanceId: string;
  authorId: string;
  authorUsername: string;
  text: string;
  timestamp: string;
  upvotes: number;
  userVote?: 'up' | 'down' | null;
}

export interface CreateGrievanceData {
  title: string;
  description: string;
  category: string;
  municipality: string;
  location?: string;
  status?: 'pending' | 'urgent';
  imageUrl?: string;
}

export interface GrievanceFilters {
  category?: string;
  municipality?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  limit?: number;
  offset?: number;
}

// API client class
class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for session management
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'An error occurred' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<{ user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(data: RegisterData): Promise<{ user: User }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<{ message: string }> {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request('/auth/me');
  }

  // Grievance methods
  async getGrievances(filters?: GrievanceFilters): Promise<{ grievances: Grievance[], total: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const query = params.toString();
    return this.request(`/grievances${query ? `?${query}` : ''}`);
  }

  async getGrievance(id: string): Promise<Grievance> {
    return this.request(`/grievances/${id}`);
  }

  async createGrievance(data: CreateGrievanceData): Promise<Grievance> {
    return this.request('/grievances', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGrievance(id: string, updates: Partial<Grievance>): Promise<Grievance> {
    return this.request(`/grievances/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteGrievance(id: string): Promise<{ message: string }> {
    return this.request(`/grievances/${id}`, {
      method: 'DELETE',
    });
  }

  async voteOnGrievance(id: string, voteType: 'up' | 'down'): Promise<{
    upvotes: number;
    downvotes: number;
    userVote: 'up' | 'down' | null;
  }> {
    return this.request(`/grievances/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ voteType }),
    });
  }

  // Comment methods
  async getComments(grievanceId: string): Promise<Comment[]> {
    return this.request(`/grievances/${grievanceId}/comments`);
  }

  async createComment(grievanceId: string, text: string): Promise<Comment> {
    return this.request(`/grievances/${grievanceId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async updateComment(id: string, text: string): Promise<Comment> {
    return this.request(`/comments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ text }),
    });
  }

  async deleteComment(id: string): Promise<{ message: string }> {
    return this.request(`/comments/${id}`, {
      method: 'DELETE',
    });
  }

  async voteOnComment(id: string, voteType: 'up' | 'down'): Promise<{
    userVote: 'up' | 'down' | null;
  }> {
    return this.request(`/comments/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ voteType }),
    });
  }

  // File upload methods
  async uploadImage(file: File): Promise<{
    imageUrl: string;
    filename: string;
    originalName: string;
    size: number;
  }> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Department methods
  async getDepartments(municipality?: string): Promise<any[]> {
    const query = municipality ? `?municipality=${municipality}` : '';
    return this.request(`/departments${query}`);
  }

  // Analytics methods
  async getGrievanceStats(municipality?: string): Promise<{
    total: number;
    pending: number;
    urgent: number;
    inProgress: number;
    resolved: number;
  }> {
    const query = municipality ? `?municipality=${municipality}` : '';
    return this.request(`/analytics/stats${query}`);
  }
}

export const api = new ApiClient();