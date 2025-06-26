import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import apiClient from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timetableResult, setTimetableResult] = useState(null);

  const checkSession = useCallback(async () => {
    try {
      const response = await apiClient.get('/auth/session');
      setUser(response.data.user);
    } catch (error) { setUser(null); } 
    finally { setLoading(false); }
  }, []);

  useEffect(() => { checkSession(); }, [checkSession]);

  const login = (userData) => setUser(userData);

  const logout = async () => {
    // We don't clear the saved email here, allowing it to persist even after logout.
    // To clear it, uncomment the next line:
    // localStorage.removeItem('rememberedEmail'); 
    await apiClient.post('/auth/logout');
    setUser(null);
    setTimetableResult(null);
  };
  
  const deleteAccount = async () => {
    localStorage.removeItem('rememberedEmail'); // Always clear on delete
    await apiClient.delete('/auth/account');
    setUser(null);
    setTimetableResult(null);
  };

  const value = { user, loading, login, logout, deleteAccount, timetableResult, setTimetableResult };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
