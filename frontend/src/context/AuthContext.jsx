import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
const apiClient = axios.create({ baseURL: '/', withCredentials: true });
const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const checkSession = useCallback(async () => {
    try {
      const response = await apiClient.get('/auth/session');
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    checkSession();
  }, [checkSession]);
  const login = (userData) => setUser(userData);
  const logout = async () => { await apiClient.post('/auth/logout'); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
