const API_BASE = '/api';

export function getStoredTokens() {
  return {
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
  };
}

export function setStoredTokens(accessToken, refreshToken) {
  if (accessToken) localStorage.setItem('accessToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
}

export function clearStoredTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

export async function apiRequest(endpoint, options = {}) {
  const { accessToken, refreshToken } = getStoredTokens();
  const headers = { ...options.headers };

  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 token refresh if refreshToken is available
  if (res.status === 401 && refreshToken && !endpoint.includes('/auth/')) {
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setStoredTokens(data.accessToken, data.refreshToken);
        headers.Authorization = `Bearer ${data.accessToken}`;
        res = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
        });
      } else {
        clearStoredTokens();
        window.dispatchEvent(new Event('auth:expired'));
      }
    } catch {
      clearStoredTokens();
      window.dispatchEvent(new Event('auth:expired'));
    }
  }

  if (!res.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errJson = await res.json();
      errorMsg = errJson.message || errorMsg;
    } catch {
      errorMsg = res.statusText || errorMsg;
    }
    const error = new Error(errorMsg);
    error.status = res.status;
    throw error;
  }

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res;
}

export async function downloadFileBlob(fileId, originalName) {
  const { accessToken } = getStoredTokens();
  const headers = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}/files/${fileId}/download`, { headers });
  if (!res.ok) {
    let errMessage = 'Download failed';
    try {
      const errJson = await res.json();
      errMessage = errJson.message || errMessage;
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = originalName || 'downloaded-file';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export const api = {
  // Auth
  register: (data) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => apiRequest('/auth/me'),

  // Rooms
  listRooms: () => apiRequest('/rooms'),
  createRoom: (name) => apiRequest('/rooms', { method: 'POST', body: JSON.stringify({ name }) }),
  getRoom: (roomId) => apiRequest(`/rooms/${roomId}`),
  updateRoom: (roomId, name) => apiRequest(`/rooms/${roomId}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  deleteRoom: (roomId) => apiRequest(`/rooms/${roomId}`, { method: 'DELETE' }),

  // Room Invites & Members
  inviteMember: (roomId, email, role) =>
    apiRequest(`/rooms/${roomId}/invites`, { method: 'POST', body: JSON.stringify({ email, role }) }),
  listRoomInvites: (roomId) => apiRequest(`/rooms/${roomId}/invites`),
  changeMemberRole: (roomId, userId, role) =>
    apiRequest(`/rooms/${roomId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeMember: (roomId, userId) => apiRequest(`/rooms/${roomId}/members/${userId}`, { method: 'DELETE' }),

  // User Invites
  getMyInvites: () => apiRequest('/invites/mine'),
  acceptInvite: (inviteId) => apiRequest(`/invites/${inviteId}/accept`, { method: 'POST' }),
  declineInvite: (inviteId) => apiRequest(`/invites/${inviteId}/decline`, { method: 'POST' }),

  // Files
  listFiles: (roomId) => apiRequest(`/rooms/${roomId}/files`),
  uploadFile: (roomId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest(`/rooms/${roomId}/files`, { method: 'POST', body: formData });
  },
  deleteFile: (fileId) => apiRequest(`/files/${fileId}`, { method: 'DELETE' }),
  getFileAccess: (fileId) => apiRequest(`/files/${fileId}/access`),
  grantFileAccess: (fileId, email, role) =>
    apiRequest(`/files/${fileId}/access`, { method: 'POST', body: JSON.stringify({ email, role }) }),
  revokeFileAccess: (fileId, email) =>
    apiRequest(`/files/${fileId}/access/${encodeURIComponent(email)}`, { method: 'DELETE' }),
  getFileActivity: (fileId) => apiRequest(`/files/${fileId}/activity`),
  convertFileToText: (fileId) => apiRequest(`/files/${fileId}/convert-to-text`, { method: 'POST' }),

  // Direct authenticated download
  downloadFileBlob,
  downloadFileUrl: (fileId) => `/api/files/${fileId}/download`,

  // Share Links
  createShareLink: (fileId, data) =>
    apiRequest(`/files/${fileId}/links`, { method: 'POST', body: JSON.stringify(data) }),
  listFileLinks: (fileId) => apiRequest(`/files/${fileId}/links`),
  revokeShareLink: (linkId) => apiRequest(`/links/${linkId}/revoke`, { method: 'PATCH' }),
  listAllLinks: (params = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') search.append(k, v);
    });
    return apiRequest(`/links?${search.toString()}`);
  },

  // Public Link Resolver, Read & Download
  resolvePublicLink: (code) => apiRequest(`/s/${code}`),
  readPublicLinkContent: (code, password) => {
    if (password) {
      return apiRequest(`/s/${code}/read`, { method: 'POST', body: JSON.stringify({ password }) });
    }
    return apiRequest(`/s/${code}/read`);
  },
  savePublicLinkContent: (code, content, password) => {
    return apiRequest(`/s/${code}/save`, {
      method: 'POST',
      body: JSON.stringify({ content, password }),
    });
  },
  downloadPublicLinkUrl: (code) => `/api/s/${code}/download`,

  // Notifications & Tracking
  listNotifications: () => apiRequest('/notifications'),
  markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => apiRequest('/notifications/read-all', { method: 'PATCH' }),

  // Dashboard Analytics
  getDashboard: (days = 14) => apiRequest(`/dashboard?days=${days}`),
};
