import React, { useState, useEffect } from 'react';
import { 
  Globe, Check, X, AlertCircle, Copy, ExternalLink, RefreshCw, 
  ChevronRight, Shield, CheckCircle2, Clock, HelpCircle, Trash2,
  Link2, ArrowRight, Info, Zap
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';

const MerchantDomains = () => {
  const [store, setStore] = useState(null);
  const [customDomain, setCustomDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState('');
  const [showDnsHelp, setShowDnsHelp] = useState(false);
  const [selectedRegistrar, setSelectedRegistrar] = useState(null);
  const [dnsCheckResults, setDnsCheckResults] = useState(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL || '';
  const SERVER_IP = '45.77.239.247';
  const PLATFORM_DOMAIN = 'getcelora.com';

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

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const checkDns = async () => {
    if (!customDomain) return;
    
    setVerifying(true);
    setMessage(null);
    setDnsCheckResults(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/store/check-dns`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ domain: customDomain })
      });
      
      const data = await response.json();
      setDnsCheckResults(data);
      
    } catch (error) {
      setMessage({ type: 'error', text: 'Error checking DNS. Please try again.' });
    } finally {
      setVerifying(false);
    }
  };

  const verifyAndActivate = async () => {
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
        setMessage({ type: 'success', text: '🎉 Domain verified and activated! Your store is now live at your custom domain.' });
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
    if (!customDomain) {
      setMessage({ type: 'error', text: 'Please enter a domain name.' });
      return;
    }

    // Basic domain validation
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const cleanDomain = customDomain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
    
    if (!domainRegex.test(cleanDomain)) {
      setMessage({ type: 'error', text: 'Please enter a valid domain name (e.g., yourdomain.com or www.yourdomain.com)' });
      return;
    }

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
        body: JSON.stringify({ custom_domain: cleanDomain })
      });
      
      if (response.ok) {
        setCustomDomain(cleanDomain);
        setMessage({ type: 'success', text: 'Domain saved! Now configure your DNS records below.' });
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
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/store/custom-domain`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCustomDomain('');
      setDnsCheckResults(null);
      setMessage({ type: 'success', text: 'Custom domain removed successfully.' });
      setShowRemoveConfirm(false);
      fetchStoreData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Error removing domain.' });
    } finally {
      setSaving(false);
    }
  };

  // DNS Instructions for popular registrars
  const registrarInstructions = {
    godaddy: {
      name: 'GoDaddy',
      steps: [
        'Log in to your GoDaddy account',
        'Go to "My Products" → Find your domain → Click "DNS"',
        '📌 First, add TXT record for verification:',
        '   - Type = TXT, Name = @, Value = ' + (store?.domain_verification_token || '[your verification token]'),
        'Then add A records for routing:',
        '   - Type = A, Name = @, Value = ' + SERVER_IP,
        '   - Type = A, Name = www, Value = ' + SERVER_IP,
        'Save changes and wait 15-30 minutes for propagation'
      ]
    },
    namecheap: {
      name: 'Namecheap',
      steps: [
        'Log in to your Namecheap account',
        'Go to "Domain List" → Click "Manage" on your domain',
        'Click "Advanced DNS" tab',
        '📌 Add TXT record for verification:',
        '   - Type = TXT Record, Host = @, Value = ' + (store?.domain_verification_token || '[your verification token]'),
        'Add A records for routing:',
        '   - Type = A Record, Host = @, Value = ' + SERVER_IP,
        '   - Type = A Record, Host = www, Value = ' + SERVER_IP,
        'Save all changes'
      ]
    },
    cloudflare: {
      name: 'Cloudflare',
      steps: [
        'Log in to your Cloudflare dashboard',
        'Select your domain → Go to "DNS"',
        '📌 Add TXT record for verification:',
        '   - Type = TXT, Name = @, Content = ' + (store?.domain_verification_token || '[your verification token]'),
        'Add A records for routing:',
        '   - Type = A, Name = @, IPv4 = ' + SERVER_IP + ' (Proxy: DNS only)',
        '   - Type = A, Name = www, IPv4 = ' + SERVER_IP + ' (Proxy: DNS only)',
        '⚠️ Important: Set proxy to "DNS only" (gray cloud) for SSL'
      ]
    },
    googledomains: {
      name: 'Google Domains / Squarespace',
      steps: [
        'Go to domains.google.com (now Squarespace Domains)',
        'Click on your domain → Go to "DNS"',
        '📌 Add TXT record for verification:',
        '   - Type = TXT, Host name = (blank), Data = ' + (store?.domain_verification_token || '[your verification token]'),
        'Add A records for routing:',
        '   - Type = A, Host name = (blank), Data = ' + SERVER_IP,
        '   - Type = A, Host name = www, Data = ' + SERVER_IP,
        'Save changes'
      ]
    },
    hostinger: {
      name: 'Hostinger',
      steps: [
        'Log in to Hostinger hPanel',
        'Go to "Domains" → Select your domain → "DNS / Nameservers"',
        '📌 Add TXT record for verification:',
        '   - Type = TXT, Name = @, TXT Value = ' + (store?.domain_verification_token || '[your verification token]'),
        'Add A records for routing:',
        '   - Type = A, Name = @, Points to = ' + SERVER_IP,
        '   - Type = A, Name = www, Points to = ' + SERVER_IP,
        'Save changes'
      ]
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="merchant-domains">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Domain Settings</h1>
        <p className="text-gray-400 mt-1">Connect your own domain to make your store truly yours</p>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`p-4 rounded-lg flex items-start gap-3 ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Current Domains Card */}
      <Card className="bg-[#151b28] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            Your Store URLs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Default Subdomain - Always Active */}
          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Default Subdomain</p>
                <p className="text-white font-medium">{store?.subdomain}.{PLATFORM_DOMAIN}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Always Active
              </span>
              <a 
                href={`https://${store?.subdomain}.${PLATFORM_DOMAIN}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Custom Domain - If verified */}
          {store?.custom_domain && store?.custom_domain_verified && (
            <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-emerald-400 text-sm">Custom Domain</p>
                  <p className="text-white font-medium">{store.custom_domain}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified & Active
                </span>
                <a 
                  href={`https://${store.custom_domain}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* Pending Custom Domain */}
          {store?.custom_domain && !store?.custom_domain_verified && (
            <div className="flex items-center justify-between p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-yellow-400 text-sm">Custom Domain (Pending)</p>
                  <p className="text-white font-medium">{store.custom_domain}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Awaiting Verification
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connect Custom Domain Card */}
      <Card className="bg-[#151b28] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            {store?.custom_domain ? 'Manage Custom Domain' : 'Connect Your Own Domain'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Enter Domain */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-medium">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-sm">1</span>
              Enter Your Domain
            </div>
            
            <div className="pl-8 space-y-3">
              <div>
                <Label className="text-gray-300">Domain Name</Label>
                <div className="flex gap-3 mt-1">
                  <Input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value.toLowerCase().trim())}
                    placeholder="yourdomain.com or www.yourdomain.com"
                    className="bg-gray-800/50 border-gray-700 text-white flex-1"
                    data-testid="custom-domain-input"
                  />
                  <Button
                    onClick={saveDomain}
                    disabled={saving || !customDomain}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white"
                    data-testid="save-domain-btn"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save'}
                  </Button>
                </div>
                <p className="text-gray-500 text-sm mt-1">
                  Enter without http:// or https:// • Both root domain and www will work
                </p>
              </div>

              {store?.custom_domain && (
                <Button
                  variant="ghost"
                  onClick={() => setShowRemoveConfirm(true)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Custom Domain
                </Button>
              )}
            </div>
          </div>

          {/* Step 2: DNS Configuration */}
          {(customDomain || store?.custom_domain) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-cyan-400 font-medium">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-sm">2</span>
                Configure DNS Records
              </div>
              
              <div className="pl-8 space-y-4">
                <p className="text-gray-400">
                  Add these DNS records at your domain registrar to point your domain to Celora:
                </p>

                {/* DNS Records Table */}
                <div className="overflow-hidden rounded-lg border border-gray-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800/80">
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Type</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Name/Host</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Value/Points To</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-400">TTL</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {/* TXT Record for Verification - REQUIRED */}
                      <tr className="bg-purple-500/10 border-l-2 border-purple-500">
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 font-mono text-xs">TXT</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-white">@</td>
                        <td className="px-4 py-3 font-mono text-purple-400 break-all max-w-xs">
                          {store?.domain_verification_token || 'Save domain to get token'}
                        </td>
                        <td className="px-4 py-3 text-gray-400">Auto</td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => copyToClipboard(store?.domain_verification_token || '', 'txt')}
                            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                            title="Copy verification token"
                            disabled={!store?.domain_verification_token}
                          >
                            {copied === 'txt' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                      {/* A Records for Routing */}
                      <tr className="bg-gray-800/30">
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 font-mono text-xs">A</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-white">@</td>
                        <td className="px-4 py-3 font-mono text-cyan-400">{SERVER_IP}</td>
                        <td className="px-4 py-3 text-gray-400">Auto or 3600</td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => copyToClipboard(SERVER_IP, 'ip1')}
                            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                            title="Copy IP"
                          >
                            {copied === 'ip1' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                      <tr className="bg-gray-800/30">
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 font-mono text-xs">A</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-white">www</td>
                        <td className="px-4 py-3 font-mono text-cyan-400">{SERVER_IP}</td>
                        <td className="px-4 py-3 text-gray-400">Auto or 3600</td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => copyToClipboard(SERVER_IP, 'ip2')}
                            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                            title="Copy IP"
                          >
                            {copied === 'ip2' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Important note about TXT verification */}
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-purple-300">
                      <p className="font-medium">Domain Ownership Verification</p>
                      <p className="text-purple-300/80 mt-1">
                        The TXT record proves you own this domain and shows exactly which store it connects to.
                        {store?.domain_verification_token && (
                          <span className="block mt-2 text-purple-200">
                            Your domain will connect to: <strong>{store?.subdomain}.getcelora.com</strong>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Help with specific registrars */}
                <Button
                  variant="outline"
                  onClick={() => setShowDnsHelp(true)}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Step-by-Step Guide for Your Registrar
                </Button>

                {/* Warning/Tips */}
                <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-200">
                      <p className="font-medium mb-1">Important Notes:</p>
                      <ul className="list-disc list-inside space-y-1 text-yellow-300/80">
                        <li>DNS changes can take 15 minutes to 48 hours to propagate</li>
                        <li>Remove any existing A or CNAME records for @ and www before adding new ones</li>
                        <li>If using Cloudflare, set proxy status to "DNS only" (gray cloud)</li>
                        <li>Both yourdomain.com and www.yourdomain.com will work after setup</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Verify & Activate */}
          {(customDomain || store?.custom_domain) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-cyan-400 font-medium">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-sm">3</span>
                Verify & Activate
              </div>
              
              <div className="pl-8 space-y-4">
                <p className="text-gray-400">
                  After updating your DNS records, click below to verify and activate your domain:
                </p>

                {/* DNS Check Results */}
                {dnsCheckResults && (
                  <div className={`p-4 rounded-lg border ${
                    dnsCheckResults.all_passed 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-orange-500/10 border-orange-500/30'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      {dnsCheckResults.all_passed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-orange-400" />
                      )}
                      <span className={dnsCheckResults.all_passed ? 'text-emerald-400' : 'text-orange-400'}>
                        {dnsCheckResults.all_passed ? 'All DNS checks passed!' : 'DNS not fully propagated yet'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      {dnsCheckResults.checks?.map((check, i) => (
                        <div key={i} className="flex items-center gap-2">
                          {check.passed ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <X className="w-4 h-4 text-red-400" />
                          )}
                          <span className={check.passed ? 'text-gray-300' : 'text-gray-400'}>
                            {check.record}: {check.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={checkDns}
                    disabled={verifying}
                    variant="outline"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    {verifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Check DNS Status
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={verifyAndActivate}
                    disabled={verifying}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    data-testid="verify-domain-btn"
                  >
                    {verifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Verify & Activate Domain
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SSL Information Card */}
      <Card className="bg-[#151b28] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            SSL Certificate (HTTPS)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-emerald-400 font-medium">Automatic SSL Included</p>
                <p className="text-gray-400 text-sm mt-1">
                  Once your domain is verified, SSL certificates are automatically provisioned and renewed. 
                  Your store will be accessible via HTTPS with a secure padlock icon.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card className="bg-[#151b28] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-gray-400" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border-gray-700">
              <AccordionTrigger className="text-gray-300 hover:text-white">
                How long does DNS propagation take?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
                DNS changes typically propagate within 15-30 minutes, but can take up to 48 hours in some cases. 
                If verification fails, wait a bit longer and try again.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border-gray-700">
              <AccordionTrigger className="text-gray-300 hover:text-white">
                Will my subdomain still work after adding a custom domain?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
                Yes! Your {store?.subdomain}.{PLATFORM_DOMAIN} subdomain will always remain active, even after 
                connecting a custom domain. Customers can access your store through either URL.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border-gray-700">
              <AccordionTrigger className="text-gray-300 hover:text-white">
                Do I need to buy an SSL certificate?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
                No! SSL certificates are automatically provided and renewed for all domains connected to Celora. 
                Your store will always have HTTPS enabled at no extra cost.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4" className="border-gray-700">
              <AccordionTrigger className="text-gray-300 hover:text-white">
                What if I want to use www.mydomain.com vs mydomain.com?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
                Both will work! When you add your domain, we automatically configure both the root domain 
                (mydomain.com) and the www version (www.mydomain.com). Visitors can use either.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5" className="border-gray-700">
              <AccordionTrigger className="text-gray-300 hover:text-white">
                I'm using Cloudflare. Any special settings?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
                Yes! When adding DNS records in Cloudflare, make sure to set the proxy status to "DNS only" 
                (gray cloud icon) instead of "Proxied" (orange cloud). This ensures SSL works correctly.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* DNS Help Dialog */}
      <Dialog open={showDnsHelp} onOpenChange={setShowDnsHelp}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">DNS Setup Instructions</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select your domain registrar for step-by-step instructions
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Registrar Selection */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(registrarInstructions).map(([key, registrar]) => (
                <button
                  key={key}
                  onClick={() => setSelectedRegistrar(selectedRegistrar === key ? null : key)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                    selectedRegistrar === key
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                      : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  {registrar.name}
                </button>
              ))}
            </div>

            {/* Instructions */}
            {selectedRegistrar && (
              <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-cyan-400" />
                  {registrarInstructions[selectedRegistrar].name} Instructions
                </h3>
                <ol className="space-y-3">
                  {registrarInstructions[selectedRegistrar].steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 text-xs">
                        {i + 1}
                      </span>
                      <span className="text-gray-300">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {!selectedRegistrar && (
              <div className="text-center py-8 text-gray-500">
                <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select your domain registrar above to see specific instructions</p>
              </div>
            )}

            {/* Generic Instructions */}
            <div className="p-4 bg-gray-800/30 rounded-lg">
              <h4 className="font-medium text-gray-300 mb-2">Don't see your registrar?</h4>
              <p className="text-gray-400 text-sm">
                The general process is the same for all registrars: find your DNS settings, 
                delete any existing A or CNAME records for @ and www, then add two new A records 
                pointing to <span className="font-mono text-cyan-400">{SERVER_IP}</span>.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Domain Confirmation Dialog */}
      <Dialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-red-400">Remove Custom Domain?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-gray-300">
              Are you sure you want to remove <span className="text-white font-medium">{store?.custom_domain}</span>?
            </p>
            <p className="text-gray-400 text-sm">
              Your store will still be accessible via your subdomain ({store?.subdomain}.{PLATFORM_DOMAIN}).
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => setShowRemoveConfirm(false)}
                className="text-gray-400 hover:text-white"
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantDomains;
