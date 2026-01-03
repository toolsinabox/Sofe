import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [storeId, setStoreId] = useState(null);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedStoreId = localStorage.getItem('store_id');
    const storedStore = localStorage.getItem('platform_store');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      
      // Set default auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    
    // Set store context
    if (storedStoreId) {
      setStoreId(storedStoreId);
      axios.defaults.headers.common['X-Store-ID'] = storedStoreId;
    }
    
    if (storedStore) {
      try {
        const storeData = JSON.parse(storedStore);
        setStore(storeData);
        if (storeData.id && !storedStoreId) {
          setStoreId(storeData.id);
          localStorage.setItem('store_id', storeData.id);
          axios.defaults.headers.common['X-Store-ID'] = storeData.id;
        }
      } catch (e) {
        console.error('Failed to parse stored store data');
      }
    }
    
    setLoading(false);
  }, []);

  const login = (accessToken, userData, storeData = null) => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    
    // If store data provided (from platform login), set it
    if (storeData) {
      setStore(storeData);
      setStoreId(storeData.id);
      localStorage.setItem('platform_store', JSON.stringify(storeData));
      localStorage.setItem('store_id', storeData.id);
      axios.defaults.headers.common['X-Store-ID'] = storeData.id;
    }
  };

  const setCurrentStore = (storeData) => {
    setStore(storeData);
    setStoreId(storeData.id);
    localStorage.setItem('platform_store', JSON.stringify(storeData));
    localStorage.setItem('store_id', storeData.id);
    axios.defaults.headers.common['X-Store-ID'] = storeData.id;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('store_id');
    localStorage.removeItem('platform_store');
    localStorage.removeItem('platform_token');
    localStorage.removeItem('platform_owner');
    localStorage.removeItem('platform_stores');
    setToken(null);
    setUser(null);
    setStoreId(null);
    setStore(null);
    delete axios.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['X-Store-ID'];
  };

  const isAuthenticated = !!token;
  const isAdmin = user?.role === 'admin';
  const isMerchant = user?.role === 'merchant' || user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      token,
      storeId,
      store,
      loading,
      login,
      logout,
      setCurrentStore,
      isAuthenticated,
      isAdmin,
      isMerchant
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route component
export const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        // Redirect to appropriate login page
        if (requiredRole === 'admin') {
          navigate('/admin/login');
        } else {
          navigate('/merchant/login');
        }
      } else if (requiredRole === 'admin' && !isAdmin) {
        navigate('/merchant');
      }
    }
  }, [isAuthenticated, user, loading, requiredRole, navigate, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole === 'admin' && !isAdmin) {
    return null;
  }

  return children;
};

export default AuthContext;
