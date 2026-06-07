'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const getAuthToken = (): string => {
  if (typeof window === 'undefined') return '';
  
  // 1. Read from cookie
  const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
  if (match) return decodeURIComponent(match[1]);
  
  // 2. Read from localStorage fallback
  return localStorage.getItem('token') || '';
};

export const setAuthToken = (token: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
  // Set cookie for 7 days
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax${secure}`;
};

export const clearAuthToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
};

// Generic api helper
async function apiRequest(endpoint: string, method: string = 'GET', body?: any) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Inject linked personal AI account connection credentials
  if (typeof window !== 'undefined') {
    const aiMode = localStorage.getItem('fasca_ai_mode') || 'default';
    const aiToken = localStorage.getItem('fasca_ai_token');
    const aiUrl = localStorage.getItem('fasca_ai_url');

    if (aiMode === 'gemini-personal' && aiToken) {
      headers['x-gemini-key'] = aiToken;
    } else if (aiMode === 'openai-personal' && aiToken) {
      headers['x-openai-key'] = aiToken;
    } else if (aiMode === 'deepseek-personal' && aiToken) {
      headers['x-deepseek-key'] = aiToken;
    } else if (aiMode === 'custom' && aiUrl) {
      headers['x-custom-url'] = aiUrl;
      if (aiToken) {
        headers['x-custom-key'] = aiToken;
      }
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    clearAuthToken();
    if (typeof window !== 'undefined' && window.location.pathname !== '/auth') {
      window.location.href = '/auth';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'API request failed');
  }

  return response.json();
}

// Client Endpoints
export const register = async (email: string, name: string, universityName: string, password?: string) => {
  const data = await apiRequest('/auth/register', 'POST', { email, name, universityName, password });
  if (data.accessToken) {
    setAuthToken(data.accessToken);
  }
  return data;
};

export const login = async (email: string, password?: string) => {
  const data = await apiRequest('/auth/login', 'POST', { email, password });
  if (data.accessToken) {
    setAuthToken(data.accessToken);
  }
  return data;
};

export const getMe = () => apiRequest('/users/me', 'GET');

export const getMyGroups = () => apiRequest('/groups', 'GET');

export const getPersonalSanctuary = () => apiRequest('/sanctuary', 'GET');

export const getGroupMessages = (groupId: string) => apiRequest(`/groups/${groupId}/messages`, 'GET');

export const askAi = (
  prompt: string,
  slideId: string | null,
  modelName: string,
  extraContext?: {
    currentSlideText?: string;
    videoUrl?: string;
    videoTimestamp?: number;
    courseId?: string;
  }
) => {
  // Try to read decoded user info or fallback
  const token = getAuthToken();
  let userId = 'default-user';
  try {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub || userId;
    }
  } catch (e) {}

  return apiRequest('/ai/chat', 'POST', {
    userId,
    prompt,
    slideId,
    modelName,
    ...extraContext
  });
};

export const indexDocument = (
  courseId: string,
  documentId: string,
  chunks: { text: string; pageNum: number }[]
) => {
  return apiRequest('/ai/index-document', 'POST', {
    courseId,
    documentId,
    chunks: JSON.stringify(chunks)
  });
};

export const indexDocumentFile = (
  courseId: string,
  documentId: string,
  fileBlob: Blob,
  fileName: string
) => {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const formData = new FormData();
  formData.append('courseId', courseId);
  formData.append('documentId', documentId);
  formData.append('file', fileBlob, fileName);

  return fetch(`${API_URL}/ai/index-document`, {
    method: 'POST',
    headers,
    body: formData
  }).then((res) => {
    if (!res.ok) throw new Error('Failed to index document file');
    return res.json();
  });
};

export const updateFocusState = (isFocusing: boolean) => {
  return apiRequest('/users/focus', 'POST', { isFocusing });
};

export const connectLms = (lmsType: string, url: string, token: string) => {
  return apiRequest('/lms/connect', 'POST', { lmsType, url, token });
};

export interface LmsDeadlineItem {
  id: string;
  course: string;
  title: string;
  timeLeftHours: number;
  timeLeftLabel: string;
}

export interface LmsDeadlinesResponse {
  source: 'live' | 'demo' | 'error';
  connected: boolean;
  provider: string | null;
  message?: string;
  error?: string;
  deadlines: LmsDeadlineItem[];
}

export const patchLmsToken = (token: string, baseUrl: string, lmsProvider: 'moodle' | 'canvas' = 'moodle') => {
  return apiRequest('/lms/token', 'PATCH', { token, baseUrl, lmsProvider });
};

export const getLmsStatus = () => apiRequest('/lms/status', 'GET');

export const getDeadlines = (): Promise<LmsDeadlinesResponse> => apiRequest('/lms/deadlines', 'GET');

// Social & Profile APIs
export const createGroup = (name: string, courseCode?: string) => {
  return apiRequest('/groups', 'POST', { name, courseCode });
};

export const updateProfile = (details: { name?: string; email?: string; preferredAiModel?: string; avatarUrl?: string }) => {
  return apiRequest('/users/me', 'PATCH', details);
};

export const getFriends = () => apiRequest('/social/friends', 'GET');

export const getFriendRequests = () => apiRequest('/social/friends/requests', 'GET');

export const sendFriendRequest = (connectionId: string) => {
  return apiRequest('/social/friends/request', 'POST', { connectionId });
};

export const acceptFriendRequest = (requestId: string) => {
  return apiRequest('/social/friends/accept', 'POST', { requestId });
};

export const rejectFriendRequest = (requestId: string) => {
  return apiRequest('/social/friends/reject', 'POST', { requestId });
};

export const removeFriend = (friendId: string) => {
  return apiRequest(`/social/friends/${friendId}`, 'DELETE');
};

export const inviteMemberToGroup = (groupId: string, connectionId: string) => {
  return apiRequest(`/groups/${groupId}/members`, 'POST', { connectionId });
};
