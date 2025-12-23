import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ChevronLeft,
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
  Info,
  HelpCircle,
  ArrowRight,
  Shield,
  CreditCard,
  RotateCcw,
  Clipboard,
  BookOpen,
  Zap,
  Globe,
  MapPin,
  FileText,
  Tag,
  Image as ImageIcon,
  List,
  Grid,
  Edit,
  Plus,
  Palette,
  Layout,
  Type,
  Layers,
  BarChart3,
  TrendingUp,
  Percent,
  Box,
  FolderTree,
  ArrowLeftRight,
  Sparkles,
  Code,
  Monitor,
  Smartphone,
  Save,
  RotateCw,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ListOrdered,
  Link2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
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

// eBay Developer Portal URLs
const EBAY_URLS = {
  developerPortal: 'https://developer.ebay.com/',
  createApp: 'https://developer.ebay.com/my/keys',
  sandbox: 'https://developer.ebay.com/tools/sandbox',
  apiDocs: 'https://developer.ebay.com/docs',
  businessPolicies: 'https://www.ebay.com.au/help/selling/business-policies/business-policies?id=4212',
  sellerHub: 'https://www.ebay.com.au/sh/ovw',
  fulfillmentPolicies: 'https://www.ebay.com.au/ship/prf/list',
  paymentPolicies: 'https://www.ebay.com.au/sh/settings/payment',
  returnPolicies: 'https://www.ebay.com.au/sh/settings/returns',
};

// Setup Wizard Steps
const SETUP_STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Zap },
  { id: 'prerequisites', title: 'Prerequisites', icon: Clipboard },
  { id: 'create-app', title: 'Create eBay App', icon: Settings },
  { id: 'connect', title: 'Connect Account', icon: Link },
  { id: 'policies', title: 'Business Policies', icon: FileText },
  { id: 'settings', title: 'Sync Settings', icon: RefreshCw },
  { id: 'complete', title: 'Complete', icon: CheckCircle },
];

const EbayIntegration = () => {
  const navigate = useNavigate();
  
  // Connection state
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  
  // Setup wizard state
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState({
    client_id: '',
    client_secret: '',
    ru_name: '',
    sandbox_mode: true,
    // Business policies
    fulfillment_policy_id: '',
    payment_policy_id: '',
    return_policy_id: '',
    // Sync settings
    auto_sync_inventory: true,
    sync_interval_minutes: 15,
    import_orders: true,
    push_tracking: true,
    auto_relist_when_in_stock: true,
    // Import existing
    import_existing_listings: false,
  });
  
  // Tabs
  const [activeTab, setActiveTab] = useState('overview');
  
  // Listings
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listingsView, setListingsView] = useState('table');
  
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

  // Theme Editor State
  const [themePreview, setThemePreview] = useState('desktop');
  const [activeThemeTemplate, setActiveThemeTemplate] = useState('default');
  const [themeSettings, setThemeSettings] = useState({
    template: 'modern',
    primaryColor: '#0066cc',
    secondaryColor: '#f5f5f5',
    accentColor: '#ff6600',
    fontFamily: 'Arial, sans-serif',
    headerStyle: 'banner',
    galleryLayout: 'main-thumb',
    showBrandLogo: true,
    showTrustBadges: true,
    showShippingInfo: true,
    showReturnPolicy: true,
    customCSS: '',
    headerHTML: '<div class="ebay-header">\n  <img src="{{store_logo}}" alt="{{store_name}}" />\n  <h1>{{store_name}}</h1>\n</div>',
    footerHTML: '<div class="ebay-footer">\n  <p>Thank you for shopping with us!</p>\n  <p>Contact: {{store_email}}</p>\n</div>',
    descriptionTemplate: '<div class="product-description">\n  <h2>{{product_name}}</h2>\n  <div class="description-content">{{product_description}}</div>\n  <div class="specs">{{product_specs}}</div>\n</div>'
  });

  // Category Mapping State
  const [categoryMappings, setCategoryMappings] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [localCategories, setLocalCategories] = useState([]);
  const [ebayCategories, setEbayCategories] = useState([]);
  const [newMapping, setNewMapping] = useState({ local_category: '', ebay_category: '', ebay_category_name: '' });

  // Pricing Rules State
  const [pricingRules, setPricingRules] = useState({
    default_markup_type: 'percentage',
    default_markup_value: 10,
    round_to_nearest: 0.99,
    minimum_price: 1.00,
    apply_to_shipping: false,
    rules: []
  });
  const [showPricingRuleModal, setShowPricingRuleModal] = useState(false);
  const [newPricingRule, setNewPricingRule] = useState({
    name: '',
    condition: 'category',
    condition_value: '',
    markup_type: 'percentage',
    markup_value: 0
  });

  // Inventory Rules State
  const [inventoryRules, setInventoryRules] = useState({
    buffer_stock: 0,
    out_of_stock_action: 'set_zero',
    low_stock_threshold: 5,
    sync_direction: 'push',
    sync_on_order: true,
    sync_on_stock_change: true
  });

  // Bulk Operations State
  const [selectedListings, setSelectedListings] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState({
    totalSales: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    conversionRate: 0,
    topProducts: [],
    salesByDay: [],
    salesByCategory: []
  });
  const [analyticsDateRange, setAnalyticsDateRange] = useState('30d');

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/ebay/status`);
      setStatus(response.data);
      // Don't auto-open wizard - let user explore the dashboard first
    } catch (error) {
      console.error('Failed to fetch eBay status:', error);
      // Set a default status so the page still renders
      setStatus({ connected: false, sandbox_mode: true });
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

  // Connection error state
  const [connectionError, setConnectionError] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Test connection without saving
  const testConnection = async () => {
    if (!wizardData.client_id || !wizardData.client_secret) {
      setTestResult({ success: false, message: 'Please enter Client ID and Client Secret' });
      return;
    }
    
    try {
      setTestingConnection(true);
      setTestResult(null);
      const response = await axios.post(`${BACKEND_URL}/api/ebay/test-connection`, {
        client_id: wizardData.client_id,
        client_secret: wizardData.client_secret,
        ru_name: wizardData.ru_name,
        sandbox_mode: wizardData.sandbox_mode
      });
      setTestResult(response.data);
    } catch (error) {
      const errorData = error.response?.data?.detail || error.response?.data;
      setTestResult({
        success: false,
        error: errorData?.error || 'Connection Failed',
        message: errorData?.message || 'Failed to test connection',
        troubleshooting: errorData?.troubleshooting || []
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Connect eBay account (from wizard)
  const connectEbay = async () => {
    if (!wizardData.client_id || !wizardData.client_secret) {
      setConnectionError({ message: 'Please enter Client ID and Client Secret' });
      return false;
    }
    
    try {
      setConnecting(true);
      setConnectionError(null);
      await axios.post(`${BACKEND_URL}/api/ebay/connect`, {
        client_id: wizardData.client_id,
        client_secret: wizardData.client_secret,
        ru_name: wizardData.ru_name,
        sandbox_mode: wizardData.sandbox_mode
      });
      
      // Save sync settings
      await axios.put(`${BACKEND_URL}/api/ebay/settings`, {
        auto_sync_inventory: wizardData.auto_sync_inventory,
        sync_interval_minutes: wizardData.sync_interval_minutes,
        import_orders: wizardData.import_orders,
        push_tracking: wizardData.push_tracking,
        auto_relist_when_in_stock: wizardData.auto_relist_when_in_stock
      });
      
      await fetchStatus();
      return true;
    } catch (error) {
      const errorData = error.response?.data?.detail || error.response?.data;
      
      if (typeof errorData === 'object') {
        setConnectionError({
          error: errorData.error || 'Connection Failed',
          message: errorData.message || 'Failed to connect',
          troubleshooting: errorData.troubleshooting || [],
          help_url: errorData.help_url
        });
      } else {
        setConnectionError({
          error: 'Connection Failed',
          message: typeof errorData === 'string' ? errorData : 'Failed to connect to eBay',
          troubleshooting: [
            'Double-check your Client ID and Client Secret',
            'Verify Sandbox/Production mode matches your credentials',
            'Try creating a new app on eBay Developer Portal'
          ],
          help_url: 'https://developer.ebay.com/my/keys'
        });
      }
      return false;
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect eBay
  const disconnectEbay = async () => {
    if (!window.confirm('Are you sure you want to disconnect eBay? All sync will stop but listings will be preserved on eBay.')) {
      return;
    }
    
    try {
      await axios.delete(`${BACKEND_URL}/api/ebay/disconnect`);
      await fetchStatus();
      setShowSetupWizard(true);
      setCurrentStep(0);
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
      alert('Settings saved successfully');
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
    if (!window.confirm('Delete this listing? This will also end the listing on eBay.')) return;
    
    try {
      await axios.delete(`${BACKEND_URL}/api/ebay/listings/${listingId}`);
      await fetchListings();
    } catch (error) {
      alert('Failed to delete listing');
    }
  };

  // Wizard navigation
  const nextStep = async () => {
    // Clear any previous errors when moving forward
    setTestResult(null);
    setConnectionError(null);
    
    if (currentStep === 3) { // Connect step
      const success = await connectEbay();
      if (!success) return;
    }
    
    if (currentStep < SETUP_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    // Clear errors when going back
    setTestResult(null);
    setConnectionError(null);
    
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeWizard = () => {
    // Clear all wizard state
    setTestResult(null);
    setConnectionError(null);
    setShowSetupWizard(false);
    setCurrentStep(0);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Settings },
    { id: 'listings', label: 'Listings', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Resources', icon: HelpCircle },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Render Setup Wizard
  const renderSetupWizard = () => {
    const step = SETUP_STEPS[currentStep];
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Wizard Header */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center text-white text-2xl">
                  🛒
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">eBay Setup Wizard</h2>
                  <p className="text-sm text-gray-500">Step {currentStep + 1} of {SETUP_STEPS.length}</p>
                </div>
              </div>
              {status?.connected && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowSetupWizard(false)}
                  className="text-gray-400"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
            
            {/* Progress Steps */}
            <div className="flex items-center gap-1">
              {SETUP_STEPS.map((s, idx) => (
                <div key={s.id} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${
                    idx < currentStep 
                      ? 'bg-emerald-500 text-white' 
                      : idx === currentStep 
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {idx < currentStep ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  {idx < SETUP_STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-1 rounded ${
                      idx < currentStep ? 'bg-emerald-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Wizard Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Step 0: Welcome */}
            {currentStep === 0 && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">🛒</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Welcome to eBay Integration</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Connect your eBay seller account to sync products, manage listings, and import orders automatically - just like Maropost!
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <p className="font-medium text-gray-900">List Products</p>
                    <p className="text-xs text-gray-500">Push products to eBay</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <RefreshCw className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-medium text-gray-900">Sync Inventory</p>
                    <p className="text-xs text-gray-500">Auto-update stock levels</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <ShoppingCart className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                    <p className="font-medium text-gray-900">Import Orders</p>
                    <p className="text-xs text-gray-500">Manage eBay orders here</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl max-w-lg mx-auto">
                  <p className="text-sm text-blue-700">
                    <strong>Estimated setup time:</strong> 5-10 minutes
                  </p>
                </div>
              </div>
            )}

            {/* Step 1: Prerequisites */}
            {currentStep === 1 && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Before You Start</h3>
                <p className="text-gray-600 mb-6">Make sure you have the following ready:</p>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                        1
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">eBay Seller Account</h4>
                        <p className="text-sm text-gray-500 mb-2">You need an active eBay seller account (Australia)</p>
                        <a 
                          href="https://www.ebay.com.au/sl/sell" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          Create seller account <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                        2
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">eBay Developer Account</h4>
                        <p className="text-sm text-gray-500 mb-2">Register as a developer to get API access</p>
                        <a 
                          href={EBAY_URLS.developerPortal}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          Register at developer.ebay.com <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                        3
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Business Policies (Recommended)</h4>
                        <p className="text-sm text-gray-500 mb-2">Set up payment, shipping, and return policies on eBay</p>
                        <a 
                          href={EBAY_URLS.businessPolicies}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          Set up business policies <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Testing First?</p>
                      <p className="text-sm text-amber-700">
                        We recommend using eBay's <strong>Sandbox</strong> environment first to test the integration without affecting your live account.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Create eBay App */}
            {currentStep === 2 && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Create Your eBay App</h3>
                <p className="text-gray-600 mb-6">Follow these steps to get your API credentials:</p>
                
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-xl border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs">1</span>
                      Go to eBay Developer Portal
                    </h4>
                    <a 
                      href={EBAY_URLS.createApp}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium"
                    >
                      Open eBay Developer Portal <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs">2</span>
                      Create a New Application
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-2 ml-8 list-disc">
                      <li>Click "Create Application" or "Get Keyset"</li>
                      <li>Choose "Production" for live use or "Sandbox" for testing</li>
                      <li>Select "Sell" as the primary use case</li>
                      <li>Complete the registration form</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs">3</span>
                      Copy Your Credentials
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">You'll need these values from your eBay app:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Client ID (App ID)</p>
                        <p className="font-mono text-sm text-gray-900">Your-App-ID-XXX</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Client Secret (Cert ID)</p>
                        <p className="font-mono text-sm text-gray-900">Your-Cert-ID-XXX</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs">4</span>
                      Configure OAuth Settings (Optional)
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      For full user authorization, you'll need to set up a Redirect URL (RuName):
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 ml-8 list-disc">
                      <li>Go to User Tokens in your app settings</li>
                      <li>Add a redirect URL for OAuth callbacks</li>
                      <li>Note down your RuName</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Connect Account */}
            {currentStep === 3 && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Connect Your eBay Account</h3>
                <p className="text-gray-600 mb-6">Enter your eBay API credentials below:</p>
                
                <div className="space-y-4 max-w-lg">
                  <div>
                    <Label className="text-gray-700">
                      Client ID (App ID) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={wizardData.client_id}
                      onChange={(e) => setWizardData(d => ({...d, client_id: e.target.value}))}
                      placeholder="e.g., YourApp-YourApp-PRD-xxxx"
                      className="bg-gray-50 border-gray-200 text-gray-900 mt-1 font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">Found in your eBay developer app settings</p>
                  </div>
                  
                  <div>
                    <Label className="text-gray-700">
                      Client Secret (Cert ID) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="password"
                      value={wizardData.client_secret}
                      onChange={(e) => setWizardData(d => ({...d, client_secret: e.target.value}))}
                      placeholder="Enter your Cert ID"
                      className="bg-gray-50 border-gray-200 text-gray-900 mt-1 font-mono"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-gray-700">RuName (Optional)</Label>
                    <Input
                      value={wizardData.ru_name}
                      onChange={(e) => setWizardData(d => ({...d, ru_name: e.target.value}))}
                      placeholder="Your-RuName-xxx"
                      className="bg-gray-50 border-gray-200 text-gray-900 mt-1 font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">Required for OAuth user authorization flow</p>
                  </div>
                  
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-amber-800">Sandbox Mode</p>
                        <p className="text-sm text-amber-700">Test without affecting live listings</p>
                      </div>
                      <Switch
                        checked={wizardData.sandbox_mode}
                        onCheckedChange={(checked) => setWizardData(d => ({...d, sandbox_mode: checked}))}
                      />
                    </div>
                  </div>

                  {wizardData.sandbox_mode && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Sandbox Mode:</strong> Use your sandbox credentials. Get them from{' '}
                        <a href={EBAY_URLS.sandbox} target="_blank" rel="noopener noreferrer" className="underline">
                          eBay Sandbox
                        </a>
                      </p>
                    </div>
                  )}

                  {/* Test Connection Button */}
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={testConnection}
                      disabled={testingConnection || !wizardData.client_id || !wizardData.client_secret}
                      className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      {testingConnection ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Testing Connection...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          Test Connection
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      Validate your credentials before connecting
                    </p>
                  </div>

                  {/* Test Result Display */}
                  {testResult && (
                    <div className={`p-4 rounded-xl border ${
                      testResult.success 
                        ? 'bg-emerald-50 border-emerald-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        {testResult.success ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={`font-medium ${testResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                            {testResult.success ? 'Connection Successful!' : (testResult.error || 'Connection Failed')}
                          </p>
                          <p className={`text-sm ${testResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
                            {testResult.message}
                          </p>
                          {testResult.troubleshooting && testResult.troubleshooting.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-red-800 mb-1">Troubleshooting:</p>
                              <ul className="text-sm text-red-700 space-y-1">
                                {testResult.troubleshooting.map((tip, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-red-400">•</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Connection Error Display */}
                  {connectionError && (
                    <div className="p-4 rounded-xl border bg-red-50 border-red-200">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-red-800">
                            {connectionError.error || 'Connection Failed'}
                          </p>
                          <p className="text-sm text-red-700">{connectionError.message}</p>
                          {connectionError.troubleshooting && connectionError.troubleshooting.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-red-800 mb-1">Troubleshooting:</p>
                              <ul className="text-sm text-red-700 space-y-1">
                                {connectionError.troubleshooting.map((tip, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-red-400">•</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {connectionError.help_url && (
                            <a 
                              href={connectionError.help_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                            >
                              <HelpCircle className="w-3 h-3" />
                              Get help on eBay Developer Portal
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Business Policies */}
            {currentStep === 4 && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Business Policies</h3>
                <p className="text-gray-600 mb-6">
                  Link your eBay business policies for seamless listing management. These define your payment, shipping, and return terms.
                </p>
                
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-blue-500" />
                        <h4 className="font-medium text-gray-900">Fulfillment Policy</h4>
                      </div>
                      <a 
                        href={EBAY_URLS.fulfillmentPolicies}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        Manage on eBay <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <Input
                      value={wizardData.fulfillment_policy_id}
                      onChange={(e) => setWizardData(d => ({...d, fulfillment_policy_id: e.target.value}))}
                      placeholder="Enter Policy ID (optional)"
                      className="bg-gray-50 border-gray-200 text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">Defines shipping options, handling time, etc.</p>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-emerald-500" />
                        <h4 className="font-medium text-gray-900">Payment Policy</h4>
                      </div>
                      <a 
                        href={EBAY_URLS.paymentPolicies}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        Manage on eBay <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <Input
                      value={wizardData.payment_policy_id}
                      onChange={(e) => setWizardData(d => ({...d, payment_policy_id: e.target.value}))}
                      placeholder="Enter Policy ID (optional)"
                      className="bg-gray-50 border-gray-200 text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">Defines accepted payment methods</p>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="w-5 h-5 text-purple-500" />
                        <h4 className="font-medium text-gray-900">Return Policy</h4>
                      </div>
                      <a 
                        href={EBAY_URLS.returnPolicies}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        Manage on eBay <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <Input
                      value={wizardData.return_policy_id}
                      onChange={(e) => setWizardData(d => ({...d, return_policy_id: e.target.value}))}
                      placeholder="Enter Policy ID (optional)"
                      className="bg-gray-50 border-gray-200 text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">Defines return window and conditions</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Policy IDs are optional. If not provided, you'll need to specify policies when creating each listing.
                  </p>
                </div>
              </div>
            )}

            {/* Step 5: Sync Settings */}
            {currentStep === 5 && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Sync Settings</h3>
                <p className="text-gray-600 mb-6">Configure how your store syncs with eBay:</p>
                
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Auto-sync Inventory</h4>
                        <p className="text-sm text-gray-500">Automatically update eBay stock levels when inventory changes</p>
                      </div>
                      <Switch
                        checked={wizardData.auto_sync_inventory}
                        onCheckedChange={(checked) => setWizardData(d => ({...d, auto_sync_inventory: checked}))}
                      />
                    </div>
                  </div>

                  {wizardData.auto_sync_inventory && (
                    <div className="p-4 bg-white rounded-xl border border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-3">Sync Interval</h4>
                      <Select 
                        value={wizardData.sync_interval_minutes.toString()}
                        onValueChange={(v) => setWizardData(d => ({...d, sync_interval_minutes: parseInt(v)}))}
                      >
                        <SelectTrigger className="bg-gray-50 border-gray-200 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="5">Every 5 minutes</SelectItem>
                          <SelectItem value="15">Every 15 minutes (Recommended)</SelectItem>
                          <SelectItem value="30">Every 30 minutes</SelectItem>
                          <SelectItem value="60">Every hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="p-4 bg-white rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Import Orders</h4>
                        <p className="text-sm text-gray-500">Automatically import eBay orders for fulfillment</p>
                      </div>
                      <Switch
                        checked={wizardData.import_orders}
                        onCheckedChange={(checked) => setWizardData(d => ({...d, import_orders: checked}))}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Push Tracking Numbers</h4>
                        <p className="text-sm text-gray-500">Send tracking information to eBay when orders ship</p>
                      </div>
                      <Switch
                        checked={wizardData.push_tracking}
                        onCheckedChange={(checked) => setWizardData(d => ({...d, push_tracking: checked}))}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Auto-relist When In Stock</h4>
                        <p className="text-sm text-gray-500">Automatically relist items when stock becomes available</p>
                      </div>
                      <Switch
                        checked={wizardData.auto_relist_when_in_stock}
                        onCheckedChange={(checked) => setWizardData(d => ({...d, auto_relist_when_in_stock: checked}))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Complete */}
            {currentStep === 6 && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Setup Complete!</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Your eBay account is now connected. You can start listing products and managing orders.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto mb-8">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-emerald-800">Account Connected</p>
                    <p className="text-xs text-emerald-600">{wizardData.sandbox_mode ? 'Sandbox' : 'Production'}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <RefreshCw className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-blue-800">Auto-sync</p>
                    <p className="text-xs text-blue-600">
                      {wizardData.auto_sync_inventory ? `Every ${wizardData.sync_interval_minutes} min` : 'Disabled'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 max-w-md mx-auto">
                  <h4 className="font-medium text-gray-900">What's Next?</h4>
                  <div className="text-left space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <ArrowRight className="w-4 h-4 text-yellow-500" />
                      <span>Create your first eBay listing</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <ArrowRight className="w-4 h-4 text-yellow-500" />
                      <span>Import existing eBay listings (if any)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <ArrowRight className="w-4 h-4 text-yellow-500" />
                      <span>Configure category mappings</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Wizard Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="border-gray-200"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            <div className="flex items-center gap-3">
              {/* Skip for Now button - only show on Connect step */}
              {currentStep === 3 && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowSetupWizard(false);
                    setCurrentStep(0);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Skip for Now
                </Button>
              )}
              
              {currentStep < SETUP_STEPS.length - 1 ? (
                <Button
                  onClick={nextStep}
                  disabled={connecting || (currentStep === 3 && (!wizardData.client_id || !wizardData.client_secret))}
                  className="bg-yellow-500 hover:bg-yellow-600"
                >
                  {connecting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {currentStep === 3 ? 'Connect & Continue' : 'Continue'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={completeWizard}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Setup Wizard Modal */}
      {showSetupWizard && renderSetupWizard()}

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
                onClick={() => setShowSetupWizard(true)}
                className="border-gray-200"
              >
                <Settings className="w-4 h-4 mr-2" />
                Setup Wizard
              </Button>
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
              onClick={() => setShowSetupWizard(true)}
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

      {/* Tabs - Show even when not connected */}
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

      {/* Not Connected Banner */}
      {!status?.connected && (
        <div className="mb-6 p-6 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 mb-1">eBay Not Connected</h3>
              <p className="text-amber-700 text-sm mb-3">
                Connect your eBay account to start syncing products, managing listings, and importing orders.
                You can explore the dashboard features below while setting up.
              </p>
              <Button 
                onClick={() => setShowSetupWizard(true)}
                className="bg-yellow-500 hover:bg-yellow-600"
                size="sm"
              >
                <Link className="w-4 h-4 mr-2" />
                Start Setup Wizard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content - Show for both connected and not connected */}
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
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-gray-200"
                    onClick={() => setShowSetupWizard(true)}
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Run Setup Wizard Again
                  </Button>
                </div>
              </div>

              {/* Integration Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Integration Status</h3>
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
                    <span className="text-gray-500">Auto-sync</span>
                    <span className={settings.auto_sync_inventory ? 'text-emerald-600' : 'text-gray-400'}>
                      {settings.auto_sync_inventory ? `Every ${settings.sync_interval_minutes} min` : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Order Import</span>
                    <span className={settings.import_orders ? 'text-emerald-600' : 'text-gray-400'}>
                      {settings.import_orders ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Push Tracking</span>
                    <span className={settings.push_tracking ? 'text-emerald-600' : 'text-gray-400'}>
                      {settings.push_tracking ? 'Enabled' : 'Disabled'}
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
                </div>
              </div>
            </div>
          )}

          {/* Listings Tab */}
          {activeTab === 'listings' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">eBay Listings ({listings.length})</h3>
                <div className="flex gap-2">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setListingsView('table')}
                      className={`p-1.5 rounded ${listingsView === 'table' ? 'bg-white shadow-sm' : ''}`}
                    >
                      <List className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setListingsView('grid')}
                      className={`p-1.5 rounded ${listingsView === 'grid' ? 'bg-white shadow-sm' : ''}`}
                    >
                      <Grid className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <Button 
                    onClick={() => { fetchProducts(); setShowCreateListing(true); }}
                    className="bg-yellow-500 hover:bg-yellow-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Listing
                  </Button>
                </div>
              </div>

              {loadingListings ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
                </div>
              ) : listings.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-3">No eBay listings yet</p>
                  <p className="text-sm text-gray-400 mb-4">Start selling by creating your first listing</p>
                  <Button 
                    onClick={() => { fetchProducts(); setShowCreateListing(true); }}
                    className="bg-yellow-500 hover:bg-yellow-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
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
                <h3 className="font-semibold text-gray-900">eBay Orders ({orders.length})</h3>
                <Button 
                  variant="outline"
                  onClick={importOrders}
                  disabled={syncing}
                  className="border-gray-200"
                >
                  {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
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
                  {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Save Settings
                </Button>
              </div>
            </div>
          )}

          {/* Help Tab */}
          {activeTab === 'help' && (
            <div className="max-w-3xl">
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    Quick Start Guide
                  </h3>
                  <ol className="space-y-3 text-sm text-gray-600">
                    <li className="flex gap-3">
                      <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
                      <span><strong>Connect your account</strong> - Use your eBay developer API credentials</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
                      <span><strong>Create listings</strong> - Push your products to eBay marketplace</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
                      <span><strong>Enable auto-sync</strong> - Keep inventory levels updated automatically</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0">4</span>
                      <span><strong>Import orders</strong> - Manage eBay orders from your dashboard</span>
                    </li>
                  </ol>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ExternalLink className="w-5 h-5 text-blue-500" />
                    Useful Links
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <a 
                      href={EBAY_URLS.developerPortal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <p className="font-medium text-gray-900 text-sm">eBay Developer Portal</p>
                      <p className="text-xs text-gray-500">Manage your API credentials</p>
                    </a>
                    <a 
                      href={EBAY_URLS.sellerHub}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <p className="font-medium text-gray-900 text-sm">eBay Seller Hub</p>
                      <p className="text-xs text-gray-500">View your eBay seller dashboard</p>
                    </a>
                    <a 
                      href={EBAY_URLS.businessPolicies}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <p className="font-medium text-gray-900 text-sm">Business Policies</p>
                      <p className="text-xs text-gray-500">Set up payment, shipping & returns</p>
                    </a>
                    <a 
                      href={EBAY_URLS.apiDocs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <p className="font-medium text-gray-900 text-sm">eBay API Documentation</p>
                      <p className="text-xs text-gray-500">Technical reference</p>
                    </a>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                  <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    If you're having trouble with the integration, check these common solutions:
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1 list-disc ml-4">
                    <li>Ensure your eBay developer app has the correct OAuth scopes</li>
                    <li>For sandbox testing, use sandbox credentials (not production)</li>
                    <li>Make sure your eBay business policies are set up correctly</li>
                    <li>Check that your products have valid SKUs before listing</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

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
                  <p className="text-xs text-gray-500 mt-1">
                    <a href="https://pages.ebay.com.au/sellerinformation/news/categorychanges.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Find category IDs →
                    </a>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-700">Override Price</Label>
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
              {creatingListing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Create Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EbayIntegration;
