import React from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Box, Loader2, Save } from 'lucide-react';
import { Button } from '../../../components/ui/button';
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

const PackagesTab = ({
  packages,
  packageForm,
  setPackageForm,
  editingItem,
  setEditingItem,
  showPackageModal,
  setShowPackageModal,
  saving,
  setSaving,
  fetchAllData
}) => {
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
          <h2 className="text-xl font-bold text-gray-900">Predefined Packages</h2>
          <p className="text-gray-500 text-sm">Define standard package sizes for shipping calculations</p>
        </div>
        <Button onClick={() => openPackageModal()} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-2" /> Add Package
        </Button>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl p-8 text-center border border-gray-200">
            <Box className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No package types configured</p>
            <Button onClick={() => openPackageModal()}>Create Your First Package</Button>
          </div>
        ) : (
          packages.map(pkg => (
            <div 
              key={pkg.id} 
              className={`bg-white rounded-xl p-5 border ${pkg.is_active ? 'border-gray-200' : 'border-gray-200/50 opacity-60'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-orange-400" />
                  <h3 className="text-gray-900 font-semibold">{pkg.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openPackageModal(pkg)}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePackage(pkg.id)}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Dimensions:</span>
                  <span className="text-gray-900">{pkg.length} x {pkg.width} x {pkg.height} cm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Max Weight:</span>
                  <span className="text-gray-900">{pkg.max_weight} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tare Weight:</span>
                  <span className="text-gray-900">{pkg.tare_weight} kg</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono">{pkg.code}</span>
                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded capitalize">{pkg.package_type}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Package Modal */}
      <Dialog open={showPackageModal} onOpenChange={setShowPackageModal}>
        <DialogContent key={editingItem?.id || 'new-package'} className="bg-white border-gray-200 text-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Package' : 'Create Package'}</DialogTitle>
            <DialogDescription className="text-gray-500">
              Define a standard package size
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700">Package Code</Label>
                <StableInput
                  key={`pkg-code-${editingItem?.id || 'new'}`}
                  name="code"
                  defaultValue={packageForm.code}
                  onBlur={(e) => setPackageForm(prev => ({...prev, code: e.target.value.toLowerCase()}))}
                  placeholder="e.g., small_box"
                  className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                  style={{textTransform: 'lowercase'}}
                />
              </div>
              <div>
                <Label className="text-gray-700">Package Name</Label>
                <StableInput
                  key={`pkg-name-${editingItem?.id || 'new'}`}
                  name="name"
                  defaultValue={packageForm.name}
                  onBlur={(e) => setPackageForm(prev => ({...prev, name: e.target.value}))}
                  placeholder="e.g., Small Box"
                  className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-700">Package Type</Label>
              <Select value={packageForm.package_type} onValueChange={(v) => setPackageForm(prev => ({...prev, package_type: v}))}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="satchel">Satchel</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                  <SelectItem value="pallet">Pallet</SelectItem>
                  <SelectItem value="tube">Tube</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700">Dimensions (cm)</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <StableInput
                  key={`pkg-length-${editingItem?.id || 'new'}`}
                  type="number"
                  name="length"
                  placeholder="Length"
                  defaultValue={packageForm.length}
                  onBlur={(e) => setPackageForm(prev => ({...prev, length: parseFloat(e.target.value) || 0}))}
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
                <StableInput
                  key={`pkg-width-${editingItem?.id || 'new'}`}
                  type="number"
                  name="width"
                  placeholder="Width"
                  defaultValue={packageForm.width}
                  onBlur={(e) => setPackageForm(prev => ({...prev, width: parseFloat(e.target.value) || 0}))}
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
                <StableInput
                  key={`pkg-height-${editingItem?.id || 'new'}`}
                  type="number"
                  name="height"
                  placeholder="Height"
                  defaultValue={packageForm.height}
                  onBlur={(e) => setPackageForm(prev => ({...prev, height: parseFloat(e.target.value) || 0}))}
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700">Max Weight (kg)</Label>
                <StableInput
                  key={`pkg-maxwt-${editingItem?.id || 'new'}`}
                  type="number"
                  step="0.1"
                  name="max_weight"
                  defaultValue={packageForm.max_weight}
                  onBlur={(e) => setPackageForm(prev => ({...prev, max_weight: parseFloat(e.target.value) || 0}))}
                  className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-700">Tare Weight (kg)</Label>
                <StableInput
                  key={`pkg-tarewt-${editingItem?.id || 'new'}`}
                  type="number"
                  step="0.01"
                  name="tare_weight"
                  defaultValue={packageForm.tare_weight}
                  onBlur={(e) => setPackageForm(prev => ({...prev, tare_weight: parseFloat(e.target.value) || 0}))}
                  className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-700">Package Active</Label>
              <Switch
                checked={packageForm.is_active}
                onCheckedChange={(checked) => setPackageForm(prev => ({...prev, is_active: checked}))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPackageModal(false)} className="border-gray-200">
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

export default PackagesTab;
