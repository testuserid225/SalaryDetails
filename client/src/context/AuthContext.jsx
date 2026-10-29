import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      if (res.success) {
        setUser(res.user);
        setProfile(res.profile);
      } else {
        api.setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.warn('Authentication token invalid or expired');
      api.setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();

    // Listen for auth expiration events from api interceptor
    const handleExpired = () => {
      setUser(null);
      setProfile(null);
    };

    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [loadUser]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.token) {
      api.setToken(res.token);
      setUser(res.user);
      await loadUser();
    }
    return res;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    if (res.success && res.token) {
      api.setToken(res.token);
      setUser(res.user);
      await loadUser();
    }
    return res;
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    setProfile(null);
  };

  const seedDemoData = async () => {
    const res = await api.post('/auth/seed-demo', {});
    await loadUser();
    return res;
  };

  const updateCredentials = async ({ email, password, name }) => {
    const res = await api.put('/auth/credentials', { email, password, name });
    if (res.success) {
      if (res.token) {
        api.setToken(res.token);
      }
      if (res.user) {
        setUser(res.user);
      }
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        loadUser,
        updateCredentials,
        seedDemoData,
        setProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
