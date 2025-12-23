import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Search, 
  Plus, 
  Check, 
  X, 
  Settings,
  Package,
  Zap,
  RefreshCw,
  Loader2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Addons with dedicated integration pages
const DEDICATED_INTEGRATIONS = {
  'ebay': '/merchant/integrations/ebay',
  // Add more as they are built:
  // 'amazon': '/merchant/integrations/amazon',
  // 'stripe': '/merchant/integrations/stripe',
};

const MerchantAddons = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showConfigModal, setShowConfigModal] = useState(null);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [configForm, setConfigForm] = useState({
    api_key: '',
    secret_key: '',
    auto_sync_inventory: true,
    import_orders: true,
    sandbox_mode: false
  });
  const [syncing, setSyncing] = useState(false);

  const categories = [
    { id: 'all', label: 'All Addons' },
    { id: 'marketplaces', label: 'Marketplaces' },
    { id: 'shipping', label: 'Shipping' },
    { id: 'payments', label: 'Payments' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'communication', label: 'Communication' },
  ];

  // Fetch addons from API
  const fetchAddons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${BACKEND_URL}/api/addons/`);
      setAddons(response.data);
    } catch (err) {
      console.error('Failed to fetch addons:', err);
      setError('Failed to load addons. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddons();
  }, [fetchAddons]);

  const filteredAddons = addons.filter(addon => {
    const matchesSearch = addon.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      addon.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || addon.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const installedCount = addons.filter(a => a.installed).length;
  const enabledCount = addons.filter(a => a.enabled).length;

  const installAddon = async (addonId) => {
    try {
      setActionLoading(addonId);
      await axios.post(`${BACKEND_URL}/api/addons/${addonId}/install`);
      await fetchAddons();
    } catch (err) {
      console.error('Failed to install addon:', err);
      alert(err.response?.data?.detail || 'Failed to install addon');
    } finally {
      setActionLoading(null);
    }
  };

  const uninstallAddon = async (addonId) => {
    if (!window.confirm('Are you sure you want to uninstall this addon? All configuration will be lost.')) {
      return;
    }
    try {
      setActionLoading(addonId);
      await axios.delete(`${BACKEND_URL}/api/addons/${addonId}/uninstall`);
      await fetchAddons();
    } catch (err) {
      console.error('Failed to uninstall addon:', err);
      alert(err.response?.data?.detail || 'Failed to uninstall addon');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleAddon = async (addonId) => {
    try {
      setActionLoading(addonId);
      await axios.put(`${BACKEND_URL}/api/addons/${addonId}/toggle`);
      await fetchAddons();
    } catch (err) {
      console.error('Failed to toggle addon:', err);
      alert(err.response?.data?.detail || 'Failed to toggle addon');
    } finally {
      setActionLoading(null);
    }
  };

  const openConfigModal = (addon) => {
    // Check if this addon has a dedicated integration page
    if (DEDICATED_INTEGRATIONS[addon.addon_id]) {
      navigate(DEDICATED_INTEGRATIONS[addon.addon_id]);
      return;
    }
    
    setShowConfigModal(addon);
    // Pre-fill form with existing config
    setConfigForm({
      api_key: addon.config?.api_key || '',
      secret_key: addon.config?.secret_key || '',
      auto_sync_inventory: addon.config?.auto_sync_inventory ?? true,
      import_orders: addon.config?.import_orders ?? true,
      sandbox_mode: addon.config?.sandbox_mode ?? false
    });
  };

  const saveConfig = async () => {
    if (!showConfigModal) return;
    
    try {
      setActionLoading(showConfigModal.addon_id);
      await axios.put(`${BACKEND_URL}/api/addons/${showConfigModal.addon_id}/config`, configForm);
      await fetchAddons();
      setShowConfigModal(null);
    } catch (err) {
      console.error('Failed to save config:', err);
      alert(err.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setActionLoading(null);
    }
  };

  const syncAllAddons = async () => {
    try {
      setSyncing(true);
      await axios.post(`${BACKEND_URL}/api/addons/sync-all`);
      alert('Sync triggered for all enabled addons');
    } catch (err) {
      console.error('Failed to sync addons:', err);
      alert('Failed to trigger sync');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-500">Loading addons...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-gray-700 mb-2">{error}</p>
          <Button onClick={fetchAddons} variant="outline">
            <RefreshCw size={14} className="mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Addons & Integrations</h1>
          <p className="text-gray-500 text-xs">Extend your store with powerful integrations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500">{installedCount} installed</p>
            <p className="text-xs text-emerald-600">{enabledCount} active</p>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="border-gray-200"
            onClick={syncAllAddons}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 size={14} className="mr-1 animate-spin" />
            ) : (
              <RefreshCw size={14} className="mr-1" />
            )}
            Sync All
          </Button>
        </div>
      </div>

      {/* Search and Categories */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search addons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-gray-200 text-gray-900 h-8 text-sm"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-50 text-gray-500 hover:text-gray-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Popular Addons Banner */}
      {activeCategory === 'all' && (
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-blue-600" />
            <span className="font-medium text-gray-900 text-sm">Popular Integrations</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {addons.filter(a => a.popular).map(addon => (
              <span key={addon.addon_id} className="px-2 py-1 bg-white rounded text-xs text-gray-600 border border-gray-200">
                {addon.icon} {addon.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Addons Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredAddons.map(addon => (
          <div
            key={addon.addon_id}
            className={`bg-white rounded-lg border p-3 transition-all ${
              addon.enabled 
                ? 'border-emerald-200 shadow-sm' 
                : addon.installed 
                  ? 'border-gray-200' 
                  : 'border-gray-100 opacity-80'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 ${addon.color} rounded-lg flex items-center justify-center text-white text-sm`}>
                  {addon.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 text-sm">{addon.name}</h3>
                  {addon.installed && (
                    <span className={`text-xs ${addon.enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {addon.enabled ? '● Active' : '○ Inactive'}
                    </span>
                  )}
                </div>
              </div>
              {addon.popular && !addon.installed && (
                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                  Popular
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-gray-500 text-xs mb-3 line-clamp-2">{addon.description}</p>

            {/* Features */}
            {addon.installed && addon.features && (
              <div className="flex flex-wrap gap-1 mb-3">
                {addon.features.slice(0, 3).map((feature, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-gray-50 text-gray-500 text-xs rounded">
                    {feature}
                  </span>
                ))}
                {addon.features.length > 3 && (
                  <span className="px-1.5 py-0.5 text-gray-400 text-xs">
                    +{addon.features.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              {addon.installed ? (
                <>
                  <Switch
                    checked={addon.enabled}
                    onCheckedChange={() => toggleAddon(addon.addon_id)}
                    disabled={actionLoading === addon.addon_id}
                  />
                  <div className="flex gap-1">
                    {addon.configurable && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-gray-500 hover:text-gray-900"
                        onClick={() => openConfigModal(addon)}
                        disabled={actionLoading === addon.addon_id}
                      >
                        <Settings size={14} />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => uninstallAddon(addon.addon_id)}
                      disabled={actionLoading === addon.addon_id}
                    >
                      {actionLoading === addon.addon_id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <X size={14} />
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700 h-7 text-xs"
                  onClick={() => installAddon(addon.addon_id)}
                  disabled={actionLoading === addon.addon_id}
                >
                  {actionLoading === addon.addon_id ? (
                    <Loader2 size={14} className="mr-1 animate-spin" />
                  ) : (
                    <Plus size={14} className="mr-1" />
                  )}
                  Install
                </Button>
              )}
            </div>

            {/* Last updated indicator for installed addons */}
            {addon.installed && addon.updated_at && (
              <p className="text-xs text-gray-400 mt-2 text-right">
                Updated: {new Date(addon.updated_at).toLocaleDateString()}
              </p>
            )}
          </div>
        ))}
      </div>

      {filteredAddons.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Package size={32} className="mx-auto mb-2 opacity-50" />
          <p>No addons found matching your search</p>
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-4 border border-gray-200 mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 ${showConfigModal.color} rounded-lg flex items-center justify-center text-white text-sm`}>
                  {showConfigModal.icon}
                </div>
                <h3 className="font-semibold text-gray-900">{showConfigModal.name} Settings</h3>
              </div>
              <button 
                onClick={() => setShowConfigModal(null)} 
                className="text-gray-400 hover:text-gray-600"
                disabled={actionLoading === showConfigModal.addon_id}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-3 mb-4">
              <div>
                <Label className="text-gray-700 text-sm">API Key</Label>
                <Input 
                  placeholder="Enter API key" 
                  className="bg-gray-50 border-gray-200 text-gray-900 h-8 text-sm"
                  value={configForm.api_key}
                  onChange={(e) => setConfigForm({...configForm, api_key: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-gray-700 text-sm">Secret Key</Label>
                <Input 
                  type="password" 
                  placeholder="Enter secret key" 
                  className="bg-gray-50 border-gray-200 text-gray-900 h-8 text-sm"
                  value={configForm.secret_key}
                  onChange={(e) => setConfigForm({...configForm, secret_key: e.target.value})}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700 text-sm">Auto-sync inventory</span>
                <Switch 
                  checked={configForm.auto_sync_inventory}
                  onCheckedChange={(checked) => setConfigForm({...configForm, auto_sync_inventory: checked})}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700 text-sm">Import orders automatically</span>
                <Switch 
                  checked={configForm.import_orders}
                  onCheckedChange={(checked) => setConfigForm({...configForm, import_orders: checked})}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700 text-sm">Sandbox/Test mode</span>
                <Switch 
                  checked={configForm.sandbox_mode}
                  onCheckedChange={(checked) => setConfigForm({...configForm, sandbox_mode: checked})}
                />
              </div>
            </div>

            {showConfigModal.config?.api_key && (
              <div className="mb-4 p-2 bg-emerald-50 rounded text-xs text-emerald-700 flex items-center gap-2">
                <Check size={14} />
                <span>This addon is configured</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowConfigModal(null)} 
                className="flex-1 border-gray-200 h-8 text-sm"
                disabled={actionLoading === showConfigModal.addon_id}
              >
                Cancel
              </Button>
              <Button 
                onClick={saveConfig} 
                className="flex-1 bg-blue-600 hover:bg-blue-700 h-8 text-sm"
                disabled={actionLoading === showConfigModal.addon_id}
              >
                {actionLoading === showConfigModal.addon_id ? (
                  <Loader2 size={14} className="mr-1 animate-spin" />
                ) : null}
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantAddons;
