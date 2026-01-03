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
  
  // Detect store context type: subdomain or custom domain
  const [storeContext, setStoreContext] = useState({ type: null, value: null });

  // Extract subdomain or detect custom domain from current hostname
  const detectStoreContext = () => {
    const hostname = window.location.hostname;
    
    // Handle localhost/development - check for query param for testing
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const params = new URLSearchParams(window.location.search);
      const testSubdomain = params.get('subdomain');
      const testDomain = params.get('domain');
      if (testSubdomain) {
        return { type: 'subdomain', value: testSubdomain };
      }
      if (testDomain) {
        return { type: 'custom_domain', value: testDomain };
      }
      return { type: null, value: null };
    }
    
    // Handle Emergent preview environment
    if (hostname.includes('preview.emergentagent.com')) {
      const params = new URLSearchParams(window.location.search);
      const testSubdomain = params.get('subdomain');
      const testDomain = params.get('domain');
      if (testSubdomain) {
        return { type: 'subdomain', value: testSubdomain };
      }
      if (testDomain) {
        return { type: 'custom_domain', value: testDomain };
      }
      return { type: null, value: null };
    }
    
    // Handle getcelora.com subdomains
    if (hostname.endsWith('.getcelora.com')) {
      const subdomain = hostname.replace('.getcelora.com', '');
      if (subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'app') {
        return { type: 'subdomain', value: subdomain };
      }
      return { type: null, value: null };
    }
    
    // Handle getcelora.com main domain (no subdomain)
    if (hostname === 'getcelora.com' || hostname === 'www.getcelora.com') {
      return { type: null, value: null };
    }
    
    // Any other domain is treated as a custom domain
    // This includes: mystore.com, www.mystore.com.au, shop.mybusiness.com, etc.
    return { type: 'custom_domain', value: hostname };
  };

  useEffect(() => {
    const context = detectStoreContext();
    setStoreContext(context);
  }, []);

  useEffect(() => {
    const fetchStoreInfo = async () => {
      if (!storeContext.type || !storeContext.value) {
        setLoadingStore(false);
        return;
      }
      
      try {
        let response;
        if (storeContext.type === 'subdomain') {
          response = await axios.get(`${API}/cpanel/store-info/${storeContext.value}`);
        } else if (storeContext.type === 'custom_domain') {
          response = await axios.get(`${API}/cpanel/store-info-by-domain`, {
            params: { domain: storeContext.value }
          });
        }
        setStoreInfo(response?.data);
      } catch (err) {
        console.error('Failed to fetch store info:', err);
        setError('Store not found');
      } finally {
        setLoadingStore(false);
      }
    };

    if (storeContext.type) {
      fetchStoreInfo();
    } else {
      setLoadingStore(false);
    }
  }, [storeContext]);

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
      // Login with subdomain or custom domain context
      const loginPayload = { ...formData };
      if (storeContext.type === 'subdomain') {
        loginPayload.subdomain = storeContext.value;
      } else if (storeContext.type === 'custom_domain') {
        loginPayload.custom_domain = storeContext.value;
      }
      
      const response = await axios.post(`${API}/cpanel/login`, loginPayload);
      
      login(response.data.access_token, response.data.user);
      navigate('/merchant');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // If no store context detected, show generic login or redirect
  if (!storeContext.type && !loadingStore) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          <Store className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access your CPanel</h1>
          <p className="text-gray-400 mb-6">
            Please access your store&apos;s control panel via your subdomain or custom domain:
          </p>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 space-y-2">
            <code className="text-cyan-400 block">yourstore.getcelora.com/cpanel</code>
            <span className="text-gray-500 text-sm">or</span>
            <code className="text-cyan-400 block">yourcustomdomain.com/cpanel</code>
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

  // Display label for the store context (subdomain or custom domain)
  const getDisplayDomain = () => {
    if (storeContext.type === 'subdomain') {
      return `${storeContext.value}.getcelora.com`;
    }
    return storeContext.value;
  };

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
            The store <span className="text-cyan-400 font-mono">{getDisplayDomain()}</span> doesn&apos;t exist or has been deactivated.
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
            {storeInfo?.store_name || storeContext.value}
          </h1>
          <p className="text-gray-400 mt-2">Merchant Control Panel</p>
          <p className="text-sm text-cyan-400 mt-1">{getDisplayDomain()}</p>
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
          <a 
            href={storeContext.type === 'custom_domain' ? `http://${storeContext.value}` : `http://${storeContext.value}.getcelora.com`} 
            className="hover:text-gray-300"
          >
            ← Back to Storefront
          </a>
        </div>
      </div>
    </div>
  );
};

export default SubdomainCPanel;
