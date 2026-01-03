import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, Check, X, AlertCircle, Copy, ExternalLink, RefreshCw, 
  Shield, CheckCircle2, Clock, Trash2, Link2, Info, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import { useAuth } from '../../context/AuthContext';
import CopyTag from '../../components/ui/CopyTag';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const SERVER_IP = '45.77.239.247';

const MerchantDomains = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const [store, setStore] = useState(null);
  const [customDomain, setCustomDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [apiError, setApiError] = useState(null);

  const fetchStoreData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setApiError('No authentication token found. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/store/domain-settings`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStore(data);
        setCustomDomain(data.custom_domain || '');
      } else if (response.status === 401) {
        setApiError('Session expired. Please log out and log in again.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setApiError(errorData.detail || `Error loading domain settings (${response.status})`);
      }
    } catch (error) {
      setApiError(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStoreData();
  }, [fetchStoreData]);

  const saveDomain = async () => {
    if (!customDomain.trim()) {
      setMessage({ type: 'error', text: 'Please enter a domain name.' });
      return;
    }

    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    let cleanDomain = customDomain.toLowerCase().trim();
    cleanDomain = cleanDomain.replace(/^(https?:\/\/)/, '').replace(/\/$/, '');
    
    if (!domainRegex.test(cleanDomain)) {
      setMessage({ type: 'error', text: 'Please enter a valid domain name (e.g., yourdomain.com or www.yourdomain.com)' });
      return;
    }

    setSaving(true);
    setMessage(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token. Please log in again.' });
        setSaving(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/store/custom-domain`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ custom_domain: cleanDomain })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setCustomDomain(cleanDomain);
        setMessage({ type: 'success', text: 'Domain saved! Now configure your DNS records below.' });
        await fetchStoreData();
      } else if (response.status === 401) {
        setMessage({ type: 'error', text: 'Session expired. Please log out and log in again.' });
      } else {
        setMessage({ type: 'error', text: data.detail || 'Error saving domain settings.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Network error: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const removeDomain = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/store/custom-domain`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setCustomDomain('');
        setMessage({ type: 'success', text: 'Custom domain removed.' });
        await fetchStoreData();
      } else {
        const data = await response.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.detail || 'Error removing domain.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Network error: ${error.message}` });
    } finally {
      setSaving(false);
      setShowRemoveConfirm(false);
    }
  };

  const verifyDomain = async () => {
    if (!customDomain) return;
    
    setVerifying(true);
    setMessage(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/store/verify-domain`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ domain: customDomain })
      });
      
      const data = await response.json();
      
      if (response.ok && data.verified) {
        setMessage({ type: 'success', text: 'Domain verified successfully! Your custom domain is now active.' });
        await fetchStoreData();
      } else {
        const errors = data.errors || [];
        setMessage({ 
          type: 'error', 
          text: errors.length > 0 ? errors.join(' ') : 'Domain verification failed. Please check your DNS settings.'
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Verification error: ${error.message}` });
    } finally {
      setVerifying(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-gray-400">Loading domain settings...</span>
        </div>
      </div>
    );
  }

  // API Error state
  if (apiError) {
    const handleRelogin = () => {
      logout();
      navigate('/merchant/login');
    };

    return (
      <div className="p-6">
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6" />
              <div>
                <h3 className="font-semibold">Error Loading Domain Settings</h3>
                <p className="text-sm mt-1">{apiError}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button 
                onClick={fetchStoreData} 
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button 
                onClick={handleRelogin} 
                className="bg-red-500 hover:bg-red-600"
              >
                Log In Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subdomain = store?.subdomain || '';
  const verificationToken = store?.domain_verification_token || '';
  const isVerified = store?.custom_domain_verified || false;
  const hasCustomDomain = !!store?.custom_domain;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Globe className="w-7 h-7 text-blue-500" />
            Domain Settings
          </h1>
          <p className="text-gray-400 mt-1">Configure your store's domain and custom domain</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchStoreData}
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Default Subdomain Card */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-500" />
            Default Subdomain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <CopyTag 
                value={`${subdomain}.getcelora.com`} 
                variant="info"
                size="lg"
              />
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Always Active</span>
            </div>
          </div>
          {subdomain && (
            <p className="text-gray-500 text-sm mt-3">
              Your store is always accessible at this subdomain
            </p>
          )}
        </CardContent>
      </Card>

      {/* Custom Domain Card */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-500" />
            Connect Your Own Domain
            {isVerified && (
              <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" /> Verified
              </span>
            )}
            {hasCustomDomain && !isVerified && (
              <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" /> Pending
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300 mb-2 block">Custom Domain</Label>
            <div className="flex gap-3">
              <Input
                data-testid="custom-domain-input"
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="www.yourdomain.com"
                className="flex-1 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500"
              />
              <Button
                data-testid="save-domain-btn"
                onClick={saveDomain}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
            <p className="text-gray-500 text-sm mt-2">
              Enter your domain (e.g., www.mystore.com or shop.mybusiness.com.au)
            </p>
          </div>

          {hasCustomDomain && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-800">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm">Current:</span>
                <CopyTag value={store?.custom_domain} variant="default" />
                {isVerified ? (
                  <span className="text-emerald-400 text-sm flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Verified & Active
                  </span>
                ) : (
                  <span className="text-amber-400 text-sm flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Awaiting Verification
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRemoveConfirm(true)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DNS Configuration - Only show when there's a domain saved */}
      {hasCustomDomain && !isVerified && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              DNS Configuration Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-blue-300 font-medium">Domain Ownership Verification</p>
                  <p className="text-blue-200/70 text-sm mt-1">
                    Add these DNS records to verify ownership. Your domain will connect to:{' '}
                    <CopyTag value={`${subdomain}.getcelora.com`} variant="info" size="sm" className="inline-flex ml-1" />
                  </p>
                </div>
              </div>
            </div>

            {/* Step 1: TXT Record */}
            <div className="space-y-3">
              <h3 className="text-white font-medium flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                Add TXT Record (Ownership Verification)
              </h3>
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-4 border border-gray-700">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 block mb-1">Type</span>
                    <CopyTag value="TXT" variant="default" size="sm" />
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">Host/Name</span>
                    <CopyTag value="@" variant="default" size="sm" />
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">TTL</span>
                    <span className="text-gray-300 font-mono text-sm">3600 (or Auto)</span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 text-sm block mb-2">Value (click to copy)</span>
                  <CopyTag 
                    value={verificationToken || 'Save domain to get token'} 
                    variant="info" 
                    size="md"
                    className="w-full justify-start"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: A Records */}
            <div className="space-y-3">
              <h3 className="text-white font-medium flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                Add A Records (Point to Server)
              </h3>
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-4 border border-gray-700">
                {/* Root A Record */}
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Root Domain</span>
                  <div className="grid grid-cols-3 gap-4 text-sm mt-2">
                    <div>
                      <span className="text-gray-500 block mb-1">Type</span>
                      <CopyTag value="A" variant="default" size="sm" />
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1">Host/Name</span>
                      <CopyTag value="@" variant="default" size="sm" />
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1">Value (IP)</span>
                      <CopyTag value={SERVER_IP} variant="success" size="sm" />
                    </div>
                  </div>
                </div>
                
                {/* WWW A Record */}
                <div className="pt-4 border-t border-gray-700">
                  <span className="text-gray-400 text-xs uppercase tracking-wide">WWW Subdomain</span>
                  <div className="grid grid-cols-3 gap-4 text-sm mt-2">
                    <div>
                      <span className="text-gray-500 block mb-1">Type</span>
                      <CopyTag value="A" variant="default" size="sm" />
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1">Host/Name</span>
                      <CopyTag value="www" variant="default" size="sm" />
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1">Value (IP)</span>
                      <CopyTag value={SERVER_IP} variant="success" size="sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Verify Button */}
            <div className="pt-4 border-t border-gray-800">
              <Button
                onClick={verifyDomain}
                disabled={verifying || !verificationToken}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-6 text-lg"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying DNS Records...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    Verify & Activate Domain
                  </>
                )}
              </Button>
              <p className="text-gray-500 text-sm text-center mt-3">
                DNS changes can take up to 24-48 hours to propagate
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verified Success Card */}
      {isVerified && (
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-emerald-400 font-semibold text-lg">Domain Verified & Active</h3>
                <p className="text-emerald-300/70 text-sm mt-1">
                  Your store is now accessible at{' '}
                  <CopyTag value={store?.custom_domain} variant="success" size="sm" className="inline-flex ml-1" />
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://${store?.custom_domain}`, '_blank')}
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remove Domain Confirmation Dialog */}
      <Dialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Remove Custom Domain?</DialogTitle>
            <DialogDescription className="text-gray-400">
              This will disconnect <strong className="text-blue-400">{store?.custom_domain}</strong> from your store.
              Visitors to this domain will no longer see your store.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowRemoveConfirm(false)}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={removeDomain}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? 'Removing...' : 'Remove Domain'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantDomains;
