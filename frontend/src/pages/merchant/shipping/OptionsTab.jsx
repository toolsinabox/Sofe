import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, Trash2, Settings, DollarSign, Layers, Loader2, Check, 
  AlertCircle, ChevronDown, ChevronUp, Truck
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Switch } from '../../../components/ui/switch';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Inline editable input component
const InlineInput = ({ value, onChange, type = 'text', prefix = '', suffix = '', className = '', placeholder, min, step }) => {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setLocalValue(value);
      inputRef.current?.blur();
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className={`flex items-center gap-1 ${className}`} onClick={handleClick}>
      {prefix && <span className="text-gray-500 text-sm">{prefix}</span>}
      <input
        ref={inputRef}
        type={type}
        value={localValue ?? ''}
        onChange={(e) => setLocalValue(type === 'number' ? (e.target.value ? parseFloat(e.target.value) : null) : e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        placeholder={placeholder}
        min={min}
        step={step}
        className="bg-transparent border-b border-gray-600 hover:border-gray-500 focus:border-teal-500 focus:outline-none px-1 py-0.5 text-sm transition-colors w-full"
      />
      {suffix && <span className="text-gray-500 text-sm">{suffix}</span>}
    </div>
  );
};

// Inline editable textarea
const InlineTextarea = ({ value, onChange, onSave, className = '', placeholder, rows = 2 }) => {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    if (localValue !== value) {
      onChange(localValue);
      onSave?.();
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
  };

  return (
    <textarea
      ref={textareaRef}
      value={localValue ?? ''}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      onClick={handleClick}
      placeholder={placeholder}
      rows={rows}
      className={`bg-transparent border border-gray-600 hover:border-gray-500 focus:border-teal-500 focus:outline-none px-2 py-1 text-sm transition-colors w-full rounded resize-none ${className}`}
    />
  );
};

// Option row component with inline editing
const OptionRow = ({ option, services, zones, onUpdate, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [localOption, setLocalOption] = useState(option);

  useEffect(() => {
    setLocalOption(option);
  }, [option]);

  const saveOption = async (updatedData) => {
    setSaving(true);
    setSaveStatus(null);
    try {
      await axios.put(`${API}/shipping/options/${option.id}`, {
        ...localOption,
        ...updatedData
      });
      setSaveStatus('success');
      onUpdate?.();
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error('Error saving option:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    const updated = { ...localOption, [field]: value };
    setLocalOption(updated);
    return updated;
  };

  const handleFieldChange = (field, value) => {
    const updated = updateField(field, value);
    saveOption(updated);
  };

  const toggleService = (serviceId) => {
    const currentIds = localOption.service_ids || [];
    const newIds = currentIds.includes(serviceId)
      ? currentIds.filter(id => id !== serviceId)
      : [...currentIds, serviceId];
    const updated = { ...localOption, service_ids: newIds };
    setLocalOption(updated);
    saveOption(updated);
  };

  const toggleFreeZone = (zoneCode) => {
    const currentZones = localOption.free_shipping_zones || [];
    const newZones = currentZones.includes(zoneCode)
      ? currentZones.filter(code => code !== zoneCode)
      : [...currentZones, zoneCode];
    const updated = { ...localOption, free_shipping_zones: newZones };
    setLocalOption(updated);
    saveOption(updated);
  };

  // Get linked service names
  const linkedServices = services.filter(s => (localOption.service_ids || []).includes(s.id));

  return (
    <div className={`bg-gray-800 rounded-xl border ${localOption.is_active ? 'border-gray-700' : 'border-gray-700/50 opacity-70'} overflow-hidden`}>
      {/* Option Header - Always visible */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2 flex-1">
            <Settings 
              className="w-5 h-5 text-teal-400 flex-shrink-0 cursor-pointer" 
              onClick={() => setExpanded(!expanded)}
            />
            <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
              <InlineInput
                value={localOption.name}
                onChange={(v) => updateField('name', v)}
                onSave={() => saveOption(localOption)}
                placeholder="Option Name"
                className="font-semibold text-white text-lg"
              />
            </div>
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />}
            {saveStatus === 'success' && <Check className="w-4 h-4 text-teal-400" />}
            {saveStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
            
            <Switch
              checked={localOption.is_active}
              onCheckedChange={(checked) => handleFieldChange('is_active', checked)}
              className="data-[state=checked]:bg-teal-600"
            />
            
            <button
              onClick={() => onDelete(option.id)}
              className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 transition-colors"
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Quick-edit fields - Always visible */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <label className="text-gray-500 text-xs block mb-1">Description</label>
            <InlineTextarea
              value={localOption.description}
              onChange={(v) => updateField('description', v)}
              onSave={() => saveOption(localOption)}
              placeholder="Shown at checkout..."
              rows={1}
              className="text-gray-300"
            />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">
              Routing Group
              <span className="text-gray-600 ml-1">(groups show cheapest)</span>
            </label>
            <InlineInput
              value={localOption.routing_group}
              onChange={(v) => updateField('routing_group', v)}
              onSave={() => saveOption(localOption)}
              placeholder="e.g., 1, 2, express"
              className="text-purple-400"
            />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Free Shipping Over</label>
            <InlineInput
              value={localOption.free_shipping_threshold}
              onChange={(v) => updateField('free_shipping_threshold', v)}
              onSave={() => saveOption(localOption)}
              type="number"
              step="0.01"
              min="0"
              prefix="$"
              placeholder="No threshold"
              className="text-emerald-400"
            />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Sort Order</label>
            <InlineInput
              value={localOption.sort_order}
              onChange={(v) => updateField('sort_order', v)}
              onSave={() => saveOption(localOption)}
              type="number"
              min="0"
              className="text-gray-300 w-16"
            />
          </div>
        </div>

        {/* Quick info badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {localOption.routing_group && (
            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded flex items-center gap-1">
              <Layers className="w-3 h-3" />
              Group: {localOption.routing_group}
            </span>
          )}
          {localOption.free_shipping_threshold && (
            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Free over ${localOption.free_shipping_threshold}
            </span>
          )}
          {linkedServices.length > 0 && (
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded flex items-center gap-1">
              <Truck className="w-3 h-3" />
              {linkedServices.length} service(s): {linkedServices.map(s => s.name).join(', ')}
            </span>
          )}
          {(localOption.free_shipping_zones?.length > 0) && (
            <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded">
              {localOption.free_shipping_zones.length} free zone(s)
            </span>
          )}
        </div>
      </div>

      {/* Expanded section - Services & Zones selection */}
      {expanded && (
        <div className="border-t border-gray-700 p-4 bg-gray-800/50 space-y-4">
          {/* Linked Services */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">
              Linked Services
              <span className="text-gray-500 text-xs ml-2">(click to toggle)</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {services.length === 0 ? (
                <p className="text-gray-500 text-sm">No services available</p>
              ) : (
                services.map(service => {
                  const isLinked = (localOption.service_ids || []).includes(service.id);
                  return (
                    <button
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        isLinked
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                      }`}
                    >
                      {service.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Free Shipping Zones */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">
              Free Shipping Zones
              <span className="text-gray-500 text-xs ml-2">(always free for these zones)</span>
            </h4>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {zones.length === 0 ? (
                <p className="text-gray-500 text-sm">No zones available</p>
              ) : (
                zones.slice(0, 50).map(zone => {
                  const isFree = (localOption.free_shipping_zones || []).includes(zone.code);
                  return (
                    <button
                      key={zone.id}
                      onClick={() => toggleFreeZone(zone.code)}
                      className={`px-2 py-1 rounded text-xs transition-all ${
                        isFree
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                      }`}
                    >
                      {zone.code}
                    </button>
                  );
                })
              )}
              {zones.length > 50 && (
                <span className="text-gray-500 text-xs py-1">+{zones.length - 50} more zones</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main OptionsTab component
export default function OptionsTab({ options, services, zones, fetchAllData }) {
  const [creating, setCreating] = useState(false);

  const handleDelete = async (optionId) => {
    if (!window.confirm('Are you sure you want to delete this option?')) return;
    try {
      await axios.delete(`${API}/shipping/options/${optionId}`);
      fetchAllData?.();
    } catch (error) {
      console.error('Error deleting option:', error);
      alert('Failed to delete option');
    }
  };

  const createNewOption = async () => {
    setCreating(true);
    try {
      const newOption = {
        name: 'New Option',
        description: '',
        routing_group: '',
        service_ids: [],
        countries: ['AU'],
        free_shipping_threshold: null,
        free_shipping_zones: [],
        is_active: true,
        sort_order: options.length
      };
      
      await axios.post(`${API}/shipping/options`, newOption);
      fetchAllData?.();
    } catch (error) {
      console.error('Error creating option:', error);
      alert('Failed to create option');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Shipping Options</h2>
          <p className="text-gray-400 text-sm">Click any field to edit • Changes save automatically</p>
        </div>
        <Button 
          onClick={createNewOption} 
          disabled={creating}
          className="bg-teal-600 hover:bg-teal-700"
        >
          {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Add Option
        </Button>
      </div>

      {/* Options List */}
      {options.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
          <Settings className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-4">No shipping options configured</p>
          <Button onClick={createNewOption} disabled={creating}>
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Create Your First Option
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {options.map(option => (
            <OptionRow
              key={option.id}
              option={option}
              services={services}
              zones={zones}
              onUpdate={fetchAllData}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
