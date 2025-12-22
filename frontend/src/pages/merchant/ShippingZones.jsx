import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  Save,
  X,
  Loader2,
  Globe,
  Search
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

const API = process.env.REACT_APP_BACKEND_URL;

const ShippingZones = () => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    country: 'AU',
    postcodes: '',
    is_active: true,
    sort_order: 0
  });

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const response = await axios.get(`${API}/api/shipping/zones`);
      setZones(response.data);
    } catch (error) {
      console.error('Error fetching zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (zone = null) => {
    if (zone) {
      setEditingZone(zone);
      setFormData({
        code: zone.code,
        name: zone.name,
        country: zone.country || 'AU',
        postcodes: zone.postcodes?.join(', ') || '',
        is_active: zone.is_active,
        sort_order: zone.sort_order || 0
      });
    } else {
      setEditingZone(null);
      setFormData({
        code: '',
        name: '',
        country: 'AU',
        postcodes: '',
        is_active: true,
        sort_order: zones.length + 1
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        postcodes: formData.postcodes.split(',').map(p => p.trim()).filter(p => p)
      };

      if (editingZone) {
        await axios.put(`${API}/api/shipping/zones/${editingZone.id}`, payload);
      } else {
        await axios.post(`${API}/api/shipping/zones`, payload);
      }
      
      setShowModal(false);
      fetchZones();
    } catch (error) {
      console.error('Error saving zone:', error);
      alert(error.response?.data?.detail || 'Failed to save zone');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (zoneId) => {
    if (!window.confirm('Are you sure you want to delete this zone?')) return;
    
    try {
      await axios.delete(`${API}/api/shipping/zones/${zoneId}`);
      fetchZones();
    } catch (error) {
      console.error('Error deleting zone:', error);
      alert('Failed to delete zone');
    }
  };

  const filteredZones = zones.filter(zone =>
    zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <MapPin className="w-7 h-7 text-blue-500" />
              Shipping Zones
            </h1>
            <p className="text-slate-500 mt-1">
              Define geographic regions based on postcodes
            </p>
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Zone
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Search zones..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Zones List */}
      <div className="space-y-3">
        {filteredZones.map((zone) => (
          <Card key={zone.id} className={`${!zone.is_active ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800">{zone.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {zone.code}
                      </span>
                      {!zone.is_active && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {zone.postcodes?.length || 0} postcode ranges • {zone.country}
                    </p>
                    {zone.postcodes?.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1 truncate max-w-md">
                        {zone.postcodes.slice(0, 5).join(', ')}
                        {zone.postcodes.length > 5 && ` +${zone.postcodes.length - 5} more`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenModal(zone)}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(zone.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredZones.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No shipping zones found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              {editingZone ? 'Edit Zone' : 'Add Zone'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Zone Code</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase().replace(/\s/g, '_')})}
                  placeholder="SYD_METRO"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Zone Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Sydney Metro"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Country</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value.toUpperCase()})}
                  placeholder="AU"
                  maxLength={2}
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
            
            <div>
              <Label>Postcodes (comma separated or ranges like 2000-2050)</Label>
              <textarea
                value={formData.postcodes}
                onChange={(e) => setFormData({...formData, postcodes: e.target.value})}
                placeholder="2000-2050, 2100, 2150-2200"
                rows={3}
                className="mt-1 w-full border border-slate-200 rounded-md p-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Use ranges (e.g., 2000-2050) or individual postcodes separated by commas
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
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
                <><Save className="w-4 h-4 mr-2" /> Save Zone</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShippingZones;
