import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Store, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SubdomainCPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  
  const [storeInfo, setStoreInfo] = useState(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract subdomain from current hostname
  const getSubdomain = () => {
    const hostname = window.location.hostname;
    // Handle localhost/development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return null;
    }
    // Handle getcelora.com subdomains
    if (hostname.endsWith('.getcelora.com')) {
      const subdomain = hostname.replace('.getcelora.com', '');
      if (subdomain !== 'www' && subdomain !== 'api') {
        return subdomain;
      }
    }
    // Handle direct IP or custom domain
    return null;
  };

  const subdomain = getSubdomain();

  useEffect(() => {
    const fetchStoreInfo = async () => {
      if (!subdomain) {
        setLoadingStore(false);
        return;
      }
      
      try {
        const response = await axios.get(`${API}/cpanel/store-info/${subdomain}`);
        setStoreInfo(response.data);
      } catch (err) {
        console.error('Failed to fetch store info:', err);
        setError('Store not found');
      } finally {
        setLoadingStore(false);
      }
    };

    fetchStoreInfo();
  }, [subdomain]);

  // If already authenticated, redirect to merchant dashboard
  useEffect(() => {
    if (isAuthenticated && !location.pathname.includes('/login')) {
      navigate('/merchant');
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Login with subdomain context
      const response = await axios.post(`${API}/cpanel/login`, {
        ...formData,
        subdomain: subdomain
      });
      
      login(response.data.access_token, response.data.user);
      navigate('/merchant');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // If no subdomain detected, show generic login or redirect
  if (!subdomain && !loadingStore) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          <Store className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access your CPanel</h1>
          <p className="text-gray-400 mb-6">
            Please access your store&apos;s control panel via your subdomain:
          </p>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <code className="text-cyan-400">yourstore.getcelora.com/cpanel</code>
          </div>
          <Button
            onClick={() => navigate('/login')}
            className="mt-6 bg-cyan-500 hover:bg-cyan-600"
          >
            Go to Platform Login
          </Button>
        </div>
      </div>
    );
  }

  if (loadingStore) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  // If store not found or error occurred, show error page
  if (error || !storeInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/20 mb-6">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Store Not Found</h1>
          <p className="text-gray-400 mb-6">
            The store <span className="text-cyan-400 font-mono">{subdomain}.getcelora.com</span> doesn&apos;t exist or has been deactivated.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => window.location.href = 'https://www.getcelora.com'}
              className="w-full bg-cyan-500 hover:bg-cyan-600"
            >
              Go to Celora Homepage
            </Button>
            <Button
              onClick={() => window.location.href = 'https://www.getcelora.com/signup'}
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Create Your Own Store
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Store Logo/Branding */}
        <div className="text-center mb-8">
          {storeInfo?.logo ? (
            <img 
              src={storeInfo.logo.startsWith('/api') ? `${API.replace('/api', '')}${storeInfo.logo}` : storeInfo.logo}
              alt={storeInfo?.store_name}
              className="w-20 h-20 mx-auto rounded-2xl object-cover mb-4 border-2 border-cyan-500/30"
            />
          ) : (
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-4 shadow-lg shadow-cyan-500/25">
              <Store className="w-10 h-10 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-white">
            {storeInfo?.store_name || subdomain}
          </h1>
          <p className="text-gray-400 mt-2">Merchant Control Panel</p>
          <p className="text-sm text-cyan-400 mt-1">{subdomain}.getcelora.com</p>
        </div>

        {/* Login Form */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="cpanel-login-form">
            <div>
              <Label className="text-gray-300 font-medium">Email Address</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="you@example.com"
                  required
                  data-testid="cpanel-email-input"
                  className="pl-10 h-11 bg-slate-900/50 border-slate-600 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300 font-medium">Password</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  data-testid="cpanel-password-input"
                  className="pl-10 pr-10 h-11 bg-slate-900/50 border-slate-600 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20" />
                Remember me
              </label>
              <a href="#" className="text-sm text-cyan-400 hover:text-cyan-300 font-medium">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="cpanel-login-button"
              className="w-full h-11 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium shadow-lg shadow-cyan-500/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <a href={`http://${subdomain}.getcelora.com`} className="hover:text-gray-300">
            ← Back to Storefront
          </a>
        </div>
      </div>
    </div>
  );
};

export default SubdomainCPanel;
