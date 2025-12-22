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
    <Label className="text-gray-300 text-sm">{label}</Label>
    <div className={`flex items-center gap-1 mt-1 ${prefix || suffix ? '' : ''}`}>
      {prefix && <span className="text-gray-400">{prefix}</span>}
      <Input
        type={type}
        step={step}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`bg-gray-700 border-gray-600 text-white ${className}`}
      />
      {suffix && <span className="text-gray-400 text-sm whitespace-nowrap">{suffix}</span>}
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
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showOptionModal, setShowOptionModal] = useState(false);
  
  // Editing states
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  
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

  // Zone form state (moved to parent level to persist across re-renders)
  const [zoneForm, setZoneForm] = useState({
    code: '',
    name: '',
    country: 'AU',
    postcodes: [],
    is_active: true,
    sort_order: 0
  });
  const [postcodesInput, setPostcodesInput] = useState('');
  const [showZoneImportModal, setShowZoneImportModal] = useState(false);
  const [zoneImporting, setZoneImporting] = useState(false);
  const [zoneImportMode, setZoneImportMode] = useState('merge');
  const [zoneImportResult, setZoneImportResult] = useState(null);
  const [zoneUploadProgress, setZoneUploadProgress] = useState(0);
  const zoneFileInputRef = useRef(null);

  // Service form state (moved to parent level)
  const [serviceForm, setServiceForm] = useState({
    name: '',
    code: '',
    carrier: 'custom',
    charge_type: 'weight',
    min_charge: 0,
    max_charge: null,
    handling_fee: 0,
    fuel_levy_percent: 0,
    fuel_levy_amount: 0,
    cubic_weight_modifier: 250,
    tax_inclusive: false,
    tax_rate: 10.0,
    categories: [],
    is_active: true,
    sort_order: 0,
    rates: []
  });
  const [expandedService, setExpandedService] = useState(null);
  const [showRateImportModal, setShowRateImportModal] = useState(false);
  const [selectedServiceForImport, setSelectedServiceForImport] = useState(null);
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

  // Stable handler for service form text input changes - uses name attribute
  const handleServiceFormInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    debouncedSetServiceForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, [debouncedSetServiceForm]);

  // Stable handler for code input (lowercase conversion)
  const handleServiceFormCodeChange = useCallback((e) => {
    setServiceForm(prev => ({
      ...prev,
      code: e.target.value.toLowerCase()
    }));
  }, []);

  // Stable handler for numeric service form fields - uses name attribute
  const handleServiceFormNumericChange = useCallback((e) => {
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
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Shipping Zones</p>
              <p className="text-2xl font-bold text-white">{zones.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Truck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Shipping Services</p>
              <p className="text-2xl font-bold text-white">{services.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Tag className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Categories</p>
              <p className="text-2xl font-bold text-white">{categories.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Box className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Package Types</p>
              <p className="text-2xl font-bold text-white">{packages.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button 
          onClick={() => { setActiveTab('zones'); }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500/50 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-semibold mb-1">Manage Zones</h4>
              <p className="text-gray-500 text-sm">Configure shipping regions and postcodes</p>
            </div>
            <MapPin className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
        </button>
        <button 
          onClick={() => { setActiveTab('services'); }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-emerald-500/50 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-semibold mb-1">Configure Services</h4>
              <p className="text-gray-500 text-sm">Set up shipping rates and carriers</p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
        </button>
        <button 
          onClick={() => { setActiveTab('options'); }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-orange-500/50 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-semibold mb-1">Shipping Options</h4>
              <p className="text-gray-500 text-sm">Free shipping thresholds & rules</p>
            </div>
            <Settings className="w-8 h-8 text-orange-400 group-hover:scale-110 transition-transform" />
          </div>
        </button>
      </div>

      {/* Recent Zones Preview */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Active Shipping Zones</h3>
          <Button variant="outline" size="sm" onClick={() => setActiveTab('zones')} className="border-gray-600">
            View All
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {zones.slice(0, 6).map(zone => (
            <div key={zone.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span className="text-white font-medium">{zone.name}</span>
              </div>
              <p className="text-gray-500 text-sm">{zone.postcodes?.slice(0, 3).join(', ')}{zone.postcodes?.length > 3 ? '...' : ''}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded text-xs ${zone.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
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
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-400" />
          Shipping Rate Calculator
        </h3>
        
        {/* Row 1: Postcode, Suburb, Weight */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <Label className="text-gray-400 text-sm">Postcode</Label>
            <Input 
              placeholder="e.g., 2000"
              value={calcPostcode}
              onChange={(e) => setCalcPostcode(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-400 text-sm flex items-center gap-2">
              Suburb
              {loadingSuburbs && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
            </Label>
            <Select 
              value={calcSuburb} 
              onValueChange={setCalcSuburb}
              disabled={calcSuburbs.length === 0}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                <SelectValue placeholder={calcSuburbs.length === 0 ? "Enter postcode first" : "Select suburb"} />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
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
            <Label className="text-gray-400 text-sm">Actual Weight (kg)</Label>
            <Input 
              type="number"
              placeholder="1"
              value={calcWeight}
              onChange={(e) => setCalcWeight(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-400 text-sm">Cart Total ($)</Label>
            <Input 
              type="number"
              placeholder="100"
              value={calcTotal}
              onChange={(e) => setCalcTotal(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white mt-1"
            />
          </div>
        </div>
        
        {/* Row 2: Shipping Dimensions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <Label className="text-gray-400 text-sm">Shipping Length (cm)</Label>
            <Input 
              type="number"
              placeholder="0"
              value={calcLength}
              onChange={(e) => setCalcLength(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-400 text-sm">Shipping Width (cm)</Label>
            <Input 
              type="number"
              placeholder="0"
              value={calcWidth}
              onChange={(e) => setCalcWidth(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-400 text-sm">Shipping Height (cm)</Label>
            <Input 
              type="number"
              placeholder="0"
              value={calcHeight}
              onChange={(e) => setCalcHeight(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white mt-1"
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
          <div className="mt-4 p-4 bg-gray-900 rounded-lg">
            {calcResult.error ? (
              <p className="text-red-400">{calcResult.error}</p>
            ) : (
              <>
                {calcResult.zone && (
                  <div className="mb-3">
                    <p className="text-gray-400 text-sm">
                      Zone: <span className="text-white font-medium">{calcResult.zone.name}</span> ({calcResult.zone.code})
                    </p>
                    {calcSuburb && (
                      <p className="text-gray-400 text-sm">
                        Suburb: <span className="text-emerald-400 font-medium">{calcSuburb}</span>
                      </p>
                    )}
                  </div>
                )}
                {calcResult.options && calcResult.options.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-gray-300 text-sm font-medium">Available shipping options:</p>
                    {calcResult.options.map((opt, idx) => (
                      <div key={idx} className="p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{opt.service_name || opt.name}</p>
                            <p className="text-gray-500 text-xs">{opt.delivery_estimate || opt.description || `${opt.delivery_days || 0} business days`}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${(opt.price === 0 || opt.is_free) ? 'text-emerald-400' : 'text-white'}`}>
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
                  <p className="text-gray-400 text-sm">No shipping options available for this destination.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ============== ZONES TAB ==============
  const ZonesTab = () => {
    // Use parent-level state - removed local state declarations

    const openZoneModal = (zone = null) => {
      if (zone) {
        setEditingItem(zone);
        setZoneForm({
          code: zone.code || '',
          name: zone.name || '',
          country: zone.country || 'AU',
          postcodes: zone.postcodes || [],
          is_active: zone.is_active !== false,
          sort_order: zone.sort_order || 0
        });
        setPostcodesInput(zone.postcodes?.join(', ') || '');
      } else {
        setEditingItem(null);
        setZoneForm({
          code: '',
          name: '',
          country: 'AU',
          postcodes: [],
          is_active: true,
          sort_order: zones.length
        });
        setPostcodesInput('');
      }
      setShowZoneModal(true);
    };

    const handleSaveZone = async () => {
      setSaving(true);
      try {
        const data = {
          ...zoneForm,
          postcodes: postcodesInput.split(',').map(p => p.trim()).filter(Boolean)
        };
        
        if (editingItem) {
          await axios.put(`${API}/shipping/zones/${editingItem.id}`, data);
        } else {
          await axios.post(`${API}/shipping/zones`, data);
        }
        await fetchAllData();
        setShowZoneModal(false);
      } catch (error) {
        console.error('Error saving zone:', error);
        alert(error.response?.data?.detail || 'Failed to save zone');
      } finally {
        setSaving(false);
      }
    };

    const handleDeleteZone = async (zoneId) => {
      if (!window.confirm('Are you sure you want to delete this zone?')) return;
      try {
        await axios.delete(`${API}/shipping/zones/${zoneId}`);
        await fetchAllData();
      } catch (error) {
        console.error('Error deleting zone:', error);
      }
    };

    // Export zones to CSV
    const handleExportZones = async () => {
      try {
        const response = await axios.get(`${API}/shipping/zones/export/csv`, {
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `shipping_zones_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error exporting zones:', error);
        alert('Failed to export zones');
      }
    };

    // Download template
    const handleDownloadTemplate = async () => {
      try {
        const response = await axios.get(`${API}/shipping/zones/export/template`, {
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'shipping_zones_template.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading template:', error);
        alert('Failed to download template');
      }
    };

    // Handle file selection - immediately start upload
    const handleFileSelect = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      setZoneImporting(true);
      setZoneImportResult(null);
      setZoneUploadProgress(0);
      
      // Show the modal immediately with upload progress
      setShowZoneImportModal(true);
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setZoneUploadProgress(prev => Math.min(prev + 10, 90));
        }, 100);
        
        const response = await axios.post(
          `${API}/shipping/zones/import/csv?mode=${zoneImportMode}`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setZoneUploadProgress(progress);
            }
          }
        );
        
        clearInterval(progressInterval);
        setZoneUploadProgress(100);
        
        setZoneImportResult({
          success: true,
          ...response.data
        });
        
        await fetchAllData();
      } catch (error) {
        console.error('Error importing zones:', error);
        setZoneImportResult({
          success: false,
          error: error.response?.data?.detail || 'Failed to import zones'
        });
      } finally {
        setZoneImporting(false);
        if (zoneFileInputRef.current) {
          zoneFileInputRef.current.value = '';
        }
      }
    };

    // Open import modal without file (for settings)
    const openImportModal = () => {
      setZoneImportResult(null);
      setZoneUploadProgress(0);
      setShowZoneImportModal(true);
    };

    // Delete all zones
    const handleDeleteAllZones = async () => {
      if (!window.confirm('Are you sure you want to delete ALL shipping zones? This cannot be undone.')) return;
      if (!window.confirm('This will remove all zone data. Please confirm again.')) return;
      
      try {
        await axios.delete(`${API}/shipping/zones/bulk`);
        await fetchAllData();
        setZoneImportResult({ success: true, message: 'All zones deleted successfully', zones_created: 0, zones_updated: 0 });
      } catch (error) {
        console.error('Error deleting all zones:', error);
        alert('Failed to delete zones');
      }
    };

    // Trigger file input click
    const triggerFileUpload = () => {
      zoneFileInputRef.current?.click();
    };

    return (
      <div className="space-y-4">
        {/* Hidden file input */}
        <input
          ref={zoneFileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Shipping Zones</h2>
            <p className="text-gray-400 text-sm">Define geographic regions for shipping rates</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportZones}
              className="border-gray-600"
              disabled={zones.length === 0}
            >
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={openImportModal}
              className="border-gray-600"
            >
              <Upload className="w-4 h-4 mr-2" /> Import CSV
            </Button>
            <Button onClick={() => openZoneModal()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Add Zone
            </Button>
          </div>
        </div>

        {/* Zones List */}
        <div className="grid gap-4">
          {zones.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
              <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">No shipping zones configured</p>
              <Button onClick={() => openZoneModal()}>Create Your First Zone</Button>
            </div>
          ) : (
            zones.map(zone => (
              <div 
                key={zone.id} 
                className={`bg-gray-800 rounded-xl p-5 border ${zone.is_active ? 'border-gray-700' : 'border-gray-700/50 opacity-60'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <MapPin className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-semibold text-white">{zone.name}</h3>
                      <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded font-mono">{zone.code}</span>
                      {!zone.is_active && (
                        <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded">Inactive</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="flex items-center gap-1 text-gray-400 text-sm">
                        <Globe className="w-4 h-4" /> {zone.country}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {zone.postcodes?.slice(0, 8).map((pc, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-900 text-gray-300 text-xs rounded">
                          {pc}
                        </span>
                      ))}
                      {zone.postcodes?.length > 8 && (
                        <span className="px-2 py-1 bg-gray-900 text-gray-500 text-xs rounded">
                          +{zone.postcodes.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openZoneModal(zone)}
                      className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteZone(zone.id)}
                      className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Zone Modal */}
        <Dialog open={showZoneModal} onOpenChange={setShowZoneModal}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Shipping Zone' : 'Create Shipping Zone'}</DialogTitle>
              <DialogDescription className="text-gray-400">
                Define a geographic region for shipping rates
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Zone Code</Label>
                  <Input
                    value={zoneForm.code}
                    onChange={(e) => setZoneForm({...zoneForm, code: e.target.value.toUpperCase()})}
                    placeholder="e.g., SYD_METRO"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Zone Name</Label>
                  <Input
                    value={zoneForm.name}
                    onChange={(e) => setZoneForm({...zoneForm, name: e.target.value})}
                    placeholder="e.g., Sydney Metro"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Country Code</Label>
                  <Select value={zoneForm.country} onValueChange={(v) => setZoneForm({...zoneForm, country: v})}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="AU">Australia (AU)</SelectItem>
                      <SelectItem value="NZ">New Zealand (NZ)</SelectItem>
                      <SelectItem value="US">United States (US)</SelectItem>
                      <SelectItem value="GB">United Kingdom (GB)</SelectItem>
                      <SelectItem value="CA">Canada (CA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Sort Order</Label>
                  <Input
                    type="number"
                    value={zoneForm.sort_order}
                    onChange={(e) => setZoneForm({...zoneForm, sort_order: parseInt(e.target.value) || 0})}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-gray-300">Postcodes (comma-separated, ranges supported)</Label>
                <textarea
                  value={postcodesInput}
                  onChange={(e) => setPostcodesInput(e.target.value)}
                  placeholder="e.g., 2000-2234, 2555-2574, 2740-2786"
                  rows={3}
                  className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-gray-500 text-xs mt-1">Use ranges like "2000-2234" or individual postcodes</p>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Zone Active</Label>
                <Switch
                  checked={zoneForm.is_active}
                  onCheckedChange={(checked) => setZoneForm({...zoneForm, is_active: checked})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowZoneModal(false)} className="border-gray-600">
                Cancel
              </Button>
              <Button onClick={handleSaveZone} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Modal */}
        <Dialog open={showZoneImportModal} onOpenChange={setShowZoneImportModal}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" />
                Import Shipping Zones
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Upload a CSV file to import shipping zones in Maropost format
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Upload Progress - shown when importing */}
              {zoneImporting && (
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                    <div>
                      <p className="text-white font-medium">Uploading & Processing...</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${zoneUploadProgress}%` }}
                    />
                  </div>
                  <p className="text-gray-400 text-xs mt-2 text-center">{zoneUploadProgress}% complete</p>
                </div>
              )}

              {/* Import Result - shown after import */}
              {zoneImportResult && !zoneImporting && (
                <div className={`p-4 rounded-lg border ${
                  zoneImportResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  {zoneImportResult.success ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Import Successful!</span>
                      </div>
                      <div className="text-sm text-gray-300 space-y-1">
                        <p>Mode: <span className="text-white">{zoneImportResult.mode}</span></p>
                        {zoneImportResult.rows_processed !== undefined && (
                          <p>Rows processed: <span className="text-white">{zoneImportResult.rows_processed}</span></p>
                        )}
                        <p>Zones created: <span className="text-emerald-400">{zoneImportResult.zones_created}</span></p>
                        <p>Zones updated: <span className="text-blue-400">{zoneImportResult.zones_updated}</span></p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-red-400 font-medium">Import Failed</span>
                        <p className="text-red-300 text-sm mt-1">{zoneImportResult.error}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Show settings and upload button only when not importing */}
              {!zoneImporting && !zoneImportResult && (
                <>
                  {/* Format Info */}
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-sm font-medium text-white mb-2">CSV Format (Maropost Compatible)</h4>
                    <p className="text-gray-400 text-xs mb-2">Required columns:</p>
                    <div className="flex flex-wrap gap-2">
                      {['Country', 'Courier', 'From Post Code', 'To Post Code', 'Zone Code', 'Zone Name'].map(col => (
                        <span key={col} className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded font-mono">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Download Template Button */}
                  <Button 
                    variant="outline" 
                    className="w-full border-gray-600 border-dashed"
                    onClick={handleDownloadTemplate}
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Download Sample Template
                  </Button>

                  {/* Import Mode Selection */}
                  <div>
                    <Label className="text-gray-300 mb-2 block">Import Mode</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setZoneImportMode('merge')}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          zoneImportMode === 'merge' 
                            ? 'border-blue-500 bg-blue-500/10 text-white' 
                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <div className="font-medium text-sm">Merge</div>
                        <div className="text-xs mt-1 opacity-70">Add new & update existing zones</div>
                      </button>
                      <button
                        onClick={() => setZoneImportMode('replace')}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          zoneImportMode === 'replace' 
                            ? 'border-orange-500 bg-orange-500/10 text-white' 
                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <div className="font-medium text-sm">Replace</div>
                        <div className="text-xs mt-1 opacity-70">Clear all & import fresh</div>
                      </button>
                    </div>
                  </div>

                  {/* Warning for Replace Mode */}
                  {zoneImportMode === 'replace' && (
                    <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                      <p className="text-orange-300 text-sm">
                        Replace mode will delete all existing zones before importing. This cannot be undone.
                      </p>
                    </div>
                  )}

                  {/* Upload Button */}
                  <Button 
                    onClick={triggerFileUpload}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Select CSV File & Upload
                  </Button>
                </>
              )}

              {/* Import another or close after result */}
              {zoneImportResult && !zoneImporting && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => setZoneImportResult(null)}
                    className="flex-1 border-gray-600"
                  >
                    Import Another
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {zones.length > 0 && !zoneImporting && (
                <Button 
                  variant="outline" 
                  onClick={handleDeleteAllZones}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 sm:mr-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All Zones
                </Button>
              )}
              <Button variant="outline" onClick={() => { setShowZoneImportModal(false); setZoneImportResult(null); }} className="border-gray-600">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // ============== SERVICES TAB ==============
  const ServicesTab = () => {
    // Using parent-level state - removed local state declarations

    const openServiceModal = (service = null) => {
      if (service) {
        setEditingItem(service);
        setServiceForm({
          name: service.name || '',
          code: service.code || '',
          carrier: service.carrier || 'custom',
          charge_type: service.charge_type || 'weight',
          min_charge: service.min_charge || 0,
          max_charge: service.max_charge || null,
          handling_fee: service.handling_fee || 0,
          fuel_levy_percent: service.fuel_levy_percent || 0,
          fuel_levy_amount: service.fuel_levy_amount || 0,
          cubic_weight_modifier: service.cubic_weight_modifier || 250,
          tax_inclusive: service.tax_inclusive || false,
          tax_rate: service.tax_rate || 10.0,
          categories: service.categories || [],
          is_active: service.is_active !== false,
          sort_order: service.sort_order || 0,
          rates: service.rates || []
        });
      } else {
        setEditingItem(null);
        setServiceForm({
          name: '',
          code: '',
          carrier: 'custom',
          charge_type: 'weight',
          min_charge: 0,
          max_charge: null,
          handling_fee: 0,
          fuel_levy_percent: 0,
          fuel_levy_amount: 0,
          cubic_weight_modifier: 250,
          tax_inclusive: false,
          tax_rate: 10.0,
          categories: ['default'],
          is_active: true,
          sort_order: services.length,
          rates: []
        });
      }
      setShowServiceModal(true);
    };

    // Add all zones as rates
    const addAllZonesAsRates = () => {
      const newRates = zones.map(zone => ({
        zone_code: zone.code,
        zone_name: zone.name,
        min_weight: 0,
        max_weight: 999,
        base_rate: 0,
        first_parcel: 0,
        per_subsequent: 0,
        per_kg_rate: 0,
        delivery_days: 3,
        is_active: true
      }));
      setServiceForm({
        ...serviceForm,
        rates: newRates
      });
    };

    const addRateRow = () => {
      setServiceForm({
        ...serviceForm,
        rates: [...serviceForm.rates, {
          zone_code: zones[0]?.code || '',
          zone_name: zones[0]?.name || '',
          min_weight: 0,
          max_weight: 999,
          base_rate: 0,
          first_parcel: 0,
          per_subsequent: 0,
          per_kg_rate: 0,
          delivery_days: 3,
          is_active: true
        }]
      });
    };

    const updateRate = (index, field, value) => {
      const newRates = [...serviceForm.rates];
      newRates[index] = { ...newRates[index], [field]: value };
      
      // Auto-fill zone name when zone_code changes
      if (field === 'zone_code') {
        const zone = zones.find(z => z.code === value);
        newRates[index].zone_name = zone?.name || value;
      }
      
      setServiceForm({ ...serviceForm, rates: newRates });
    };

    const removeRate = (index) => {
      setServiceForm({
        ...serviceForm,
        rates: serviceForm.rates.filter((_, i) => i !== index)
      });
    };

    // Toggle zone selection - add or remove rate for zone
    const toggleZoneRate = (zone) => {
      const existingIndex = serviceForm.rates.findIndex(r => r.zone_code === zone.code);
      
      if (existingIndex >= 0) {
        // Remove the zone
        setServiceForm({
          ...serviceForm,
          rates: serviceForm.rates.filter((_, i) => i !== existingIndex)
        });
      } else {
        // Add the zone with empty rates
        setServiceForm({
          ...serviceForm,
          rates: [...serviceForm.rates, {
            zone_code: zone.code,
            zone_name: zone.name,
            min_weight: 0,
            max_weight: 999,
            base_rate: 0,
            first_parcel: 0,
            per_subsequent: 0,
            per_kg_rate: 0,
            delivery_days: 3,
            internal_note: '',
            is_active: true
          }]
        });
      }
    };

    // Select all zones
    const selectAllZones = () => {
      const newRates = zones.map(zone => {
        // Keep existing rate data if already selected
        const existing = serviceForm.rates.find(r => r.zone_code === zone.code);
        return existing || {
          zone_code: zone.code,
          zone_name: zone.name,
          min_weight: 0,
          max_weight: 999,
          base_rate: 0,
          first_parcel: 0,
          per_subsequent: 0,
          per_kg_rate: 0,
          delivery_days: 3,
          internal_note: '',
          is_active: true
        };
      });
      setServiceForm({ ...serviceForm, rates: newRates });
    };

    // Select all zones from filtered list
    const selectAllZonesFiltered = (filteredZones) => {
      const newRates = filteredZones.map(zone => {
        // Keep existing rate data if already selected
        const existing = serviceForm.rates.find(r => r.zone_code === zone.code);
        return existing || {
          zone_code: zone.code,
          zone_name: zone.name,
          min_weight: 0,
          max_weight: 999,
          base_rate: 0,
          first_parcel: 0,
          per_subsequent: 0,
          per_kg_rate: 0,
          delivery_days: 3,
          internal_note: '',
          is_active: true
        };
      });
      setServiceForm({ ...serviceForm, rates: newRates });
    };

    // Clear all zones
    const clearAllZones = () => {
      setServiceForm({ ...serviceForm, rates: [] });
    };

    // Handle CSV upload in modal - parse and auto-fill rates
    const handleModalRateUpload = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      setModalUploadingRates(true);
      
      try {
        const text = await file.text();
        const lines = text.split('\n');
        const headerLine = lines[0];
        
        // Parse header - handle quoted values
        const headers = [];
        let inQuote = false;
        let currentHeader = '';
        for (let i = 0; i < headerLine.length; i++) {
          const char = headerLine[i];
          if (char === '"') {
            inQuote = !inQuote;
          } else if (char === ',' && !inQuote) {
            headers.push(currentHeader.trim());
            currentHeader = '';
          } else if (char !== '\r') {
            currentHeader += char;
          }
        }
        headers.push(currentHeader.trim());
        
        console.log('CSV Headers:', headers);
        
        // Find column indices by exact header name
        const zoneCodeIdx = headers.findIndex(h => h.toLowerCase() === 'zone code');
        const zoneNameIdx = headers.findIndex(h => h.toLowerCase() === 'zone name');
        const minChargeIdx = headers.findIndex(h => h.toLowerCase() === 'minimum charge');
        const firstParcelIdx = headers.findIndex(h => h.toLowerCase() === '1st parcel');
        const perSubseqIdx = headers.findIndex(h => h.toLowerCase() === 'per subsequent parcel');
        const perKgIdx = headers.findIndex(h => h.toLowerCase() === 'per kg');
        const deliveryIdx = headers.findIndex(h => h.toLowerCase() === 'delivery time');
        const noteIdx = headers.findIndex(h => h.toLowerCase() === 'internal note');
        
        console.log('Column indices:', { zoneCodeIdx, zoneNameIdx, minChargeIdx, firstParcelIdx, perSubseqIdx, perKgIdx, deliveryIdx, noteIdx });
        
        const newRates = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Parse CSV line - handle empty values and commas properly
          const values = [];
          let inQuote = false;
          let currentValue = '';
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
              values.push(currentValue.trim());
              currentValue = '';
            } else if (char !== '\r') {
              currentValue += char;
            }
          }
          values.push(currentValue.trim());
          
          const zoneCode = zoneCodeIdx >= 0 ? values[zoneCodeIdx] : '';
          if (!zoneCode) continue;
          
          const rate = {
            zone_code: zoneCode,
            zone_name: zoneNameIdx >= 0 ? values[zoneNameIdx] || zoneCode : zoneCode,
            base_rate: minChargeIdx >= 0 ? parseFloat(values[minChargeIdx]) || 0 : 0,
            first_parcel: firstParcelIdx >= 0 ? parseFloat(values[firstParcelIdx]) || 0 : 0,
            per_subsequent: perSubseqIdx >= 0 ? parseFloat(values[perSubseqIdx]) || 0 : 0,
            per_kg_rate: perKgIdx >= 0 ? parseFloat(values[perKgIdx]) || 0 : 0,
            delivery_days: deliveryIdx >= 0 ? parseInt(values[deliveryIdx]) || 0 : 3,
            internal_note: noteIdx >= 0 ? values[noteIdx] || '' : '',
            min_weight: 0,
            max_weight: 999,
            is_active: true
          };
          
          newRates.push(rate);
        }
        
        console.log('Parsed rates sample:', newRates[0]);
        
        if (newRates.length > 0) {
          setServiceForm({ ...serviceForm, rates: newRates });
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
        alert('Failed to parse CSV file');
      } finally {
        setModalUploadingRates(false);
        if (modalRateFileInputRef.current) {
          modalRateFileInputRef.current.value = '';
        }
      }
    };

    const handleSaveService = async () => {
      setSaving(true);
      try {
        if (editingItem) {
          await axios.put(`${API}/shipping/services/${editingItem.id}`, serviceForm);
        } else {
          await axios.post(`${API}/shipping/services`, serviceForm);
        }
        await fetchAllData();
        setShowServiceModal(false);
      } catch (error) {
        console.error('Error saving service:', error);
        alert(error.response?.data?.detail || 'Failed to save service');
      } finally {
        setSaving(false);
      }
    };

    const handleDeleteService = async (serviceId) => {
      if (!window.confirm('Are you sure you want to delete this service?')) return;
      try {
        await axios.delete(`${API}/shipping/services/${serviceId}`);
        await fetchAllData();
      } catch (error) {
        console.error('Error deleting service:', error);
      }
    };

    // Export rates to CSV
    const handleExportRates = async (service) => {
      try {
        const response = await axios.get(`${API}/shipping/services/${service.id}/rates/export/csv`, {
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `ShippingRate_${service.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error exporting rates:', error);
        alert('Failed to export rates');
      }
    };

    // Download rate template
    const handleDownloadRateTemplate = async () => {
      try {
        const response = await axios.get(`${API}/shipping/rates/export/template`, {
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'shipping_rates_template.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading template:', error);
        alert('Failed to download template');
      }
    };

    // Open import modal for a service
    const openRateImportModal = (service) => {
      setSelectedServiceForImport(service);
      setRateImportResult(null);
      setSelectedRateFile(null);
      setRateUploadProgress(0);
      setShowRateImportModal(true);
    };

    // Handle rate file selection - immediately start upload
    const handleRateFileSelect = async (event) => {
      const file = event.target.files?.[0];
      if (!file || !selectedServiceForImport) return;
      
      setSelectedRateFile(file);
      setImportingRates(true);
      setRateImportResult(null);
      setRateUploadProgress(0);
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        // Simulate progress
        const progressInterval = setInterval(() => {
          setRateUploadProgress(prev => Math.min(prev + 10, 90));
        }, 100);
        
        const response = await axios.post(
          `${API}/shipping/services/${selectedServiceForImport.id}/rates/import/csv?mode=${rateImportMode}`,
          formData,
          { 
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setRateUploadProgress(progress);
            }
          }
        );
        
        clearInterval(progressInterval);
        setRateUploadProgress(100);
        
        setRateImportResult({ success: true, ...response.data });
        await fetchAllData();
      } catch (error) {
        console.error('Error importing rates:', error);
        setRateImportResult({
          success: false,
          error: error.response?.data?.detail || 'Failed to import rates'
        });
      } finally {
        setImportingRates(false);
        setSelectedRateFile(null);
        if (rateFileInputRef.current) {
          rateFileInputRef.current.value = '';
        }
      }
    };

    // Trigger rate file upload
    const triggerRateFileUpload = () => {
      rateFileInputRef.current?.click();
    };

    return (
      <div className="space-y-4">
        {/* Hidden file input for rate import */}
        <input
          ref={rateFileInputRef}
          type="file"
          accept=".csv"
          onChange={handleRateFileSelect}
          className="hidden"
        />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Shipping Services & Rates</h2>
            <p className="text-gray-400 text-sm">Configure shipping methods and pricing</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadRateTemplate}
              className="border-gray-600"
            >
              <FileDown className="w-4 h-4 mr-2" /> Rate Template
            </Button>
            <Button onClick={() => openServiceModal()} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> Add Service
            </Button>
          </div>
        </div>

        {/* Services List */}
        <div className="space-y-4">
          {services.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
              <Truck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">No shipping services configured</p>
              <Button onClick={() => openServiceModal()}>Create Your First Service</Button>
            </div>
          ) : (
            services.map(service => (
              <div 
                key={service.id} 
                className={`bg-gray-800 rounded-xl border ${service.is_active ? 'border-gray-700' : 'border-gray-700/50 opacity-60'}`}
              >
                <div 
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Truck className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                        <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded font-mono">{service.code}</span>
                        {!service.is_active && (
                          <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded">Inactive</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                        <span>Carrier: {service.carrier}</span>
                        <span>Type: {service.charge_type}</span>
                        <span>Min: ${service.min_charge?.toFixed(2)}</span>
                        <span>{service.rates?.length || 0} rate(s)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openServiceModal(service); }}
                        className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteService(service.id); }}
                        className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expandedService === service.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Rates Table */}
                {expandedService === service.id && (
                  <div className="px-5 pb-5 border-t border-gray-700">
                    {/* Import/Export buttons for rates */}
                    <div className="flex flex-wrap gap-2 mt-4 mb-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); handleExportRates(service); }}
                        className="border-gray-600"
                        disabled={!service.rates?.length}
                      >
                        <Download className="w-4 h-4 mr-1" /> Export Rates
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); openRateImportModal(service); }}
                        className="border-gray-600"
                      >
                        <Upload className="w-4 h-4 mr-1" /> Import Rates
                      </Button>
                    </div>
                    
                    {service.rates?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-gray-400 text-left">
                              <th className="pb-2 font-medium">Zone</th>
                              <th className="pb-2 font-medium">Min Charge</th>
                              <th className="pb-2 font-medium">1st Parcel</th>
                              <th className="pb-2 font-medium">Per Subseq.</th>
                              <th className="pb-2 font-medium">Per kg</th>
                              <th className="pb-2 font-medium">Days</th>
                              <th className="pb-2 font-medium">Internal Note</th>
                              <th className="pb-2 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {service.rates.map((rate, i) => (
                              <tr key={i} className="border-t border-gray-700/50">
                                <td className="py-2">
                                  <div className="text-white">{rate.zone_name || rate.zone_code}</div>
                                  <div className="text-gray-500 text-xs">{rate.zone_code}</div>
                                </td>
                                <td className="py-2 text-emerald-400">${(rate.base_rate || 0).toFixed(2)}</td>
                                <td className="py-2 text-gray-300">${(rate.first_parcel || rate.base_rate || 0).toFixed(2)}</td>
                                <td className="py-2 text-gray-300">{rate.per_subsequent ? `$${rate.per_subsequent.toFixed(2)}` : '-'}</td>
                                <td className="py-2 text-gray-300">${(rate.per_kg_rate || 0).toFixed(2)}</td>
                                <td className="py-2 text-gray-300">{rate.delivery_days || '-'}</td>
                                <td className="py-2 text-gray-500 text-xs max-w-32 truncate">{rate.internal_note || '-'}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 rounded text-xs ${rate.is_active !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
                                    {rate.is_active !== false ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <p className="mb-2">No rates configured for this service</p>
                        <p className="text-sm">Import rates from CSV or add them manually in the edit modal</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Service Modal */}
        <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Shipping Service' : 'Create Shipping Service'}</DialogTitle>
              <DialogDescription className="text-gray-400">
                Configure shipping method and zone-based rates
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              
              {/* Section: Details */}
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  Details
                </h3>
                
                {/* Carrier Selection */}
                <div className="mb-4">
                  <Label className="text-gray-300 text-sm mb-2 block">Carrier</Label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {[
                      { value: 'custom', label: 'Custom' },
                      { value: 'startrack', label: 'StarTrack' },
                      { value: 'australia_post', label: 'Australia Post' },
                      { value: 'tnt', label: 'TNT' },
                      { value: 'fedex', label: 'FedEx' },
                      { value: 'dhl', label: 'DHL' },
                    ].map(carrier => (
                      <button
                        key={carrier.value}
                        onClick={() => handleServiceFormChange('carrier', carrier.value)}
                        className={`p-2 rounded-lg border text-center transition-all text-sm ${
                          serviceForm.carrier === carrier.value 
                            ? 'border-emerald-500 bg-emerald-500/10 text-white' 
                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        {carrier.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-gray-300 text-sm">Name</Label>
                    <StableInput
                      key={`service-name-${editingItem?.id || 'new'}`}
                      name="name"
                      defaultValue={serviceForm.name}
                      onChange={handleServiceFormInputChange}
                      placeholder="e.g., StarTrack"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Code</Label>
                    <StableInput
                      key={`service-code-${editingItem?.id || 'new'}`}
                      name="code"
                      defaultValue={serviceForm.code}
                      onChange={handleServiceFormCodeChange}
                      placeholder="e.g., startrack"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Status</Label>
                    <Select value={serviceForm.is_active ? 'active' : 'inactive'} onValueChange={(v) => handleServiceFormChange('is_active', v === 'active')}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Charge Type</Label>
                    <Select value={serviceForm.charge_type} onValueChange={(v) => handleServiceFormChange('charge_type', v)}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="weight">Weight</SelectItem>
                        <SelectItem value="weight_cubic">Weight / Cubic</SelectItem>
                        <SelectItem value="cubic">Cubic</SelectItem>
                        <SelectItem value="fixed">Fixed Price</SelectItem>
                        <SelectItem value="flat">Flat Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <Label className="text-gray-300 text-sm">Maximum Length</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <StableInput
                        type="number"
                        step="0.1"
                        name="max_length"
                        defaultValue={serviceForm.max_length || ''}
                        onChange={handleServiceFormNumericChange}
                        placeholder="1.4"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                      <span className="text-gray-400 text-sm">m</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Cubic Weight Modifier</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <StableInput
                        type="number"
                        step="0.001"
                        name="cubic_weight_modifier"
                        defaultValue={serviceForm.cubic_weight_modifier || 250}
                        onChange={handleServiceFormNumericChange}
                        placeholder="250"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                      <span className="text-gray-400 text-sm whitespace-nowrap">kg/m³</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-gray-300 text-sm">Internal Description</Label>
                    <StableInput
                      name="internal_description"
                      defaultValue={serviceForm.internal_description || ''}
                      onChange={handleServiceFormInputChange}
                      placeholder="e.g., New rates from July 2024"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="tax_inclusive"
                      checked={serviceForm.tax_inclusive || false}
                      onChange={handleServiceFormInputChange}
                      className="rounded border-gray-600 text-emerald-500"
                    />
                    <div>
                      <span className="text-gray-300 text-sm">Rates Include GST</span>
                      <p className="text-gray-500 text-xs">Check if uploaded rates already include 10% GST</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="ship_to_po_box"
                      checked={serviceForm.ship_to_po_box || false}
                      onChange={handleServiceFormInputChange}
                      className="rounded border-gray-600 text-emerald-500"
                    />
                    <span className="text-gray-300 text-sm">Ship to PO Box</span>
                  </label>
                </div>

                {/* Tracking URL */}
                <div className="mt-4">
                  <Label className="text-gray-300 text-sm">Tracking URL</Label>
                  <div className="flex gap-2 mt-1">
                    <Select value={serviceForm.tracking_carrier || 'other'} onValueChange={(v) => handleServiceFormChange('tracking_carrier', v)}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="startrack">StarTrack</SelectItem>
                        <SelectItem value="auspost">Aus Post</SelectItem>
                        <SelectItem value="tnt">TNT</SelectItem>
                        <SelectItem value="fedex">FedEx</SelectItem>
                        <SelectItem value="dhl">DHL</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <StableInput
                      name="tracking_url"
                      defaultValue={serviceForm.tracking_url || ''}
                      onChange={handleServiceFormInputChange}
                      placeholder="https://carrier.com/track/#tracking_num#"
                      className="bg-gray-700 border-gray-600 text-white flex-1"
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-1">Use #tracking_num# as placeholder for the tracking number</p>
                </div>
              </div>

              {/* Section: Levies and Allowances */}
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Levies and Allowances
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-300 text-sm">Minimum Charge</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-gray-400">$</span>
                      <StableInput
                        type="number"
                        step="0.01"
                        name="min_charge"
                        defaultValue={serviceForm.min_charge || ''}
                        onChange={handleServiceFormNumericChange}
                        placeholder="0.00"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Maximum Charge</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-gray-400">$</span>
                      <StableInput
                        type="number"
                        step="0.01"
                        name="max_charge"
                        defaultValue={serviceForm.max_charge || ''}
                        onChange={handleServiceFormNumericChange}
                        placeholder="No max"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Handling Cost</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-gray-400">$</span>
                      <StableInput
                        type="number"
                        step="0.01"
                        name="handling_fee"
                        defaultValue={serviceForm.handling_fee || ''}
                        onChange={handleServiceFormNumericChange}
                        placeholder="0.00"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                      <span className="text-gray-400 text-xs whitespace-nowrap">per item</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <Label className="text-gray-300 text-sm">Fuel Levy</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-gray-400">$</span>
                      <StableInput
                        type="number"
                        step="0.01"
                        name="fuel_levy_amount"
                        defaultValue={serviceForm.fuel_levy_amount || ''}
                        onChange={handleServiceFormNumericChange}
                        placeholder="0.00"
                        className="bg-gray-700 border-gray-600 text-white w-20"
                      />
                      <span className="text-gray-400">+</span>
                      <StableInput
                        type="number"
                        step="0.1"
                        name="fuel_levy_percent"
                        defaultValue={serviceForm.fuel_levy_percent || ''}
                        onChange={handleServiceFormNumericChange}
                        placeholder="0.0"
                        className="bg-gray-700 border-gray-600 text-white w-20"
                      />
                      <span className="text-gray-400">%</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Packaging Allowance</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <StableInput
                        type="number"
                        step="0.1"
                        name="packaging_allowance_kg"
                        defaultValue={serviceForm.packaging_allowance_kg || ''}
                        onChange={handleServiceFormNumericChange}
                        placeholder="0"
                        className="bg-gray-700 border-gray-600 text-white w-16"
                      />
                      <span className="text-gray-400 text-xs">kg</span>
                      <span className="text-gray-400">+</span>
                      <StableInput
                        type="number"
                        step="0.1"
                        name="packaging_allowance_percent"
                        defaultValue={serviceForm.packaging_allowance_percent || ''}
                        onChange={handleServiceFormNumericChange}
                        placeholder="0"
                        className="bg-gray-700 border-gray-600 text-white w-16"
                      />
                      <span className="text-gray-400">%</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="round_up_weight"
                      checked={serviceForm.round_up_weight || false}
                      onChange={handleServiceFormInputChange}
                      className="rounded border-gray-600 text-emerald-500"
                    />
                    <span className="text-gray-300 text-sm">Round Up to Nearest kg</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="ignore_physical_weight"
                      checked={serviceForm.ignore_physical_weight || false}
                      onChange={handleServiceFormInputChange}
                      className="rounded border-gray-600 text-emerald-500"
                    />
                    <span className="text-gray-300 text-sm">Ignore physical weight of products in calculations</span>
                  </label>
                </div>
              </div>

              {/* Zone Rates */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-gray-300 text-base">Zone Rates</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => modalRateFileInputRef.current?.click()}
                      className="border-gray-600"
                    >
                      <Upload className="w-4 h-4 mr-1" /> Upload Rates CSV
                    </Button>
                  </div>
                </div>

                {/* Hidden file input for modal rate upload */}
                <input
                  ref={modalRateFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleModalRateUpload}
                  className="hidden"
                />

                {/* Upload progress indicator */}
                {modalUploadingRates && (
                  <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-700">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                      <div className="flex-1">
                        <p className="text-white text-sm">Processing rates...</p>
                        <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                          <div className="bg-emerald-500 h-1.5 rounded-full w-full animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Zone Selection Grid - Filtered by Carrier */}
                {(() => {
                  // Filter zones by carrier
                  const carrierMap = {
                    'startrack': 'StarTrack',
                    'australia_post': 'Australia Post',
                    'tnt': 'TNT',
                    'fedex': 'FedEx',
                    'dhl': 'DHL'
                  };
                  const selectedCarrierName = carrierMap[serviceForm.carrier];
                  const filteredZones = serviceForm.carrier === 'custom' 
                    ? zones 
                    : zones.filter(z => z.carrier?.toLowerCase() === selectedCarrierName?.toLowerCase() || z.carrier === selectedCarrierName);
                  
                  return (
                    <div className="bg-gray-900 rounded-lg border border-gray-700 mb-4">
                      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300 text-sm font-medium">
                            {serviceForm.carrier === 'custom' ? 'All Zones' : `${selectedCarrierName} Zones`}
                          </span>
                          <span className="text-gray-500 text-xs">({filteredZones.length} available)</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => selectAllZonesFiltered(filteredZones)}
                            className="text-xs text-emerald-400 hover:text-emerald-300"
                            disabled={filteredZones.length === 0}
                          >
                            Select All
                          </button>
                          <span className="text-gray-600">|</span>
                          <button
                            onClick={clearAllZones}
                            className="text-xs text-gray-400 hover:text-gray-300"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>
                      
                      {filteredZones.length === 0 ? (
                        <div className="p-6 text-center">
                          <MapPin className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                          <p className="text-gray-500">No zones found for {selectedCarrierName || 'selected carrier'}</p>
                          <p className="text-gray-600 text-sm mt-1">Upload zones for this carrier or select "Custom / All Zones"</p>
                        </div>
                      ) : (
                        <div className="p-3 max-h-40 overflow-y-auto">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {filteredZones.map(zone => {
                              const isSelected = serviceForm.rates.some(r => r.zone_code === zone.code);
                              return (
                                <label
                                  key={zone.code}
                                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                                    isSelected 
                                      ? 'bg-emerald-500/20 border border-emerald-500/30' 
                                      : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleZoneRate(zone)}
                                    className="rounded border-gray-600 text-emerald-500 focus:ring-emerald-500"
                                  />
                                  <span className={`text-sm truncate ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                                    {zone.name}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                {/* Rate Table for Selected Zones */}
                {serviceForm.rates.length === 0 ? (
                  <div className="bg-gray-900 rounded-lg p-6 text-center border border-dashed border-gray-700">
                    <MapPin className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 mb-1">No zones selected</p>
                    <p className="text-gray-600 text-sm">Select zones above or upload a rates CSV</p>
                  </div>
                ) : (
                  <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-800 text-gray-400 text-left">
                            <th className="px-2 py-2 font-medium whitespace-nowrap">Zone</th>
                            <th className="px-2 py-2 font-medium whitespace-nowrap w-20">Min Charge</th>
                            <th className="px-2 py-2 font-medium whitespace-nowrap w-20">1st Parcel</th>
                            <th className="px-2 py-2 font-medium whitespace-nowrap w-20">Per Subseq.</th>
                            <th className="px-2 py-2 font-medium whitespace-nowrap w-20">Per Kg</th>
                            <th className="px-2 py-2 font-medium whitespace-nowrap w-16">Days</th>
                            <th className="px-2 py-2 font-medium whitespace-nowrap">Internal Note</th>
                            <th className="px-2 py-2 font-medium w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {serviceForm.rates.map((rate, i) => (
                            <tr key={i} className="border-t border-gray-700/50">
                              <td className="px-2 py-1">
                                <div className="text-white font-medium text-xs">{rate.zone_name}</div>
                                <div className="text-gray-500 text-xs">{rate.zone_code}</div>
                              </td>
                              <td className="px-1 py-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={rate.base_rate || ''}
                                  onChange={(e) => updateRate(i, 'base_rate', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="bg-gray-700 border-gray-600 text-white h-7 text-xs w-20"
                                />
                              </td>
                              <td className="px-1 py-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={rate.first_parcel || ''}
                                  onChange={(e) => updateRate(i, 'first_parcel', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="bg-gray-700 border-gray-600 text-white h-7 text-xs w-20"
                                />
                              </td>
                              <td className="px-1 py-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={rate.per_subsequent || ''}
                                  onChange={(e) => updateRate(i, 'per_subsequent', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="bg-gray-700 border-gray-600 text-white h-7 text-xs w-20"
                                />
                              </td>
                              <td className="px-1 py-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={rate.per_kg_rate || ''}
                                  onChange={(e) => updateRate(i, 'per_kg_rate', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="bg-gray-700 border-gray-600 text-white h-7 text-xs w-20"
                                />
                              </td>
                              <td className="px-1 py-1">
                                <Input
                                  type="number"
                                  value={rate.delivery_days || ''}
                                  onChange={(e) => updateRate(i, 'delivery_days', parseInt(e.target.value) || 0)}
                                  placeholder="0"
                                  className="bg-gray-700 border-gray-600 text-white h-7 text-xs w-16"
                                />
                              </td>
                              <td className="px-1 py-1">
                                <Input
                                  type="text"
                                  value={rate.internal_note || ''}
                                  onChange={(e) => updateRate(i, 'internal_note', e.target.value)}
                                  placeholder="Note..."
                                  className="bg-gray-700 border-gray-600 text-white h-7 text-xs min-w-24"
                                />
                              </td>
                              <td className="px-1 py-1">
                                <button
                                  onClick={() => removeRate(i)}
                                  className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-3 py-2 bg-gray-800 border-t border-gray-700 text-gray-400 text-xs">
                      {serviceForm.rates.length} zone(s) configured
                    </div>
                  </div>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                <Label className="text-gray-300">Service Active</Label>
                <Switch
                  checked={serviceForm.is_active}
                  onCheckedChange={(checked) => handleServiceFormChange('is_active', checked)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowServiceModal(false)} className="border-gray-600">
                Cancel
              </Button>
              <Button onClick={handleSaveService} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rate Import Modal */}
        <Dialog open={showRateImportModal} onOpenChange={setShowRateImportModal}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                Import Shipping Rates
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Upload a CSV file to import rates for: <span className="text-white font-medium">{selectedServiceForImport?.name}</span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Upload Progress - shown when importing */}
              {importingRates && (
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                    <div>
                      <p className="text-white font-medium">Uploading & Processing...</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${rateUploadProgress}%` }}
                    />
                  </div>
                  <p className="text-gray-400 text-xs mt-2 text-center">{rateUploadProgress}% complete</p>
                </div>
              )}

              {/* Import Result - shown after import */}
              {rateImportResult && !importingRates && (
                <div className={`p-4 rounded-lg border ${
                  rateImportResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  {rateImportResult.success ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Import Successful!</span>
                      </div>
                      <div className="text-sm text-gray-300 space-y-1">
                        <p>Mode: <span className="text-white">{rateImportResult.mode}</span></p>
                        <p>Rates imported: <span className="text-emerald-400">{rateImportResult.rates_imported}</span></p>
                        <p>Total rates: <span className="text-white">{rateImportResult.total_rates}</span></p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-red-400 font-medium">Import Failed</span>
                        <p className="text-red-300 text-sm mt-1">{rateImportResult.error}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Show settings and upload button only when not importing */}
              {!importingRates && !rateImportResult && (
                <>
                  {/* Format Info */}
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-sm font-medium text-white mb-2">CSV Format (Maropost Compatible)</h4>
                    <p className="text-gray-400 text-xs mb-2">Required columns:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Zone Code', 'Zone Name', 'Courier Name', 'Minimum Charge', '1st Parcel', 'Per Kg', 'Delivery Time'].map(col => (
                        <span key={col} className="px-1.5 py-0.5 bg-gray-800 text-gray-300 text-xs rounded font-mono">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Download Template */}
                  <Button 
                    variant="outline" 
                    className="w-full border-gray-600 border-dashed"
                    onClick={handleDownloadRateTemplate}
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Download Sample Rate Template
                  </Button>

                  {/* Import Mode */}
                  <div>
                    <Label className="text-gray-300 mb-2 block">Import Mode</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setRateImportMode('merge')}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          rateImportMode === 'merge' 
                            ? 'border-emerald-500 bg-emerald-500/10 text-white' 
                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <div className="font-medium text-sm">Merge</div>
                        <div className="text-xs mt-1 opacity-70">Add new & update by zone code</div>
                      </button>
                      <button
                        onClick={() => setRateImportMode('replace')}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          rateImportMode === 'replace' 
                            ? 'border-orange-500 bg-orange-500/10 text-white' 
                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <div className="font-medium text-sm">Replace</div>
                        <div className="text-xs mt-1 opacity-70">Clear all rates & import fresh</div>
                      </button>
                    </div>
                  </div>

                  {/* Warning for Replace */}
                  {rateImportMode === 'replace' && (
                    <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                      <p className="text-orange-300 text-sm">
                        Replace mode will delete all existing rates for this service before importing.
                      </p>
                    </div>
                  )}

                  {/* Upload Button */}
                  <Button 
                    onClick={triggerRateFileUpload}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Select CSV File & Upload
                  </Button>
                </>
              )}

              {/* Import another or close after result */}
              {rateImportResult && !importingRates && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => setRateImportResult(null)}
                    className="flex-1 border-gray-600"
                  >
                    Import Another
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowRateImportModal(false); setRateImportResult(null); }} className="border-gray-600">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // ============== CATEGORIES TAB ==============
  const CategoriesTab = () => {
    const [categoryForm, setCategoryForm] = useState({
      code: '',
      name: '',
      description: '',
      is_default: false,
      is_active: true
    });

    const openCategoryModal = (category = null) => {
      if (category) {
        setEditingItem(category);
        setCategoryForm({
          code: category.code || '',
          name: category.name || '',
          description: category.description || '',
          is_default: category.is_default || false,
          is_active: category.is_active !== false
        });
      } else {
        setEditingItem(null);
        setCategoryForm({
          code: '',
          name: '',
          description: '',
          is_default: false,
          is_active: true
        });
      }
      setShowCategoryModal(true);
    };

    const handleSaveCategory = async () => {
      setSaving(true);
      try {
        if (editingItem) {
          await axios.put(`${API}/shipping/categories/${editingItem.id}`, categoryForm);
        } else {
          await axios.post(`${API}/shipping/categories`, categoryForm);
        }
        await fetchAllData();
        setShowCategoryModal(false);
      } catch (error) {
        console.error('Error saving category:', error);
        alert(error.response?.data?.detail || 'Failed to save category');
      } finally {
        setSaving(false);
      }
    };

    const handleDeleteCategory = async (categoryId) => {
      if (!window.confirm('Are you sure you want to delete this category?')) return;
      try {
        await axios.delete(`${API}/shipping/categories/${categoryId}`);
        await fetchAllData();
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Shipping Categories</h2>
            <p className="text-gray-400 text-sm">Categorize products for different shipping rules</p>
          </div>
          <Button onClick={() => openCategoryModal()} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" /> Add Category
          </Button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.length === 0 ? (
            <div className="col-span-full bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
              <Tag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">No shipping categories configured</p>
              <Button onClick={() => openCategoryModal()}>Create Your First Category</Button>
            </div>
          ) : (
            categories.map(category => (
              <div 
                key={category.id} 
                className={`bg-gray-800 rounded-xl p-5 border ${category.is_active ? 'border-gray-700' : 'border-gray-700/50 opacity-60'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-purple-400" />
                    <h3 className="text-white font-semibold">{category.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openCategoryModal(category)}
                      className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-gray-500 text-sm mb-3">{category.description || 'No description'}</p>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded font-mono">{category.code}</span>
                  {category.is_default && (
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">Default</span>
                  )}
                  {!category.is_active && (
                    <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded">Inactive</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Category Modal */}
        <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Category' : 'Create Category'}</DialogTitle>
              <DialogDescription className="text-gray-400">
                Categorize products for specific shipping rules
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-gray-300">Category Code</Label>
                <Input
                  value={categoryForm.code}
                  onChange={(e) => setCategoryForm({...categoryForm, code: e.target.value.toLowerCase()})}
                  placeholder="e.g., bulky"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Category Name</Label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                  placeholder="e.g., Bulky Items"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Description</Label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Default Category</Label>
                <Switch
                  checked={categoryForm.is_default}
                  onCheckedChange={(checked) => setCategoryForm({...categoryForm, is_default: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Category Active</Label>
                <Switch
                  checked={categoryForm.is_active}
                  onCheckedChange={(checked) => setCategoryForm({...categoryForm, is_active: checked})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCategoryModal(false)} className="border-gray-600">
                Cancel
              </Button>
              <Button onClick={handleSaveCategory} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // ============== PACKAGES TAB ==============
  const PackagesTab = () => {
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

    const openPackageModal = (pkg = null) => {
      if (pkg) {
        setEditingItem(pkg);
        setPackageForm({
          code: pkg.code || '',
          name: pkg.name || '',
          package_type: pkg.package_type || 'box',
          length: pkg.length || 0,
          width: pkg.width || 0,
          height: pkg.height || 0,
          max_weight: pkg.max_weight || 0,
          tare_weight: pkg.tare_weight || 0,
          is_active: pkg.is_active !== false
        });
      } else {
        setEditingItem(null);
        setPackageForm({
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
      }
      setShowPackageModal(true);
    };

    const handleSavePackage = async () => {
      setSaving(true);
      try {
        if (editingItem) {
          await axios.put(`${API}/shipping/packages/${editingItem.id}`, packageForm);
        } else {
          await axios.post(`${API}/shipping/packages`, packageForm);
        }
        await fetchAllData();
        setShowPackageModal(false);
      } catch (error) {
        console.error('Error saving package:', error);
        alert(error.response?.data?.detail || 'Failed to save package');
      } finally {
        setSaving(false);
      }
    };

    const handleDeletePackage = async (packageId) => {
      if (!window.confirm('Are you sure you want to delete this package?')) return;
      try {
        await axios.delete(`${API}/shipping/packages/${packageId}`);
        await fetchAllData();
      } catch (error) {
        console.error('Error deleting package:', error);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Predefined Packages</h2>
            <p className="text-gray-400 text-sm">Define standard package sizes for shipping calculations</p>
          </div>
          <Button onClick={() => openPackageModal()} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" /> Add Package
          </Button>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.length === 0 ? (
            <div className="col-span-full bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
              <Box className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">No package types configured</p>
              <Button onClick={() => openPackageModal()}>Create Your First Package</Button>
            </div>
          ) : (
            packages.map(pkg => (
              <div 
                key={pkg.id} 
                className={`bg-gray-800 rounded-xl p-5 border ${pkg.is_active ? 'border-gray-700' : 'border-gray-700/50 opacity-60'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Box className="w-5 h-5 text-orange-400" />
                    <h3 className="text-white font-semibold">{pkg.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openPackageModal(pkg)}
                      className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePackage(pkg.id)}
                      className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dimensions:</span>
                    <span className="text-white">{pkg.length} x {pkg.width} x {pkg.height} cm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Max Weight:</span>
                    <span className="text-white">{pkg.max_weight} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tare Weight:</span>
                    <span className="text-white">{pkg.tare_weight} kg</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded font-mono">{pkg.code}</span>
                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded capitalize">{pkg.package_type}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Package Modal */}
        <Dialog open={showPackageModal} onOpenChange={setShowPackageModal}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Package' : 'Create Package'}</DialogTitle>
              <DialogDescription className="text-gray-400">
                Define a standard package size
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Package Code</Label>
                  <Input
                    value={packageForm.code}
                    onChange={(e) => setPackageForm({...packageForm, code: e.target.value.toLowerCase()})}
                    placeholder="e.g., small_box"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Package Name</Label>
                  <Input
                    value={packageForm.name}
                    onChange={(e) => setPackageForm({...packageForm, name: e.target.value})}
                    placeholder="e.g., Small Box"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-gray-300">Package Type</Label>
                <Select value={packageForm.package_type} onValueChange={(v) => setPackageForm({...packageForm, package_type: v})}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="satchel">Satchel</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="pallet">Pallet</SelectItem>
                    <SelectItem value="tube">Tube</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Dimensions (cm)</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <Input
                    type="number"
                    placeholder="Length"
                    value={packageForm.length}
                    onChange={(e) => setPackageForm({...packageForm, length: parseFloat(e.target.value) || 0})}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <Input
                    type="number"
                    placeholder="Width"
                    value={packageForm.width}
                    onChange={(e) => setPackageForm({...packageForm, width: parseFloat(e.target.value) || 0})}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <Input
                    type="number"
                    placeholder="Height"
                    value={packageForm.height}
                    onChange={(e) => setPackageForm({...packageForm, height: parseFloat(e.target.value) || 0})}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Max Weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={packageForm.max_weight}
                    onChange={(e) => setPackageForm({...packageForm, max_weight: parseFloat(e.target.value) || 0})}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Tare Weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={packageForm.tare_weight}
                    onChange={(e) => setPackageForm({...packageForm, tare_weight: parseFloat(e.target.value) || 0})}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Package Active</Label>
                <Switch
                  checked={packageForm.is_active}
                  onCheckedChange={(checked) => setPackageForm({...packageForm, is_active: checked})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPackageModal(false)} className="border-gray-600">
                Cancel
              </Button>
              <Button onClick={handleSavePackage} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // ============== OPTIONS TAB ==============
  const OptionsTab = () => {
    const [optionForm, setOptionForm] = useState({
      name: '',
      description: '',
      service_ids: [],
      countries: ['AU'],
      free_shipping_threshold: null,
      free_shipping_zones: [],
      is_active: true,
      sort_order: 0
    });

    const openOptionModal = (option = null) => {
      if (option) {
        setEditingItem(option);
        setOptionForm({
          name: option.name || '',
          description: option.description || '',
          service_ids: option.service_ids || [],
          countries: option.countries || ['AU'],
          free_shipping_threshold: option.free_shipping_threshold || null,
          free_shipping_zones: option.free_shipping_zones || [],
          is_active: option.is_active !== false,
          sort_order: option.sort_order || 0
        });
      } else {
        setEditingItem(null);
        setOptionForm({
          name: '',
          description: '',
          service_ids: [],
          countries: ['AU'],
          free_shipping_threshold: null,
          free_shipping_zones: [],
          is_active: true,
          sort_order: options.length
        });
      }
      setShowOptionModal(true);
    };

    const handleSaveOption = async () => {
      setSaving(true);
      try {
        if (editingItem) {
          await axios.put(`${API}/shipping/options/${editingItem.id}`, optionForm);
        } else {
          await axios.post(`${API}/shipping/options`, optionForm);
        }
        await fetchAllData();
        setShowOptionModal(false);
      } catch (error) {
        console.error('Error saving option:', error);
        alert(error.response?.data?.detail || 'Failed to save option');
      } finally {
        setSaving(false);
      }
    };

    const handleDeleteOption = async (optionId) => {
      if (!window.confirm('Are you sure you want to delete this option?')) return;
      try {
        await axios.delete(`${API}/shipping/options/${optionId}`);
        await fetchAllData();
      } catch (error) {
        console.error('Error deleting option:', error);
      }
    };

    const toggleServiceId = (serviceId) => {
      if (optionForm.service_ids.includes(serviceId)) {
        setOptionForm({
          ...optionForm,
          service_ids: optionForm.service_ids.filter(id => id !== serviceId)
        });
      } else {
        setOptionForm({
          ...optionForm,
          service_ids: [...optionForm.service_ids, serviceId]
        });
      }
    };

    const toggleFreeZone = (zoneCode) => {
      if (optionForm.free_shipping_zones.includes(zoneCode)) {
        setOptionForm({
          ...optionForm,
          free_shipping_zones: optionForm.free_shipping_zones.filter(code => code !== zoneCode)
        });
      } else {
        setOptionForm({
          ...optionForm,
          free_shipping_zones: [...optionForm.free_shipping_zones, zoneCode]
        });
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Shipping Options</h2>
            <p className="text-gray-400 text-sm">Configure free shipping and checkout options</p>
          </div>
          <Button onClick={() => openOptionModal()} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" /> Add Option
          </Button>
        </div>

        {/* Options List */}
        <div className="space-y-4">
          {options.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
              <Settings className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">No shipping options configured</p>
              <Button onClick={() => openOptionModal()}>Create Your First Option</Button>
            </div>
          ) : (
            options.map(option => (
              <div 
                key={option.id} 
                className={`bg-gray-800 rounded-xl p-5 border ${option.is_active ? 'border-gray-700' : 'border-gray-700/50 opacity-60'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Settings className="w-5 h-5 text-teal-400" />
                      <h3 className="text-lg font-semibold text-white">{option.name}</h3>
                      {!option.is_active && (
                        <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded">Inactive</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mb-3">{option.description || 'No description'}</p>
                    <div className="flex flex-wrap gap-2">
                      {option.free_shipping_threshold && (
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          Free over ${option.free_shipping_threshold}
                        </span>
                      )}
                      {option.free_shipping_zones?.length > 0 && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                          {option.free_shipping_zones.length} free zones
                        </span>
                      )}
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                        {option.service_ids?.length || 0} service(s)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openOptionModal(option)}
                      className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteOption(option.id)}
                      className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Option Modal */}
        <Dialog open={showOptionModal} onOpenChange={setShowOptionModal}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Shipping Option' : 'Create Shipping Option'}</DialogTitle>
              <DialogDescription className="text-gray-400">
                Configure checkout shipping options and free shipping rules
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-gray-300">Option Name</Label>
                <Input
                  value={optionForm.name}
                  onChange={(e) => setOptionForm({...optionForm, name: e.target.value})}
                  placeholder="e.g., Standard Shipping"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Description</Label>
                <textarea
                  value={optionForm.description}
                  onChange={(e) => setOptionForm({...optionForm, description: e.target.value})}
                  placeholder="Shown at checkout..."
                  rows={2}
                  className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              
              {/* Linked Services */}
              <div>
                <Label className="text-gray-300 mb-2 block">Linked Services</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {services.map(service => (
                    <label key={service.id} className="flex items-center gap-2 p-2 bg-gray-900 rounded cursor-pointer hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={optionForm.service_ids.includes(service.id)}
                        onChange={() => toggleServiceId(service.id)}
                        className="rounded border-gray-600"
                      />
                      <span className="text-white text-sm">{service.name}</span>
                      <span className="text-gray-500 text-xs">({service.code})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Free Shipping Threshold */}
              <div>
                <Label className="text-gray-300">Free Shipping Threshold ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={optionForm.free_shipping_threshold || ''}
                  onChange={(e) => setOptionForm({...optionForm, free_shipping_threshold: e.target.value ? parseFloat(e.target.value) : null})}
                  placeholder="e.g., 150.00 (leave empty for none)"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>

              {/* Free Shipping Zones */}
              <div>
                <Label className="text-gray-300 mb-2 block">Free Shipping Zones (if threshold met)</Label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {zones.map(zone => (
                    <button
                      key={zone.code}
                      onClick={() => toggleFreeZone(zone.code)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        optionForm.free_shipping_zones.includes(zone.code)
                          ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/50'
                          : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                      }`}
                    >
                      {zone.name}
                    </button>
                  ))}
                </div>
                {optionForm.free_shipping_zones.length === 0 && optionForm.free_shipping_threshold && (
                  <p className="text-gray-500 text-xs mt-1">All zones will be eligible if none selected</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                <Label className="text-gray-300">Option Active</Label>
                <Switch
                  checked={optionForm.is_active}
                  onCheckedChange={(checked) => setOptionForm({...optionForm, is_active: checked})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOptionModal(false)} className="border-gray-600">
                Cancel
              </Button>
              <Button onClick={handleSaveOption} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // ============== RENDER ==============
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Truck className="w-7 h-7 text-emerald-400" />
            Shipping Management
          </h1>
          <p className="text-gray-400 text-sm mt-1">Configure zones, services, rates, and shipping rules</p>
        </div>
        <Button variant="outline" onClick={fetchAllData} className="border-gray-600">
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
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
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
        {activeTab === 'zones' && <ZonesTab />}
        {activeTab === 'services' && <ServicesTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'packages' && <PackagesTab />}
        {activeTab === 'options' && <OptionsTab />}
      </div>
    </div>
  );
};

export default MerchantShipping;
