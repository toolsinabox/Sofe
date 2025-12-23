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

  // Get the selected preview product data
  const getPreviewProduct = () => {
    const selectedId = themeSettings.previewProduct;
    if (!selectedId || selectedId === 'sample') {
      return {
        name: 'Sample Product - Premium Quality Item',
        price: 129.99,
        compare_price: 159.99,
        sku: 'SAMPLE-001',
        description: 'This is a sample product description. Select a real product from the dropdown above to see how your actual products will look in the eBay listing.',
        stock: 25,
        brand: 'Your Brand',
        category: 'Category',
        weight: '1.5 kg',
        dimensions: '10 x 8 x 4 cm',
        condition: 'New',
        images: [],
        upc: '123456789012',
        mpn: 'MPN-12345'
      };
    }
    
    const product = products.find(p => p.id === selectedId);
    if (!product) {
      return {
        name: 'Product Not Found',
        price: 0,
        sku: 'N/A',
        description: 'The selected product could not be found.',
        stock: 0,
        brand: '-',
        category: '-',
        images: []
      };
    }
    
    return {
      name: product.name || 'Untitled Product',
      price: product.price || 0,
      compare_price: product.compare_price || product.price * 1.2,
      sku: product.sku || 'NO-SKU',
      description: product.description || 'No description available.',
      stock: product.stock ?? product.quantity ?? 0,
      brand: product.brand || product.vendor || 'Unbranded',
      category: product.category || 'General',
      weight: product.weight ? `${product.weight} kg` : 'N/A',
      dimensions: product.dimensions || 'N/A',
      condition: product.condition || 'New',
      images: product.images || [],
      upc: product.upc || product.barcode || 'N/A',
      mpn: product.mpn || 'N/A'
    };
  };

  const previewProduct = getPreviewProduct();

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
    // Fetch products when theme tab is active (for preview selector)
    if (activeTab === 'theme') {
      fetchProducts();
    }
    if (status?.connected) {
      fetchSettings();
      if (activeTab === 'listings') fetchListings();
      if (activeTab === 'orders') fetchOrders();
    }
  }, [status?.connected, activeTab, fetchSettings, fetchListings, fetchOrders, fetchProducts]);

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
    { id: 'theme', label: 'Theme Editor', icon: Palette },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'pricing', label: 'Pricing Rules', icon: DollarSign },
    { id: 'inventory', label: 'Inventory', icon: Box },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

  // eBay Listing Templates
  const listingTemplates = [
    { id: 'modern', name: 'Modern Clean', description: 'Minimalist design with focus on product images' },
    { id: 'professional', name: 'Professional', description: 'Corporate style with detailed specifications' },
    { id: 'boutique', name: 'Boutique', description: 'Elegant design for premium products' },
    { id: 'tech', name: 'Tech Store', description: 'Technical specs focused layout' },
    { id: 'custom', name: 'Custom HTML', description: 'Full control with custom HTML/CSS' },
  ];

  // Sample eBay categories for demo
  const sampleEbayCategories = [
    { id: '11450', name: 'Clothing, Shoes & Accessories' },
    { id: '293', name: 'Consumer Electronics' },
    { id: '11700', name: 'Home & Garden' },
    { id: '888', name: 'Sporting Goods' },
    { id: '220', name: 'Toys & Hobbies' },
    { id: '26395', name: 'Health & Beauty' },
    { id: '12576', name: 'Business & Industrial' },
    { id: '625', name: 'Cameras & Photo' },
    { id: '58058', name: 'Cell Phones & Accessories' },
    { id: '281', name: 'Jewelry & Watches' },
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

          {/* Theme Editor Tab - SUPER ADVANCED */}
          {activeTab === 'theme' && (
            <div className="space-y-4">
              {/* Theme Editor Header */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Advanced eBay Theme Editor</h3>
                  <p className="text-sm text-gray-500">Design professional listing templates with live preview</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Preview Product Selector */}
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5">
                    <Package className="w-4 h-4 text-gray-500" />
                    <Select 
                      value={themeSettings.previewProduct || 'sample'}
                      onValueChange={(v) => setThemeSettings(s => ({...s, previewProduct: v}))}
                    >
                      <SelectTrigger className="w-44 h-8 border-0 bg-transparent text-sm">
                        <SelectValue placeholder="Preview Product" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="sample">Sample Product</SelectItem>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.sku ? `${p.sku} - ` : ''}{p.name?.slice(0, 25)}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Device Preview Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setThemePreview('desktop')}
                      className={`p-2 rounded transition-colors ${themePreview === 'desktop' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                      title="Desktop Preview"
                    >
                      <Monitor className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setThemePreview('tablet')}
                      className={`p-2 rounded transition-colors ${themePreview === 'tablet' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                      title="Tablet Preview"
                    >
                      <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="4" y="2" width="16" height="20" rx="2" />
                        <line x1="12" y1="18" x2="12" y2="18" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setThemePreview('mobile')}
                      className={`p-2 rounded transition-colors ${themePreview === 'mobile' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                      title="Mobile Preview"
                    >
                      <Smartphone className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <Button variant="outline" size="sm" className="gap-1">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Upload className="w-4 h-4" />
                    Import
                  </Button>
                  <Button className="bg-yellow-500 hover:bg-yellow-600 gap-1">
                    <Save className="w-4 h-4" />
                    Save Theme
                  </Button>
                </div>
              </div>

              {/* Main Editor Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Left Panel - Code Editor */}
                <div className="space-y-4">
                  {/* Editor Tabs */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex border-b border-gray-200 bg-gray-50">
                      {[
                        { id: 'header', label: 'Header', icon: Layout },
                        { id: 'description', label: 'Description', icon: FileText },
                        { id: 'specs', label: 'Specifications', icon: List },
                        { id: 'footer', label: 'Footer', icon: Type },
                        { id: 'css', label: 'Custom CSS', icon: Code },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveThemeTemplate(tab.id)}
                          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[2px] ${
                            activeThemeTemplate === tab.id
                              ? 'border-yellow-500 text-yellow-600 bg-white'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <tab.icon className="w-3.5 h-3.5" />
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Template Tags Toolbar */}
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-gray-500 mr-2">Insert Tag:</span>
                        {[
                          { tag: '{{product_name}}', label: 'Name', color: 'blue' },
                          { tag: '{{product_price}}', label: 'Price', color: 'green' },
                          { tag: '{{product_sku}}', label: 'SKU', color: 'purple' },
                          { tag: '{{product_description}}', label: 'Desc', color: 'orange' },
                          { tag: '{{product_images}}', label: 'Images', color: 'pink' },
                          { tag: '{{product_stock}}', label: 'Stock', color: 'cyan' },
                          { tag: '{{store_name}}', label: 'Store', color: 'yellow' },
                          { tag: '{{store_logo}}', label: 'Logo', color: 'indigo' },
                        ].map(item => (
                          <button
                            key={item.tag}
                            onClick={() => {
                              const textarea = document.getElementById('theme-code-editor');
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const currentTemplate = activeThemeTemplate === 'header' ? themeSettings.headerHTML :
                                  activeThemeTemplate === 'description' ? themeSettings.descriptionTemplate :
                                  activeThemeTemplate === 'specs' ? (themeSettings.specsTemplate || '') :
                                  activeThemeTemplate === 'footer' ? themeSettings.footerHTML :
                                  themeSettings.customCSS;
                                const newValue = currentTemplate.slice(0, start) + item.tag + currentTemplate.slice(end);
                                
                                if (activeThemeTemplate === 'header') {
                                  setThemeSettings(s => ({...s, headerHTML: newValue}));
                                } else if (activeThemeTemplate === 'description') {
                                  setThemeSettings(s => ({...s, descriptionTemplate: newValue}));
                                } else if (activeThemeTemplate === 'specs') {
                                  setThemeSettings(s => ({...s, specsTemplate: newValue}));
                                } else if (activeThemeTemplate === 'footer') {
                                  setThemeSettings(s => ({...s, footerHTML: newValue}));
                                } else {
                                  setThemeSettings(s => ({...s, customCSS: newValue}));
                                }
                              }
                            }}
                            className={`px-2 py-1 text-xs rounded-md border transition-colors bg-${item.color}-50 border-${item.color}-200 text-${item.color}-700 hover:bg-${item.color}-100`}
                            style={{
                              backgroundColor: item.color === 'blue' ? '#eff6ff' : item.color === 'green' ? '#f0fdf4' : item.color === 'purple' ? '#faf5ff' : item.color === 'orange' ? '#fff7ed' : item.color === 'pink' ? '#fdf2f8' : item.color === 'cyan' ? '#ecfeff' : item.color === 'yellow' ? '#fefce8' : '#eef2ff',
                              borderColor: item.color === 'blue' ? '#bfdbfe' : item.color === 'green' ? '#bbf7d0' : item.color === 'purple' ? '#e9d5ff' : item.color === 'orange' ? '#fed7aa' : item.color === 'pink' ? '#fbcfe8' : item.color === 'cyan' ? '#a5f3fc' : item.color === 'yellow' ? '#fef08a' : '#c7d2fe',
                              color: item.color === 'blue' ? '#1d4ed8' : item.color === 'green' ? '#15803d' : item.color === 'purple' ? '#7e22ce' : item.color === 'orange' ? '#c2410c' : item.color === 'pink' ? '#be185d' : item.color === 'cyan' ? '#0891b2' : item.color === 'yellow' ? '#a16207' : '#4338ca',
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      
                      {/* More Tags - Expandable */}
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">More tags...</summary>
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          {[
                            { tag: '{{product_brand}}', label: 'Brand' },
                            { tag: '{{product_category}}', label: 'Category' },
                            { tag: '{{product_weight}}', label: 'Weight' },
                            { tag: '{{product_dimensions}}', label: 'Dimensions' },
                            { tag: '{{product_condition}}', label: 'Condition' },
                            { tag: '{{product_upc}}', label: 'UPC' },
                            { tag: '{{product_mpn}}', label: 'MPN' },
                            { tag: '{{shipping_cost}}', label: 'Shipping' },
                            { tag: '{{return_policy}}', label: 'Returns' },
                            { tag: '{{store_email}}', label: 'Email' },
                            { tag: '{{store_phone}}', label: 'Phone' },
                            { tag: '{{current_date}}', label: 'Date' },
                            { tag: '{{listing_id}}', label: 'Listing ID' },
                          ].map(item => (
                            <button
                              key={item.tag}
                              onClick={() => {
                                const textarea = document.getElementById('theme-code-editor');
                                if (textarea) {
                                  const start = textarea.selectionStart;
                                  const currentTemplate = activeThemeTemplate === 'header' ? themeSettings.headerHTML :
                                    activeThemeTemplate === 'description' ? themeSettings.descriptionTemplate :
                                    activeThemeTemplate === 'specs' ? (themeSettings.specsTemplate || '') :
                                    activeThemeTemplate === 'footer' ? themeSettings.footerHTML :
                                    themeSettings.customCSS;
                                  const newValue = currentTemplate.slice(0, start) + item.tag + currentTemplate.slice(start);
                                  
                                  if (activeThemeTemplate === 'header') {
                                    setThemeSettings(s => ({...s, headerHTML: newValue}));
                                  } else if (activeThemeTemplate === 'description') {
                                    setThemeSettings(s => ({...s, descriptionTemplate: newValue}));
                                  } else if (activeThemeTemplate === 'specs') {
                                    setThemeSettings(s => ({...s, specsTemplate: newValue}));
                                  } else if (activeThemeTemplate === 'footer') {
                                    setThemeSettings(s => ({...s, footerHTML: newValue}));
                                  } else {
                                    setThemeSettings(s => ({...s, customCSS: newValue}));
                                  }
                                }
                              }}
                              className="px-2 py-1 text-xs rounded-md border bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </details>
                    </div>

                    {/* Formatting Toolbar */}
                    {activeThemeTemplate !== 'css' && (
                      <div className="p-2 border-b border-gray-100 flex items-center gap-1 bg-white">
                        <button className="p-1.5 rounded hover:bg-gray-100" title="Bold">
                          <Bold className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1.5 rounded hover:bg-gray-100" title="Italic">
                          <Italic className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1.5 rounded hover:bg-gray-100" title="Underline">
                          <Underline className="w-4 h-4 text-gray-600" />
                        </button>
                        <div className="w-px h-5 bg-gray-200 mx-1"></div>
                        <button className="p-1.5 rounded hover:bg-gray-100" title="Align Left">
                          <AlignLeft className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1.5 rounded hover:bg-gray-100" title="Align Center">
                          <AlignCenter className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1.5 rounded hover:bg-gray-100" title="Align Right">
                          <AlignRight className="w-4 h-4 text-gray-600" />
                        </button>
                        <div className="w-px h-5 bg-gray-200 mx-1"></div>
                        <button className="p-1.5 rounded hover:bg-gray-100" title="Numbered List">
                          <ListOrdered className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1.5 rounded hover:bg-gray-100" title="Bullet List">
                          <List className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1.5 rounded hover:bg-gray-100" title="Insert Link">
                          <Link2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1.5 rounded hover:bg-gray-100" title="Insert Image">
                          <ImageIcon className="w-4 h-4 text-gray-600" />
                        </button>
                        <div className="flex-1"></div>
                        <span className="text-xs text-gray-400">HTML</span>
                      </div>
                    )}

                    {/* Code Editor */}
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-50 border-r border-gray-200 flex flex-col text-right pr-2 pt-3 text-xs text-gray-400 font-mono select-none overflow-hidden">
                        {Array.from({ length: 30 }, (_, i) => (
                          <div key={i} className="h-5 leading-5">{i + 1}</div>
                        ))}
                      </div>
                      <textarea
                        id="theme-code-editor"
                        value={
                          activeThemeTemplate === 'header' ? themeSettings.headerHTML :
                          activeThemeTemplate === 'description' ? themeSettings.descriptionTemplate :
                          activeThemeTemplate === 'specs' ? (themeSettings.specsTemplate || `<div class="product-specs">
  <h3>Product Specifications</h3>
  <table class="specs-table">
    <tr><td>Brand</td><td>{{product_brand}}</td></tr>
    <tr><td>SKU</td><td>{{product_sku}}</td></tr>
    <tr><td>Condition</td><td>{{product_condition}}</td></tr>
    <tr><td>Weight</td><td>{{product_weight}}</td></tr>
  </table>
</div>`) :
                          activeThemeTemplate === 'footer' ? themeSettings.footerHTML :
                          themeSettings.customCSS
                        }
                        onChange={(e) => {
                          if (activeThemeTemplate === 'header') {
                            setThemeSettings(s => ({...s, headerHTML: e.target.value}));
                          } else if (activeThemeTemplate === 'description') {
                            setThemeSettings(s => ({...s, descriptionTemplate: e.target.value}));
                          } else if (activeThemeTemplate === 'specs') {
                            setThemeSettings(s => ({...s, specsTemplate: e.target.value}));
                          } else if (activeThemeTemplate === 'footer') {
                            setThemeSettings(s => ({...s, footerHTML: e.target.value}));
                          } else {
                            setThemeSettings(s => ({...s, customCSS: e.target.value}));
                          }
                        }}
                        className="w-full h-72 pl-12 pr-4 py-3 font-mono text-sm bg-gray-900 text-green-400 resize-none focus:outline-none"
                        style={{ lineHeight: '1.25rem', tabSize: 2 }}
                        spellCheck={false}
                        placeholder={activeThemeTemplate === 'css' ? '/* Enter your custom CSS here */' : '<!-- Enter your HTML template here -->'}
                      />
                    </div>

                    {/* Editor Footer */}
                    <div className="p-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-4">
                        <span>
                          {activeThemeTemplate === 'css' ? 'CSS' : 'HTML'} • UTF-8
                        </span>
                        <span>
                          {(activeThemeTemplate === 'header' ? themeSettings.headerHTML :
                          activeThemeTemplate === 'description' ? themeSettings.descriptionTemplate :
                          activeThemeTemplate === 'specs' ? (themeSettings.specsTemplate || '') :
                          activeThemeTemplate === 'footer' ? themeSettings.footerHTML :
                          themeSettings.customCSS).length} characters
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="hover:text-gray-700" title="Format Code">
                          <Sparkles className="w-4 h-4" />
                        </button>
                        <button className="hover:text-gray-700" title="Copy Code">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button className="hover:text-gray-700" title="Fullscreen">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick Settings Panel */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Colors */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <h4 className="font-medium text-gray-900 mb-3 text-sm flex items-center gap-2">
                        <Palette className="w-4 h-4 text-yellow-500" />
                        Theme Colors
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={themeSettings.primaryColor}
                            onChange={(e) => setThemeSettings(s => ({...s, primaryColor: e.target.value}))}
                            className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                          />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">Primary</p>
                            <p className="text-xs font-mono">{themeSettings.primaryColor}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={themeSettings.accentColor}
                            onChange={(e) => setThemeSettings(s => ({...s, accentColor: e.target.value}))}
                            className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                          />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">Accent</p>
                            <p className="text-xs font-mono">{themeSettings.accentColor}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={themeSettings.secondaryColor}
                            onChange={(e) => setThemeSettings(s => ({...s, secondaryColor: e.target.value}))}
                            className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                          />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">Background</p>
                            <p className="text-xs font-mono">{themeSettings.secondaryColor}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Typography */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <h4 className="font-medium text-gray-900 mb-3 text-sm flex items-center gap-2">
                        <Type className="w-4 h-4 text-yellow-500" />
                        Typography
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-gray-500">Font Family</Label>
                          <Select 
                            value={themeSettings.fontFamily}
                            onValueChange={(v) => setThemeSettings(s => ({...s, fontFamily: v}))}
                          >
                            <SelectTrigger className="mt-1 h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                              <SelectItem value="'Helvetica Neue', sans-serif">Helvetica</SelectItem>
                              <SelectItem value="Georgia, serif">Georgia</SelectItem>
                              <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                              <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                              <SelectItem value="'Trebuchet MS', sans-serif">Trebuchet</SelectItem>
                              <SelectItem value="'Segoe UI', sans-serif">Segoe UI</SelectItem>
                              <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Base Font Size</Label>
                          <Select 
                            value={themeSettings.fontSize || '14px'}
                            onValueChange={(v) => setThemeSettings(s => ({...s, fontSize: v}))}
                          >
                            <SelectTrigger className="mt-1 h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              <SelectItem value="12px">12px - Small</SelectItem>
                              <SelectItem value="14px">14px - Default</SelectItem>
                              <SelectItem value="16px">16px - Large</SelectItem>
                              <SelectItem value="18px">18px - Extra Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Display Options */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h4 className="font-medium text-gray-900 mb-3 text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4 text-yellow-500" />
                      Display Elements
                    </h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {[
                        { key: 'showBrandLogo', label: 'Brand Logo' },
                        { key: 'showTrustBadges', label: 'Trust Badges' },
                        { key: 'showShippingInfo', label: 'Shipping Info' },
                        { key: 'showReturnPolicy', label: 'Return Policy' },
                        { key: 'showPaymentIcons', label: 'Payment Icons' },
                        { key: 'showSocialLinks', label: 'Social Links' },
                        { key: 'showProductSpecs', label: 'Product Specs' },
                        { key: 'showStockLevel', label: 'Stock Level' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between py-1">
                          <Label className="text-sm text-gray-700">{item.label}</Label>
                          <Switch
                            checked={themeSettings[item.key] ?? true}
                            onCheckedChange={(c) => setThemeSettings(s => ({...s, [item.key]: c}))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Panel - Live Preview */}
                <div className="space-y-4">
                  {/* Preview Header */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-gray-500" />
                        <h4 className="font-medium text-gray-900 text-sm">Live Preview</h4>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className={`w-2 h-2 rounded-full ${themePreview === 'desktop' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        <span>{themePreview === 'desktop' ? '1200px' : themePreview === 'tablet' ? '768px' : '375px'}</span>
                      </div>
                    </div>
                    
                    {/* eBay Frame Simulation */}
                    <div className="p-4 bg-gray-100">
                      <div className={`mx-auto transition-all duration-300 ${
                        themePreview === 'desktop' ? 'max-w-full' : 
                        themePreview === 'tablet' ? 'max-w-md' : 'max-w-xs'
                      }`}>
                        {/* Simulated eBay Header */}
                        <div className="bg-white border border-gray-200 rounded-t-lg p-2 flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-400"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                          </div>
                          <div className="flex-1 bg-gray-100 rounded px-3 py-1 text-xs text-gray-500 flex items-center gap-2">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0110 0v4"></path>
                            </svg>
                            ebay.com/itm/123456789
                          </div>
                        </div>
                        
                        {/* Listing Preview */}
                        <div 
                          className="bg-white border-x border-b border-gray-200 rounded-b-lg overflow-hidden"
                          style={{fontFamily: themeSettings.fontFamily, fontSize: themeSettings.fontSize || '14px'}}
                        >
                          {/* Store Header */}
                          {themeSettings.showBrandLogo && (
                            <div 
                              className="p-4 text-white"
                              style={{backgroundColor: themeSettings.primaryColor}}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                  <span className="text-xl">🏪</span>
                                </div>
                                <div>
                                  <h2 className="font-bold">{'{{store_name}}'}</h2>
                                  <p className="text-sm opacity-80">Top Rated Seller • 99.8% Positive</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Product Content */}
                          <div className="p-4">
                            {/* Gallery */}
                            <div className="mb-4">
                              <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center relative overflow-hidden">
                                {previewProduct.images && previewProduct.images.length > 0 ? (
                                  <img 
                                    src={previewProduct.images[0]} 
                                    alt={previewProduct.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon className="w-16 h-16 text-gray-300" />
                                )}
                                <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                  1/{Math.max(previewProduct.images?.length || 1, 4)}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                {[0,1,2,3].map(i => (
                                  <div key={i} className={`w-16 h-16 bg-gray-100 rounded flex items-center justify-center border-2 overflow-hidden ${i === 0 ? 'border-yellow-500' : 'border-transparent'}`}>
                                    {previewProduct.images && previewProduct.images[i] ? (
                                      <img 
                                        src={previewProduct.images[i]} 
                                        alt={`${previewProduct.name} ${i+1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <ImageIcon className="w-6 h-6 text-gray-300" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Title & Price */}
                            <h3 className="font-bold text-lg text-gray-900 mb-2">
                              {previewProduct.name}
                            </h3>
                            <div className="flex items-center gap-3 mb-4 flex-wrap">
                              <span className="text-2xl font-bold" style={{color: themeSettings.accentColor}}>
                                ${previewProduct.price?.toFixed(2) || '0.00'}
                              </span>
                              {previewProduct.compare_price && previewProduct.compare_price > previewProduct.price && (
                                <>
                                  <span className="text-gray-400 line-through text-sm">
                                    ${previewProduct.compare_price.toFixed(2)}
                                  </span>
                                  <span 
                                    className="px-2 py-1 text-xs rounded font-medium"
                                    style={{backgroundColor: themeSettings.accentColor, color: 'white'}}
                                  >
                                    {Math.round((1 - previewProduct.price / previewProduct.compare_price) * 100)}% OFF
                                  </span>
                                </>
                              )}
                            </div>

                            {/* SKU & Condition */}
                            <div className="flex gap-4 mb-4 text-sm flex-wrap">
                              <div>
                                <span className="text-gray-500">SKU:</span>{' '}
                                <span className="font-mono text-gray-900">{previewProduct.sku}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Condition:</span>{' '}
                                <span className="text-green-600 font-medium">{previewProduct.condition}</span>
                              </div>
                              {previewProduct.brand && previewProduct.brand !== 'Unbranded' && (
                                <div>
                                  <span className="text-gray-500">Brand:</span>{' '}
                                  <span className="text-gray-900">{previewProduct.brand}</span>
                                </div>
                              )}
                            </div>

                            {/* Trust Badges */}
                            {themeSettings.showTrustBadges && (
                              <div className="flex gap-3 mb-4 p-3 rounded-lg flex-wrap" style={{backgroundColor: themeSettings.secondaryColor}}>
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <Shield className="w-4 h-4 text-green-500" />
                                  <span>Buyer Protection</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <Truck className="w-4 h-4 text-blue-500" />
                                  <span>Fast Shipping</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <RotateCcw className="w-4 h-4 text-purple-500" />
                                  <span>Easy Returns</span>
                                </div>
                              </div>
                            )}

                            {/* Stock Level */}
                            {themeSettings.showStockLevel && (
                              <div className="flex items-center gap-2 mb-4 text-sm">
                                <span className={`w-2 h-2 rounded-full ${previewProduct.stock > 10 ? 'bg-green-500' : previewProduct.stock > 0 ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                                <span className={previewProduct.stock > 10 ? 'text-green-600' : previewProduct.stock > 0 ? 'text-yellow-600' : 'text-red-600'}>
                                  {previewProduct.stock > 10 ? 'In Stock' : previewProduct.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-500">{previewProduct.stock} available</span>
                              </div>
                            )}
                                <span className="text-green-600">In Stock</span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-500">{'{{product_stock}}'} available</span>
                              </div>
                            )}

                            {/* Description */}
                            <div className="prose prose-sm text-gray-600 mb-4 border-t border-gray-100 pt-4">
                              <h4 className="font-semibold text-gray-900">Description</h4>
                              <p>{'{{product_description}}'}</p>
                            </div>

                            {/* Specifications */}
                            {themeSettings.showProductSpecs && (
                              <div className="mb-4 border-t border-gray-100 pt-4">
                                <h4 className="font-semibold text-gray-900 mb-2">Specifications</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div className="flex justify-between py-1 border-b border-gray-50">
                                    <span className="text-gray-500">Brand</span>
                                    <span>{'{{product_brand}}'}</span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-gray-50">
                                    <span className="text-gray-500">SKU</span>
                                    <span className="font-mono">{'{{product_sku}}'}</span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-gray-50">
                                    <span className="text-gray-500">Weight</span>
                                    <span>{'{{product_weight}}'}</span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-gray-50">
                                    <span className="text-gray-500">Dimensions</span>
                                    <span>{'{{product_dimensions}}'}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Shipping Info */}
                            {themeSettings.showShippingInfo && (
                              <div className="p-3 bg-blue-50 rounded-lg mb-4">
                                <div className="flex items-center gap-2 text-sm text-blue-700">
                                  <Truck className="w-4 h-4" />
                                  <span><strong>Free Shipping</strong> - Est. delivery: 3-5 business days</span>
                                </div>
                              </div>
                            )}

                            {/* Return Policy */}
                            {themeSettings.showReturnPolicy && (
                              <div className="p-3 bg-gray-50 rounded-lg mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <RotateCcw className="w-4 h-4" />
                                  <span><strong>30 Day Returns</strong> - Buyer pays return shipping</span>
                                </div>
                              </div>
                            )}

                            {/* Payment Icons */}
                            {themeSettings.showPaymentIcons && (
                              <div className="flex items-center gap-3 mb-4 text-gray-400">
                                <CreditCard className="w-8 h-8" />
                                <span className="text-2xl font-bold text-blue-600">PayPal</span>
                                <div className="w-10 h-6 bg-gradient-to-r from-red-500 via-yellow-500 to-red-500 rounded"></div>
                                <div className="w-10 h-6 bg-blue-900 rounded flex items-center justify-center text-white text-xs font-bold">VISA</div>
                              </div>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="p-4 border-t border-gray-200 text-center text-sm text-gray-500" style={{backgroundColor: themeSettings.secondaryColor}}>
                            <p>Thank you for shopping with {'{{store_name}}'}!</p>
                            <p className="text-xs mt-1">Contact: {'{{store_email}}'}</p>
                            {themeSettings.showSocialLinks && (
                              <div className="flex justify-center gap-3 mt-2">
                                <Globe className="w-4 h-4 text-gray-400" />
                                <span className="w-4 h-4 text-blue-500">f</span>
                                <span className="w-4 h-4 text-pink-500">📷</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Template Presets */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h4 className="font-medium text-gray-900 mb-3 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      Quick Templates
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'minimal', name: 'Minimal', preview: '🎯' },
                        { id: 'professional', name: 'Professional', preview: '💼' },
                        { id: 'modern', name: 'Modern', preview: '✨' },
                        { id: 'classic', name: 'Classic', preview: '📜' },
                        { id: 'bold', name: 'Bold', preview: '🔥' },
                        { id: 'elegant', name: 'Elegant', preview: '👑' },
                      ].map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            // Apply preset theme settings
                            if (preset.id === 'minimal') {
                              setThemeSettings(s => ({
                                ...s,
                                primaryColor: '#1f2937',
                                accentColor: '#3b82f6',
                                secondaryColor: '#f9fafb',
                                showBrandLogo: false,
                                showTrustBadges: false,
                                showSocialLinks: false
                              }));
                            } else if (preset.id === 'professional') {
                              setThemeSettings(s => ({
                                ...s,
                                primaryColor: '#1e3a5f',
                                accentColor: '#0ea5e9',
                                secondaryColor: '#f0f9ff',
                                showBrandLogo: true,
                                showTrustBadges: true,
                                showPaymentIcons: true
                              }));
                            } else if (preset.id === 'bold') {
                              setThemeSettings(s => ({
                                ...s,
                                primaryColor: '#dc2626',
                                accentColor: '#f97316',
                                secondaryColor: '#fef2f2',
                                showBrandLogo: true,
                                showTrustBadges: true
                              }));
                            }
                          }}
                          className="p-3 border border-gray-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors text-center"
                        >
                          <span className="text-2xl mb-1 block">{preset.preview}</span>
                          <span className="text-xs text-gray-600">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Categories Mapping Tab */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Category Mapping</h3>
                  <p className="text-sm text-gray-500">Map your store categories to eBay categories</p>
                </div>
                <Button 
                  onClick={() => setShowCategoryModal(true)}
                  className="bg-yellow-500 hover:bg-yellow-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Mapping
                </Button>
              </div>

              {/* Category Mappings Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Your Category</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                        <ArrowLeftRight className="w-4 h-4 inline mr-1" />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">eBay Category</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Products</th>
                      <th className="w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Sample mappings */}
                    {[
                      { local: 'Electronics', ebay: 'Consumer Electronics', ebayId: '293', count: 45 },
                      { local: 'Clothing', ebay: 'Clothing, Shoes & Accessories', ebayId: '11450', count: 120 },
                      { local: 'Home & Garden', ebay: 'Home & Garden', ebayId: '11700', count: 78 },
                      { local: 'Sports', ebay: 'Sporting Goods', ebayId: '888', count: 34 },
                    ].map((mapping, idx) => (
                      <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FolderTree className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{mapping.local}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ArrowRight className="w-4 h-4 text-gray-300" />
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <span className="text-sm text-gray-900">{mapping.ebay}</span>
                            <span className="text-xs text-gray-400 ml-2">({mapping.ebayId})</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                            {mapping.count} products
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4 text-gray-400" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Auto-Map Section */}
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">Auto-Map Categories</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Let us automatically suggest eBay categories based on your product names and descriptions.
                    </p>
                    <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                      <Zap className="w-4 h-4 mr-2" />
                      Run Auto-Mapping
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Rules Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Pricing Rules</h3>
                  <p className="text-sm text-gray-500">Set up automatic price adjustments for eBay listings</p>
                </div>
                <Button 
                  onClick={() => setShowPricingRuleModal(true)}
                  className="bg-yellow-500 hover:bg-yellow-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Rule
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Default Pricing */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-yellow-500" />
                    Default Pricing
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-700">Markup Type</Label>
                      <Select 
                        value={pricingRules.default_markup_type}
                        onValueChange={(v) => setPricingRules(r => ({...r, default_markup_type: v}))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                          <SelectItem value="none">No Markup</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-700">
                        Markup Value {pricingRules.default_markup_type === 'percentage' ? '(%)' : '($)'}
                      </Label>
                      <Input
                        type="number"
                        value={pricingRules.default_markup_value}
                        onChange={(e) => setPricingRules(r => ({...r, default_markup_value: parseFloat(e.target.value) || 0}))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-700">Round to Nearest</Label>
                      <Select 
                        value={pricingRules.round_to_nearest.toString()}
                        onValueChange={(v) => setPricingRules(r => ({...r, round_to_nearest: parseFloat(v)}))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="0">No Rounding</SelectItem>
                          <SelectItem value="0.99">$X.99</SelectItem>
                          <SelectItem value="0.95">$X.95</SelectItem>
                          <SelectItem value="1">Whole Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-700">Minimum Price ($)</Label>
                      <Input
                        type="number"
                        value={pricingRules.minimum_price}
                        onChange={(e) => setPricingRules(r => ({...r, minimum_price: parseFloat(e.target.value) || 0}))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Price Calculator */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-yellow-500" />
                    Price Calculator
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-700">Your Price</Label>
                      <Input type="number" placeholder="100.00" className="mt-1" />
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500">Your Price</span>
                        <span className="text-gray-900">$100.00</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500">Markup (10%)</span>
                        <span className="text-gray-900">+$10.00</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500">eBay Fees (~13%)</span>
                        <span className="text-red-600">-$14.30</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="flex justify-between font-medium">
                          <span className="text-gray-900">eBay Price</span>
                          <span className="text-yellow-600">$109.99</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Your Profit</span>
                          <span className="text-emerald-600">$95.69</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Rules */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900">Custom Pricing Rules</h4>
                  <p className="text-sm text-gray-500">Rules are applied in order from top to bottom</p>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Rule Name</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Condition</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Adjustment</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                      <th className="w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Clearance Items', condition: 'Tag = Clearance', adjustment: '-15%', active: true },
                      { name: 'Premium Products', condition: 'Price > $500', adjustment: '+5%', active: true },
                      { name: 'Electronics', condition: 'Category = Electronics', adjustment: '+8%', active: false },
                    ].map((rule, idx) => (
                      <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{rule.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{rule.condition}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            rule.adjustment.startsWith('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {rule.adjustment}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Switch checked={rule.active} />
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Inventory Rules Tab */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900">Inventory Management</h3>
                <p className="text-sm text-gray-500">Configure how inventory syncs between your store and eBay</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sync Settings */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-yellow-500" />
                    Sync Settings
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-700">Sync Direction</Label>
                      <Select 
                        value={inventoryRules.sync_direction}
                        onValueChange={(v) => setInventoryRules(r => ({...r, sync_direction: v}))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="push">Push to eBay (Your Store → eBay)</SelectItem>
                          <SelectItem value="pull">Pull from eBay (eBay → Your Store)</SelectItem>
                          <SelectItem value="both">Two-way Sync</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Sync on Order</p>
                        <p className="text-xs text-gray-500">Update stock when orders are placed</p>
                      </div>
                      <Switch
                        checked={inventoryRules.sync_on_order}
                        onCheckedChange={(c) => setInventoryRules(r => ({...r, sync_on_order: c}))}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Sync on Stock Change</p>
                        <p className="text-xs text-gray-500">Update eBay when you adjust inventory</p>
                      </div>
                      <Switch
                        checked={inventoryRules.sync_on_stock_change}
                        onCheckedChange={(c) => setInventoryRules(r => ({...r, sync_on_stock_change: c}))}
                      />
                    </div>
                  </div>
                </div>

                {/* Stock Rules */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Box className="w-4 h-4 text-yellow-500" />
                    Stock Rules
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-700">Buffer Stock</Label>
                      <Input
                        type="number"
                        value={inventoryRules.buffer_stock}
                        onChange={(e) => setInventoryRules(r => ({...r, buffer_stock: parseInt(e.target.value) || 0}))}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">Reserve this many units (not listed on eBay)</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-700">Out of Stock Action</Label>
                      <Select 
                        value={inventoryRules.out_of_stock_action}
                        onValueChange={(v) => setInventoryRules(r => ({...r, out_of_stock_action: v}))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="set_zero">Set quantity to 0</SelectItem>
                          <SelectItem value="end_listing">End listing</SelectItem>
                          <SelectItem value="out_of_stock">Mark as out of stock</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-700">Low Stock Alert Threshold</Label>
                      <Input
                        type="number"
                        value={inventoryRules.low_stock_threshold}
                        onChange={(e) => setInventoryRules(r => ({...r, low_stock_threshold: parseInt(e.target.value) || 0}))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventory Status */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h4 className="font-medium text-gray-900 mb-4">Inventory Status</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-emerald-600">156</p>
                    <p className="text-sm text-emerald-700">In Stock</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-600">23</p>
                    <p className="text-sm text-yellow-700">Low Stock</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-600">8</p>
                    <p className="text-sm text-red-700">Out of Stock</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">12</p>
                    <p className="text-sm text-blue-700">Pending Sync</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">eBay Analytics</h3>
                  <p className="text-sm text-gray-500">Track your eBay sales performance</p>
                </div>
                <Select value={analyticsDateRange} onValueChange={setAnalyticsDateRange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="365d">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Total Sales</span>
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">$12,450</p>
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" /> +15% vs last period
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Orders</span>
                    <ShoppingCart className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">87</p>
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" /> +8% vs last period
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Avg Order Value</span>
                    <BarChart3 className="w-4 h-4 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">$143.10</p>
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" /> +6% vs last period
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Conversion Rate</span>
                    <Percent className="w-4 h-4 text-yellow-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">4.2%</p>
                  <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 rotate-180" /> -2% vs last period
                  </p>
                </div>
              </div>

              {/* Charts Placeholder */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Sales Over Time</h4>
                  <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Sales chart visualization</p>
                      <p className="text-xs text-gray-300">Connect eBay to see real data</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Top Selling Products</h4>
                  <div className="space-y-3">
                    {[
                      { name: 'Premium Wireless Headphones', sales: 23, revenue: '$2,069.77' },
                      { name: 'Smart Watch Pro', sales: 18, revenue: '$3,599.82' },
                      { name: 'Bluetooth Speaker', sales: 15, revenue: '$1,199.85' },
                      { name: 'USB-C Hub Adapter', sales: 12, revenue: '$479.88' },
                      { name: 'Laptop Stand', sales: 10, revenue: '$349.90' },
                    ].map((product, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center text-xs font-medium">
                            {idx + 1}
                          </span>
                          <span className="text-sm text-gray-900">{product.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{product.revenue}</p>
                          <p className="text-xs text-gray-400">{product.sales} sold</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
