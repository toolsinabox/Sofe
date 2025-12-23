import React from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Settings, DollarSign, Layers, Loader2, Save } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Stable input component to prevent focus loss
const StableInput = React.memo(({ name, defaultValue, onBlur, className, ...props }) => {
  return (
    <input
      name={name}
      defaultValue={defaultValue || ''}
      onBlur={onBlur}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
      {...props}
    />
  );
});
StableInput.displayName = 'StableInput';

const OptionsTab = ({
  options,
  services,
  zones,
  optionForm,
  setOptionForm,
  editingItem,
  setEditingItem,
  showOptionModal,
  setShowOptionModal,
  saving,
  setSaving,
  fetchAllData
}) => {
  const openOptionModal = (option = null) => {
    if (option) {
      setEditingItem(option);
      setOptionForm({
        name: option.name || '',
        description: option.description || '',
        routing_group: option.routing_group || '',
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
        routing_group: '',
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
      setOptionForm(prev => ({
        ...prev,
        service_ids: prev.service_ids.filter(id => id !== serviceId)
      }));
    } else {
      setOptionForm(prev => ({
        ...prev,
        service_ids: [...prev.service_ids, serviceId]
      }));
    }
  };

  const toggleFreeZone = (zoneCode) => {
    if (optionForm.free_shipping_zones.includes(zoneCode)) {
      setOptionForm(prev => ({
        ...prev,
        free_shipping_zones: prev.free_shipping_zones.filter(code => code !== zoneCode)
      }));
    } else {
      setOptionForm(prev => ({
        ...prev,
        free_shipping_zones: [...prev.free_shipping_zones, zoneCode]
      }));
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
                    {option.routing_group && (
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Group: {option.routing_group}
                      </span>
                    )}
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
        <DialogContent key={editingItem?.id || 'new-option'} className="bg-gray-800 border-gray-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Shipping Option' : 'Create Shipping Option'}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Configure checkout shipping options and free shipping rules
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-300">Option Name</Label>
              <StableInput
                key={`option-name-${editingItem?.id || 'new'}`}
                name="name"
                defaultValue={optionForm.name}
                onBlur={(e) => setOptionForm(prev => ({...prev, name: e.target.value}))}
                placeholder="e.g., Standard Shipping"
                className="bg-gray-700 border-gray-600 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-300">Description</Label>
              <textarea
                key={`option-desc-${editingItem?.id || 'new'}`}
                defaultValue={optionForm.description}
                onBlur={(e) => setOptionForm(prev => ({...prev, description: e.target.value}))}
                placeholder="Shown at checkout..."
                rows={2}
                className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Routing Group */}
            <div>
              <Label className="text-gray-300">
                Routing Group
                <span className="text-gray-500 text-xs ml-2">(Options in same group show only cheapest to customer)</span>
              </Label>
              <StableInput
                key={`option-routing-${editingItem?.id || 'new'}`}
                name="routing_group"
                defaultValue={optionForm.routing_group}
                onBlur={(e) => setOptionForm(prev => ({...prev, routing_group: e.target.value}))}
                placeholder="e.g., standard, express (leave empty to always show)"
                className="bg-gray-700 border-gray-600 text-white mt-1"
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
              <StableInput
                key={`option-threshold-${editingItem?.id || 'new'}`}
                type="number"
                step="0.01"
                name="free_shipping_threshold"
                defaultValue={optionForm.free_shipping_threshold || ''}
                onBlur={(e) => setOptionForm(prev => ({...prev, free_shipping_threshold: e.target.value ? parseFloat(e.target.value) : null}))}
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
                    type="button"
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
                onCheckedChange={(checked) => setOptionForm(prev => ({...prev, is_active: checked}))}
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

export default OptionsTab;
