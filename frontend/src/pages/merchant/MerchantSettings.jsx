import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Bell, Key, Shield, Save, Eye, EyeOff, Copy, RefreshCw, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantSettings = () => {
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [accountSettings, setAccountSettings] = useState({
    name: 'Edward Enayah',
    email: 'edwardenayah@live.com.au',
    phone: '+61 400 000 000',
    timezone: 'Australia/Sydney',
    language: 'en'
  });
  
  const [notifications, setNotifications] = useState({
    email_orders: true,
    email_customers: true,
    email_inventory: true,
    email_marketing: false,
    push_orders: true,
    push_inventory: false
  });
  
  const [security, setSecurity] = useState({
    two_factor: false,
    session_timeout: '30',
    api_key: 'mk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  });

  const handleSave = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setSaved(true);
    setLoading(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(security.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateApiKey = () => {
    const newKey = 'mk_live_' + Math.random().toString(36).substring(2, 34);
    setSecurity({ ...security, api_key: newKey });
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'api', label: 'API Keys', icon: Key }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading ? 'Saving...' : saved ? <><Check size={16} className="mr-2" /> Saved</> : <><Save size={16} className="mr-2" /> Save Changes</>}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label className="text-gray-700">Full Name</Label>
              <Input
                value={accountSettings.name}
                onChange={(e) => setAccountSettings({ ...accountSettings, name: e.target.value })}
                className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Email Address</Label>
              <Input
                type="email"
                value={accountSettings.email}
                onChange={(e) => setAccountSettings({ ...accountSettings, email: e.target.value })}
                className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Phone Number</Label>
              <Input
                value={accountSettings.phone}
                onChange={(e) => setAccountSettings({ ...accountSettings, phone: e.target.value })}
                className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Timezone</Label>
              <select
                value={accountSettings.timezone}
                onChange={(e) => setAccountSettings({ ...accountSettings, timezone: e.target.value })}
                className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-md text-gray-900 mt-1"
              >
                <option value="Australia/Sydney">Australia/Sydney</option>
                <option value="Australia/Melbourne">Australia/Melbourne</option>
                <option value="Australia/Brisbane">Australia/Brisbane</option>
                <option value="Australia/Perth">Australia/Perth</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h2>
          <div className="space-y-4">
            {[
              { key: 'email_orders', label: 'Order Notifications', desc: 'Receive emails for new orders' },
              { key: 'email_customers', label: 'Customer Notifications', desc: 'New customer registrations' },
              { key: 'email_inventory', label: 'Inventory Alerts', desc: 'Low stock warnings' },
              { key: 'email_marketing', label: 'Marketing Updates', desc: 'Tips and product updates' }
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-gray-900 font-medium">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                <Switch
                  checked={notifications[item.key]}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })}
                />
              </div>
            ))}
          </div>
          
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-6">Push Notifications</h2>
          <div className="space-y-4">
            {[
              { key: 'push_orders', label: 'Order Alerts', desc: 'Browser notifications for new orders' },
              { key: 'push_inventory', label: 'Stock Alerts', desc: 'Browser notifications for low stock' }
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-gray-900 font-medium">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                <Switch
                  checked={notifications[item.key]}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h2>
          
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div>
              <p className="text-gray-900 font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
            </div>
            <Switch
              checked={security.two_factor}
              onCheckedChange={(checked) => setSecurity({ ...security, two_factor: checked })}
            />
          </div>
          
          <div>
            <Label className="text-gray-700">Session Timeout (minutes)</Label>
            <select
              value={security.session_timeout}
              onChange={(e) => setSecurity({ ...security, session_timeout: e.target.value })}
              className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-md text-gray-900 mt-1"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
            </select>
          </div>
          
          <div className="pt-4">
            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
              Change Password
            </Button>
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'api' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">API Keys</h2>
          <p className="text-gray-500 text-sm">Use these keys to integrate with third-party services or build custom integrations.</p>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <Label className="text-gray-700 mb-2 block">Live API Key</Label>
            <div className="flex gap-2">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={security.api_key}
                readOnly
                className="bg-white border-gray-200 text-gray-900 font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
                className="border-gray-200"
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={copyApiKey}
                className="border-gray-200"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={regenerateApiKey} className="border-gray-200">
              <RefreshCw size={16} className="mr-2" />
              Regenerate Key
            </Button>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-700 text-sm">
              <strong>Warning:</strong> Regenerating your API key will invalidate the current key. Any integrations using the old key will stop working.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantSettings;
