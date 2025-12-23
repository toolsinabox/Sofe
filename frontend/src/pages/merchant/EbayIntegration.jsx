import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Settings,
  RefreshCw,
  Link,
  Unlink,
  Package,
  ShoppingCart,
  Truck,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronRight,
  ExternalLink,
  Upload,
  Download,
  Play,
  Pause,
  Clock,
  DollarSign,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Eye,
  Copy,
  ArrowUpDown,
  X,
  Check,
  Info
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const EbayIntegration = () => {
  // Connection state
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState('overview');
  
  // Connection form
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [credentials, setCredentials] = useState({
    client_id: '',
    client_secret: '',
    ru_name: '',
    sandbox_mode: true
  });
  
  // Listings
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  
  // Orders
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // Sync
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  
  // Settings
  const [settings, setSettings] = useState({
    auto_sync_inventory: true,
    sync_interval_minutes: 15,
    import_orders: true,
    push_tracking: true,
    auto_relist_when_in_stock: true
  });
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Create listing
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [listingForm, setListingForm] = useState({
    ebay_category_id: '',
    listing_type: 'FixedPriceItem',
    duration: 'GTC',
    condition: 'NEW',
    price: '',
    quantity: ''
  });
  const [creatingListing, setCreatingListing] = useState(false);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/ebay/status`);
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch eBay status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch listings
  const fetchListings = useCallback(async () => {
    try {
      setLoadingListings(true);
      const response = await axios.get(`${BACKEND_URL}/api/ebay/listings`);
      setListings(response.data.listings || []);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    } finally {
      setLoadingListings(false);
    }
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const response = await axios.get(`${BACKEND_URL}/api/ebay/orders`);
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/ebay/settings`);
      if (response.data.sync_config) {
        setSettings(response.data.sync_config);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  }, []);

  // Fetch products for listing
  const fetchProducts = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/products`);
      setProducts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (status?.connected) {
      fetchSettings();
      if (activeTab === 'listings') fetchListings();
      if (activeTab === 'orders') fetchOrders();
    }
  }, [status?.connected, activeTab, fetchSettings, fetchListings, fetchOrders]);

  // Connect eBay account
  const connectEbay = async () => {
    if (!credentials.client_id || !credentials.client_secret) {
      alert('Please enter Client ID and Client Secret');
      return;
    }
    
    try {
      setConnecting(true);
      await axios.post(`${BACKEND_URL}/api/ebay/connect`, credentials);
      await fetchStatus();
      setShowConnectModal(false);
      setCredentials({ client_id: '', client_secret: '', ru_name: '', sandbox_mode: true });
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to connect eBay account');
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect eBay
  const disconnectEbay = async () => {
    if (!window.confirm('Are you sure you want to disconnect eBay? All listings will be preserved but sync will stop.')) {
      return;
    }
    
    try {
      await axios.delete(`${BACKEND_URL}/api/ebay/disconnect`);
      await fetchStatus();
    } catch (error) {
      alert('Failed to disconnect');
    }
  };

  // Sync inventory
  const syncInventory = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const response = await axios.post(`${BACKEND_URL}/api/ebay/sync/inventory`);
      setSyncResult(response.data);
      await fetchStatus();
    } catch (error) {
      setSyncResult({ error: error.response?.data?.detail || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  // Import orders
  const importOrders = async () => {
    try {
      setSyncing(true);
      const response = await axios.post(`${BACKEND_URL}/api/ebay/sync/orders`);
      alert(`Imported ${response.data.imported} orders`);
      await fetchOrders();
    } catch (error) {
      alert('Failed to import orders');
    } finally {
      setSyncing(false);
    }
  };

  // Save settings
  const saveSettings = async () => {
    try {
      setSavingSettings(true);
      await axios.put(`${BACKEND_URL}/api/ebay/settings`, settings);
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Create listing
  const createListing = async () => {
    if (!selectedProduct || !listingForm.ebay_category_id) {
      alert('Please select a product and category');
      return;
    }
    
    try {
      setCreatingListing(true);
      await axios.post(`${BACKEND_URL}/api/ebay/listings`, {
        product_id: selectedProduct.id,
        ...listingForm,
        price: parseFloat(listingForm.price) || selectedProduct.price,
        quantity: parseInt(listingForm.quantity) || selectedProduct.stock
      });
      setShowCreateListing(false);
      setSelectedProduct(null);
      setListingForm({
        ebay_category_id: '',
        listing_type: 'FixedPriceItem',
        duration: 'GTC',
        condition: 'NEW',
        price: '',
        quantity: ''
      });
      await fetchListings();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to create listing');
    } finally {
      setCreatingListing(false);
    }
  };

  // Delete listing
  const deleteListing = async (listingId) => {
    if (!window.confirm('Delete this listing?')) return;
    
    try {
      await axios.delete(`${BACKEND_URL}/api/ebay/listings/${listingId}`);
      await fetchListings();
    } catch (error) {
      alert('Failed to delete listing');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Settings },
    { id: 'listings', label: 'Listings', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center text-white text-2xl">
            🛒
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">eBay Integration</h1>
            <p className="text-gray-500 text-sm">
              {status?.connected 
                ? `Connected ${status.sandbox_mode ? '(Sandbox)' : '(Production)'}`
                : 'Not connected'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status?.connected ? (
            <>
              <Button 
                variant="outline" 
                onClick={syncInventory}
                disabled={syncing}
                className="border-gray-200"
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Sync Now
              </Button>
              <Button 
                variant="outline" 
                onClick={disconnectEbay}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Unlink className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => setShowConnectModal(true)}
              className="bg-yellow-500 hover:bg-yellow-600"
            >
              <Link className="w-4 h-4 mr-2" />
              Connect eBay
            </Button>
          )}
        </div>
      </div>

      {/* Connection Status Banner */}
      {status?.connected && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="font-medium text-emerald-800">eBay Connected</p>
                <p className="text-sm text-emerald-600">
                  Last sync: {status.last_sync ? new Date(status.last_sync).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{status.listings_count}</p>
                <p className="text-gray-500">Listings</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{status.active_orders}</p>
                <p className="text-gray-500">Pending Orders</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className={`mb-6 p-4 rounded-xl border ${
          syncResult.error 
            ? 'bg-red-50 border-red-200' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          {syncResult.error ? (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>{syncResult.error}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-600">
                <CheckCircle className="w-5 h-5" />
                <span>Sync completed: {syncResult.synced}/{syncResult.total} items synced</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSyncResult(null)}
                className="text-gray-400"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      {status?.connected && (
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] transition-colors ${
                activeTab === tab.id
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      {status?.connected ? (
        <div>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-gray-200"
                    onClick={() => { fetchProducts(); setShowCreateListing(true); }}
                  >
                    <Upload className="w-4 h-4 mr-3" />
                    Create New Listing
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-gray-200"
                    onClick={syncInventory}
                    disabled={syncing}
                  >
                    <RefreshCw className={`w-4 h-4 mr-3 ${syncing ? 'animate-spin' : ''}`} />
                    Sync Inventory
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-gray-200"
                    onClick={importOrders}
                    disabled={syncing}
                  >
                    <Download className="w-4 h-4 mr-3" />
                    Import Orders
                  </Button>
                </div>
              </div>

              {/* Integration Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Integration Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Environment</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      status.sandbox_mode 
                        ? 'bg-yellow-100 text-yellow-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {status.sandbox_mode ? 'Sandbox' : 'Production'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Token Expires</span>
                    <span className="text-gray-900">
                      {status.token_expires 
                        ? new Date(status.token_expires).toLocaleString() 
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Auto-sync</span>
                    <span className={settings.auto_sync_inventory ? 'text-emerald-600' : 'text-gray-400'}>
                      {settings.auto_sync_inventory ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Order Import</span>
                    <span className={settings.import_orders ? 'text-emerald-600' : 'text-gray-400'}>
                      {settings.import_orders ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Help Section */}
              <div className="lg:col-span-2 bg-blue-50 rounded-xl border border-blue-200 p-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">How eBay Integration Works</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• <strong>Product Sync:</strong> Push your products to eBay as listings</li>
                      <li>• <strong>Inventory Sync:</strong> Stock levels update automatically every {settings.sync_interval_minutes} minutes</li>
                      <li>• <strong>Order Import:</strong> eBay orders appear in your dashboard for fulfillment</li>
                      <li>• <strong>Tracking:</strong> Shipping tracking numbers push back to eBay automatically</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Listings Tab */}
          {activeTab === 'listings' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">eBay Listings</h3>
                <Button 
                  onClick={() => { fetchProducts(); setShowCreateListing(true); }}
                  className="bg-yellow-500 hover:bg-yellow-600"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Create Listing
                </Button>
              </div>

              {loadingListings ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
                </div>
              ) : listings.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-3">No eBay listings yet</p>
                  <Button 
                    onClick={() => { fetchProducts(); setShowCreateListing(true); }}
                    variant="outline"
                  >
                    Create Your First Listing
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Product</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">SKU</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Price</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Qty</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Last Sync</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.map(listing => (
                        <tr key={listing.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 text-sm">{listing.title}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 font-mono">{listing.sku}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">${listing.price?.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{listing.quantity}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              listing.status === 'active' 
                                ? 'bg-emerald-100 text-emerald-700'
                                : listing.status === 'draft'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-600'
                            }`}>
                              {listing.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {listing.last_sync ? new Date(listing.last_sync).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteListing(listing.id)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">eBay Orders</h3>
                <Button 
                  variant="outline"
                  onClick={importOrders}
                  disabled={syncing}
                  className="border-gray-200"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Import Orders
                </Button>
              </div>

              {loadingOrders ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-3">No eBay orders imported</p>
                  <Button onClick={importOrders} variant="outline">
                    Import Orders Now
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Order ID</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Buyer</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Total</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-sm text-gray-900">
                            {order.ebay_order_id?.slice(0, 12)}...
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{order.buyer_username}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">${order.total?.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              order.status === 'shipped' 
                                ? 'bg-emerald-100 text-emerald-700'
                                : order.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-blue-100 text-blue-700'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {order.order_date ? new Date(order.order_date).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                <h3 className="font-semibold text-gray-900">Sync Settings</h3>
                
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">Auto-sync Inventory</p>
                    <p className="text-sm text-gray-500">Automatically sync stock levels to eBay</p>
                  </div>
                  <Switch
                    checked={settings.auto_sync_inventory}
                    onCheckedChange={(checked) => setSettings(s => ({...s, auto_sync_inventory: checked}))}
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">Sync Interval</p>
                    <p className="text-sm text-gray-500">How often to sync inventory</p>
                  </div>
                  <Select 
                    value={settings.sync_interval_minutes.toString()}
                    onValueChange={(v) => setSettings(s => ({...s, sync_interval_minutes: parseInt(v)}))}
                  >
                    <SelectTrigger className="w-32 bg-gray-50 border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">Import Orders</p>
                    <p className="text-sm text-gray-500">Automatically import eBay orders</p>
                  </div>
                  <Switch
                    checked={settings.import_orders}
                    onCheckedChange={(checked) => setSettings(s => ({...s, import_orders: checked}))}
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">Push Tracking</p>
                    <p className="text-sm text-gray-500">Send tracking numbers to eBay</p>
                  </div>
                  <Switch
                    checked={settings.push_tracking}
                    onCheckedChange={(checked) => setSettings(s => ({...s, push_tracking: checked}))}
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-gray-900">Auto-relist When In Stock</p>
                    <p className="text-sm text-gray-500">Relist items when stock becomes available</p>
                  </div>
                  <Switch
                    checked={settings.auto_relist_when_in_stock}
                    onCheckedChange={(checked) => setSettings(s => ({...s, auto_relist_when_in_stock: checked}))}
                  />
                </div>

                <Button 
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="w-full bg-yellow-500 hover:bg-yellow-600"
                >
                  {savingSettings ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Save Settings
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Not Connected State */
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🛒</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your eBay Account</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Link your eBay seller account to sync products, manage listings, and import orders automatically.
          </p>
          <Button 
            onClick={() => setShowConnectModal(true)}
            className="bg-yellow-500 hover:bg-yellow-600"
          >
            <Link className="w-4 h-4 mr-2" />
            Connect eBay Account
          </Button>
        </div>
      )}

      {/* Connect Modal */}
      <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">🛒</span>
              Connect eBay Account
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Enter your eBay Developer API credentials to connect
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-700">Client ID (App ID)</Label>
              <Input
                value={credentials.client_id}
                onChange={(e) => setCredentials(c => ({...c, client_id: e.target.value}))}
                placeholder="Your eBay App ID"
                className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Client Secret (Cert ID)</Label>
              <Input
                type="password"
                value={credentials.client_secret}
                onChange={(e) => setCredentials(c => ({...c, client_secret: e.target.value}))}
                placeholder="Your eBay Cert ID"
                className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">RuName (optional)</Label>
              <Input
                value={credentials.ru_name}
                onChange={(e) => setCredentials(c => ({...c, ru_name: e.target.value}))}
                placeholder="Redirect URL name for OAuth"
                className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Required for user authorization flow</p>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-700">Sandbox Mode</p>
                <p className="text-xs text-gray-500">Use eBay sandbox for testing</p>
              </div>
              <Switch
                checked={credentials.sandbox_mode}
                onCheckedChange={(checked) => setCredentials(c => ({...c, sandbox_mode: checked}))}
              />
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Need credentials?</strong> Register at{' '}
                <a href="https://developer.ebay.com" target="_blank" rel="noopener noreferrer" className="underline">
                  developer.ebay.com
                </a>
                {' '}to get your API keys.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConnectModal(false)} className="border-gray-200">
              Cancel
            </Button>
            <Button 
              onClick={connectEbay}
              disabled={connecting}
              className="bg-yellow-500 hover:bg-yellow-600"
            >
              {connecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Link className="w-4 h-4 mr-2" />
              )}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Listing Modal */}
      <Dialog open={showCreateListing} onOpenChange={setShowCreateListing}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg">
          <DialogHeader>
            <DialogTitle>Create eBay Listing</DialogTitle>
            <DialogDescription className="text-gray-500">
              Select a product to list on eBay
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-700">Select Product</Label>
              <Select 
                value={selectedProduct?.id || ''}
                onValueChange={(v) => setSelectedProduct(products.find(p => p.id === v))}
              >
                <SelectTrigger className="bg-gray-50 border-gray-200 mt-1">
                  <SelectValue placeholder="Choose a product" />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-60">
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - ${product.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct && (
              <>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Current Price:</span>
                    <span className="text-gray-900">${selectedProduct.price}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Stock:</span>
                    <span className="text-gray-900">{selectedProduct.stock}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-700">eBay Category ID</Label>
                  <Input
                    value={listingForm.ebay_category_id}
                    onChange={(e) => setListingForm(f => ({...f, ebay_category_id: e.target.value}))}
                    placeholder="e.g., 9355"
                    className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-700">Override Price (optional)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={listingForm.price}
                      onChange={(e) => setListingForm(f => ({...f, price: e.target.value}))}
                      placeholder={selectedProduct.price.toString()}
                      className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700">Override Quantity</Label>
                    <Input
                      type="number"
                      value={listingForm.quantity}
                      onChange={(e) => setListingForm(f => ({...f, quantity: e.target.value}))}
                      placeholder={selectedProduct.stock?.toString()}
                      className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-700">Condition</Label>
                    <Select 
                      value={listingForm.condition}
                      onValueChange={(v) => setListingForm(f => ({...f, condition: v}))}
                    >
                      <SelectTrigger className="bg-gray-50 border-gray-200 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="NEW">New</SelectItem>
                        <SelectItem value="LIKE_NEW">Like New</SelectItem>
                        <SelectItem value="USED_EXCELLENT">Used - Excellent</SelectItem>
                        <SelectItem value="USED_GOOD">Used - Good</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-700">Duration</Label>
                    <Select 
                      value={listingForm.duration}
                      onValueChange={(v) => setListingForm(f => ({...f, duration: v}))}
                    >
                      <SelectTrigger className="bg-gray-50 border-gray-200 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="GTC">Good Till Cancelled</SelectItem>
                        <SelectItem value="Days_7">7 Days</SelectItem>
                        <SelectItem value="Days_30">30 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateListing(false)} className="border-gray-200">
              Cancel
            </Button>
            <Button 
              onClick={createListing}
              disabled={creatingListing || !selectedProduct}
              className="bg-yellow-500 hover:bg-yellow-600"
            >
              {creatingListing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Create Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EbayIntegration;
