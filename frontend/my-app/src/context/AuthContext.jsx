import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getStoredTokens, setStoredTokens, clearStoredTokens } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      const { accessToken } = getStoredTokens();
      if (!accessToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.getMe();
        setUser(res.user);
        localStorage.setItem('user', JSON.stringify(res.user));
      } catch {
        clearStoredTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadSession();

    const handleAuthExpired = () => {
      setUser(null);
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    setStoredTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  };

  const register = async (name, email, password) => {
    const data = await api.register({ name, email, password });
    setStoredTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  };

  const logout = () => {
    clearStoredTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
