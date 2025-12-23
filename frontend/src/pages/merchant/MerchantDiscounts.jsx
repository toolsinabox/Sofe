import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, X, Save, Tag, Percent, DollarSign, Calendar, Users, Copy, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantDiscounts = () => {
  const [discounts, setDiscounts] = useState([
    {
      id: '1',
      code: 'WELCOME10',
      type: 'percentage',
      value: 10,
      description: 'New customer welcome discount',
      min_order: 50,
      max_uses: 100,
      used_count: 45,
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      is_active: true
    },
    {
      id: '2',
      code: 'SAVE20',
      type: 'fixed',
      value: 20,
      description: 'Save $20 on orders over $100',
      min_order: 100,
      max_uses: 50,
      used_count: 12,
      start_date: '2025-01-01',
      end_date: '2025-06-30',
      is_active: true
    },
    {
      id: '3',
      code: 'FREESHIP',
      type: 'shipping',
      value: 0,
      description: 'Free shipping on all orders',
      min_order: 0,
      max_uses: null,
      used_count: 234,
      start_date: '2025-01-01',
      end_date: '2025-03-31',
      is_active: false
    }
  ]);
  
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage',
    value: '',
    description: '',
    min_order: '',
    max_uses: '',
    start_date: '',
    end_date: '',
    is_active: true
  });

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'percentage',
      value: '',
      description: '',
      min_order: '',
      max_uses: '',
      start_date: '',
      end_date: '',
      is_active: true
    });
    setEditingDiscount(null);
  };

  const openModal = (discount = null) => {
    if (discount) {
      setEditingDiscount(discount);
      setFormData(discount);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (editingDiscount) {
      setDiscounts(discounts.map(d => d.id === editingDiscount.id ? { ...formData, id: d.id } : d));
    } else {
      setDiscounts([...discounts, { ...formData, id: Date.now().toString(), used_count: 0 }]);
    }
    setShowModal(false);
    resetForm();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this discount?')) {
      setDiscounts(discounts.filter(d => d.id !== id));
    }
  };

  const toggleActive = (id) => {
    setDiscounts(discounts.map(d => d.id === id ? { ...d, is_active: !d.is_active } : d));
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'percentage': return <Percent size={16} className="text-green-600" />;
      case 'fixed': return <DollarSign size={16} className="text-blue-600" />;
      case 'shipping': return <Tag size={16} className="text-purple-600" />;
      default: return <Tag size={16} />;
    }
  };

  const formatValue = (discount) => {
    switch (discount.type) {
      case 'percentage': return `${discount.value}% off`;
      case 'fixed': return `$${discount.value} off`;
      case 'shipping': return 'Free Shipping';
      default: return discount.value;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discounts & Coupons</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage discount codes for your store</p>
        </div>
        <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700">
          <Plus size={16} className="mr-2" /> Create Discount
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-gray-500 text-sm">Active Discounts</p>
          <p className="text-2xl font-bold text-gray-900">{discounts.filter(d => d.is_active).length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-gray-500 text-sm">Total Discounts</p>
          <p className="text-2xl font-bold text-gray-900">{discounts.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-gray-500 text-sm">Total Uses</p>
          <p className="text-2xl font-bold text-gray-900">{discounts.reduce((sum, d) => sum + d.used_count, 0)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-gray-500 text-sm">Avg. Discount</p>
          <p className="text-2xl font-bold text-gray-900">
            {Math.round(discounts.filter(d => d.type === 'percentage').reduce((sum, d) => sum + d.value, 0) / discounts.filter(d => d.type === 'percentage').length || 0)}%
          </p>
        </div>
      </div>

      {/* Discounts Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left p-4 text-gray-600 font-medium">Code</th>
              <th className="text-left p-4 text-gray-600 font-medium">Discount</th>
              <th className="text-left p-4 text-gray-600 font-medium">Usage</th>
              <th className="text-left p-4 text-gray-600 font-medium">Valid Period</th>
              <th className="text-left p-4 text-gray-600 font-medium">Status</th>
              <th className="text-right p-4 text-gray-600 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {discounts.map(discount => (
              <tr key={discount.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <code className="text-blue-600 bg-blue-50 px-2 py-1 rounded font-mono text-sm">
                      {discount.code}
                    </code>
                    <button
                      onClick={() => copyCode(discount.code)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {copiedCode === discount.code ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{discount.description}</p>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(discount.type)}
                    <span className="text-gray-900 font-medium">{formatValue(discount)}</span>
                  </div>
                  {discount.min_order > 0 && (
                    <p className="text-xs text-gray-500 mt-1">Min. order: ${discount.min_order}</p>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-gray-400" />
                    <span className="text-gray-900">{discount.used_count}</span>
                    {discount.max_uses && (
                      <span className="text-gray-500">/ {discount.max_uses}</span>
                    )}
                  </div>
                  {discount.max_uses && (
                    <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-2">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, (discount.used_count / discount.max_uses) * 100)}%` }}
                      />
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Calendar size={14} />
                    <span>{discount.start_date} - {discount.end_date}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    discount.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {discount.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => toggleActive(discount.id)}
                      className={`p-2 rounded hover:bg-gray-100 ${discount.is_active ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      <Switch checked={discount.is_active} />
                    </button>
                    <button
                      onClick={() => openModal(discount)}
                      className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(discount.id)}
                      className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-6 border border-gray-200 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingDiscount ? 'Edit Discount' : 'Create Discount'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700">Discount Code</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER20"
                  className="bg-gray-50 border-gray-200 text-gray-900 mt-1 font-mono"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">Discount Type</Label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-md text-gray-900 mt-1"
                  >
                    <option value="percentage">Percentage Off</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="shipping">Free Shipping</option>
                  </select>
                </div>
                <div>
                  <Label className="text-gray-700">
                    {formData.type === 'percentage' ? 'Percentage' : formData.type === 'fixed' ? 'Amount ($)' : 'Value'}
                  </Label>
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                    disabled={formData.type === 'shipping'}
                    className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-gray-700">Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description for internal use"
                  className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">Minimum Order ($)</Label>
                  <Input
                    type="number"
                    value={formData.min_order}
                    onChange={(e) => setFormData({ ...formData, min_order: parseFloat(e.target.value) || 0 })}
                    className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Max Uses (blank = unlimited)</Label>
                  <Input
                    type="number"
                    value={formData.max_uses || ''}
                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                    className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <span className="text-gray-700">Active</span>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowModal(false)} className="border-gray-200 text-gray-700">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                <Save size={16} className="mr-2" /> {editingDiscount ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantDiscounts;
