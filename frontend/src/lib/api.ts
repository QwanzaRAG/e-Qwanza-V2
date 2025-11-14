export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export class ApiClient {
  private baseUrl: string;
  private projectId: number;
  private authToken?: string;
  private refreshToken?: string;
  private onTokenRefresh?: (newToken: string) => void;

  constructor(baseUrl: string = DEFAULT_BASE_URL, projectId: number = 1) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.projectId = projectId;
  }

  setProjectId(projectId: number) {
    this.projectId = projectId;
  }

  setAuthToken(token?: string) {
    this.authToken = token;
  }

  setRefreshToken(token?: string) {
    this.refreshToken = token;
  }

  setOnTokenRefresh(callback: (newToken: string) => void) {
    this.onTokenRefresh = callback;
  }

  getProjectId() {
    return this.projectId;
  }

  private async request<T>(path: string, init?: RequestInit, retryCount = 0): Promise<ApiResult<T>> {
    try {
      const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
      if (this.authToken) headers["Authorization"] = `Bearer ${this.authToken}`;
      const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
      const contentType = res.headers.get("content-type");
      const body = contentType && contentType.includes("application/json") ? await res.json() : await res.text();
      
      // Si 401 et on a un refresh token, essayer de renouveler
      
      /*
      if (!res.ok && res.status === 401 && this.refreshToken && retryCount === 0) {
        const refreshResult = await this.refreshAccessToken();
        if (refreshResult.ok) {
          // Retry la requête originale avec le nouveau token
          return this.request(path, init, retryCount + 1);
        } else {
          // Refresh échoué, déconnecter l'utilisateur
          this.onTokenRefresh?.("");
          return { ok: false, error: "Session expirée", status: 401 };
        }
      }
        */
      
      if (!res.ok) {
        let message = "Erreur inconnue";
        if (typeof body === "string") {
          message = body;
        } else if (body) {
          // Le backend peut retourner soit {signal: "..."} soit {message: "..."}
          message = body.signal || body.message || JSON.stringify(body);
        }
        return { ok: false, error: message, status: res.status };
      }
      return { ok: true, data: body as T };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Network error" };
    }
  }

  private async refreshAccessToken(): Promise<ApiResult<{ access_token: string }>> {
    if (!this.refreshToken) {
      return { ok: false, error: "No refresh token" };
    }
    
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
      
      const contentType = res.headers.get("content-type");
      const body = contentType && contentType.includes("application/json") ? await res.json() : await res.text();
      
      if (!res.ok) {
        let message = "Erreur inconnue";
        if (typeof body === "string") {
          message = body;
        } else if (body) {
          // Le backend peut retourner soit {signal: "..."} soit {message: "..."}
          message = body.signal || body.message || JSON.stringify(body);
        }
        return { ok: false, error: message, status: res.status };
      }
      
      const result: ApiResult<{ access_token: string }> = { ok: true, data: body as { access_token: string } };
      this.authToken = result.data.access_token;
      this.onTokenRefresh?.(result.data.access_token);
      return result;
    } catch (e: any) {
      return { ok: false, error: e?.message || "Network error" };
    }
  }

  // Files upload
  async uploadFile(file: File): Promise<ApiResult<{ signal: string; file_id: string; asset_name: string }>> {
    const form = new FormData();
    form.append("file", file);
    return this.request(`/api/v1/data/upload/${this.projectId}`, {
      method: "POST",
      body: form,
    });
  }

  // Process chunks (optionally for a specific file_id)
  async processFiles(params: { chunk_size: number; overlap_size: number; do_reset?: number; file_id?: string }): Promise<ApiResult<{ signal: string; inserted_chunks: number; processed_files: number }>> {
    return this.request(`/api/v1/data/process/${this.projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, do_reset: params.do_reset ?? 0 }),
    });
  }

  // Push to vector index
  async pushToIndex(params: { do_reset?: boolean }): Promise<ApiResult<{ signal: string; inserted_items_count: number }>> {
    return this.request(`/api/v1/nlp/index/push/${this.projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ do_reset: params.do_reset ?? false }),
    });
  }

  // Answer RAG
  async answer(params: { text: string; limit?: number }): Promise<ApiResult<{ signal: string; answer: string; full_prompt: string; chat_history: any }>> {
    return this.request(`/api/v1/nlp/index/answer/${this.projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: params.text, limit: params.limit ?? 10 }),
    });
  }

  // List assets for current project
  async listAssets(): Promise<ApiResult<{ signal: string; assets: { asset_id: number; asset_name: string; asset_size: number; created_at?: string }[] }>> {
    return this.request(`/api/v1/data/assets/${this.projectId}`);
  }

  // Delete asset by name
  async deleteAsset(assetName: string): Promise<ApiResult<{ signal: string; asset_name: string }>> {
    return this.request(`/api/v1/data/asset/${this.projectId}/${encodeURIComponent(assetName)}` , {
      method: "DELETE",
    });
  }

  // Conversations API
  async createConversation(title: string, description?: string, userId?: number): Promise<ApiResult<{ conversation_id: number }>> {
    // Si userId n'est pas fourni, essayer de le récupérer depuis le token JWT
    let actualUserId = userId;
    if (!actualUserId && this.authToken) {
      try {
        const tokenPayload = JSON.parse(atob(this.authToken.split('.')[1]));
        actualUserId = parseInt(tokenPayload.sub);
      } catch (error) {
        console.error('Erreur lors du décodage du token pour récupérer l\'ID utilisateur:', error);
        actualUserId = 1; // Fallback
      }
    }
    
    return this.request(`/api/v1/conversations/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_title: title,
        conversation_description: description,
        conversation_project_id: this.projectId,
        conversation_user_id: actualUserId || 1,
      }),
    });
  }

  async getConversation(conversationId: number): Promise<ApiResult<{ conversation_id: number; conversation_title: string; conversation_description: string; conversation_user_id: number }>> {
    return this.request(`/api/v1/conversations/${conversationId}`);
  }

  async listConversations(page: number = 1, pageSize: number = 20): Promise<ApiResult<{ conversation_id: number; conversation_title: string; conversation_description: string; conversation_project_id: number; conversation_user_id: number }[]>> {
    return this.request(`/api/v1/conversations/?page=${page}&page_size=${pageSize}&project_id=${this.projectId}`);
  }

  async updateConversation(conversationId: number, title?: string, description?: string): Promise<ApiResult<{ conversation_id: number }>> {
    return this.request(`/api/v1/conversations/${conversationId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_title: title,
        conversation_description: description,
      }),
    });
  }

  async deleteConversation(conversationId: number): Promise<ApiResult<null>> {
    return this.request(`/api/v1/conversations/${conversationId}`, {
      method: "DELETE",
    });
  }

  // Messages API
  async createMessage(content: string, sender: string, conversationId: number, userId?: number): Promise<ApiResult<{ message_id: number }>> {
    // Si userId n'est pas fourni, essayer de le récupérer depuis le token JWT
    let actualUserId = userId;
    if (!actualUserId && this.authToken) {
      try {
        const tokenPayload = JSON.parse(atob(this.authToken.split('.')[1]));
        actualUserId = parseInt(tokenPayload.sub);
      } catch (error) {
        console.error('Erreur lors du décodage du token pour récupérer l\'ID utilisateur:', error);
        actualUserId = 1; // Fallback
      }
    }
    
    return this.request(`/api/v1/messages/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message_content: content,
        message_sender: sender,
        message_conversation_id: conversationId,
        message_user_id: actualUserId || 1,
      }),
    });
  }

  async getMessage(messageId: number): Promise<ApiResult<{ message_id: number; message_content: string; message_sender: string; message_conversation_id: number; message_user_id: number }>> {
    return this.request(`/api/v1/messages/${messageId}`);
  }

  async listMessages(conversationId?: number, page: number = 1, pageSize: number = 50): Promise<ApiResult<{ message_id: number; message_content: string; message_sender: string; message_conversation_id: number; message_user_id: number }[]>> {
    const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() });
    if (conversationId) params.append('conversation_id', conversationId.toString());
    return this.request(`/api/v1/messages/?${params.toString()}`);
  }

  async updateMessage(messageId: number, content?: string, sender?: string): Promise<ApiResult<{ message_id: number }>> {
    return this.request(`/api/v1/messages/${messageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message_content: content,
        message_sender: sender,
      }),
    });
  }

  // Auth API
  async register(payload: { first_name: string; last_name: string; email: string; password: string; role?: string }): Promise<ApiResult<{ user_id: number; email: string; access_token: string; refresh_token: string }>> {
    return this.request(`/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async login(payload: { email: string; password: string }): Promise<ApiResult<{ access_token: string; refresh_token: string }>> {
    return this.request(`/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async refreshTokenApi(refresh_token: string): Promise<ApiResult<{ access_token: string }>> {
    return this.request(`/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });
  }

  async verifyEmail(token: string): Promise<ApiResult<{ message: string }>> {
    return this.request(`/api/v1/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  }

  async resendVerification(email: string): Promise<ApiResult<{ message: string }>> {
    return this.request(`/api/v1/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  }

  async forgotPassword(email: string): Promise<ApiResult<{ message: string }>> {
    return this.request(`/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, new_password: string): Promise<ApiResult<{ message: string }>> {
    return this.request(`/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password }),
    });
  }

  // Users API (admin)
  async listUsers(page: number = 1, pageSize: number = 50): Promise<ApiResult<{ user_id: number; first_name: string; last_name: string; email: string; user_role: string }[]>> {
    return this.request(`/api/v1/users/?page=${page}&page_size=${pageSize}`);
  }

  async createUser(payload: { first_name: string; last_name: string; email: string; password: string; user_role?: string }): Promise<ApiResult<{ user_id: number; email: string }>> {
    return this.request(`/api/v1/users/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async deleteUser(userId: number): Promise<ApiResult<null>> {
    return this.request(`/api/v1/users/${userId}`, {
      method: "DELETE",
    });
  }

  // Projects (admin)
  async listAllProjects(page: number = 1, pageSize: number = 50): Promise<ApiResult<{ project_id: number; project_uuid: string; nom_projet: string; description_projet: string; user_id: number; created_at?: string; updated_at?: string }[]>> {
    return this.request(`/api/v1/projects/?page=${page}&page_size=${pageSize}`);
  }

  // Maturity Analysis
  async analyzeMaturityExcel(file: File, mode?: "devsecops" | "architecture"): Promise<ApiResult<{
    global_score: number;
    total_axes: number;
    axes_analysis: Array<{
      name: string;
      definition: string;
      average_score: number;
      max_score: number;
      questions_count: number;
    }>;
    improvement_opportunities: Array<{
      axis_name: string;
      axis_definition: string;
      question: string;
      current_response: string;
      current_score: number;
      next_level_response: string;
      next_level_score: number;
      improvement_gap: number;
    }>;
    recommendations: {
      short_term: Array<{
        axis_name: string;
        question: string;
        current_situation: string;
        target_situation: string;
        recommendation: string;
        timeline: string;
        priority: string;
      }>;
      medium_term: Array<{
        axis_name: string;
        question: string;
        current_situation: string;
        target_situation: string;
        recommendation: string;
        timeline: string;
        priority: string;
      }>;
      long_term: Array<{
        axis_name: string;
        question: string;
        current_situation: string;
        target_situation: string;
        recommendation: string;
        timeline: string;
        priority: string;
      }>;
    };
  }>> {
    const formData = new FormData();
    formData.append('file', file);
    const qs = mode ? `?type=${encodeURIComponent(mode)}` : '';
    const res = await fetch(`${this.baseUrl}/api/v1/maturity/analyze${qs}`, {
      method: 'POST',
      headers: this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {},
      body: formData,
    });
    try {
      if (!res.ok) {
        const txt = await res.text();
        let msg = txt;
        try { msg = JSON.parse(txt)?.error || txt; } catch {}
        return { ok: false, error: msg, status: res.status } as ApiResult<any>;
      }
      const data = await res.json();
      return { ok: true, data: data.data } as ApiResult<any>;
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Erreur réseau' } as ApiResult<any>;
    }
  }
}

// export const apiClient = new ApiClient();
// export const apiClient = new ApiClient(DEFAULT_BASE_URL, 3); // Utilise project_id = 3
// Clients pour chaque mode
export const enterpriseApiClient = new ApiClient(DEFAULT_BASE_URL, 1); // Mode Entreprise
export const personalApiClient = new ApiClient(DEFAULT_BASE_URL, 2);   // Mode Personnel

