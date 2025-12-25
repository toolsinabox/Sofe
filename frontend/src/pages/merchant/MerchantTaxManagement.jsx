import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { 
  Percent, Plus, Edit, Trash2, Calculator, Globe, MapPin, Save,
  DollarSign, Settings, CheckCircle, Loader2, Navigation
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Country and state data
const COUNTRIES = [
  { code: 'AU', name: 'Australia', states: [
    { code: '', name: 'All States' },
    { code: 'NSW', name: 'New South Wales' },
    { code: 'VIC', name: 'Victoria' },
    { code: 'QLD', name: 'Queensland' },
    { code: 'WA', name: 'Western Australia' },
    { code: 'SA', name: 'South Australia' },
    { code: 'TAS', name: 'Tasmania' },
    { code: 'ACT', name: 'Australian Capital Territory' },
    { code: 'NT', name: 'Northern Territory' }
  ]},
  { code: 'NZ', name: 'New Zealand', states: [
    { code: '', name: 'All Regions' },
    { code: 'AUK', name: 'Auckland' },
    { code: 'WGN', name: 'Wellington' },
    { code: 'CAN', name: 'Canterbury' },
    { code: 'WKO', name: 'Waikato' },
    { code: 'BOP', name: 'Bay of Plenty' },
    { code: 'OTA', name: 'Otago' }
  ]},
  { code: 'US', name: 'United States', states: [
    { code: '', name: 'All States' },
    { code: 'CA', name: 'California' },
    { code: 'TX', name: 'Texas' },
    { code: 'FL', name: 'Florida' },
    { code: 'NY', name: 'New York' },
    { code: 'IL', name: 'Illinois' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'OH', name: 'Ohio' },
    { code: 'GA', name: 'Georgia' },
    { code: 'NC', name: 'North Carolina' },
    { code: 'MI', name: 'Michigan' },
    { code: 'WA', name: 'Washington' }
  ]},
  { code: 'GB', name: 'United Kingdom', states: [
    { code: '', name: 'All Regions' },
    { code: 'ENG', name: 'England' },
    { code: 'SCT', name: 'Scotland' },
    { code: 'WLS', name: 'Wales' },
    { code: 'NIR', name: 'Northern Ireland' }
  ]},
  { code: 'CA', name: 'Canada', states: [
    { code: '', name: 'All Provinces' },
    { code: 'ON', name: 'Ontario' },
    { code: 'QC', name: 'Quebec' },
    { code: 'BC', name: 'British Columbia' },
    { code: 'AB', name: 'Alberta' }
  ]}
];

export default function MerchantTaxManagement() {
  const [activeTab, setActiveTab] = useState('rates');
  const [taxRates, setTaxRates] = useState([]);
  const [taxSettings, setTaxSettings] = useState({
    prices_include_tax: true,
    calculate_tax_based_on: 'shipping',
    shipping_tax_class: 'standard',
    display_prices_in_shop: 'incl',
    display_prices_in_cart: 'incl',
    tax_round_at_subtotal: false,
    tax_classes: ['standard', 'reduced', 'zero']
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcResult, setCalcResult] = useState(null);

  const [rateForm, setRateForm] = useState({
    name: '',
    rate: '',
    country: 'AU',
    state: '',
    postcode_from: '',
    postcode_to: '',
    tax_class: 'standard',
    compound: false,
    is_active: true,
    priority: 0
  });

  const [calcForm, setCalcForm] = useState({
    subtotal: 100,
    country: 'AU',
    state: '',
    postcode: ''
  });

  const [detectingLocation, setDetectingLocation] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState(null);

  // Get states for selected country
  const getStatesForCountry = (countryCode) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    return country?.states || [];
  };

  // Auto-detect region from IP
  const detectRegion = async () => {
    setDetectingLocation(true);
    try {
      // Use free IP geolocation service
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      
      if (data.country_code) {
        const location = {
          country: data.country_code,
          state: data.region_code || '',
          postcode: data.postal || '',
          city: data.city || '',
          ip: data.ip
        };
        setDetectedLocation(location);
        setCalcForm(prev => ({
          ...prev,
          country: location.country,
          state: location.state,
          postcode: location.postcode
        }));
      }
    } catch (error) {
      console.error('Failed to detect location:', error);
      alert('Could not detect location. Please enter manually.');
    } finally {
      setDetectingLocation(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [ratesRes, settingsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/tax/rates`),
        axios.get(`${BACKEND_URL}/api/tax/settings`)
      ]);
      setTaxRates(ratesRes.data.rates || []);
      if (settingsRes.data) {
        setTaxSettings(settingsRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch tax data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveRate = async () => {
    try {
      setSaving(true);
      const data = {
        ...rateForm,
        rate: parseFloat(rateForm.rate) || 0,
        priority: parseInt(rateForm.priority) || 0
      };
      
      if (editingRate) {
        await axios.put(`${BACKEND_URL}/api/tax/rates/${editingRate.id}`, data);
      } else {
        await axios.post(`${BACKEND_URL}/api/tax/rates`, data);
      }
      
      setShowModal(false);
      setEditingRate(null);
      resetRateForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save tax rate:', error);
      alert('Failed to save tax rate');
    } finally {
      setSaving(false);
    }
  };

  const deleteRate = async (id) => {
    if (!window.confirm('Delete this tax rate?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/tax/rates/${id}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await axios.put(`${BACKEND_URL}/api/tax/settings`, taxSettings);
      alert('Tax settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const calculateTax = async () => {
    try {
      const params = {
        subtotal: parseFloat(calcForm.subtotal) || 0,
        country: calcForm.country
      };
      if (calcForm.state) params.state = calcForm.state;
      if (calcForm.postcode) params.postcode = calcForm.postcode;
      
      const res = await axios.post(`${BACKEND_URL}/api/tax/calculate`, null, { params });
      setCalcResult(res.data);
    } catch (error) {
      console.error('Failed to calculate tax:', error);
    }
  };

  const resetRateForm = () => {
    setRateForm({
      name: '',
      rate: '',
      country: 'AU',
      state: '',
      postcode_from: '',
      postcode_to: '',
      tax_class: 'standard',
      compound: false,
      is_active: true,
      priority: 0
    });
  };

  const openEditRate = (rate) => {
    setEditingRate(rate);
    setRateForm({
      name: rate.name || '',
      rate: rate.rate?.toString() || '',
      country: rate.country || 'AU',
      state: rate.state || '',
      postcode_from: rate.postcode_from || '',
      postcode_to: rate.postcode_to || '',
      tax_class: rate.tax_class || 'standard',
      compound: rate.compound || false,
      is_active: rate.is_active !== false,
      priority: rate.priority || 0
    });
    setShowModal(true);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax Management</h1>
          <p className="text-gray-500">Configure tax rates and settings for your store</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCalculator(true)}>
            <Calculator className="w-4 h-4 mr-2" /> Tax Calculator
          </Button>
          <Button onClick={() => { resetRateForm(); setEditingRate(null); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Tax Rate
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Percent className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{taxRates.length}</p>
                <p className="text-sm text-gray-500">Tax Rates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{taxRates.filter(r => r.is_active).length}</p>
                <p className="text-sm text-gray-500">Active Rates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Globe className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {[...new Set(taxRates.map(r => r.country))].length}
                </p>
                <p className="text-sm text-gray-500">Countries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {taxSettings.prices_include_tax ? 'Incl' : 'Excl'}
                </p>
                <p className="text-sm text-gray-500">Price Display</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="rates">Tax Rates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Tax Rates Tab */}
        <TabsContent value="rates">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : taxRates.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Percent className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No tax rates configured</p>
                  <Button variant="link" onClick={() => setShowModal(true)}>
                    Add your first tax rate
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {taxRates.map(rate => (
                    <div key={rate.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{rate.name}</span>
                          <Badge className={rate.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {rate.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">{rate.tax_class}</Badge>
                          {rate.compound && <Badge className="bg-purple-100 text-purple-800">Compound</Badge>}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" /> {rate.country}
                            {rate.state && ` / ${rate.state}`}
                          </span>
                          {(rate.postcode_from || rate.postcode_to) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {rate.postcode_from} - {rate.postcode_to}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">{rate.rate}%</div>
                          <div className="text-xs text-gray-500">Priority: {rate.priority}</div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditRate(rate)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteRate(rate.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Tax Calculation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Prices Include Tax</Label>
                  <p className="text-sm text-gray-500">Enter prices inclusive of tax</p>
                </div>
                <Switch
                  checked={taxSettings.prices_include_tax}
                  onCheckedChange={(v) => setTaxSettings({...taxSettings, prices_include_tax: v})}
                />
              </div>
              
              <div>
                <Label>Calculate Tax Based On</Label>
                <Select 
                  value={taxSettings.calculate_tax_based_on} 
                  onValueChange={(v) => setTaxSettings({...taxSettings, calculate_tax_based_on: v})}
                >
                  <SelectTrigger className="w-64 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shipping">Shipping Address</SelectItem>
                    <SelectItem value="billing">Billing Address</SelectItem>
                    <SelectItem value="store">Store Base Address</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Shipping Tax Class</Label>
                <Select 
                  value={taxSettings.shipping_tax_class} 
                  onValueChange={(v) => setTaxSettings({...taxSettings, shipping_tax_class: v})}
                >
                  <SelectTrigger className="w-64 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="reduced">Reduced</SelectItem>
                    <SelectItem value="zero">Zero Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Display Prices in Shop</Label>
                <Select 
                  value={taxSettings.display_prices_in_shop} 
                  onValueChange={(v) => setTaxSettings({...taxSettings, display_prices_in_shop: v})}
                >
                  <SelectTrigger className="w-64 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incl">Including Tax</SelectItem>
                    <SelectItem value="excl">Excluding Tax</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Round Tax at Subtotal Level</Label>
                  <p className="text-sm text-gray-500">Round tax at the subtotal level instead of per line</p>
                </div>
                <Switch
                  checked={taxSettings.tax_round_at_subtotal}
                  onCheckedChange={(v) => setTaxSettings({...taxSettings, tax_round_at_subtotal: v})}
                />
              </div>
              
              <Button onClick={saveSettings} disabled={saving}>
                <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Tax Rate Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRate ? 'Edit Tax Rate' : 'Add Tax Rate'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={rateForm.name}
                onChange={(e) => setRateForm({...rateForm, name: e.target.value})}
                placeholder="e.g., GST, VAT"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rate (%) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={rateForm.rate}
                  onChange={(e) => setRateForm({...rateForm, rate: e.target.value})}
                  placeholder="10"
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={rateForm.priority}
                  onChange={(e) => setRateForm({...rateForm, priority: e.target.value})}
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Country</Label>
                <Select value={rateForm.country} onValueChange={(v) => setRateForm({...rateForm, country: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AU">Australia</SelectItem>
                    <SelectItem value="NZ">New Zealand</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>State/Region</Label>
                <Select value={rateForm.state} onValueChange={(v) => setRateForm({...rateForm, state: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All states" />
                  </SelectTrigger>
                  <SelectContent>
                    {australianStates.map(s => (
                      <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Postcode From</Label>
                <Input
                  value={rateForm.postcode_from}
                  onChange={(e) => setRateForm({...rateForm, postcode_from: e.target.value})}
                  placeholder="2000"
                />
              </div>
              <div>
                <Label>Postcode To</Label>
                <Input
                  value={rateForm.postcode_to}
                  onChange={(e) => setRateForm({...rateForm, postcode_to: e.target.value})}
                  placeholder="2999"
                />
              </div>
            </div>
            
            <div>
              <Label>Tax Class</Label>
              <Select value={rateForm.tax_class} onValueChange={(v) => setRateForm({...rateForm, tax_class: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="reduced">Reduced</SelectItem>
                  <SelectItem value="zero">Zero Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={rateForm.is_active}
                  onCheckedChange={(v) => setRateForm({...rateForm, is_active: v})}
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={rateForm.compound}
                  onCheckedChange={(v) => setRateForm({...rateForm, compound: v})}
                />
                <Label>Compound</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={saveRate} disabled={saving || !rateForm.name || !rateForm.rate}>
              {saving ? 'Saving...' : editingRate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tax Calculator Modal */}
      <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tax Calculator</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Subtotal ($)</Label>
              <Input
                type="number"
                value={calcForm.subtotal}
                onChange={(e) => setCalcForm({...calcForm, subtotal: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Country</Label>
                <Select value={calcForm.country} onValueChange={(v) => setCalcForm({...calcForm, country: v, state: ''})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>State/Region</Label>
                <Select value={calcForm.state} onValueChange={(v) => setCalcForm({...calcForm, state: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {getStatesForCountry(calcForm.country).map(s => (
                      <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Postcode</Label>
              <Input
                value={calcForm.postcode}
                onChange={(e) => setCalcForm({...calcForm, postcode: e.target.value})}
                placeholder="2000"
              />
            </div>

            {/* Auto-detect button */}
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={detectRegion}
              disabled={detectingLocation}
            >
              {detectingLocation ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Detecting Location...</>
              ) : (
                <><Navigation className="w-4 h-4 mr-2" /> Auto-Detect Region</>
              )}
            </Button>

            {detectedLocation && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <div className="flex items-center gap-2 text-blue-800 font-medium mb-1">
                  <MapPin className="w-4 h-4" /> Detected Location
                </div>
                <div className="text-blue-600">
                  {detectedLocation.city && `${detectedLocation.city}, `}
                  {detectedLocation.state && `${detectedLocation.state}, `}
                  {detectedLocation.country}
                  {detectedLocation.postcode && ` (${detectedLocation.postcode})`}
                </div>
              </div>
            )}
            
            <Button onClick={calculateTax} className="w-full">
              <Calculator className="w-4 h-4 mr-2" /> Calculate Tax
            </Button>
            
            {calcResult && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${calcResult.subtotal?.toFixed(2)}</span>
                </div>
                {calcResult.breakdown?.map((tax, idx) => (
                  <div key={idx} className="flex justify-between text-sm text-gray-600">
                    <span>{tax.name} ({tax.rate}%):</span>
                    <span>${tax.amount?.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total Tax:</span>
                  <span>${calcResult.tax_total?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-green-600">${calcResult.total?.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCalculator(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
