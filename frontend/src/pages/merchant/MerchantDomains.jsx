import React, { useState, useEffect } from 'react';
import { Globe, Check, X, AlertCircle, Copy, ExternalLink, RefreshCw } from 'lucide-react';

const MerchantDomains = () => {
  const [store, setStore] = useState(null);
  const [customDomain, setCustomDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL || '';
  const SERVER_IP = '45.77.239.247';

  useEffect(() => {
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/store/domain-settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStore(data);
        setCustomDomain(data.custom_domain || '');
      }
    } catch (error) {
      console.error('Error fetching store:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        fetchStoreData();
      } else {
        setMessage({ 
          type: 'error', 
          text: data.message || 'Domain verification failed. Please check your DNS settings and try again.' 
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error verifying domain. Please try again.' });
    } finally {
      setVerifying(false);
    }
  };

  const saveDomain = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/store/custom-domain`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ custom_domain: customDomain || null })
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Domain settings saved. Now verify your DNS configuration.' });
        fetchStoreData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.detail || 'Error saving domain settings.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving domain settings.' });
    } finally {
      setSaving(false);
    }
  };

  const removeDomain = async () => {
    if (!window.confirm('Are you sure you want to remove your custom domain?')) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/store/custom-domain`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCustomDomain('');
      setMessage({ type: 'success', text: 'Custom domain removed.' });
      fetchStoreData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Error removing domain.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto" data-testid="merchant-domains">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Domain Settings</h1>
        <p className="text-gray-600 mt-1">Connect your own domain to your store</p>
      </div>

      {/* Current Domain Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-500" />
          Your Store URLs
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Default Subdomain</p>
              <p className="font-medium">{store?.subdomain}.getcelora.com</p>
            </div>
            <a 
              href={`http://${store?.subdomain}.getcelora.com`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
          
          {store?.custom_domain && store?.custom_domain_verified && (
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div>
                <p className="text-sm text-green-600">Custom Domain (Active)</p>
                <p className="font-medium text-green-700">{store.custom_domain}</p>
              </div>
              <Check className="w-5 h-5 text-green-500" />
            </div>
          )}
        </div>
      </div>

      {/* Connect Custom Domain */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Connect Custom Domain</h2>
        
        {message && (
          <div className={`p-4 rounded-lg mb-4 flex items-start gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <Check className="w-5 h-5 mt-0.5" /> : <AlertCircle className="w-5 h-5 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Domain
            </label>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value.toLowerCase().trim())}
              placeholder="www.yourdomain.com"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="custom-domain-input"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter your domain without http:// or https://
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={saveDomain}
              disabled={saving || !customDomain}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="save-domain-btn"
            >
              {saving ? 'Saving...' : 'Save Domain'}
            </button>
            
            {store?.custom_domain && (
              <button
                onClick={removeDomain}
                disabled={saving}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                data-testid="remove-domain-btn"
              >
                Remove Domain
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DNS Instructions */}
      {customDomain && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">DNS Configuration</h2>
          <p className="text-gray-600 mb-4">
            Add the following DNS records at your domain registrar:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Type</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Name/Host</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Value/Points To</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-4 py-3 font-mono">A</td>
                  <td className="px-4 py-3 font-mono">@</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{SERVER_IP}</span>
                      <button 
                        onClick={() => copyToClipboard(SERVER_IP)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono">A</td>
                  <td className="px-4 py-3 font-mono">www</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{SERVER_IP}</span>
                      <button 
                        onClick={() => copyToClipboard(SERVER_IP)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {copied && (
            <p className="text-sm text-green-600 mt-2">Copied to clipboard!</p>
          )}

          <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> DNS changes can take 15 minutes to 48 hours to propagate globally. 
              After updating your DNS records, click "Verify Domain" below.
            </p>
          </div>

          <div className="mt-4">
            <button
              onClick={verifyDomain}
              disabled={verifying}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
              data-testid="verify-domain-btn"
            >
              {verifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Verify Domain
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold mb-2">Need help?</h3>
        <p className="text-gray-600 text-sm">
          If you're having trouble connecting your domain, make sure:
        </p>
        <ul className="list-disc list-inside text-gray-600 text-sm mt-2 space-y-1">
          <li>You've added both A records (@ and www) at your domain registrar</li>
          <li>The IP address is exactly <span className="font-mono">{SERVER_IP}</span></li>
          <li>You've waited at least 15 minutes after making DNS changes</li>
          <li>You've removed any conflicting CNAME records for @ or www</li>
        </ul>
      </div>
    </div>
  );
};

export default MerchantDomains;
