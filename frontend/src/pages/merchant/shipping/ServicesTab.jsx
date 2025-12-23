import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, Trash2, Save, Truck, ChevronDown, ChevronUp, 
  Upload, Download, FileDown, Check, X, Loader2, Copy,
  Settings, AlertCircle
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Switch } from '../../../components/ui/switch';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Inline editable input component
const InlineInput = ({ value, onChange, onSave, type = 'text', prefix = '', suffix = '', className = '', min, step, placeholder }) => {
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
      onSave?.();
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

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {prefix && <span className="text-gray-500 text-sm">{prefix}</span>}
      <input
        ref={inputRef}
        type={type}
        value={localValue ?? ''}
        onChange={(e) => setLocalValue(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        min={min}
        step={step}
        placeholder={placeholder}
        className="bg-transparent border-b border-transparent hover:border-gray-600 focus:border-emerald-500 focus:outline-none px-1 py-0.5 text-sm transition-colors w-full"
      />
      {suffix && <span className="text-gray-500 text-sm">{suffix}</span>}
    </div>
  );
};

// Service row component with inline editing
const ServiceRow = ({ service, zones, categories, onUpdate, onDelete, onExportRates, onImportRates }) => {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null
  const [localService, setLocalService] = useState(service);

  useEffect(() => {
    setLocalService(service);
  }, [service]);

  const saveService = async (updatedData) => {
    setSaving(true);
    setSaveStatus(null);
    try {
      await axios.put(`${API}/shipping/services/${service.id}`, {
        ...localService,
        ...updatedData
      });
      setSaveStatus('success');
      onUpdate?.();
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error('Error saving service:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    const updated = { ...localService, [field]: value };
    setLocalService(updated);
    return updated;
  };

  const handleFieldChange = (field, value) => {
    const updated = updateField(field, value);
    saveService(updated);
  };

  const updateRate = (index, field, value) => {
    const newRates = [...localService.rates];
    newRates[index] = { ...newRates[index], [field]: value };
    const updated = { ...localService, rates: newRates };
    setLocalService(updated);
    return updated;
  };

  const handleRateChange = (index, field, value) => {
    const updated = updateRate(index, field, value);
    saveService(updated);
  };

  const deleteRate = (index) => {
    if (!window.confirm('Delete this rate?')) return;
    const newRates = localService.rates.filter((_, i) => i !== index);
    const updated = { ...localService, rates: newRates };
    setLocalService(updated);
    saveService(updated);
  };

  const addNewRate = () => {
    const newRate = {
      zone_code: zones[0]?.code || 'NEW',
      zone_name: zones[0]?.name || 'New Zone',
      base_rate: 0,
      min_charge: 0,
      first_parcel: 0,
      per_subsequent: 0,
      per_kg_rate: 0,
      min_weight: 0,
      max_weight: 999,
      delivery_days: 3,
      internal_note: '',
      is_active: true
    };
    const updated = { ...localService, rates: [...localService.rates, newRate] };
    setLocalService(updated);
    saveService(updated);
  };

  return (
    <div className={`bg-gray-800 rounded-xl border ${localService.is_active ? 'border-gray-700' : 'border-gray-700/50 opacity-70'} overflow-hidden`}>
      {/* Service Header - Always visible */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div 
            className="flex items-center gap-2 cursor-pointer flex-1"
            onClick={() => setExpanded(!expanded)}
          >
            <Truck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <InlineInput
                  value={localService.name}
                  onChange={(v) => updateField('name', v)}
                  onSave={() => saveService(localService)}
                  placeholder="Service Name"
                  className="font-semibold text-white text-lg"
                />
                <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded font-mono flex-shrink-0">
                  {localService.code}
                </span>
              </div>
            </div>
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />}
            {saveStatus === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
            {saveStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
            
            <Switch
              checked={localService.is_active}
              onCheckedChange={(checked) => handleFieldChange('is_active', checked)}
              className="data-[state=checked]:bg-emerald-600"
            />
            
            <button
              onClick={() => onDelete(service.id)}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-sm">
          <div>
            <label className="text-gray-500 text-xs block mb-1">Carrier</label>
            <InlineInput
              value={localService.carrier}
              onChange={(v) => updateField('carrier', v)}
              onSave={() => saveService(localService)}
              className="text-gray-300"
            />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Fuel Levy %</label>
            <InlineInput
              value={localService.fuel_levy_percent}
              onChange={(v) => updateField('fuel_levy_percent', v)}
              onSave={() => saveService(localService)}
              type="number"
              step="0.1"
              suffix="%"
              className="text-emerald-400"
            />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Handling Fee</label>
            <InlineInput
              value={localService.handling_fee}
              onChange={(v) => updateField('handling_fee', v)}
              onSave={() => saveService(localService)}
              type="number"
              step="0.01"
              prefix="$"
              className="text-emerald-400"
            />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Cubic Modifier</label>
            <InlineInput
              value={localService.cubic_weight_modifier}
              onChange={(v) => updateField('cubic_weight_modifier', v)}
              onSave={() => saveService(localService)}
              type="number"
              className="text-gray-300"
            />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Max Length (mm)</label>
            <InlineInput
              value={localService.max_length || ''}
              onChange={(v) => updateField('max_length', v || null)}
              onSave={() => saveService(localService)}
              type="number"
              placeholder="No limit"
              className="text-gray-300"
            />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Tax Inclusive</label>
            <Switch
              checked={localService.tax_inclusive}
              onCheckedChange={(checked) => handleFieldChange('tax_inclusive', checked)}
              className="data-[state=checked]:bg-emerald-600 mt-1"
            />
          </div>
        </div>
      </div>

      {/* Expanded section - Rates */}
      {expanded && (
        <div className="border-t border-gray-700 p-4 bg-gray-800/50">
          {/* Rates header */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h4 className="text-sm font-medium text-gray-300">
              Rates ({localService.rates?.length || 0})
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onExportRates(service)}
                className="border-gray-600 h-8 text-xs"
                disabled={!localService.rates?.length}
              >
                <Download className="w-3 h-3 mr-1" /> Export
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onImportRates(service)}
                className="border-gray-600 h-8 text-xs"
              >
                <Upload className="w-3 h-3 mr-1" /> Import
              </Button>
              <Button 
                size="sm" 
                onClick={addNewRate}
                className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" /> Add Rate
              </Button>
            </div>
          </div>

          {/* Rates table */}
          {localService.rates?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wider">
                    <th className="text-left pb-2 pr-2">Zone</th>
                    <th className="text-left pb-2 px-2">Min Charge</th>
                    <th className="text-left pb-2 px-2">1st Parcel</th>
                    <th className="text-left pb-2 px-2">Per Subseq</th>
                    <th className="text-left pb-2 px-2">Per Kg</th>
                    <th className="text-left pb-2 px-2">Days</th>
                    <th className="text-left pb-2 px-2">Note</th>
                    <th className="text-center pb-2 px-2">Active</th>
                    <th className="text-center pb-2 pl-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {localService.rates.map((rate, index) => (
                    <tr key={index} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-2 pr-2">
                        <div className="text-white text-sm">{rate.zone_name || rate.zone_code}</div>
                        <div className="text-gray-600 text-xs">{rate.zone_code}</div>
                      </td>
                      <td className="py-2 px-2">
                        <InlineInput
                          value={rate.min_charge || rate.base_rate || 0}
                          onChange={(v) => updateRate(index, 'min_charge', v)}
                          onSave={() => {
                            // Also update base_rate to match
                            const newRates = [...localService.rates];
                            newRates[index].base_rate = newRates[index].min_charge;
                            saveService({ ...localService, rates: newRates });
                          }}
                          type="number"
                          step="0.01"
                          prefix="$"
                          className="text-emerald-400 w-20"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <InlineInput
                          value={rate.first_parcel || 0}
                          onChange={(v) => updateRate(index, 'first_parcel', v)}
                          onSave={() => saveService(localService)}
                          type="number"
                          step="0.01"
                          prefix="$"
                          className="text-gray-300 w-20"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <InlineInput
                          value={rate.per_subsequent || 0}
                          onChange={(v) => updateRate(index, 'per_subsequent', v)}
                          onSave={() => saveService(localService)}
                          type="number"
                          step="0.01"
                          prefix="$"
                          className="text-gray-300 w-20"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <InlineInput
                          value={rate.per_kg_rate || 0}
                          onChange={(v) => updateRate(index, 'per_kg_rate', v)}
                          onSave={() => saveService(localService)}
                          type="number"
                          step="0.01"
                          prefix="$"
                          className="text-gray-300 w-20"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <InlineInput
                          value={rate.delivery_days || 0}
                          onChange={(v) => updateRate(index, 'delivery_days', v)}
                          onSave={() => saveService(localService)}
                          type="number"
                          className="text-gray-300 w-12"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <InlineInput
                          value={rate.internal_note || ''}
                          onChange={(v) => updateRate(index, 'internal_note', v)}
                          onSave={() => saveService(localService)}
                          placeholder="Note..."
                          className="text-gray-400 w-32"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <Switch
                          checked={rate.is_active !== false}
                          onCheckedChange={(checked) => handleRateChange(index, 'is_active', checked)}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                      </td>
                      <td className="py-2 pl-2 text-center">
                        <button
                          onClick={() => deleteRate(index)}
                          className="p-1 rounded hover:bg-gray-600 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">No rates configured</p>
              <p className="text-xs">Click "Import" to upload rates from CSV or "Add Rate" to add manually</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main ServicesTab component
export default function ServicesTab({ services, zones, categories, onRefresh }) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importMode, setImportMode] = useState('merge');
  const [importing, setImporting] = useState(false);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef(null);

  const handleDelete = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service and all its rates?')) return;
    try {
      await axios.delete(`${API}/shipping/services/${serviceId}`);
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Failed to delete service');
    }
  };

  const handleExportRates = async (service) => {
    try {
      const response = await axios.get(`${API}/shipping/services/${service.id}/rates/export/csv`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ShippingRate_${service.name.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting rates:', error);
      alert('Failed to export rates');
    }
  };

  const handleDownloadTemplate = async () => {
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
    }
  };

  const openImportModal = (service) => {
    setSelectedService(service);
    setImportFile(null);
    setImportMode('merge');
    setShowImportModal(true);
  };

  const handleImport = async () => {
    if (!importFile || !selectedService) return;
    
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      await axios.post(
        `${API}/shipping/services/${selectedService.id}/rates/import/csv?mode=${importMode}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      setShowImportModal(false);
      onRefresh?.();
    } catch (error) {
      console.error('Error importing rates:', error);
      alert(error.response?.data?.detail || 'Failed to import rates');
    } finally {
      setImporting(false);
    }
  };

  const createNewService = async () => {
    setCreating(true);
    try {
      const newService = {
        name: 'New Service',
        code: `SVC-${Date.now().toString(36).toUpperCase()}`,
        carrier: 'custom',
        charge_type: 'weight',
        min_charge: 0,
        handling_fee: 0,
        fuel_levy_percent: 0,
        fuel_levy_amount: 0,
        cubic_weight_modifier: 250,
        tax_inclusive: false,
        tax_rate: 10.0,
        categories: ['default'],
        is_active: true,
        rates: []
      };
      
      await axios.post(`${API}/shipping/services`, newService);
      onRefresh?.();
    } catch (error) {
      console.error('Error creating service:', error);
      alert('Failed to create service');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Shipping Services & Rates</h2>
          <p className="text-gray-400 text-sm">Click any field to edit • Changes save automatically</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadTemplate}
            className="border-gray-600"
          >
            <FileDown className="w-4 h-4 mr-2" /> Rate Template
          </Button>
          <Button 
            onClick={createNewService} 
            disabled={creating}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Add Service
          </Button>
        </div>
      </div>

      {/* Services List */}
      {services.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
          <Truck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-4">No shipping services configured</p>
          <Button onClick={createNewService} disabled={creating}>
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Create Your First Service
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map(service => (
            <ServiceRow
              key={service.id}
              service={service}
              zones={zones}
              categories={categories}
              onUpdate={onRefresh}
              onDelete={handleDelete}
              onExportRates={handleExportRates}
              onImportRates={openImportModal}
            />
          ))}
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Import Rates for {selectedService?.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">CSV File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0])}
                  className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:cursor-pointer hover:file:bg-emerald-700"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-2">Import Mode</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="text-emerald-600"
                    />
                    Merge (update existing, add new)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-emerald-600"
                    />
                    Replace all
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowImportModal(false)}
                className="border-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Import
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
