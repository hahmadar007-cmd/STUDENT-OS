'use client';

export const getBackendUrl = (): string => {
  const envVal = process.env.NEXT_PUBLIC_API_URL;
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocal) {
    return envVal || 'http://localhost:3001';
  } else {
    if (!envVal || envVal.includes('localhost') || envVal.includes('127.0.0.1')) {
      return 'https://ammeeee-student-os.hf.space';
    }
    return envVal;
  }
};

const API_URL = getBackendUrl();

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

// Generic api helper accepts optional extraHeaders to inject AI provider keys per-request
async function apiRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  extraHeaders?: Record<string, string>,
) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Legacy fasca_ai_mode support (kept for backwards compat)
  if (typeof window !== 'undefined') {
    const aiMode = localStorage.getItem('fasca_ai_mode') || 'default';
    const aiToken = localStorage.getItem('fasca_ai_token');
    const aiUrl = localStorage.getItem('fasca_ai_url');
    if (aiMode === 'gemini-personal' && aiToken) headers['x-gemini-key'] = aiToken;
    else if (aiMode === 'openai-personal' && aiToken) headers['x-openai-key'] = aiToken;
    else if (aiMode === 'deepseek-personal' && aiToken) headers['x-deepseek-key'] = aiToken;
    else if (aiMode === 'custom' && aiUrl) {
      headers['x-custom-url'] = aiUrl;
      if (aiToken) headers['x-custom-key'] = aiToken;
    }
  }

  // Inject any extra headers (e.g. AI provider keys from AI Control Center)
  if (extraHeaders) {
    Object.assign(headers, extraHeaders);
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

export const forgotPassword = async (email: string) => {
  return apiRequest('/auth/forgot-password', 'POST', { email });
};

export const resetPassword = async (token: string, newPassword: string) => {
  return apiRequest('/auth/reset-password', 'POST', { token, newPassword });
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
  },
  activeEngine?: { name: string; apiKeyRaw: string; baseUrl: string | null }
) => {
  const token = getAuthToken();
  let userId = 'default-user';
  try {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub || userId;
    }
  } catch (e) {}

  // AI Control Center headers from either the in-page engine or stored provider config
  const aiHeaders: Record<string, string> = {};
  let resolvedModel = activeEngine?.name ?? modelName;

  if (activeEngine?.apiKeyRaw) {
    aiHeaders['x-openrouter-key'] = activeEngine.apiKeyRaw;
    if (activeEngine.baseUrl) {
      aiHeaders['x-custom-url'] = activeEngine.baseUrl;
      aiHeaders['x-custom-key'] = activeEngine.apiKeyRaw;
    }
  } else if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('fasca_ai_providers_v1');
      if (raw) {
        const providers: Array<{
          id: string;
          name: string;
          providerType: 'OPENAI' | 'ANTHROPIC' | 'GEMINI' | 'CUSTOM';
          apiKeyRaw: string;
          baseUrl: string | null;
          isActive: boolean;
        }> = JSON.parse(raw);

        const active = providers.find((p) => p.isActive);
        if (active) {
          switch (active.providerType) {
            case 'OPENAI':
              resolvedModel = 'gpt-4o';
              aiHeaders['x-openai-key'] = active.apiKeyRaw;
              break;
            case 'ANTHROPIC':
              resolvedModel = 'claude-3-5-sonnet';
              aiHeaders['x-anthropic-key'] = active.apiKeyRaw;
              break;
            case 'GEMINI':
              resolvedModel = 'gemini-1.5-pro';
              aiHeaders['x-gemini-key'] = active.apiKeyRaw;
              break;
            case 'CUSTOM':
              resolvedModel = 'custom-endpoint';
              aiHeaders['x-custom-key'] = active.apiKeyRaw;
              if (active.baseUrl) aiHeaders['x-custom-url'] = active.baseUrl;
              break;
          }
        }
      }
    } catch (e) {
      // localStorage parse failure — proceed without custom headers
    }
  }

  return apiRequest('/ai/chat', 'POST', {
      userId,
      prompt,
      slideId,
      modelName: resolvedModel,
      ...extraContext,
    }, aiHeaders);
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

export const getPortalStatus = () => apiRequest('/portal/status', 'GET');

export const connectPortal = (portalUrl: string, portalType: string, studentId: string) =>
  apiRequest('/portal/connect', 'PATCH', { portalUrl, portalType, studentId });

export const getPortalProfile = () => apiRequest('/portal/profile', 'GET');

export const savePortalAttendance = (attendance: any[]) =>
  apiRequest('/portal/attendance', 'POST', { attendance });

export const savePortalTranscript = (transcript: any[]) =>
  apiRequest('/portal/transcript', 'POST', { transcript });

export const savePortalGpa = (gpa: number | null, cgpa: number | null, semester: string) =>
  apiRequest('/portal/gpa', 'PATCH', { gpa, cgpa, semester });

export const getDeadlines = (): Promise<LmsDeadlinesResponse> => apiRequest('/lms/deadlines', 'GET');

export interface CourseFile {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface CourseContents {
  courseId: number;
  courseName: string;
  courseShortName: string;
  files: CourseFile[];
}

export interface CourseContentsResponse {
  source: 'live' | 'not-connected' | 'unsupported' | 'error';
  courses: CourseContents[];
}

export interface GradeItem {
  courseId: number;
  courseName: string;
  courseShortName: string;
  gradePercent: number | null;
  letterGrade: string | null;
}

export interface GradesResponse {
  source: 'live' | 'not-connected' | 'unsupported' | 'error';
  grades: GradeItem[];
}

export const getCourseContents = (): Promise<CourseContentsResponse> =>
  apiRequest('/lms/courses/contents', 'GET');

export const getGrades = (): Promise<GradesResponse> =>
  apiRequest('/lms/grades', 'GET');

export interface AssignmentStatusItem {
  id: string;
  title: string;
  course: string;
  courseId: number;
  dueDate: string | null;
  dueDateMs: number | null;
  status: 'submitted' | 'draft' | 'new' | 'overdue';
}

export interface AssignmentsResponse {
  source: 'live' | 'not-connected' | 'unsupported' | 'error';
  assignments: AssignmentStatusItem[];
}

export interface QuizItem {
  id: string;
  title: string;
  course: string;
  courseId: number;
  timeOpen: number | null;
  timeClose: number | null;
  timeLimit: number | null;
  attemptsAllowed: number;
  grade: number | null;
}

export interface QuizzesResponse {
  source: 'live' | 'not-connected' | 'unsupported' | 'error';
  quizzes: QuizItem[];
}

export interface ForumItem {
  id: string;
  forumId: number;
  name: string;
  course: string;
  courseId: number;
  discussionCount: number;
  unreadCount: number;
  type: string;
}

export interface ForumsResponse {
  source: 'live' | 'not-connected' | 'unsupported' | 'error';
  forums: ForumItem[];
}

export const getAssignments = (): Promise<AssignmentsResponse> =>
  apiRequest('/lms/assignments', 'GET');

export const getQuizzes = (): Promise<QuizzesResponse> =>
  apiRequest('/lms/quizzes', 'GET');

export const getForumActivity = (): Promise<ForumsResponse> =>
  apiRequest('/lms/forums', 'GET');

export interface CourseInfo {
  id: number;
  shortname: string;
  fullname: string;
  teacherName: string | null;
}

export interface CoursesResponse {
  source: 'live' | 'not-connected' | 'unsupported' | 'error';
  courses: CourseInfo[];
}

export const getCourses = (): Promise<CoursesResponse> =>
  apiRequest('/lms/courses', 'GET');

// Social & Profile APIs
export const createGroup = (name: string, courseCode?: string) => {
  return apiRequest('/groups', 'POST', { name, courseCode });
};

export const deleteGroup = (groupId: string) => {
  return apiRequest(`/groups/${groupId}`, 'DELETE');
};

export const renameGroup = (groupId: string, name: string) => {
  return apiRequest(`/groups/${groupId}`, 'PATCH', { name });
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

export const getGroupMembers = (groupId: string) => {
  return apiRequest(`/groups/${groupId}/members`, 'GET');
};

export const acceptGroupMember = (groupId: string, userId: string) => {
  return apiRequest(`/groups/${groupId}/members/${userId}/accept`, 'POST');
};

export const rejectGroupMember = (groupId: string, userId: string) => {
  return apiRequest(`/groups/${groupId}/members/${userId}/reject`, 'DELETE');
};

export const webSearch = (query: string): Promise<{ title: string; link: string; snippet: string }[]> => {
  return apiRequest(`/ai/search?q=${encodeURIComponent(query)}`, 'GET');
};

// ─── Shared Group Drive ───────────────────────────────────────────────────────

export interface GroupFileItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: string;
  uploadedBy: string;
  createdAt: string;
  groupId: string;
}

/** Fetch all files for a study circle. */
export const getGroupFiles = (groupId: string): Promise<GroupFileItem[]> => {
  return apiRequest(`/groups/${groupId}/files`, 'GET');
};

/**
 * Upload a file to the shared group drive using XHR so we can report
 * upload progress to the drag-and-drop UI in real time.
 */
export const uploadGroupFile = (
  groupId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ success: boolean; file: GroupFileItem }> => {
  return new Promise((resolve, reject) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/groups/${groupId}/files`, true);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Failed to parse upload response'));
        }
      } else if (xhr.status === 401) {
        clearAuthToken();
        reject(new Error('Unauthorized'));
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.message || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
};

/** Delete a file from the shared group drive. */
export const deleteGroupFile = (groupId: string, fileId: string): Promise<{ success: boolean }> => {
  return apiRequest(`/groups/${groupId}/files/${fileId}`, 'DELETE');
};
