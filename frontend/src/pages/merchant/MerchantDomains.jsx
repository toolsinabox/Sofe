import React, { useState, useEffect, useCallback } from 'react';
import { 
  Globe, Check, X, AlertCircle, Copy, ExternalLink, RefreshCw, 
  ChevronRight, Shield, CheckCircle2, Clock, HelpCircle, Trash2,
  Link2, ArrowRight, Info, Zap, Loader2
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

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const SERVER_IP = '45.77.239.247';

const MerchantDomains = () => {
  const [store, setStore] = useState(null);
  const [customDomain, setCustomDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState('');
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

      console.log('Fetching domain settings...');
      const response = await fetch(`${API_URL}/api/store/domain-settings`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Domain settings data:', data);
        setStore(data);
        setCustomDomain(data.custom_domain || '');
      } else if (response.status === 401) {
        setApiError('Session expired. Please log out and log in again.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setApiError(errorData.detail || `Error loading domain settings (${response.status})`);
      }
    } catch (error) {
      console.error('Error fetching store:', error);
      setApiError(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStoreData();
  }, [fetchStoreData]);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const saveDomain = async () => {
    if (!customDomain.trim()) {
      setMessage({ type: 'error', text: 'Please enter a domain name.' });
      return;
    }

    // Basic domain validation
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

      console.log('Saving domain:', cleanDomain);
      
      const response = await fetch(`${API_URL}/api/store/custom-domain`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ custom_domain: cleanDomain })
      });
      
      console.log('Save response status:', response.status);
      const data = await response.json();
      console.log('Save response data:', data);
      
      if (response.ok) {
        setCustomDomain(cleanDomain);
        setMessage({ type: 'success', text: 'Domain saved! Now configure your DNS records below.' });
        // Refresh store data to get updated token
        await fetchStoreData();
      } else if (response.status === 401) {
        setMessage({ type: 'error', text: 'Session expired. Please log out and log in again.' });
      } else {
        setMessage({ type: 'error', text: data.detail || 'Error saving domain settings.' });
      }
    } catch (error) {
      console.error('Save error:', error);
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
          <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
          <span className="text-gray-400">Loading domain settings...</span>
        </div>
      </div>
    );
  }

  // API Error state
  if (apiError) {
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
            <Button 
              onClick={fetchStoreData} 
              className="mt-4 bg-red-500 hover:bg-red-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
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
            <Globe className="w-7 h-7 text-cyan-400" />
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
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-cyan-400" />
            Default Subdomain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                <span className="text-cyan-400 font-mono text-lg font-semibold">
                  {subdomain || '(not set)'}
                </span>
                <span className="text-gray-400 font-mono text-lg">.getcelora.com</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Always Active</span>
            </div>
          </div>
          {subdomain && (
            <p className="text-gray-500 text-sm mt-3">
              Your store is always accessible at{' '}
              <a 
                href={`https://${subdomain}.getcelora.com`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline"
              >
                {subdomain}.getcelora.com
              </a>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Custom Domain Card */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-400" />
            Connect Your Own Domain
            {isVerified && (
              <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" /> Verified
              </span>
            )}
            {hasCustomDomain && !isVerified && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
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
                className="flex-1 bg-slate-900/50 border-slate-600 text-white placeholder:text-gray-500"
              />
              <Button
                data-testid="save-domain-btn"
                onClick={saveDomain}
                disabled={saving}
                className="bg-cyan-600 hover:bg-cyan-700 text-white min-w-[100px]"
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
            <div className="flex items-center justify-between pt-2 border-t border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Current:</span>
                <code className="text-cyan-400 bg-slate-900 px-2 py-1 rounded">{store?.custom_domain}</code>
                {isVerified ? (
                  <span className="text-emerald-400 text-sm flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Verified & Active
                  </span>
                ) : (
                  <span className="text-yellow-400 text-sm flex items-center gap-1">
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
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
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
                    Add these DNS records to your domain to verify ownership and connect it to your store.
                    Your domain will connect to: <strong className="text-cyan-400">{subdomain}.getcelora.com</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Step 1: TXT Record */}
            <div className="space-y-3">
              <h3 className="text-white font-medium flex items-center gap-2">
                <span className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                Add TXT Record (Ownership Verification)
              </h3>
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Type</span>
                    <p className="text-white font-mono mt-1">TXT</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Host/Name</span>
                    <p className="text-white font-mono mt-1">@ or {store?.custom_domain}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">TTL</span>
                    <p className="text-white font-mono mt-1">3600 (or Auto)</p>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">Value</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-slate-800 text-cyan-400 px-3 py-2 rounded font-mono text-sm break-all">
                      {verificationToken || 'Save domain to get token'}
                    </code>
                    {verificationToken && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(verificationToken, 'txt')}
                        className="text-gray-400 hover:text-white"
                      >
                        {copied === 'txt' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: A Record */}
            <div className="space-y-3">
              <h3 className="text-white font-medium flex items-center gap-2">
                <span className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                Add A Record (Point to Server)
              </h3>
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Type</span>
                    <p className="text-white font-mono mt-1">A</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Host/Name</span>
                    <p className="text-white font-mono mt-1">@ (root) or www</p>
                  </div>
                  <div>
                    <span className="text-gray-500">TTL</span>
                    <p className="text-white font-mono mt-1">3600 (or Auto)</p>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">Value (IP Address)</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-slate-800 text-emerald-400 px-3 py-2 rounded font-mono text-sm">
                      {SERVER_IP}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(SERVER_IP, 'ip')}
                      className="text-gray-400 hover:text-white"
                    >
                      {copied === 'ip' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Verify Button */}
            <div className="pt-4 border-t border-slate-700">
              <Button
                onClick={verifyDomain}
                disabled={verifying || !verificationToken}
                className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white py-6 text-lg"
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
              <div>
                <h3 className="text-emerald-400 font-semibold text-lg">Domain Verified & Active</h3>
                <p className="text-emerald-300/70 text-sm mt-1">
                  Your store is now accessible at{' '}
                  <a 
                    href={`https://${store?.custom_domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline font-medium"
                  >
                    {store?.custom_domain}
                  </a>
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://${store?.custom_domain}`, '_blank')}
                className="ml-auto border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
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
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Remove Custom Domain?</DialogTitle>
            <DialogDescription className="text-gray-400">
              This will disconnect <strong className="text-cyan-400">{store?.custom_domain}</strong> from your store.
              Visitors to this domain will no longer see your store.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowRemoveConfirm(false)}
              className="border-slate-600 text-gray-300"
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
