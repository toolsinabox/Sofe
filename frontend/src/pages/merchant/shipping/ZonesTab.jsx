import React, { useState, useRef } from 'react';
import axios from 'axios';
import { 
  Plus, Edit, Trash2, Save, MapPin, Globe, 
  Loader2, CheckCircle, AlertCircle, Upload, Download,
  FileDown, AlertTriangle
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Stable input component to prevent focus loss
const StableInput = React.forwardRef(({ name, defaultValue, onBlur, className, ...props }, ref) => {
  const internalRef = React.useRef(null);
  const inputRef = ref || internalRef;
  
  const handleBlur = React.useCallback((e) => {
    if (onBlur) {
      onBlur(e);
    }
  }, [onBlur]);
  
  return (
    <Input
      ref={inputRef}
      name={name}
      defaultValue={defaultValue}
      onBlur={handleBlur}
      className={className}
      {...props}
    />
  );
});
StableInput.displayName = 'StableInput';

const ZonesTab = ({ zones, fetchAllData }) => {
  // Modal states
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showZoneImportModal, setShowZoneImportModal] = useState(false);
  
  // Form states
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [zoneForm, setZoneForm] = useState({
    code: '',
    name: '',
    country: 'AU',
    postcodes: [],
    is_active: true,
    sort_order: 0
  });
  const [postcodesInput, setPostcodesInput] = useState('');
  
  // Import states
  const [zoneImporting, setZoneImporting] = useState(false);
  const [zoneImportMode, setZoneImportMode] = useState('merge');
  const [zoneImportResult, setZoneImportResult] = useState(null);
  const [zoneUploadProgress, setZoneUploadProgress] = useState(0);
  const zoneFileInputRef = useRef(null);

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
          <h2 className="text-xl font-bold text-gray-900">Shipping Zones</h2>
          <p className="text-gray-500 text-sm">Define geographic regions for shipping rates</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportZones}
            className="border-gray-200"
            disabled={zones.length === 0}
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={openImportModal}
            className="border-gray-200"
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
          <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
            <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No shipping zones configured</p>
            <Button onClick={() => openZoneModal()}>Create Your First Zone</Button>
          </div>
        ) : (
          zones.map(zone => (
            <div 
              key={zone.id} 
              className={`bg-white rounded-xl p-5 border ${zone.is_active ? 'border-gray-200' : 'border-gray-200/50 opacity-60'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{zone.name}</h3>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono">{zone.code}</span>
                    {!zone.is_active && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">Inactive</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="flex items-center gap-1 text-gray-500 text-sm">
                      <Globe className="w-4 h-4" /> {zone.country}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {zone.postcodes?.slice(0, 8).map((pc, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded">
                        {pc}
                      </span>
                    ))}
                    {zone.postcodes?.length > 8 && (
                      <span className="px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded">
                        +{zone.postcodes.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openZoneModal(zone)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteZone(zone.id)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
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
        <DialogContent key={editingItem?.id || 'new-zone'} className="bg-white border-gray-200 text-gray-900 max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Shipping Zone' : 'Create Shipping Zone'}</DialogTitle>
            <DialogDescription className="text-gray-500">
              Define a geographic region for shipping rates
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700">Zone Code</Label>
                <StableInput
                  key={`zone-code-${editingItem?.id || 'new'}`}
                  name="code"
                  defaultValue={zoneForm.code}
                  onBlur={(e) => setZoneForm(prev => ({...prev, code: e.target.value.toUpperCase()}))}
                  placeholder="e.g., SYD_METRO"
                  className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                  style={{textTransform: 'uppercase'}}
                />
              </div>
              <div>
                <Label className="text-gray-700">Zone Name</Label>
                <StableInput
                  key={`zone-name-${editingItem?.id || 'new'}`}
                  name="name"
                  defaultValue={zoneForm.name}
                  onBlur={(e) => setZoneForm(prev => ({...prev, name: e.target.value}))}
                  placeholder="e.g., Sydney Metro"
                  className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700">Country Code</Label>
                <Select value={zoneForm.country} onValueChange={(v) => setZoneForm(prev => ({...prev, country: v}))}>
                  <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="AU">Australia (AU)</SelectItem>
                    <SelectItem value="NZ">New Zealand (NZ)</SelectItem>
                    <SelectItem value="US">United States (US)</SelectItem>
                    <SelectItem value="GB">United Kingdom (GB)</SelectItem>
                    <SelectItem value="CA">Canada (CA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-700">Sort Order</Label>
                <StableInput
                  key={`zone-sort-${editingItem?.id || 'new'}`}
                  type="number"
                  name="sort_order"
                  defaultValue={zoneForm.sort_order}
                  onBlur={(e) => setZoneForm(prev => ({...prev, sort_order: parseInt(e.target.value) || 0}))}
                  className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-700">Postcodes (comma-separated, ranges supported)</Label>
              <textarea
                key={`zone-postcodes-${editingItem?.id || 'new'}`}
                defaultValue={postcodesInput}
                onBlur={(e) => setPostcodesInput(e.target.value)}
                placeholder="e.g., 2000-2234, 2555-2574, 2740-2786"
                rows={3}
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-gray-500 text-xs mt-1">Use ranges like "2000-2234" or individual postcodes</p>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-700">Zone Active</Label>
              <Switch
                checked={zoneForm.is_active}
                onCheckedChange={(checked) => setZoneForm(prev => ({...prev, is_active: checked}))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowZoneModal(false)} className="border-gray-200">
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
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Import Shipping Zones
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Upload a CSV file to import shipping zones in Maropost format
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Upload Progress - shown when importing */}
            {zoneImporting && (
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  <div>
                    <p className="text-gray-900 font-medium">Uploading & Processing...</p>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${zoneUploadProgress}%` }}
                  />
                </div>
                <p className="text-gray-500 text-xs mt-2 text-center">{zoneUploadProgress}% complete</p>
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
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <span className="text-emerald-600 font-medium">Import Successful!</span>
                    </div>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p>Mode: <span className="text-gray-900">{zoneImportResult.mode}</span></p>
                      {zoneImportResult.rows_processed !== undefined && (
                        <p>Rows processed: <span className="text-gray-900">{zoneImportResult.rows_processed}</span></p>
                      )}
                      <p>Zones created: <span className="text-emerald-600">{zoneImportResult.zones_created}</span></p>
                      <p>Zones updated: <span className="text-blue-600">{zoneImportResult.zones_updated}</span></p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-red-600 font-medium">Import Failed</span>
                      <p className="text-red-500 text-sm mt-1">{zoneImportResult.error}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Show settings and upload button only when not importing */}
            {!zoneImporting && !zoneImportResult && (
              <>
                {/* Format Info */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">CSV Format (Maropost Compatible)</h4>
                  <p className="text-gray-500 text-xs mb-2">Required columns:</p>
                  <div className="flex flex-wrap gap-2">
                    {['Country', 'Courier', 'From Post Code', 'To Post Code', 'Zone Code', 'Zone Name'].map(col => (
                      <span key={col} className="px-2 py-1 bg-white text-gray-700 text-xs rounded font-mono">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Download Template Button */}
                <Button 
                  variant="outline" 
                  className="w-full border-gray-200 border-dashed"
                  onClick={handleDownloadTemplate}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download Sample Template
                </Button>

                {/* Import Mode Selection */}
                <div>
                  <Label className="text-gray-700 mb-2 block">Import Mode</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setZoneImportMode('merge')}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        zoneImportMode === 'merge' 
                          ? 'border-blue-500 bg-blue-500/10 text-gray-900' 
                          : 'border-gray-200 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      <div className="font-medium text-sm">Merge</div>
                      <div className="text-xs mt-1 opacity-70">Add new & update existing zones</div>
                    </button>
                    <button
                      onClick={() => setZoneImportMode('replace')}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        zoneImportMode === 'replace' 
                          ? 'border-orange-500 bg-orange-500/10 text-gray-900' 
                          : 'border-gray-200 text-gray-500 hover:border-gray-200'
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
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <p className="text-orange-600 text-sm">
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
                  className="flex-1 border-gray-200"
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
                className="border-red-500/50 text-red-600 hover:bg-red-500/10 sm:mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All Zones
              </Button>
            )}
            <Button variant="outline" onClick={() => { setShowZoneImportModal(false); setZoneImportResult(null); }} className="border-gray-200">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ZonesTab;
