import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, logout as logoutAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user on mount by checking /api/auth/me
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await getMe();
        setUser(res.data.user || res.data);
      } catch {
        // Not authenticated or token expired
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);

  const loginUser = (tokenValue, userData) => {
    // With HttpOnly cookies, we don't store token in localStorage
    // Just set the user data
    setUser(userData);
  };

  const logout = async () => {
    try {
      // Call logout API to clear cookies on server
      await logoutAPI();
    } catch (err) {
      // Log out locally even if API call fails
      console.error('Logout API error:', err);
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login: loginUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
