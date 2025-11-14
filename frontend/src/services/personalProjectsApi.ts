const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface PersonalProject {
  project_id: number;
  project_uuid: string;
  nom_projet: string;
  description_projet: string;
  created_at: string;
  updated_at: string;
  visibility?: string;
  user_id?: number;
}

export interface CreateProjectRequest {
  nom_projet: string;
  description_projet: string;
  visibility?: 'private' | 'public';
}

export interface UpdateProjectRequest {
  nom_projet?: string;
  description_projet?: string;
}

class PersonalProjectsApi {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('auth_access_token') || undefined;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async createProject(data: CreateProjectRequest): Promise<PersonalProject> {
    const response = await this.request<{ signal: string; project: PersonalProject }>(
      '/personal-projects/',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.project;
  }

  async getProjects(): Promise<PersonalProject[]> {
    const response = await this.request<{ signal: string; projects: PersonalProject[] }>(
      `/personal-projects/`
    );
    return response.projects;
  }

  async getProject(projectId: number): Promise<PersonalProject> {
    const response = await this.request<{ signal: string; project: PersonalProject }>(
      `/personal-projects/${projectId}`
    );
    return response.project;
  }

  async updateProject(projectId: number, data: UpdateProjectRequest): Promise<PersonalProject> {
    const response = await this.request<{ signal: string; project: PersonalProject }>(
      `/personal-projects/${projectId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.project;
  }

  async deleteProject(projectId: number): Promise<void> {
    await this.request<{ signal: string; message: string }>(
      `/personal-projects/${projectId}`,
      {
        method: 'DELETE',
      }
    );
  }

  async getPublicProjects(page: number = 1, pageSize: number = 50): Promise<{
    projects: PersonalProject[];
    total_projects: number;
    total_pages: number;
    page: number;
    page_size: number;
  }> {
    const response = await this.request<{
      signal: string;
      projects: PersonalProject[];
      total_projects: number;
      total_pages: number;
      page: number;
      page_size: number;
    }>(`/personal-projects/public?page=${page}&page_size=${pageSize}`);
    return {
      projects: response.projects,
      total_projects: response.total_projects,
      total_pages: response.total_pages,
      page: response.page,
      page_size: response.page_size,
    };
  }
}

export const personalProjectsApi = new PersonalProjectsApi();
