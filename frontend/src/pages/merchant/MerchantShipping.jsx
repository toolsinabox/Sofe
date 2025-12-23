import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { 
  Plus, Edit, Trash2, X, Save, Truck, MapPin, Package, DollarSign, 
  Globe, Settings, Box, Tag, Loader2, CheckCircle, AlertCircle, 
  ChevronDown, ChevronUp, RefreshCw, Search, MoreHorizontal, Eye,
  Layers, Calculator, FileText, Copy, ArrowUpDown, Upload, Download,
  FileUp, FileDown, AlertTriangle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

// Import extracted tab components
import OptionsTab from './shipping/OptionsTab';
import CategoriesTab from './shipping/CategoriesTab';
import PackagesTab from './shipping/PackagesTab';
import ServicesTab from './shipping/ServicesTab';
import ZonesTab from './shipping/ZonesTab';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Tab components
const TABS = [
  { id: 'overview', label: 'Overview', icon: Truck },
  { id: 'zones', label: 'Shipping Zones', icon: MapPin },
  { id: 'services', label: 'Services & Rates', icon: DollarSign },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'packages', label: 'Packages', icon: Box },
  { id: 'options', label: 'Options', icon: Settings },
];

// Uncontrolled native input to prevent focus loss - syncs on blur only
const NativeInput = React.forwardRef(({ name, defaultValue, onBlur, onChange, className, ...props }, ref) => {
  const internalRef = React.useRef(null);
  const inputRef = ref || internalRef;
  
  // Handle blur to sync state
  const handleBlur = React.useCallback((e) => {
    if (onBlur) {
      onBlur(e);
    }
    // Also call onChange on blur to update state
    if (onChange) {
      onChange(e);
    }
  }, [onBlur, onChange]);
  
  return (
    <input
      ref={inputRef}
      name={name}
      defaultValue={defaultValue || ''}
      onBlur={handleBlur}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
      {...props}
    />
  );
});
NativeInput.displayName = 'NativeInput';

// Uncontrolled input wrapper to prevent focus loss
const StableInput = React.memo(({ name, defaultValue, onChange, onBlur, ...props }) => {
  return (
    <NativeInput
      name={name}
      defaultValue={defaultValue}
      onChange={onChange}
      onBlur={onBlur}
      {...props}
    />
  );
});
StableInput.displayName = 'StableInput';

// Memoized service form input component to prevent focus loss
const ServiceFormInput = React.memo(({ label, name, value, onChange, placeholder, type = 'text', step, className = '', prefix, suffix }) => (
  <div>
    <Label className="text-gray-700 text-sm">{label}</Label>
    <div className={`flex items-center gap-1 mt-1 ${prefix || suffix ? '' : ''}`}>
      {prefix && <span className="text-gray-500">{prefix}</span>}
      <Input
        type={type}
        step={step}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`bg-gray-50 border-gray-200 text-gray-900 ${className}`}
      />
      {suffix && <span className="text-gray-500 text-sm whitespace-nowrap">{suffix}</span>}
    </div>
  </div>
));

const MerchantShipping = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [zones, setZones] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [packages, setPackages] = useState([]);
  const [options, setOptions] = useState([]);
  
  // Modal states
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showOptionModal, setShowOptionModal] = useState(false);
  
  // Editing states
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Option form state (moved to parent level for persistence)
  const [optionForm, setOptionForm] = useState({
    name: '',
    description: '',
    routing_group: '',
    service_ids: [],
    countries: ['AU'],
    free_shipping_threshold: null,
    free_shipping_zones: [],
    is_active: true,
    sort_order: 0
  });

  // Category form state (moved to parent level for persistence)
  const [categoryForm, setCategoryForm] = useState({
    code: '',
    name: '',
    description: '',
    is_default: false,
    is_active: true
  });

  // Package form state (moved to parent level for persistence)
  const [packageForm, setPackageForm] = useState({
    code: '',
    name: '',
    package_type: 'box',
    length: 0,
    width: 0,
    height: 0,
    max_weight: 0,
    tare_weight: 0,
    is_active: true
  });
  
  // Calculator state
  const [calcPostcode, setCalcPostcode] = useState('');
  const [calcSuburb, setCalcSuburb] = useState('');
  const [calcSuburbs, setCalcSuburbs] = useState([]);
  const [loadingSuburbs, setLoadingSuburbs] = useState(false);
  const [calcWeight, setCalcWeight] = useState('1');
  const [calcLength, setCalcLength] = useState('');
  const [calcWidth, setCalcWidth] = useState('');
  const [calcHeight, setCalcHeight] = useState('');
  const [calcTotal, setCalcTotal] = useState('100');
  const [calcResult, setCalcResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  // Service form state (moved to parent level)
  const [serviceForm, setServiceForm] = useState({
    name: '',
    code: '',
    carrier: 'custom',
    charge_type: 'weight',
    min_charge: 0,
    max_charge: null,
    max_length: null,  // Maximum item length in mm (e.g., 1400)
    handling_fee: 0,
    fuel_levy_percent: 0,
    fuel_levy_amount: 0,
    cubic_weight_modifier: 250,
    tax_inclusive: false,
    tax_rate: 10.0,
    categories: [],
    is_active: true,
    sort_order: 0,
    rates: [],
    // Additional fields
    tracking_url: '',
    internal_description: '',
    packaging_allowance_kg: 0,
    packaging_allowance_percent: 0,
    round_up_weight: false,
    ignore_physical_weight: false,
    ship_to_po_box: false
  });
  const [expandedService, setExpandedService] = useState(null);
  const [showRateImportModal, setShowRateImportModal] = useState(false);
  const [selectedServiceForImport, setSelectedServiceForImport] = useState(null);
  const [selectedRateFile, setSelectedRateFile] = useState(null);
  const [importingRates, setImportingRates] = useState(false);
  const [rateImportMode, setRateImportMode] = useState('merge');
  const [rateImportResult, setRateImportResult] = useState(null);
  const [rateUploadProgress, setRateUploadProgress] = useState(0);
  const [modalUploadingRates, setModalUploadingRates] = useState(false);
  const rateFileInputRef = useRef(null);
  const modalRateFileInputRef = useRef(null);

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch suburbs when postcode changes
  useEffect(() => {
    const fetchSuburbs = async () => {
      if (calcPostcode.length >= 4) {
        setLoadingSuburbs(true);
        try {
          const response = await axios.get(`${API}/shipping/suburbs?postcode=${calcPostcode}`);
          setCalcSuburbs(response.data.suburbs || []);
          // Auto-select first suburb if only one
          if (response.data.suburbs?.length === 1) {
            setCalcSuburb(response.data.suburbs[0].suburb);
          } else {
            setCalcSuburb('');
          }
        } catch (error) {
          console.error('Error fetching suburbs:', error);
          setCalcSuburbs([]);
        } finally {
          setLoadingSuburbs(false);
        }
      } else {
        setCalcSuburbs([]);
        setCalcSuburb('');
      }
    };
    
    const debounceTimer = setTimeout(fetchSuburbs, 300);
    return () => clearTimeout(debounceTimer);
  }, [calcPostcode]);

  // Stable handler for service form changes to prevent focus loss
  const handleServiceFormChange = useCallback((field, value) => {
    setServiceForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Debounced state setter for form inputs
  const debouncedSetServiceForm = useMemo(() => {
    let timeoutId = null;
    return (updater) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setServiceForm(updater);
      }, 50);
    };
  }, []);

  // Handler for blur - syncs state when user leaves the field
  const handleServiceFormBlur = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setServiceForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  // Stable handler for service form text input changes - does nothing to avoid focus loss
  const handleServiceFormInputChange = useCallback((e) => {
    // No-op during typing - state syncs on blur
  }, []);

  // Stable handler for code input (lowercase conversion)
  const handleServiceFormCodeChange = useCallback((e) => {
    setServiceForm(prev => ({
      ...prev,
      code: e.target.value.toLowerCase()
    }));
  }, []);

  // Stable handler for numeric service form fields - uses name attribute, syncs on blur
  const handleServiceFormNumericBlur = useCallback((e) => {
    const { name, value } = e.target;
    setServiceForm(prev => ({
      ...prev,
      [name]: value === '' ? '' : parseFloat(value) || 0
    }));
  }, []);

  // Stable handler for numeric service form fields with custom default
  const handleServiceFormNumberChange = useCallback((field, value, defaultValue = 0) => {
    setServiceForm(prev => ({
      ...prev,
      [field]: parseFloat(value) || defaultValue
    }));
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [zonesRes, servicesRes, categoriesRes, packagesRes, optionsRes] = await Promise.all([
        axios.get(`${API}/shipping/zones`),
        axios.get(`${API}/shipping/services`),
        axios.get(`${API}/shipping/categories`),
        axios.get(`${API}/shipping/packages`),
        axios.get(`${API}/shipping/options`),
      ]);
      setZones(zonesRes.data || []);
      setServices(servicesRes.data || []);
      setCategories(categoriesRes.data || []);
      setPackages(packagesRes.data || []);
      setOptions(optionsRes.data || []);
    } catch (error) {
      console.error('Error fetching shipping data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate shipping
  const handleCalculateShipping = async () => {
    if (!calcPostcode) return;
    setCalculating(true);
    try {
      const itemData = { 
        weight: parseFloat(calcWeight) || 1, 
        quantity: 1 
      };
      
      // Add shipping dimensions if provided
      if (calcLength && calcWidth && calcHeight) {
        itemData.shipping_length = parseFloat(calcLength);
        itemData.shipping_width = parseFloat(calcWidth);
        itemData.shipping_height = parseFloat(calcHeight);
      }
      
      const response = await axios.post(`${API}/shipping/calculate`, {
        postcode: calcPostcode,
        suburb: calcSuburb || null,
        country: 'AU',
        items: [itemData],
        cart_total: parseFloat(calcTotal) || 100
      });
      setCalcResult(response.data);
    } catch (error) {
      console.error('Error calculating shipping:', error);
      setCalcResult({ error: 'Failed to calculate shipping' });
    } finally {
      setCalculating(false);
    }
  };

  // ============== OVERVIEW TAB - Stats and Quick Actions (memoized) ==============
  const overviewStats = useMemo(() => (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Shipping Zones</p>
              <p className="text-2xl font-bold text-gray-900">{zones.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Truck className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Shipping Services</p>
              <p className="text-2xl font-bold text-gray-900">{services.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
              <Tag className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Categories</p>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
              <Box className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Package Types</p>
              <p className="text-2xl font-bold text-gray-900">{packages.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button 
          onClick={() => { setActiveTab('zones'); }}
          className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-500/50 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-gray-900 font-semibold mb-1">Manage Zones</h4>
              <p className="text-gray-500 text-sm">Configure shipping regions and postcodes</p>
            </div>
            <MapPin className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
        </button>
        <button 
          onClick={() => { setActiveTab('services'); }}
          className="bg-white rounded-xl p-6 border border-gray-200 hover:border-emerald-500/50 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-gray-900 font-semibold mb-1">Configure Services</h4>
              <p className="text-gray-500 text-sm">Set up shipping rates and carriers</p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
        </button>
        <button 
          onClick={() => { setActiveTab('options'); }}
          className="bg-white rounded-xl p-6 border border-gray-200 hover:border-orange-500/50 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-gray-900 font-semibold mb-1">Shipping Options</h4>
              <p className="text-gray-500 text-sm">Free shipping thresholds & rules</p>
            </div>
            <Settings className="w-8 h-8 text-orange-600 group-hover:scale-110 transition-transform" />
          </div>
        </button>
      </div>

      {/* Recent Zones Preview */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Active Shipping Zones</h3>
          <Button variant="outline" size="sm" onClick={() => setActiveTab('zones')} className="border-gray-200">
            View All
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {zones.slice(0, 6).map(zone => (
            <div key={zone.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-gray-900 font-medium">{zone.name}</span>
              </div>
              <p className="text-gray-500 text-sm">{zone.postcodes?.slice(0, 3).join(', ')}{zone.postcodes?.length > 3 ? '...' : ''}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded text-xs ${zone.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                  {zone.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-gray-600 text-xs">{zone.code}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  ), [zones, services, categories, packages, setActiveTab]);

  // Overview content combines memoized stats with calculator (not memoized)
  const overviewContent = (
    <div className="space-y-6">
      {overviewStats}
      
      {/* Shipping Calculator - NOT memoized to allow input updates */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-600" />
          Shipping Rate Calculator
        </h3>
        
        {/* Row 1: Postcode, Suburb, Weight */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <Label className="text-gray-500 text-sm">Postcode</Label>
            <Input 
              placeholder="e.g., 2000"
              value={calcPostcode}
              onChange={(e) => setCalcPostcode(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-500 text-sm flex items-center gap-2">
              Suburb
              {loadingSuburbs && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
            </Label>
            <Select 
              value={calcSuburb} 
              onValueChange={setCalcSuburb}
              disabled={calcSuburbs.length === 0}
            >
              <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 mt-1">
                <SelectValue placeholder={calcSuburbs.length === 0 ? "Enter postcode first" : "Select suburb"} />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 max-h-60">
                {calcSuburbs.map((s, idx) => (
                  <SelectItem key={idx} value={s.suburb}>
                    {s.suburb} ({s.state})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {calcPostcode.length >= 4 && calcSuburbs.length === 0 && !loadingSuburbs && (
              <p className="text-gray-500 text-xs mt-1">No suburbs found</p>
            )}
          </div>
          <div>
            <Label className="text-gray-500 text-sm">Actual Weight (kg)</Label>
            <Input 
              type="number"
              placeholder="1"
              value={calcWeight}
              onChange={(e) => setCalcWeight(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-500 text-sm">Cart Total ($)</Label>
            <Input 
              type="number"
              placeholder="100"
              value={calcTotal}
              onChange={(e) => setCalcTotal(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
            />
          </div>
        </div>
        
        {/* Row 2: Shipping Dimensions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <Label className="text-gray-500 text-sm">Shipping Length (cm)</Label>
            <Input 
              type="number"
              placeholder="0"
              value={calcLength}
              onChange={(e) => setCalcLength(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-500 text-sm">Shipping Width (cm)</Label>
            <Input 
              type="number"
              placeholder="0"
              value={calcWidth}
              onChange={(e) => setCalcWidth(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-500 text-sm">Shipping Height (cm)</Label>
            <Input 
              type="number"
              placeholder="0"
              value={calcHeight}
              onChange={(e) => setCalcHeight(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={handleCalculateShipping}
              disabled={calculating || !calcPostcode}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {calculating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
              Calculate
            </Button>
          </div>
        </div>
        
        <p className="text-gray-500 text-xs mb-4">
          Cubic Weight = (L × W × H) / 1,000,000 × 250. Charges use the greater of actual or cubic weight.
        </p>

        {/* Calculator Results */}
        {calcResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            {calcResult.error ? (
              <p className="text-red-600">{calcResult.error}</p>
            ) : (
              <>
                {calcResult.zone && (
                  <div className="mb-3">
                    <p className="text-gray-500 text-sm">
                      Zone: <span className="text-gray-900 font-medium">{calcResult.zone.name}</span> ({calcResult.zone.code})
                    </p>
                    {calcSuburb && (
                      <p className="text-gray-500 text-sm">
                        Suburb: <span className="text-emerald-600 font-medium">{calcSuburb}</span>
                      </p>
                    )}
                  </div>
                )}
                {calcResult.options && calcResult.options.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-gray-700 text-sm font-medium">Available shipping options:</p>
                    {calcResult.options.map((opt, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-900 font-medium">{opt.service_name || opt.name}</p>
                            <p className="text-gray-500 text-xs">{opt.delivery_estimate || opt.description || `${opt.delivery_days || 0} business days`}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${(opt.price === 0 || opt.is_free) ? 'text-emerald-600' : 'text-gray-900'}`}>
                              {(opt.price === 0 || opt.is_free) ? 'FREE' : `$${(opt.price || 0).toFixed(2)}`}
                            </p>
                            {opt.price > 0 && opt.gst_amount > 0 && (
                              <p className="text-gray-500 text-xs">
                                {opt.tax_inclusive 
                                  ? `incl. GST $${opt.gst_amount?.toFixed(2)}` 
                                  : `+ GST $${opt.gst_amount?.toFixed(2)} = $${opt.price?.toFixed(2)}`
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No shipping options available for this destination.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ============== RENDER ==============
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-emerald-600" />
            Shipping Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Configure zones, services, rates, and shipping rules</p>
        </div>
        <Button variant="outline" onClick={fetchAllData} className="border-gray-200">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-500/30'
                : 'text-gray-500 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && overviewContent}
        {activeTab === 'zones' && (
          <ZonesTab 
            zones={zones}
            fetchAllData={fetchAllData}
          />
        )}
        {activeTab === 'services' && (
          <ServicesTab
            services={services}
            zones={zones}
            categories={categories}
            onRefresh={fetchAllData}
          />
        )}
        {activeTab === 'categories' && (
          <CategoriesTab
            categories={categories}
            categoryForm={categoryForm}
            setCategoryForm={setCategoryForm}
            editingItem={editingItem}
            setEditingItem={setEditingItem}
            showCategoryModal={showCategoryModal}
            setShowCategoryModal={setShowCategoryModal}
            saving={saving}
            setSaving={setSaving}
            fetchAllData={fetchAllData}
          />
        )}
        {activeTab === 'packages' && (
          <PackagesTab
            packages={packages}
            packageForm={packageForm}
            setPackageForm={setPackageForm}
            editingItem={editingItem}
            setEditingItem={setEditingItem}
            showPackageModal={showPackageModal}
            setShowPackageModal={setShowPackageModal}
            saving={saving}
            setSaving={setSaving}
            fetchAllData={fetchAllData}
          />
        )}
        {activeTab === 'options' && (
          <OptionsTab
            options={options}
            services={services}
            zones={zones}
            fetchAllData={fetchAllData}
          />
        )}
      </div>
    </div>
  );
};

export default MerchantShipping;
