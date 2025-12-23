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

  // Store Settings State (for theme preview)
  const [storeSettings, setStoreSettings] = useState(null);
  const [storeLogoBase64, setStoreLogoBase64] = useState(null);

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
        images: [
          'https://placehold.co/600x600/e8e8e8/666?text=Product+Image+1',
          'https://placehold.co/600x600/f0f0f0/666?text=Product+Image+2',
          'https://placehold.co/600x600/e0e0e0/666?text=Product+Image+3',
          'https://placehold.co/600x600/d8d8d8/666?text=Product+Image+4'
        ],
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

  // Fetch store settings (for theme preview logo)
  const fetchStoreSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/store/settings`);
      const settings = response.data || null;
      setStoreSettings(settings);
      
      // Convert logo to base64 for iframe preview (to avoid CORS issues)
      if (settings?.store_logo) {
        try {
          const logoResponse = await fetch(settings.store_logo);
          const blob = await logoResponse.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            setStoreLogoBase64(reader.result);
          };
          reader.readAsDataURL(blob);
        } catch (logoError) {
          console.warn('Could not convert logo to base64 for preview:', logoError);
          setStoreLogoBase64(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch store settings:', error);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    // Fetch products and store settings when theme tab is active (for preview selector and logo)
    if (activeTab === 'theme') {
      fetchProducts();
      fetchStoreSettings();
    }
    if (status?.connected) {
      fetchSettings();
      if (activeTab === 'listings') fetchListings();
      if (activeTab === 'orders') fetchOrders();
    }
  }, [status?.connected, activeTab, fetchSettings, fetchListings, fetchOrders, fetchProducts, fetchStoreSettings]);

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

  // eBay Listing Templates - Full HTML Code
  const EBAY_TEMPLATES = {
    modern: {
      name: 'Modern Clean',
      description: 'Minimalist design with clean lines and focus on product images',
      preview: '✨',
      html: `<!-- MODERN CLEAN TEMPLATE -->
<div style="max-width: 900px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.6;">
  
  <!-- Store Header -->
  <div style="background: linear-gradient(135deg, {{primary_color}} 0%, #1a1a2e 100%); padding: 25px 30px; border-radius: 12px 12px 0 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          {{#if_store_logo}}<img src="{{store_logo}}" alt="{{store_name}}" style="height: 50px; border-radius: 8px;" />{{/if_store_logo}}
        </td>
        <td align="right" style="color: #fff;">
          <div style="font-size: 18px; font-weight: 600;">{{store_name}}</div>
          <div style="font-size: 12px; opacity: 0.8;">⭐ Top Rated Seller • 99.8% Positive Feedback</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Main Content -->
  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    
    <!-- Product Images Gallery - Only shows if images exist -->
    {{#if_has_images}}
    <div style="margin-bottom: 30px;">
      <div style="display: flex; gap: 15px; flex-wrap: wrap;">
        <!-- Main Image -->
        {{#if_image_1}}
        <div style="flex: 0 0 400px; max-width: 100%;">
          <img src="{{product_image_1}}" alt="{{product_name}}" style="width: 100%; height: auto; border-radius: 12px; border: 1px solid #eee;" />
        </div>
        {{/if_image_1}}
        <!-- Thumbnail Grid -->
        <div style="display: flex; flex-wrap: wrap; gap: 10px; flex: 1; min-width: 200px;">
          {{#if_image_2}}<img src="{{product_image_2}}" alt="{{product_name}} - Image 2" style="width: 90px; height: 90px; object-fit: cover; border-radius: 8px; border: 2px solid #eee; cursor: pointer;" />{{/if_image_2}}
          {{#if_image_3}}<img src="{{product_image_3}}" alt="{{product_name}} - Image 3" style="width: 90px; height: 90px; object-fit: cover; border-radius: 8px; border: 2px solid #eee; cursor: pointer;" />{{/if_image_3}}
          {{#if_image_4}}<img src="{{product_image_4}}" alt="{{product_name}} - Image 4" style="width: 90px; height: 90px; object-fit: cover; border-radius: 8px; border: 2px solid #eee; cursor: pointer;" />{{/if_image_4}}
        </div>
      </div>
    </div>
    {{/if_has_images}}

    <!-- Product Title -->
    <h1 style="font-size: 24px; font-weight: 600; color: #1a1a2e; margin: 0 0 20px 0; padding-bottom: 15px; border-bottom: 2px solid {{primary_color}};">
      {{product_name}}
    </h1>

    <!-- Price & Stock -->
    <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 25px; flex-wrap: wrap;">
      <span style="font-size: 32px; font-weight: 700; color: {{accent_color}};">{{product_price}}</span>
      <span style="background: #e8f5e9; color: #2e7d32; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500;">
        ✓ {{product_stock}} In Stock
      </span>
      <span style="background: #fff3e0; color: #ef6c00; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500;">
        🔥 Hot Item
      </span>
    </div>

    <!-- Trust Badges -->
    <div style="display: flex; gap: 15px; margin-bottom: 30px; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #f8f9fa; border-radius: 8px;">
        <span style="font-size: 18px;">🛡️</span>
        <span style="font-size: 13px; color: #555;">Buyer Protection</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #f8f9fa; border-radius: 8px;">
        <span style="font-size: 18px;">🚚</span>
        <span style="font-size: 13px; color: #555;">Fast Shipping</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #f8f9fa; border-radius: 8px;">
        <span style="font-size: 18px;">↩️</span>
        <span style="font-size: 13px; color: #555;">30-Day Returns</span>
      </div>
    </div>

    <!-- Product Description -->
    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 18px; color: #1a1a2e; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 1px solid #eee;">
        📋 Product Description
      </h2>
      <div style="color: #555; font-size: 15px;">
        {{product_description}}
      </div>
    </div>

    <!-- Specifications -->
    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 18px; color: #1a1a2e; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 1px solid #eee;">
        📊 Specifications
      </h2>
      <table width="100%" cellpadding="12" cellspacing="0" style="border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
        <tr style="background: #f8f9fa;">
          <td style="border-bottom: 1px solid #eee; font-weight: 500; width: 30%;">Brand</td>
          <td style="border-bottom: 1px solid #eee;">{{product_brand}}</td>
        </tr>
        <tr>
          <td style="border-bottom: 1px solid #eee; font-weight: 500;">SKU</td>
          <td style="border-bottom: 1px solid #eee; font-family: monospace;">{{product_sku}}</td>
        </tr>
        <tr style="background: #f8f9fa;">
          <td style="border-bottom: 1px solid #eee; font-weight: 500;">Condition</td>
          <td style="border-bottom: 1px solid #eee;">{{product_condition}}</td>
        </tr>
        <tr>
          <td style="border-bottom: 1px solid #eee; font-weight: 500;">Weight</td>
          <td style="border-bottom: 1px solid #eee;">{{product_weight}}</td>
        </tr>
        <tr style="background: #f8f9fa;">
          <td style="font-weight: 500;">Dimensions</td>
          <td>{{product_dimensions}}</td>
        </tr>
      </table>
    </div>

    <!-- Shipping Info -->
    <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 20px; border-radius: 10px; margin-bottom: 30px;">
      <div style="font-weight: 600; color: #1565c0; margin-bottom: 8px;">🚚 Shipping Information</div>
      <div style="color: #1976d2; font-size: 14px;">{{shipping_cost}} • Estimated delivery: 3-5 business days</div>
    </div>

    <!-- Return Policy -->
    <div style="background: #f5f5f5; padding: 20px; border-radius: 10px;">
      <div style="font-weight: 600; color: #555; margin-bottom: 8px;">↩️ Return Policy</div>
      <div style="color: #666; font-size: 14px;">{{return_policy}}</div>
    </div>
  </div>

  <!-- Footer -->
  <div style="background: #1a1a2e; color: #fff; padding: 25px 30px; border-radius: 0 0 12px 12px; text-align: center;">
    <div style="font-size: 16px; margin-bottom: 8px;">Thank you for shopping with {{store_name}}!</div>
    <div style="font-size: 13px; opacity: 0.7;">📧 {{store_email}} • 📞 {{store_phone}}</div>
  </div>

</div>
<!-- END MODERN CLEAN TEMPLATE -->`
    },

    professional: {
      name: 'Professional Business',
      description: 'Corporate style perfect for B2B and professional products',
      preview: '💼',
      html: `<!-- PROFESSIONAL BUSINESS TEMPLATE -->
<div style="max-width: 950px; margin: 0 auto; font-family: 'Arial', sans-serif; color: #2c3e50; background: #fff;">

  <!-- Corporate Header -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background: {{primary_color}}; border-bottom: 4px solid {{accent_color}};">
    <tr>
      <td style="padding: 20px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="200">
              <img src="{{store_logo}}" alt="{{store_name}}" style="height: 60px;" />
            </td>
            <td align="right" style="color: #fff; vertical-align: middle;">
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8;">Authorized Dealer</div>
              <div style="font-size: 20px; font-weight: bold;">{{store_name}}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Product Images Gallery -->
  <div style="padding: 30px; background: #f8f9fa;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="60%" style="vertical-align: top; padding-right: 20px;">
          <img src="{{product_image_1}}" alt="{{product_name}}" style="width: 100%; border-radius: 8px; border: 1px solid #dee2e6;" />
        </td>
        <td width="40%" style="vertical-align: top;">
          <table width="100%" cellpadding="5" cellspacing="0">
            <tr>
              <td width="50%"><img src="{{product_image_2}}" alt="{{product_name}}" style="width: 100%; border-radius: 6px; border: 1px solid #dee2e6;" /></td>
              <td width="50%"><img src="{{product_image_3}}" alt="{{product_name}}" style="width: 100%; border-radius: 6px; border: 1px solid #dee2e6;" /></td>
            </tr>
            <tr>
              <td width="50%"><img src="{{product_image_4}}" alt="{{product_name}}" style="width: 100%; border-radius: 6px; border: 1px solid #dee2e6;" /></td>
              <td width="50%"><img src="{{product_image_5}}" alt="{{product_name}}" style="width: 100%; border-radius: 6px; border: 1px solid #dee2e6;" /></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>

  <!-- Product Header Bar -->
  <div style="background: #f8f9fa; padding: 15px 30px; border-bottom: 1px solid #dee2e6;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size: 12px; color: #6c757d;">
          SKU: <strong style="color: #2c3e50;">{{product_sku}}</strong> &nbsp;|&nbsp; 
          Category: <strong style="color: #2c3e50;">{{product_category}}</strong>
        </td>
        <td align="right">
          <span style="background: #28a745; color: #fff; padding: 5px 12px; border-radius: 3px; font-size: 11px; font-weight: bold;">
            ✓ IN STOCK
          </span>
        </td>
      </tr>
    </table>
  </div>

  <!-- Main Content Area -->
  <div style="padding: 30px;">
    
    <!-- Product Title -->
    <h1 style="font-size: 28px; font-weight: bold; color: #1a252f; margin: 0 0 10px 0; line-height: 1.3;">
      {{product_name}}
    </h1>
    <div style="font-size: 14px; color: #6c757d; margin-bottom: 25px;">
      by <strong>{{product_brand}}</strong> &nbsp;|&nbsp; Condition: <strong>{{product_condition}}</strong>
    </div>

    <!-- Price Box -->
    <div style="background: linear-gradient(to right, #f8f9fa, #fff); border: 2px solid {{primary_color}}; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-size: 14px; color: #6c757d; margin-bottom: 5px;">Your Price</div>
            <div style="font-size: 36px; font-weight: bold; color: {{accent_color}};">{{product_price}}</div>
          </td>
          <td align="right" style="vertical-align: bottom;">
            <div style="font-size: 13px; color: #28a745;">
              ✓ Quantity Available: {{product_stock}}<br/>
              ✓ Usually ships within 24 hours
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Quick Info Cards -->
    <table width="100%" cellpadding="10" cellspacing="0" style="margin-bottom: 30px;">
      <tr>
        <td width="33%" style="background: #e8f5e9; padding: 15px; border-radius: 6px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 5px;">🛡️</div>
          <div style="font-size: 12px; font-weight: bold; color: #2e7d32;">BUYER PROTECTION</div>
          <div style="font-size: 11px; color: #388e3c;">Money Back Guarantee</div>
        </td>
        <td width="33%" style="background: #e3f2fd; padding: 15px; border-radius: 6px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 5px;">🚚</div>
          <div style="font-size: 12px; font-weight: bold; color: #1565c0;">FAST SHIPPING</div>
          <div style="font-size: 11px; color: #1976d2;">{{shipping_cost}}</div>
        </td>
        <td width="33%" style="background: #fff3e0; padding: 15px; border-radius: 6px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 5px;">↩️</div>
          <div style="font-size: 12px; font-weight: bold; color: #e65100;">EASY RETURNS</div>
          <div style="font-size: 11px; color: #ef6c00;">30-Day Policy</div>
        </td>
      </tr>
    </table>

    <!-- Description Section -->
    <div style="margin-bottom: 30px;">
      <div style="background: {{primary_color}}; color: #fff; padding: 12px 20px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
        Product Description
      </div>
      <div style="border: 1px solid #dee2e6; border-top: none; padding: 20px; background: #fff;">
        {{product_description}}
      </div>
    </div>

    <!-- Technical Specifications -->
    <div style="margin-bottom: 30px;">
      <div style="background: {{primary_color}}; color: #fff; padding: 12px 20px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
        Technical Specifications
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #dee2e6; border-top: none;">
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #dee2e6; background: #f8f9fa; font-weight: bold; width: 200px;">Brand</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #dee2e6;">{{product_brand}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #dee2e6; background: #f8f9fa; font-weight: bold;">Model / SKU</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #dee2e6; font-family: monospace;">{{product_sku}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #dee2e6; background: #f8f9fa; font-weight: bold;">UPC / EAN</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #dee2e6; font-family: monospace;">{{product_upc}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #dee2e6; background: #f8f9fa; font-weight: bold;">MPN</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #dee2e6; font-family: monospace;">{{product_mpn}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #dee2e6; background: #f8f9fa; font-weight: bold;">Weight</td>
          <td style="padding: 12px 20px; border-bottom: 1px solid #dee2e6;">{{product_weight}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; background: #f8f9fa; font-weight: bold;">Dimensions</td>
          <td style="padding: 12px 20px;">{{product_dimensions}}</td>
        </tr>
      </table>
    </div>

    <!-- Shipping & Returns -->
    <table width="100%" cellpadding="0" cellspacing="15">
      <tr>
        <td width="50%" valign="top">
          <div style="border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden;">
            <div style="background: #e3f2fd; padding: 12px 15px; font-weight: bold; color: #1565c0;">
              📦 Shipping Information
            </div>
            <div style="padding: 15px; font-size: 13px; color: #555;">
              {{shipping_cost}}<br/>
              Estimated delivery: 3-5 business days<br/>
              Ships from: United States
            </div>
          </div>
        </td>
        <td width="50%" valign="top">
          <div style="border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden;">
            <div style="background: #fff3e0; padding: 12px 15px; font-weight: bold; color: #e65100;">
              ↩️ Return Policy
            </div>
            <div style="padding: 15px; font-size: 13px; color: #555;">
              {{return_policy}}<br/>
              Buyer pays return shipping<br/>
              Refund or replacement available
            </div>
          </div>
        </td>
      </tr>
    </table>

  </div>

  <!-- Footer -->
  <div style="background: #2c3e50; color: #fff; padding: 25px 30px; text-align: center;">
    <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">{{store_name}}</div>
    <div style="font-size: 12px; opacity: 0.8;">
      Questions? Contact us: {{store_email}} | {{store_phone}}
    </div>
    <div style="font-size: 11px; opacity: 0.6; margin-top: 10px;">
      © {{current_date}} {{store_name}}. All Rights Reserved.
    </div>
  </div>

</div>
<!-- END PROFESSIONAL BUSINESS TEMPLATE -->`
    },

    boutique: {
      name: 'Luxury Boutique',
      description: 'Elegant design for premium and luxury products',
      preview: '👑',
      html: `<!-- LUXURY BOUTIQUE TEMPLATE -->
<div style="max-width: 900px; margin: 0 auto; font-family: 'Georgia', 'Times New Roman', serif; color: #333; background: #fff;">

  <!-- Elegant Header -->
  <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 40px; text-align: center; border-bottom: 3px solid {{accent_color}};">
    <img src="{{store_logo}}" alt="{{store_name}}" style="height: 70px; margin-bottom: 15px;" />
    <div style="color: {{accent_color}}; font-size: 14px; letter-spacing: 3px; text-transform: uppercase;">Premium Collection</div>
  </div>

  <!-- Gold Accent Bar -->
  <div style="height: 4px; background: linear-gradient(90deg, transparent, {{accent_color}}, transparent);"></div>

  <!-- Main Content -->
  <div style="padding: 50px 40px; background: #fafafa;">
    
    <!-- Luxury Image Gallery -->
    <div style="margin-bottom: 50px; text-align: center;">
      <img src="{{product_image_1}}" alt="{{product_name}}" style="max-width: 100%; width: 500px; border: 8px solid #fff; box-shadow: 0 10px 40px rgba(0,0,0,0.1);" />
      <div style="display: flex; justify-content: center; gap: 15px; margin-top: 20px; flex-wrap: wrap;">
        <img src="{{product_image_2}}" alt="{{product_name}}" style="width: 100px; height: 100px; object-fit: cover; border: 3px solid #fff; box-shadow: 0 3px 10px rgba(0,0,0,0.1); cursor: pointer;" />
        <img src="{{product_image_3}}" alt="{{product_name}}" style="width: 100px; height: 100px; object-fit: cover; border: 3px solid #fff; box-shadow: 0 3px 10px rgba(0,0,0,0.1); cursor: pointer;" />
        <img src="{{product_image_4}}" alt="{{product_name}}" style="width: 100px; height: 100px; object-fit: cover; border: 3px solid #fff; box-shadow: 0 3px 10px rgba(0,0,0,0.1); cursor: pointer;" />
        <img src="{{product_image_5}}" alt="{{product_name}}" style="width: 100px; height: 100px; object-fit: cover; border: 3px solid #fff; box-shadow: 0 3px 10px rgba(0,0,0,0.1); cursor: pointer;" />
      </div>
    </div>

    <!-- Product Title -->
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="font-size: 12px; color: {{accent_color}}; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px;">
        {{product_brand}}
      </div>
      <h1 style="font-size: 32px; font-weight: normal; color: #1a1a1a; margin: 0; line-height: 1.4;">
        {{product_name}}
      </h1>
      <div style="width: 60px; height: 2px; background: {{accent_color}}; margin: 20px auto;"></div>
    </div>

    <!-- Price Display -->
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="font-size: 42px; color: #1a1a1a; font-weight: 300; letter-spacing: 2px;">
        {{product_price}}
      </div>
      <div style="font-size: 13px; color: #888; margin-top: 10px;">
        Free Express Shipping Worldwide
      </div>
    </div>

    <!-- Luxury Features -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 50px;">
      <tr>
        <td width="25%" style="text-align: center; padding: 20px;">
          <div style="font-size: 28px; margin-bottom: 10px;">✨</div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666;">Authentic</div>
        </td>
        <td width="25%" style="text-align: center; padding: 20px; border-left: 1px solid #ddd;">
          <div style="font-size: 28px; margin-bottom: 10px;">🎁</div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666;">Gift Wrapped</div>
        </td>
        <td width="25%" style="text-align: center; padding: 20px; border-left: 1px solid #ddd;">
          <div style="font-size: 28px; margin-bottom: 10px;">🚚</div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666;">Express Ship</div>
        </td>
        <td width="25%" style="text-align: center; padding: 20px; border-left: 1px solid #ddd;">
          <div style="font-size: 28px; margin-bottom: 10px;">🛡️</div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666;">Guaranteed</div>
        </td>
      </tr>
    </table>

    <!-- Description -->
    <div style="background: #fff; padding: 40px; border: 1px solid #e0e0e0; margin-bottom: 30px;">
      <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: {{accent_color}}; margin: 0 0 20px 0; font-weight: normal;">
        About This Piece
      </h2>
      <div style="font-size: 15px; line-height: 1.8; color: #555;">
        {{product_description}}
      </div>
    </div>

    <!-- Details Grid -->
    <div style="background: #fff; border: 1px solid #e0e0e0; margin-bottom: 30px;">
      <div style="background: #1a1a1a; color: #fff; padding: 15px 25px;">
        <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Product Details</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 18px 25px; border-bottom: 1px solid #eee; color: #888; width: 40%;">Reference</td>
          <td style="padding: 18px 25px; border-bottom: 1px solid #eee; font-family: monospace;">{{product_sku}}</td>
        </tr>
        <tr>
          <td style="padding: 18px 25px; border-bottom: 1px solid #eee; color: #888;">Brand</td>
          <td style="padding: 18px 25px; border-bottom: 1px solid #eee;">{{product_brand}}</td>
        </tr>
        <tr>
          <td style="padding: 18px 25px; border-bottom: 1px solid #eee; color: #888;">Condition</td>
          <td style="padding: 18px 25px; border-bottom: 1px solid #eee;">{{product_condition}}</td>
        </tr>
        <tr>
          <td style="padding: 18px 25px; color: #888;">Availability</td>
          <td style="padding: 18px 25px; color: #2e7d32;">{{product_stock}} Available</td>
        </tr>
      </table>
    </div>

    <!-- Shipping & Returns -->
    <table width="100%" cellpadding="0" cellspacing="15" style="margin-bottom: 30px;">
      <tr>
        <td width="50%" valign="top" style="background: #fff; border: 1px solid #e0e0e0; padding: 25px;">
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: {{accent_color}}; margin-bottom: 15px;">
            Shipping
          </div>
          <div style="font-size: 14px; color: #555; line-height: 1.7;">
            {{shipping_cost}}<br/>
            Express delivery within 2-4 business days<br/>
            Signature required on delivery
          </div>
        </td>
        <td width="50%" valign="top" style="background: #fff; border: 1px solid #e0e0e0; padding: 25px;">
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: {{accent_color}}; margin-bottom: 15px;">
            Returns
          </div>
          <div style="font-size: 14px; color: #555; line-height: 1.7;">
            {{return_policy}}<br/>
            Free return shipping<br/>
            Full refund guaranteed
          </div>
        </td>
      </tr>
    </table>

  </div>

  <!-- Footer -->
  <div style="background: #1a1a1a; color: #fff; padding: 40px; text-align: center;">
    <div style="font-size: 20px; margin-bottom: 10px; font-weight: 300;">{{store_name}}</div>
    <div style="font-size: 12px; color: {{accent_color}}; letter-spacing: 2px; margin-bottom: 15px;">LUXURY RETAIL</div>
    <div style="font-size: 12px; color: #888;">
      {{store_email}} • {{store_phone}}
    </div>
  </div>

</div>
<!-- END LUXURY BOUTIQUE TEMPLATE -->`
    },

    tech: {
      name: 'Tech Store',
      description: 'Modern tech-focused design with specs highlights',
      preview: '🔧',
      html: `<!-- TECH STORE TEMPLATE -->
<div style="max-width: 950px; margin: 0 auto; font-family: 'Roboto', 'Arial', sans-serif; color: #e0e0e0; background: #121212;">

  <!-- Tech Header -->
  <div style="background: linear-gradient(180deg, #1e1e1e 0%, #121212 100%); padding: 25px 30px; border-bottom: 2px solid {{accent_color}};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <img src="{{store_logo}}" alt="{{store_name}}" style="height: 45px;" />
        </td>
        <td align="right">
          <span style="color: {{accent_color}}; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            🔌 Tech Specialist
          </span>
        </td>
      </tr>
    </table>
  </div>

  <!-- Product Title Bar -->
  <div style="background: #1e1e1e; padding: 25px 30px;">
    <div style="font-size: 11px; color: {{accent_color}}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
      {{product_brand}} • {{product_category}}
    </div>
    <h1 style="font-size: 26px; font-weight: 500; color: #fff; margin: 0;">
      {{product_name}}
    </h1>
  </div>

  <!-- Main Content -->
  <div style="padding: 30px; background: #181818;">
    
    <!-- Tech Product Image Gallery -->
    <div style="margin-bottom: 30px; background: #1e1e1e; border-radius: 12px; padding: 20px;">
      <div style="display: flex; gap: 20px; flex-wrap: wrap;">
        <div style="flex: 0 0 350px; max-width: 100%;">
          <img src="{{product_image_1}}" alt="{{product_name}}" style="width: 100%; border-radius: 8px; border: 2px solid #333;" />
        </div>
        <div style="flex: 1; min-width: 150px;">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            <img src="{{product_image_2}}" alt="{{product_name}}" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 6px; border: 2px solid #333;" />
            <img src="{{product_image_3}}" alt="{{product_name}}" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 6px; border: 2px solid #333;" />
            <img src="{{product_image_4}}" alt="{{product_name}}" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 6px; border: 2px solid #333;" />
            <img src="{{product_image_5}}" alt="{{product_name}}" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 6px; border: 2px solid #333;" />
          </div>
        </div>
      </div>
    </div>

    <!-- Price & Stock Row -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 15px;">
      <div>
        <div style="font-size: 38px; font-weight: 700; color: {{accent_color}};">{{product_price}}</div>
        <div style="font-size: 12px; color: #888; margin-top: 5px;">Free Shipping on orders over $50</div>
      </div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <span style="background: #2e7d32; color: #fff; padding: 8px 16px; border-radius: 4px; font-size: 12px; font-weight: 500;">
          ✓ IN STOCK ({{product_stock}})
        </span>
        <span style="background: #1565c0; color: #fff; padding: 8px 16px; border-radius: 4px; font-size: 12px; font-weight: 500;">
          🚚 SHIPS TODAY
        </span>
      </div>
    </div>

    <!-- Tech Specs Quick View -->
    <div style="background: #1e1e1e; border: 1px solid #333; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
      <div style="font-size: 13px; font-weight: 600; color: {{accent_color}}; text-transform: uppercase; margin-bottom: 15px;">
        ⚡ Quick Specs
      </div>
      <table width="100%" cellpadding="8" cellspacing="0">
        <tr>
          <td style="color: #888; font-size: 13px; border-right: 1px solid #333; padding-right: 15px;">SKU</td>
          <td style="color: #fff; font-family: 'Courier New', monospace; font-size: 13px; padding-left: 15px;">{{product_sku}}</td>
          <td style="color: #888; font-size: 13px; border-left: 1px solid #333; border-right: 1px solid #333; padding: 0 15px;">Brand</td>
          <td style="color: #fff; font-size: 13px; padding-left: 15px;">{{product_brand}}</td>
        </tr>
        <tr>
          <td style="color: #888; font-size: 13px; border-right: 1px solid #333; padding-right: 15px; padding-top: 10px;">UPC</td>
          <td style="color: #fff; font-family: 'Courier New', monospace; font-size: 13px; padding-left: 15px; padding-top: 10px;">{{product_upc}}</td>
          <td style="color: #888; font-size: 13px; border-left: 1px solid #333; border-right: 1px solid #333; padding: 10px 15px 0;">Condition</td>
          <td style="color: #4caf50; font-size: 13px; padding-left: 15px; padding-top: 10px;">{{product_condition}}</td>
        </tr>
      </table>
    </div>

    <!-- Features Grid -->
    <table width="100%" cellpadding="0" cellspacing="10" style="margin-bottom: 30px;">
      <tr>
        <td width="25%" style="background: #1e1e1e; border: 1px solid #333; border-radius: 6px; padding: 20px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 8px;">🛡️</div>
          <div style="font-size: 11px; color: #888; text-transform: uppercase;">Warranty</div>
          <div style="font-size: 13px; color: #fff; margin-top: 5px;">Included</div>
        </td>
        <td width="25%" style="background: #1e1e1e; border: 1px solid #333; border-radius: 6px; padding: 20px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 8px;">📦</div>
          <div style="font-size: 11px; color: #888; text-transform: uppercase;">Package</div>
          <div style="font-size: 13px; color: #fff; margin-top: 5px;">{{product_weight}}</div>
        </td>
        <td width="25%" style="background: #1e1e1e; border: 1px solid #333; border-radius: 6px; padding: 20px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 8px;">📐</div>
          <div style="font-size: 11px; color: #888; text-transform: uppercase;">Dimensions</div>
          <div style="font-size: 13px; color: #fff; margin-top: 5px;">{{product_dimensions}}</div>
        </td>
        <td width="25%" style="background: #1e1e1e; border: 1px solid #333; border-radius: 6px; padding: 20px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 8px;">↩️</div>
          <div style="font-size: 11px; color: #888; text-transform: uppercase;">Returns</div>
          <div style="font-size: 13px; color: #fff; margin-top: 5px;">30 Days</div>
        </td>
      </tr>
    </table>

    <!-- Product Description -->
    <div style="background: #1e1e1e; border: 1px solid #333; border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
      <div style="background: linear-gradient(90deg, {{accent_color}}, #1e88e5); padding: 12px 20px;">
        <span style="color: #fff; font-weight: 600; font-size: 13px; text-transform: uppercase;">📋 Product Description</span>
      </div>
      <div style="padding: 25px; color: #ccc; font-size: 14px; line-height: 1.7;">
        {{product_description}}
      </div>
    </div>

    <!-- Full Specifications -->
    <div style="background: #1e1e1e; border: 1px solid #333; border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
      <div style="background: #252525; padding: 12px 20px; border-bottom: 1px solid #333;">
        <span style="color: #fff; font-weight: 600; font-size: 13px; text-transform: uppercase;">🔧 Technical Specifications</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 15px 20px; border-bottom: 1px solid #333; color: #888; background: #1a1a1a; width: 30%;">Brand</td>
          <td style="padding: 15px 20px; border-bottom: 1px solid #333; color: #fff;">{{product_brand}}</td>
        </tr>
        <tr>
          <td style="padding: 15px 20px; border-bottom: 1px solid #333; color: #888; background: #1a1a1a;">Model / SKU</td>
          <td style="padding: 15px 20px; border-bottom: 1px solid #333; color: {{accent_color}}; font-family: monospace;">{{product_sku}}</td>
        </tr>
        <tr>
          <td style="padding: 15px 20px; border-bottom: 1px solid #333; color: #888; background: #1a1a1a;">MPN</td>
          <td style="padding: 15px 20px; border-bottom: 1px solid #333; color: #fff; font-family: monospace;">{{product_mpn}}</td>
        </tr>
        <tr>
          <td style="padding: 15px 20px; border-bottom: 1px solid #333; color: #888; background: #1a1a1a;">UPC / Barcode</td>
          <td style="padding: 15px 20px; border-bottom: 1px solid #333; color: #fff; font-family: monospace;">{{product_upc}}</td>
        </tr>
        <tr>
          <td style="padding: 15px 20px; border-bottom: 1px solid #333; color: #888; background: #1a1a1a;">Weight</td>
          <td style="padding: 15px 20px; border-bottom: 1px solid #333; color: #fff;">{{product_weight}}</td>
        </tr>
        <tr>
          <td style="padding: 15px 20px; color: #888; background: #1a1a1a;">Dimensions</td>
          <td style="padding: 15px 20px; color: #fff;">{{product_dimensions}}</td>
        </tr>
      </table>
    </div>

    <!-- Shipping & Support -->
    <table width="100%" cellpadding="0" cellspacing="15">
      <tr>
        <td width="50%" valign="top" style="background: #1e1e1e; border: 1px solid #333; border-radius: 8px; padding: 20px;">
          <div style="color: {{accent_color}}; font-weight: 600; font-size: 13px; margin-bottom: 12px;">🚚 Shipping</div>
          <div style="color: #ccc; font-size: 13px; line-height: 1.6;">
            {{shipping_cost}}<br/>
            Orders placed before 3PM ship same day<br/>
            Tracking number provided
          </div>
        </td>
        <td width="50%" valign="top" style="background: #1e1e1e; border: 1px solid #333; border-radius: 8px; padding: 20px;">
          <div style="color: {{accent_color}}; font-weight: 600; font-size: 13px; margin-bottom: 12px;">💬 Support</div>
          <div style="color: #ccc; font-size: 13px; line-height: 1.6;">
            {{return_policy}}<br/>
            Technical support available<br/>
            Email: {{store_email}}
          </div>
        </td>
      </tr>
    </table>

  </div>

  <!-- Footer -->
  <div style="background: #0a0a0a; padding: 30px; text-align: center; border-top: 1px solid #333;">
    <div style="font-size: 18px; font-weight: 600; color: #fff; margin-bottom: 8px;">{{store_name}}</div>
    <div style="font-size: 12px; color: {{accent_color}};">Your Trusted Tech Partner</div>
    <div style="font-size: 11px; color: #666; margin-top: 15px;">
      {{store_email}} • {{store_phone}}
    </div>
  </div>

</div>
<!-- END TECH STORE TEMPLATE -->`
    },

    minimal: {
      name: 'Minimalist',
      description: 'Clean, distraction-free design that lets product speak',
      preview: '🎯',
      html: `<!-- MINIMALIST TEMPLATE -->
<div style="max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #222; background: #fff;">

  <!-- Simple Header -->
  <div style="padding: 30px 0; text-align: center; border-bottom: 1px solid #eee;">
    <div style="font-size: 20px; font-weight: 600; color: #111;">{{store_name}}</div>
  </div>

  <!-- Content -->
  <div style="padding: 40px 20px;">
    
    <!-- Clean Image Gallery -->
    <div style="margin-bottom: 40px;">
      <img src="{{product_image_1}}" alt="{{product_name}}" style="width: 100%; max-width: 600px; display: block; margin: 0 auto 20px;" />
      <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
        <img src="{{product_image_2}}" alt="{{product_name}}" style="width: 80px; height: 80px; object-fit: cover; border: 1px solid #eee;" />
        <img src="{{product_image_3}}" alt="{{product_name}}" style="width: 80px; height: 80px; object-fit: cover; border: 1px solid #eee;" />
        <img src="{{product_image_4}}" alt="{{product_name}}" style="width: 80px; height: 80px; object-fit: cover; border: 1px solid #eee;" />
      </div>
    </div>

    <!-- Title -->
    <h1 style="font-size: 28px; font-weight: 400; color: #111; margin: 0 0 15px 0; line-height: 1.4;">
      {{product_name}}
    </h1>
    
    <!-- Brand & SKU -->
    <div style="font-size: 13px; color: #888; margin-bottom: 30px;">
      {{product_brand}} &nbsp;·&nbsp; {{product_sku}}
    </div>

    <!-- Price -->
    <div style="font-size: 32px; font-weight: 300; color: #111; margin-bottom: 30px;">
      {{product_price}}
    </div>

    <!-- Simple Tags -->
    <div style="display: flex; gap: 10px; margin-bottom: 40px; flex-wrap: wrap;">
      <span style="font-size: 12px; color: #666; padding: 6px 12px; border: 1px solid #ddd; border-radius: 20px;">
        ✓ Free Shipping
      </span>
      <span style="font-size: 12px; color: #666; padding: 6px 12px; border: 1px solid #ddd; border-radius: 20px;">
        ✓ {{product_stock}} Available
      </span>
      <span style="font-size: 12px; color: #666; padding: 6px 12px; border: 1px solid #ddd; border-radius: 20px;">
        ✓ 30-Day Returns
      </span>
    </div>

    <!-- Divider -->
    <div style="height: 1px; background: #eee; margin: 40px 0;"></div>

    <!-- Description -->
    <div style="margin-bottom: 40px;">
      <h2 style="font-size: 14px; font-weight: 600; color: #111; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">
        Description
      </h2>
      <div style="font-size: 15px; line-height: 1.8; color: #444;">
        {{product_description}}
      </div>
    </div>

    <!-- Details -->
    <div style="margin-bottom: 40px;">
      <h2 style="font-size: 14px; font-weight: 600; color: #111; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">
        Details
      </h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #888; width: 140px;">Brand</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #333;">{{product_brand}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #888;">SKU</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #333; font-family: monospace;">{{product_sku}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #888;">Condition</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #333;">{{product_condition}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #888;">Weight</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #333;">{{product_weight}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #888;">Dimensions</td>
          <td style="padding: 12px 0; color: #333;">{{product_dimensions}}</td>
        </tr>
      </table>
    </div>

    <!-- Divider -->
    <div style="height: 1px; background: #eee; margin: 40px 0;"></div>

    <!-- Shipping & Returns -->
    <div style="display: flex; gap: 40px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 200px;">
        <h3 style="font-size: 13px; font-weight: 600; color: #111; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
          Shipping
        </h3>
        <div style="font-size: 14px; color: #666; line-height: 1.7;">
          {{shipping_cost}}<br/>
          Delivery: 3-5 business days
        </div>
      </div>
      <div style="flex: 1; min-width: 200px;">
        <h3 style="font-size: 13px; font-weight: 600; color: #111; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
          Returns
        </h3>
        <div style="font-size: 14px; color: #666; line-height: 1.7;">
          {{return_policy}}<br/>
          Hassle-free process
        </div>
      </div>
    </div>

  </div>

  <!-- Simple Footer -->
  <div style="padding: 30px 20px; text-align: center; border-top: 1px solid #eee;">
    <div style="font-size: 14px; color: #666;">
      Thank you for shopping with us
    </div>
    <div style="font-size: 12px; color: #999; margin-top: 8px;">
      {{store_email}}
    </div>
  </div>

</div>
<!-- END MINIMALIST TEMPLATE -->`
    }
  };

  // Function to get full template HTML with colors applied
  const getFullTemplateHTML = (templateId) => {
    const template = EBAY_TEMPLATES[templateId];
    if (!template) return '';
    
    // Replace color variables with actual values
    let html = template.html;
    html = html.replace(/\{\{primary_color\}\}/g, themeSettings.primaryColor);
    html = html.replace(/\{\{accent_color\}\}/g, themeSettings.accentColor);
    html = html.replace(/\{\{secondary_color\}\}/g, themeSettings.secondaryColor);
    
    return html;
  };

  // Apply template to editor
  const applyTemplate = (templateId) => {
    const fullHTML = getFullTemplateHTML(templateId);
    setThemeSettings(prev => ({
      ...prev,
      template: templateId,
      headerHTML: fullHTML,
      descriptionTemplate: fullHTML,
      activeTemplate: templateId
    }));
  };

  // eBay Listing Templates for selector (simplified for UI)
  const listingTemplates = Object.entries(EBAY_TEMPLATES).map(([id, template]) => ({
    id,
    name: template.name,
    description: template.description,
    preview: template.preview
  }));

  // Theme save state
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeSaveMessage, setThemeSaveMessage] = useState(null);

  // Process HTML template with actual product data for preview
  const processTemplateForPreview = (html) => {
    if (!html) return '';
    
    // Store info - use actual store settings if available
    const storeName = storeSettings?.store_name || 'Your Store';
    const storeEmail = storeSettings?.store_email || 'contact@yourstore.com';
    
    // Use base64 logo for preview (to avoid CORS issues in iframe), or fallback to placeholder
    let storeLogo = storeLogoBase64 || '';
    if (!storeLogo || storeLogo.trim() === '') {
      // Fallback to SVG placeholder only if no logo is uploaded or conversion failed
      storeLogo = 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="180" height="50" viewBox="0 0 180 50">
          <rect width="180" height="50" fill="#ffffff" rx="6"/>
          <rect x="8" y="8" width="34" height="34" fill="#0066cc" rx="6"/>
          <text x="25" y="32" fill="#ffffff" font-family="Arial, sans-serif" font-size="20" font-weight="bold" text-anchor="middle">S</text>
          <text x="105" y="32" fill="#0066cc" font-family="Arial, sans-serif" font-size="16" font-weight="bold" text-anchor="middle">${storeName}</text>
        </svg>
      `.trim());
    }
    
    // Product info from selected preview product
    const product = previewProduct;
    
    // Get product images - filter out empty strings
    const images = (product.images || []).filter(img => img && img.trim() !== '');
    
    let processedHtml = html;
    
    // Process conditional blocks: {{#if_image_X}}...{{/if_image_X}}
    // If image exists, show content; if not, remove the entire block
    for (let i = 1; i <= 6; i++) {
      const hasImage = images[i - 1] && images[i - 1].trim() !== '';
      // Match {{#if_image_X}} ... {{/if_image_X}} - note the forward slash, not escaped
      const ifRegex = new RegExp(`\\{\\{#if_image_${i}\\}\\}([\\s\\S]*?)\\{\\{/if_image_${i}\\}\\}`, 'g');
      processedHtml = processedHtml.replace(ifRegex, hasImage ? '$1' : '');
    }
    
    // Process main image conditional: {{#if_has_images}}...{{/if_has_images}}
    const hasAnyImages = images.length > 0;
    const ifHasImagesRegex = /\{\{#if_has_images\}\}([\s\S]*?)\{\{\/if_has_images\}\}/g;
    processedHtml = processedHtml.replace(ifHasImagesRegex, hasAnyImages ? '$1' : '');
    
    // Process no images conditional: {{#if_no_images}}...{{/if_no_images}}
    const ifNoImagesRegex = /\{\{#if_no_images\}\}([\s\S]*?)\{\{\/if_no_images\}\}/g;
    processedHtml = processedHtml.replace(ifNoImagesRegex, !hasAnyImages ? '$1' : '');
    
    // Process store logo conditional: {{#if_store_logo}}...{{/if_store_logo}}
    const hasStoreLogo = storeLogo && storeLogo.trim() !== '';
    const ifStoreLogoRegex = /\{\{#if_store_logo\}\}([\s\S]*?)\{\{\/if_store_logo\}\}/g;
    processedHtml = processedHtml.replace(ifStoreLogoRegex, hasStoreLogo ? '$1' : '');
    
    // Replace variables
    processedHtml = processedHtml
      // Store variables
      .replace(/\{\{store_name\}\}/g, storeName)
      .replace(/\{\{store_logo\}\}/g, storeLogo)
      .replace(/\{\{store_email\}\}/g, storeEmail)
      // Product variables
      .replace(/\{\{product_name\}\}/g, product.name || 'Sample Product')
      .replace(/\{\{product_price\}\}/g, `$${(product.price || 0).toFixed(2)}`)
      .replace(/\{\{product_sku\}\}/g, product.sku || 'N/A')
      .replace(/\{\{product_description\}\}/g, product.description || 'No description available.')
      .replace(/\{\{product_brand\}\}/g, product.brand || 'Unbranded')
      .replace(/\{\{product_stock\}\}/g, String(product.stock || 0))
      .replace(/\{\{product_condition\}\}/g, product.condition || 'New')
      .replace(/\{\{product_weight\}\}/g, product.weight || 'N/A')
      .replace(/\{\{product_dimensions\}\}/g, product.dimensions || 'N/A')
      .replace(/\{\{product_upc\}\}/g, product.upc || 'N/A')
      .replace(/\{\{product_mpn\}\}/g, product.mpn || 'N/A')
      .replace(/\{\{product_category\}\}/g, product.category || 'General')
      // Product images - only show if image exists, otherwise empty string
      .replace(/\{\{product_image\}\}/g, images[0] || '')
      .replace(/\{\{product_image_1\}\}/g, images[0] || '')
      .replace(/\{\{product_image_2\}\}/g, images[1] || '')
      .replace(/\{\{product_image_3\}\}/g, images[2] || '')
      .replace(/\{\{product_image_4\}\}/g, images[3] || '')
      .replace(/\{\{product_image_5\}\}/g, images[4] || '')
      .replace(/\{\{product_image_6\}\}/g, images[5] || '')
      .replace(/\{\{product_image_count\}\}/g, String(images.length || 0))
      // Boolean checks for images (returns 'true' or 'false')
      .replace(/\{\{has_image_1\}\}/g, images[0] ? 'true' : 'false')
      .replace(/\{\{has_image_2\}\}/g, images[1] ? 'true' : 'false')
      .replace(/\{\{has_image_3\}\}/g, images[2] ? 'true' : 'false')
      .replace(/\{\{has_image_4\}\}/g, images[3] ? 'true' : 'false')
      .replace(/\{\{has_image_5\}\}/g, images[4] ? 'true' : 'false')
      .replace(/\{\{has_image_6\}\}/g, images[5] ? 'true' : 'false')
      // Color variables
      .replace(/\{\{primary_color\}\}/g, themeSettings.primaryColor)
      .replace(/\{\{accent_color\}\}/g, themeSettings.accentColor)
      .replace(/\{\{secondary_color\}\}/g, themeSettings.secondaryColor)
      // Shipping & Policy placeholders
      .replace(/\{\{shipping_cost\}\}/g, 'Free Shipping')
      .replace(/\{\{return_policy\}\}/g, '30-day money back guarantee. Buyer pays return shipping.');
    
    return processedHtml;
  };

  // Get the HTML for the live preview iframe
  const getPreviewHtml = () => {
    const templateHtml = themeSettings.descriptionTemplate || getFullTemplateHTML(themeSettings.template || 'modern');
    const processedHtml = processTemplateForPreview(templateHtml);
    
    // Wrap in a complete HTML document for the iframe
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: Arial, sans-serif; 
      padding: 10px; 
      background: #fff;
      color: #333;
      line-height: 1.5;
    }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; }
    ${themeSettings.customCSS || ''}
  </style>
</head>
<body>
  ${processedHtml}
</body>
</html>`;
  };

  // Save theme to backend
  const handleSaveTheme = async () => {
    setSavingTheme(true);
    setThemeSaveMessage(null);
    
    try {
      const themeData = {
        template_id: themeSettings.template || 'custom',
        template_html: themeSettings.descriptionTemplate || getFullTemplateHTML(themeSettings.template || 'modern'),
        settings: {
          primaryColor: themeSettings.primaryColor,
          accentColor: themeSettings.accentColor,
          secondaryColor: themeSettings.secondaryColor,
          fontFamily: themeSettings.fontFamily,
          customCSS: themeSettings.customCSS,
          showBrandLogo: themeSettings.showBrandLogo,
          showTrustBadges: themeSettings.showTrustBadges,
          showShippingInfo: themeSettings.showShippingInfo,
          showReturnPolicy: themeSettings.showReturnPolicy,
          showStockLevel: themeSettings.showStockLevel,
          showProductSpecs: themeSettings.showProductSpecs,
          showPaymentIcons: themeSettings.showPaymentIcons,
          showSocialLinks: themeSettings.showSocialLinks
        }
      };
      
      await axios.put(`${BACKEND_URL}/api/ebay/theme`, themeData);
      setThemeSaveMessage({ type: 'success', text: 'Theme saved successfully!' });
      
      // Clear message after 3 seconds
      setTimeout(() => setThemeSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save theme:', error);
      setThemeSaveMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to save theme. Please try again.' 
      });
    } finally {
      setSavingTheme(false);
    }
  };

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
                  <Button 
                    onClick={handleSaveTheme}
                    disabled={savingTheme}
                    className="bg-yellow-500 hover:bg-yellow-600 gap-1"
                  >
                    {savingTheme ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {savingTheme ? 'Saving...' : 'Save Theme'}
                  </Button>
                  
                  {/* Save Status Message */}
                  {themeSaveMessage && (
                    <span className={`text-sm font-medium ${themeSaveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {themeSaveMessage.type === 'success' ? '✓' : '✗'} {themeSaveMessage.text}
                    </span>
                  )}
                </div>
              </div>

              {/* Main Editor Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Left Panel - Code Editor */}
                <div className="space-y-4">
                  {/* Template Selector */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      Choose Template
                    </h4>
                    <div className="grid grid-cols-5 gap-2">
                      {listingTemplates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => applyTemplate(template.id)}
                          className={`p-3 border rounded-lg transition-all text-center ${
                            themeSettings.template === template.id
                              ? 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-200'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-2xl block mb-1">{template.preview}</span>
                          <span className="text-xs font-medium text-gray-700">{template.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Full HTML Code Editor */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium text-gray-900">Full Template HTML</span>
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                          {EBAY_TEMPLATES[themeSettings.template]?.name || 'Custom'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(themeSettings.descriptionTemplate || '');
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                      </div>
                    </div>

                    {/* Template Tags Quick Insert */}
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-gray-500 mr-2">Insert:</span>
                        {[
                          { tag: '{{product_name}}', label: 'Name' },
                          { tag: '{{product_price}}', label: 'Price' },
                          { tag: '{{product_sku}}', label: 'SKU' },
                          { tag: '{{product_description}}', label: 'Description' },
                          { tag: '{{product_brand}}', label: 'Brand' },
                          { tag: '{{product_stock}}', label: 'Stock' },
                          { tag: '{{product_condition}}', label: 'Condition' },
                          { tag: '{{product_image_1}}', label: 'Img1' },
                          { tag: '{{product_image_2}}', label: 'Img2' },
                          { tag: '{{product_image_3}}', label: 'Img3' },
                          { tag: '{{product_image_4}}', label: 'Img4' },
                          { tag: '{{#if_image_1}}...{{/if_image_1}}', label: 'If Img1' },
                          { tag: '{{#if_has_images}}...{{/if_has_images}}', label: 'If Images' },
                          { tag: '{{store_name}}', label: 'Store' },
                          { tag: '{{store_logo}}', label: 'Logo' },
                          { tag: '{{#if_store_logo}}...{{/if_store_logo}}', label: 'If Logo' },
                        ].map(item => (
                          <button
                            key={item.tag}
                            onClick={() => {
                              const textarea = document.getElementById('theme-code-editor');
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const currentVal = themeSettings.descriptionTemplate || '';
                                const newVal = currentVal.slice(0, start) + item.tag + currentVal.slice(start);
                                setThemeSettings(s => ({...s, descriptionTemplate: newVal}));
                              }
                            }}
                            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors font-mono"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Code Editor */}
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-800 flex flex-col text-right pr-3 pt-3 text-xs text-gray-500 font-mono select-none overflow-hidden border-r border-gray-700">
                        {Array.from({ length: Math.max((themeSettings.descriptionTemplate || '').split('\n').length + 5, 50) }, (_, i) => (
                          <div key={i} className="h-5 leading-5">{i + 1}</div>
                        ))}
                      </div>
                      <textarea
                        id="theme-code-editor"
                        value={themeSettings.descriptionTemplate || getFullTemplateHTML(themeSettings.template || 'modern')}
                        onChange={(e) => setThemeSettings(s => ({...s, descriptionTemplate: e.target.value}))}
                        className="w-full pl-14 pr-4 py-3 font-mono text-sm bg-gray-900 text-green-400 resize-none focus:outline-none"
                        style={{ lineHeight: '1.25rem', tabSize: 2, minHeight: '500px' }}
                        spellCheck={false}
                        placeholder="<!-- Your eBay listing HTML template -->"
                      />
                    </div>

                    {/* Editor Footer */}
                    <div className="p-2 border-t border-gray-700 bg-gray-800 flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-4">
                        <span>HTML • UTF-8</span>
                        <span>{(themeSettings.descriptionTemplate || '').length.toLocaleString()} characters</span>
                        <span>{(themeSettings.descriptionTemplate || '').split('\n').length} lines</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-yellow-500">eBay Compatible</span>
                      </div>
                    </div>
                  </div>

                  {/* Color Customization */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-yellow-500" />
                      Theme Colors
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Primary</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={themeSettings.primaryColor}
                            onChange={(e) => {
                              setThemeSettings(s => ({...s, primaryColor: e.target.value}));
                              // Re-apply template with new color
                              if (themeSettings.template) {
                                setTimeout(() => applyTemplate(themeSettings.template), 100);
                              }
                            }}
                            className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                          />
                          <Input
                            value={themeSettings.primaryColor}
                            onChange={(e) => setThemeSettings(s => ({...s, primaryColor: e.target.value}))}
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Accent</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={themeSettings.accentColor}
                            onChange={(e) => {
                              setThemeSettings(s => ({...s, accentColor: e.target.value}));
                              if (themeSettings.template) {
                                setTimeout(() => applyTemplate(themeSettings.template), 100);
                              }
                            }}
                            className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                          />
                          <Input
                            value={themeSettings.accentColor}
                            onChange={(e) => setThemeSettings(s => ({...s, accentColor: e.target.value}))}
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Background</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={themeSettings.secondaryColor}
                            onChange={(e) => {
                              setThemeSettings(s => ({...s, secondaryColor: e.target.value}));
                              if (themeSettings.template) {
                                setTimeout(() => applyTemplate(themeSettings.template), 100);
                              }
                            }}
                            className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                          />
                          <Input
                            value={themeSettings.secondaryColor}
                            onChange={(e) => setThemeSettings(s => ({...s, secondaryColor: e.target.value}))}
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>
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
                    
                    {/* eBay Frame Simulation with Iframe Preview */}
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
                            ebay.com/itm/{previewProduct.sku || '123456789'}
                          </div>
                        </div>
                        
                        {/* Live HTML Preview using iframe */}
                        <div className="bg-white border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
                          <iframe
                            srcDoc={getPreviewHtml()}
                            title="eBay Listing Preview"
                            className="w-full border-0"
                            style={{ 
                              minHeight: '600px',
                              height: themePreview === 'mobile' ? '500px' : themePreview === 'tablet' ? '600px' : '700px'
                            }}
                            sandbox="allow-same-origin"
                          />
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
