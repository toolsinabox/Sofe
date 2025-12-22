import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, X, Save, Truck, MapPin, Package, DollarSign } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantShipping = () => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    countries: [],
    states: [],
    postcodes: [],
    rates: [],
    is_active: true
  });

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const response = await axios.get(`${API}/shipping/zones`);
      setZones(response.data);
    } catch (error) {
      console.error('Error fetching zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (zone = null) => {
    if (zone) {
      setEditingZone(zone);
      setFormData(zone);
    } else {
      setEditingZone(null);
      setFormData({
        name: '',
        countries: [],
        states: [],
        postcodes: [],
        rates: [{ id: Date.now().toString(), name: 'Standard Shipping', price: 9.95, estimated_days: '3-5 business days', is_active: true }],
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingZone) {
        await axios.put(`${API}/shipping/zones/${editingZone.id}`, formData);
      } else {
        await axios.post(`${API}/shipping/zones`, formData);
      }
      fetchZones();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving zone:', error);
    }
  };

  const deleteZone = async (zoneId) => {
    if (!window.confirm('Are you sure you want to delete this shipping zone?')) return;
    try {
      await axios.delete(`${API}/shipping/zones/${zoneId}`);
      fetchZones();
    } catch (error) {
      console.error('Error deleting zone:', error);
    }
  };

  const addRate = () => {
    setFormData({
      ...formData,
      rates: [...formData.rates, {
        id: Date.now().toString(),
        name: 'New Rate',
        price: 0,
        min_weight: 0,
        max_weight: null,
        estimated_days: '3-5 business days',
        is_active: true
      }]
    });
  };

  const updateRate = (index, field, value) => {
    const newRates = [...formData.rates];
    newRates[index] = { ...newRates[index], [field]: value };
    setFormData({ ...formData, rates: newRates });
  };

  const removeRate = (index) => {
    setFormData({
      ...formData,
      rates: formData.rates.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Shipping Zones & Rates</h1>
          <p className="text-gray-400 text-sm mt-1">Configure shipping costs by region</p>
        </div>
        <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700">
          <Plus size={16} className="mr-2" /> Add Zone
        </Button>
      </div>

      {/* Zones Grid */}
      <div className="grid gap-4">
        {zones.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <Truck size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No shipping zones configured</p>
            <Button onClick={() => openModal()} className="mt-4">
              Create Your First Zone
            </Button>
          </div>
        ) : (
          zones.map((zone) => (
            <div key={zone.id} className={`bg-gray-800 rounded-lg p-6 border ${
              zone.is_active ? 'border-gray-700' : 'border-gray-700/50 opacity-60'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <MapPin size={18} className="text-blue-400" />
                    {zone.name}
                    {!zone.is_active && (
                      <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">Inactive</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {zone.countries?.length > 0 && `Countries: ${zone.countries.join(', ')}`}
                    {zone.states?.length > 0 && ` | States: ${zone.states.join(', ')}`}
                    {zone.postcodes?.length > 0 && ` | Postcodes: ${zone.postcodes.join(', ')}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(zone)}
                    className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => deleteZone(zone.id)}
                    className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Rates */}
              <div className="space-y-2">
                {zone.rates?.map((rate, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-900 rounded-lg p-3">
                    <div className="flex items-center gap-4">
                      <Package size={16} className="text-gray-500" />
                      <div>
                        <p className="text-white font-medium">{rate.name}</p>
                        <p className="text-xs text-gray-500">{rate.estimated_days}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold">${rate.price?.toFixed(2)}</p>
                      {(rate.min_weight > 0 || rate.max_weight) && (
                        <p className="text-xs text-gray-500">
                          {rate.min_weight}kg - {rate.max_weight || '∞'}kg
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-gray-800 rounded-lg w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">
                {editingZone ? 'Edit Shipping Zone' : 'Create Shipping Zone'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Zone Name */}
              <div>
                <Label className="text-gray-300">Zone Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Australia, International"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>

              {/* Countries */}
              <div>
                <Label className="text-gray-300">Countries (ISO codes, comma-separated)</Label>
                <Input
                  value={formData.countries?.join(', ') || ''}
                  onChange={(e) => setFormData({ ...formData, countries: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="AU, NZ, US"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>

              {/* States */}
              <div>
                <Label className="text-gray-300">States/Regions (comma-separated)</Label>
                <Input
                  value={formData.states?.join(', ') || ''}
                  onChange={(e) => setFormData({ ...formData, states: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="VIC, NSW, QLD"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>

              {/* Postcodes */}
              <div>
                <Label className="text-gray-300">Postcodes (comma-separated, ranges supported)</Label>
                <Input
                  value={formData.postcodes?.join(', ') || ''}
                  onChange={(e) => setFormData({ ...formData, postcodes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="3000-3999, 4000-4999"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>

              {/* Rates */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-gray-300">Shipping Rates</Label>
                  <Button variant="outline" size="sm" onClick={addRate} className="border-gray-600">
                    <Plus size={14} className="mr-1" /> Add Rate
                  </Button>
                </div>
                <div className="space-y-3">
                  {formData.rates?.map((rate, i) => (
                    <div key={i} className="bg-gray-900 rounded-lg p-4">
                      <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-2">
                          <Input
                            value={rate.name}
                            onChange={(e) => updateRate(i, 'name', e.target.value)}
                            placeholder="Rate name"
                            className="bg-gray-700 border-gray-600 text-white text-sm"
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            step="0.01"
                            value={rate.price}
                            onChange={(e) => updateRate(i, 'price', parseFloat(e.target.value) || 0)}
                            placeholder="Price"
                            className="bg-gray-700 border-gray-600 text-white text-sm"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => removeRate(i)}
                            className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        <Input
                          value={rate.estimated_days}
                          onChange={(e) => updateRate(i, 'estimated_days', e.target.value)}
                          placeholder="Estimated days"
                          className="bg-gray-700 border-gray-600 text-white text-sm"
                        />
                        <Input
                          type="number"
                          value={rate.min_weight || ''}
                          onChange={(e) => updateRate(i, 'min_weight', parseFloat(e.target.value) || 0)}
                          placeholder="Min weight (kg)"
                          className="bg-gray-700 border-gray-600 text-white text-sm"
                        />
                        <Input
                          type="number"
                          value={rate.max_weight || ''}
                          onChange={(e) => updateRate(i, 'max_weight', e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="Max weight (kg)"
                          className="bg-gray-700 border-gray-600 text-white text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active */}
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Zone Active</span>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
              <Button variant="outline" onClick={() => setShowModal(false)} className="border-gray-600">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                <Save size={16} className="mr-2" /> {editingZone ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantShipping;
