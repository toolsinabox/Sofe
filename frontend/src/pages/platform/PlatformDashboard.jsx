import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  Store, Plus, Settings, Globe, CreditCard, BarChart3, Users, Package,
  ExternalLink, ArrowRight, Check, AlertTriangle, Loader2, Copy, LogOut,
  ChevronDown, Zap, Shield, Clock
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '../../components/ui/dropdown-menu';
import { useAuth } from '../../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function PlatformDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setCurrentStore: setAuthStore } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [owner, setOwner] = useState(null);
  const [stores, setStores] = useState([]);
  const [currentStore, setCurrentStore] = useState(null);
  const [usage, setUsage] = useState(null);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainResult, setDomainResult] = useState(null);

  // Handle "Manage Store" click - log user into merchant dashboard
  const handleManageStore = () => {
    const token = localStorage.getItem('platform_token');
    if (currentStore && owner && token) {
      // Set up the auth context with store data
      const merchantUser = {
        id: owner.id,
        email: owner.email,
        name: owner.name,
        role: 'merchant',
        store_id: currentStore.id
      };
      
      // Login to merchant context
      login(token, merchantUser, currentStore);
      
      // Store the store context for API calls
      localStorage.setItem('store_id', currentStore.id);
      axios.defaults.headers.common['X-Store-ID'] = currentStore.id;
      
      // Navigate to merchant dashboard
      navigate('/merchant');
    }
  };

  useEffect(() => {
    fetchData();
    
    // Check if new store was just created
    if (location.state?.newStore) {
      // Could show a welcome modal here
    }
  }, [location]);

  const fetchData = async () => {
    const token = localStorage.getItem('platform_token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    try {
      setLoading(true);
      
      // Get owner and stores
      const authRes = await axios.get(`${BACKEND_URL}/api/platform/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setOwner(authRes.data.owner);
      setStores(authRes.data.stores);
      
      // Set current store
      const savedStore = localStorage.getItem('platform_store');
      if (savedStore) {
        setCurrentStore(JSON.parse(savedStore));
      } else if (authRes.data.stores.length > 0) {
        setCurrentStore(authRes.data.stores[0]);
        localStorage.setItem('platform_store', JSON.stringify(authRes.data.stores[0]));
      }
      
      // Get usage for current store
      if (authRes.data.current_store_id || authRes.data.stores[0]?.id) {
        const storeId = authRes.data.current_store_id || authRes.data.stores[0]?.id;
        const usageRes = await axios.get(`${BACKEND_URL}/api/platform/stores/${storeId}/usage`);
        setUsage(usageRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('platform_token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('platform_token');
    localStorage.removeItem('platform_store');
    localStorage.removeItem('platform_owner');
    localStorage.removeItem('platform_stores');
    navigate('/platform');
  };

  const switchStore = (store) => {
    setCurrentStore(store);
    localStorage.setItem('platform_store', JSON.stringify(store));
    fetchData();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleAddDomain = async () => {
    if (!domainInput || !currentStore) return;
    
    setDomainLoading(true);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/platform/stores/${currentStore.id}/domain?domain=${encodeURIComponent(domainInput)}`
      );
      setDomainResult(res.data);
    } catch (error) {
      setDomainResult({ error: error.response?.data?.detail || 'Failed to add domain' });
    } finally {
      setDomainLoading(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!currentStore) return;
    
    setDomainLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/platform/stores/${currentStore.id}/domain/verify`);
      setDomainResult(res.data);
      fetchData(); // Refresh store data
    } catch (error) {
      setDomainResult({ error: error.response?.data?.detail || 'Verification failed' });
    } finally {
      setDomainLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const storeUrl = currentStore?.custom_domain_verified && currentStore?.custom_domain
    ? `https://${currentStore.custom_domain}`
    : `https://${currentStore?.subdomain}.storebuilder.com`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold">StoreBuilder</span>
              </Link>
              
              {/* Store Switcher */}
              {stores.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Store className="w-4 h-4" />
                      {currentStore?.store_name || 'Select Store'}
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {stores.map(store => (
                      <DropdownMenuItem 
                        key={store.id}
                        onClick={() => switchStore(store)}
                        className="gap-2"
                      >
                        {store.id === currentStore?.id && <Check className="w-4 h-4 text-green-600" />}
                        <span className={store.id === currentStore?.id ? 'font-medium' : ''}>
                          {store.store_name}
                        </span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/signup')} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Create New Store
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {currentStore && (
                <Button variant="outline" asChild>
                  <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                    View Store <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-700 font-medium">
                        {owner?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-3 py-2">
                    <p className="font-medium">{owner?.name}</p>
                    <p className="text-sm text-gray-500">{owner?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="w-4 h-4 mr-2" /> Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" /> Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner for New Users */}
        {location.state?.newStore && (
          <Card className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-2">🎉 Your store is ready!</h2>
              <p className="opacity-90 mb-4">
                Your store is live at {storeUrl}. Start adding products and customizing your theme.
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => window.open(`${storeUrl}/merchant`, '_blank')}>
                  Go to Store Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" className="bg-white/10 border-white/30 hover:bg-white/20">
                  Watch Tutorial
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        {usage && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Products</p>
                    <p className="text-2xl font-bold">
                      {usage.usage.products.used} / {usage.usage.products.limit}
                    </p>
                  </div>
                  <Package className="w-8 h-8 text-blue-500" />
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, (usage.usage.products.used / usage.usage.products.limit) * 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Orders</p>
                    <p className="text-2xl font-bold">{usage.stats.orders_count}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Customers</p>
                    <p className="text-2xl font-bold">{usage.stats.customers_count}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Storage</p>
                    <p className="text-2xl font-bold">
                      {usage.usage.storage_mb.used}MB / {usage.usage.storage_mb.limit}MB
                    </p>
                  </div>
                  <Shield className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open(`${storeUrl}/merchant`, '_blank')}>
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Store className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Manage Store</h3>
              <p className="text-gray-500 text-sm">Add products, manage orders, customize your store</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowDomainModal(true)}>
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Custom Domain</h3>
              <p className="text-gray-500 text-sm">
                {currentStore?.custom_domain_verified 
                  ? `Connected: ${currentStore.custom_domain}`
                  : 'Connect your own domain name'}
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/billing')}>
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Billing & Plan</h3>
              <p className="text-gray-500 text-sm">
                Current plan: <Badge variant="outline">{usage?.plan?.name || 'Free'}</Badge>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Store Details */}
        {currentStore && (
          <Card>
            <CardHeader>
              <CardTitle>Store Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-gray-500">Store URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="px-3 py-2 bg-gray-100 rounded-lg text-sm flex-1 truncate">
                      {storeUrl}
                    </code>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(storeUrl)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label className="text-gray-500">Dashboard URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="px-3 py-2 bg-gray-100 rounded-lg text-sm flex-1 truncate">
                      {storeUrl}/merchant
                    </code>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`${storeUrl}/merchant`)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <div className="mt-1">
                    <Badge className={
                      currentStore.status === 'active' ? 'bg-green-100 text-green-800' :
                      currentStore.status === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {currentStore.status === 'trial' && <Clock className="w-3 h-3 mr-1" />}
                      {currentStore.status.charAt(0).toUpperCase() + currentStore.status.slice(1)}
                    </Badge>
                    {currentStore.status === 'trial' && currentStore.trial_ends_at && (
                      <span className="text-sm text-gray-500 ml-2">
                        Ends {new Date(currentStore.trial_ends_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label className="text-gray-500">Created</Label>
                  <div className="mt-1 text-gray-900">
                    {new Date(currentStore.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Domain Modal */}
      <Dialog open={showDomainModal} onOpenChange={setShowDomainModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Custom Domain</DialogTitle>
            <DialogDescription>
              Use your own domain name for a professional storefront
            </DialogDescription>
          </DialogHeader>
          
          {!domainResult ? (
            <div className="space-y-4">
              <div>
                <Label>Domain Name</Label>
                <Input
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="www.yourdomain.com"
                />
              </div>
              <Button onClick={handleAddDomain} disabled={domainLoading || !domainInput}>
                {domainLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Add Domain
              </Button>
            </div>
          ) : domainResult.error ? (
            <div className="p-4 bg-red-50 rounded-lg text-red-600">
              {domainResult.error}
              <Button variant="outline" className="mt-4" onClick={() => setDomainResult(null)}>
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                  {domainResult.verified ? (
                    <><Check className="w-5 h-5" /> Domain Verified!</>
                  ) : (
                    <><AlertTriangle className="w-5 h-5 text-yellow-600" /> Verification Required</>
                  )}
                </div>
                <p className="text-sm text-green-600">
                  {domainResult.message}
                </p>
              </div>
              
              {!domainResult.verified && domainResult.instructions && (
                <div className="space-y-3">
                  <p className="font-medium">Add this DNS record to your domain:</p>
                  <div className="p-3 bg-gray-100 rounded-lg font-mono text-sm">
                    <p>Type: {domainResult.instructions.record_type}</p>
                    <p>Name: {domainResult.instructions.record_name}</p>
                    <p className="truncate">Value: {domainResult.instructions.record_value}</p>
                  </div>
                  <Button onClick={handleVerifyDomain} disabled={domainLoading}>
                    {domainLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Verify Domain
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
