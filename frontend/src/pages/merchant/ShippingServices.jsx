import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  Truck,
  Package,
  Scale
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
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

const API = process.env.REACT_APP_BACKEND_URL;

const ShippingServices = () => {
  const [services, setServices] = useState([]);
  const [zones, setZones] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedService, setExpandedService] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    carrier: 'custom',
    charge_type: 'weight',
    min_charge: 0,
    max_charge: null,
    handling_fee: 0,
    fuel_levy_percent: 0,
    cubic_weight_modifier: 250,
    categories: [],
    is_active: true,
    sort_order: 0,
    rates: []
  });

  const chargeTypes = [
    { value: 'weight', label: 'Weight-based (per kg)' },
    { value: 'cubic', label: 'Cubic weight' },
    { value: 'fixed', label: 'Fixed rate per zone' },
    { value: 'flat', label: 'Flat rate (all zones)' },
    { value: 'cart_total', label: 'Based on cart total' }
  ];

  const carriers = [
    { value: 'custom', label: 'Custom / Manual' },
    { value: 'australia_post', label: 'Australia Post' },
    { value: 'startrack', label: 'StarTrack' },
    { value: 'tnt', label: 'TNT' },
    { value: 'toll', label: 'Toll' },
    { value: 'sendle', label: 'Sendle' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [servicesRes, zonesRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/api/shipping/services`),
        axios.get(`${API}/api/shipping/zones`),
        axios.get(`${API}/api/shipping/categories`)
      ]);
      setServices(servicesRes.data);
      setZones(zonesRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeRates = () => {
    return zones.map(zone => ({
      zone_code: zone.code,
      zone_name: zone.name,
      min_weight: 0,
      max_weight: 999,
      base_rate: 0,
      per_kg_rate: 0,
      delivery_days: 3,
      is_active: true
    }));
  };

  const handleOpenModal = (service = null) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        code: service.code,
        carrier: service.carrier || 'custom',
        charge_type: service.charge_type || 'weight',
        min_charge: service.min_charge || 0,
        max_charge: service.max_charge || null,
        handling_fee: service.handling_fee || 0,
        fuel_levy_percent: service.fuel_levy_percent || 0,
        cubic_weight_modifier: service.cubic_weight_modifier || 250,
        categories: service.categories || [],
        is_active: service.is_active,
        sort_order: service.sort_order || 0,
        rates: service.rates || initializeRates()
      });
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        code: '',
        carrier: 'custom',
        charge_type: 'weight',
        min_charge: 0,
        max_charge: null,
        handling_fee: 0,
        fuel_levy_percent: 0,
        cubic_weight_modifier: 250,
        categories: [],
        is_active: true,
        sort_order: services.length + 1,
        rates: initializeRates()
      });
    }
    setShowModal(true);
  };

  const handleRateChange = (zoneCode, field, value) => {
    setFormData(prev => ({
      ...prev,
      rates: prev.rates.map(rate =>
        rate.zone_code === zoneCode
          ? { ...rate, [field]: value }
          : rate
      )
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingService) {
        await axios.put(`${API}/api/shipping/services/${editingService.id}`, formData);
      } else {
        await axios.post(`${API}/api/shipping/services`, formData);
      }
      
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving service:', error);
      alert(error.response?.data?.detail || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    
    try {
      await axios.delete(`${API}/api/shipping/services/${serviceId}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Failed to delete service');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/merchant/shipping" className="text-cyan-600 hover:text-cyan-700 text-sm flex items-center gap-1 mb-2">
          <ChevronLeft className="w-4 h-4" />
          Back to Shipping Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <DollarSign className="w-7 h-7 text-emerald-500" />
              Shipping Services & Rates
            </h1>
            <p className="text-slate-500 mt-1">
              Configure shipping services and rates per zone
            </p>
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-gray-900"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-4">
        {services.map((service) => (
          <Card key={service.id} className={`${!service.is_active ? 'opacity-60' : ''}`}>
            <CardContent className="p-0">
              {/* Service Header */}
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <Truck className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800">{service.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {service.code}
                      </span>
                      {!service.is_active && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5" />
                        {chargeTypes.find(c => c.value === service.charge_type)?.label || service.charge_type}
                      </span>
                      <span>•</span>
                      <span>Min: ${service.min_charge?.toFixed(2) || '0.00'}</span>
                      <span>•</span>
                      <span>{service.rates?.length || 0} zone rates</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleOpenModal(service); }}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleDelete(service.id); }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {expandedService === service.id ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
              
              {/* Expanded Rates Table */}
              {expandedService === service.id && service.rates?.length > 0 && (
                <div className="border-t border-slate-200 p-4 bg-slate-50">
                  <h4 className="font-medium text-slate-700 mb-3">Zone Rates</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 border-b border-slate-200">
                          <th className="pb-2 pr-4">Zone</th>
                          <th className="pb-2 pr-4">Base Rate</th>
                          <th className="pb-2 pr-4">Per KG</th>
                          <th className="pb-2 pr-4">Weight Range</th>
                          <th className="pb-2">Delivery Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {service.rates.map((rate, idx) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-0">
                            <td className="py-2 pr-4 font-medium text-slate-700">{rate.zone_name}</td>
                            <td className="py-2 pr-4 text-emerald-600">${rate.base_rate?.toFixed(2)}</td>
                            <td className="py-2 pr-4">${rate.per_kg_rate?.toFixed(2)}/kg</td>
                            <td className="py-2 pr-4 text-slate-500">{rate.min_weight}-{rate.max_weight}kg</td>
                            <td className="py-2">{rate.delivery_days} days</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {services.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No shipping services found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-500" />
              {editingService ? 'Edit Service' : 'Add Service'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Service Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Standard Delivery"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Service Code</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toLowerCase().replace(/\s/g, '_')})}
                  placeholder="standard"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Carrier</Label>
                <Select value={formData.carrier} onValueChange={(v) => setFormData({...formData, carrier: v})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {carriers.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Charge Type</Label>
                <Select value={formData.charge_type} onValueChange={(v) => setFormData({...formData, charge_type: v})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chargeTypes.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Min Charge ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.min_charge}
                  onChange={(e) => setFormData({...formData, min_charge: parseFloat(e.target.value) || 0})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Handling Fee ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.handling_fee}
                  onChange={(e) => setFormData({...formData, handling_fee: parseFloat(e.target.value) || 0})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Fuel Levy (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.fuel_levy_percent}
                  onChange={(e) => setFormData({...formData, fuel_levy_percent: parseFloat(e.target.value) || 0})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                  className="mt-1"
                />
              </div>
            </div>
            
            {/* Zone Rates */}
            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Zone Rates</h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr className="text-left text-slate-600">
                      <th className="p-3">Zone</th>
                      <th className="p-3">Base Rate ($)</th>
                      <th className="p-3">Per KG ($)</th>
                      <th className="p-3">Delivery Days</th>
                      <th className="p-3 text-center">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.rates.map((rate, idx) => (
                      <tr key={idx} className="border-t border-slate-200">
                        <td className="p-3 font-medium text-slate-700">{rate.zone_name}</td>
                        <td className="p-3">
                          <Input
                            type="number"
                            step="0.01"
                            value={rate.base_rate}
                            onChange={(e) => handleRateChange(rate.zone_code, 'base_rate', parseFloat(e.target.value) || 0)}
                            className="w-24"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            step="0.01"
                            value={rate.per_kg_rate}
                            onChange={(e) => handleRateChange(rate.zone_code, 'per_kg_rate', parseFloat(e.target.value) || 0)}
                            className="w-24"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={rate.delivery_days}
                            onChange={(e) => handleRateChange(rate.zone_code, 'delivery_days', parseInt(e.target.value) || 3)}
                            className="w-20"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={rate.is_active}
                            onChange={(e) => handleRateChange(rate.zone_code, 'is_active', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-cyan-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Service Active</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.code || !formData.name}
              className="bg-gradient-to-r from-cyan-500 to-teal-500"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Service</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShippingServices;
