const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('dental_token');
}

function setToken(token) {
  localStorage.setItem('dental_token', token);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('dental_user'));
  } catch {
    return null;
  }
}

function setUser(user) {
  localStorage.setItem('dental_user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('dental_token');
  localStorage.removeItem('dental_user');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
    window.location.reload();
    throw new Error('Sesion expirada');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Error en la solicitud');
  }
  return data;
}

export {
  apiFetch,
  getToken,
  setToken,
  getUser,
  setUser,
  clearAuth,
};
