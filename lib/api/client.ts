/**
 * API Client for Backend Integration
 * Connects to: https://zing-te-task-zing-backend.vercel.app
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://zing-te-task-zing-backend.vercel.app";

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResponse {
  token: string;
  user: UserData;
  refreshToken?: string;
}

export interface UserData {
  id: string;
  uid?: string;
  email: string;
  username?: string;
  fullName?: string;
  name?: string;
  role?: "client" | "provider" | "both" | "client+provider";
  currentRole?: "client" | "provider" | "both";
  profileCompleted?: boolean;
  providerProfileCompleted?: boolean;
  isAvailableForWork?: boolean;
  location?: string;
  totalRating?: number;
  totalReviews?: number;
  skills?: string[];
  bio?: string;
  about?: string;
  photoUrl?: string;
  profilePicture?: string;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Get the stored auth token
   */
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token");
  }

  /**
   * Store the auth token
   */
  private setToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("auth_token", token);
  }

  /**
   * Remove the auth token
   */
  private removeToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("auth_token");
  }

  /**
   * Make an API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      // Handle 204 No Content (like logout)
      if (response.status === 204) {
        return { data: {} as T };
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          error: data.message || data.error || `HTTP ${response.status}`,
        };
      }

      return { data };
    } catch (error: any) {
      return {
        error: error.message || "Network error occurred",
      };
    }
  }

  /**
   * Auth: Sign up
   */
  async signUp(
    email: string,
    password: string,
    fullName: string,
    role: "client" | "provider" | "client+provider" = "client"
  ): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        fullName,
        name: fullName,
        role,
      }),
    });

    if (response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  /**
   * Auth: Sign in
   */
  async signIn(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  /**
   * Auth: Sign in with Google
   */
  async signInWithGoogle(idToken: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });

    if (response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  /**
   * Auth: Sign in with Apple
   */
  async signInWithApple(idToken: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>("/auth/apple", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });

    if (response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  /**
   * Auth: Logout
   */
  async logout(): Promise<ApiResponse> {
    const response = await this.request("/auth/logout", {
      method: "POST",
    });

    this.removeToken();
    return response;
  }

  /**
   * Auth: Get current user
   */
  async getCurrentUser(): Promise<ApiResponse<UserData>> {
    return this.request<UserData>("/auth/me");
  }

  /**
   * Auth: Refresh token
   */
  async refreshToken(): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>("/auth/refresh", {
      method: "POST",
    });

    if (response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  /**
   * User: Get user data by ID
   */
  async getUserData(userId: string): Promise<ApiResponse<UserData>> {
    return this.request<UserData>(`/users/${userId}`);
  }

  /**
   * User: Update user profile
   */
  async updateUser(userId: string, data: Partial<UserData>): Promise<ApiResponse<UserData>> {
    return this.request<UserData>(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /**
   * Password: Reset password request
   */
  async resetPassword(email: string): Promise<ApiResponse> {
    return this.request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Password: Change password
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse> {
    return this.request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
