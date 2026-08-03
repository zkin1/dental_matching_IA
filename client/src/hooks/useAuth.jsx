import { useState, useEffect, createContext, useContext } from 'react';
import { getToken, getUser, setToken, setUser, clearAuth, apiFetch } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(getUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token && getUser()) {
      setUserState(getUser());
    }
    setLoading(false);
  }, []);

  async function login(email, password) {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.data.tokens.accessToken);
    setUser(data.data.user);
    setUserState(data.data.user);
    return data.data.user;
  }

  function logout() {
    clearAuth();
    setUserState(null);
  }

  const isLoggedIn = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoggedIn, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
