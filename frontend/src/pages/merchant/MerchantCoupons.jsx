import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { 
  Ticket, Plus, Search, Trash2, Edit, Copy, ToggleLeft, Calendar, 
  Percent, DollarSign, Tag, Users, ShoppingCart, Gift, Zap, Package,
  TrendingUp, Clock, CheckCircle, XCircle, MoreVertical
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MerchantCoupons() {
  const [activeTab, setActiveTab] = useState('coupons');
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [filter, setFilter] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_purchase: '',
    max_discount: '',
    usage_limit: '',
    usage_per_customer: 1,
    starts_at: '',
    expires_at: '',
    is_active: true,
    is_stackable: false,
    first_order_only: false,
    buy_quantity: '',
    get_quantity: '',
    get_discount: ''
  });

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter === 'active') params.is_active = true;
      if (filter === 'inactive') params.is_active = false;
      
      const response = await axios.get(`${BACKEND_URL}/api/marketing/coupons`, { params });
      setCoupons(response.data.coupons || []);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleSubmit = async () => {
    try {
      const data = { ...formData };
      // Clean empty strings
      Object.keys(data).forEach(key => {
        if (data[key] === '') delete data[key];
      });

      if (editingCoupon) {
        await axios.put(`${BACKEND_URL}/api/marketing/coupons/${editingCoupon.id}`, data);
      } else {
        await axios.post(`${BACKEND_URL}/api/marketing/coupons`, data);
      }
      
      setShowModal(false);
      setEditingCoupon(null);
      resetForm();
      fetchCoupons();
    } catch (error) {
      console.error('Failed to save coupon:', error);
      alert(error.response?.data?.detail || 'Failed to save coupon');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/marketing/coupons/${id}`);
      fetchCoupons();
    } catch (error) {
      console.error('Failed to delete coupon:', error);
    }
  };

  const handleToggleActive = async (coupon) => {
    try {
      await axios.put(`${BACKEND_URL}/api/marketing/coupons/${coupon.id}`, {
        is_active: !coupon.is_active
      });
      fetchCoupons();
    } catch (error) {
      console.error('Failed to toggle coupon:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 10,
      min_purchase: '',
      max_discount: '',
      usage_limit: '',
      usage_per_customer: 1,
      starts_at: '',
      expires_at: '',
      is_active: true,
      is_stackable: false,
      first_order_only: false,
      buy_quantity: '',
      get_quantity: '',
      get_discount: ''
    });
  };

  const openEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code || '',
      name: coupon.name || '',
      description: coupon.description || '',
      discount_type: coupon.discount_type || 'percentage',
      discount_value: coupon.discount_value || 10,
      min_purchase: coupon.min_purchase || '',
      max_discount: coupon.max_discount || '',
      usage_limit: coupon.usage_limit || '',
      usage_per_customer: coupon.usage_per_customer || 1,
      starts_at: coupon.starts_at ? coupon.starts_at.slice(0, 16) : '',
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 16) : '',
      is_active: coupon.is_active !== false,
      is_stackable: coupon.is_stackable || false,
      first_order_only: coupon.first_order_only || false,
      buy_quantity: coupon.buy_quantity || '',
      get_quantity: coupon.get_quantity || '',
      get_discount: coupon.get_discount || ''
    });
    setShowModal(true);
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const getDiscountTypeIcon = (type) => {
    switch (type) {
      case 'percentage': return <Percent className="h-4 w-4" />;
      case 'fixed_amount': return <DollarSign className="h-4 w-4" />;
      case 'free_shipping': return <Package className="h-4 w-4" />;
      case 'buy_x_get_y': return <Gift className="h-4 w-4" />;
      default: return <Tag className="h-4 w-4" />;
    }
  };

  const getDiscountDisplay = (coupon) => {
    switch (coupon.discount_type) {
      case 'percentage': return `${coupon.discount_value}% off`;
      case 'fixed_amount': return `$${coupon.discount_value} off`;
      case 'free_shipping': return 'Free Shipping';
      case 'buy_x_get_y': return `Buy ${coupon.buy_quantity} Get ${coupon.get_quantity}`;
      default: return coupon.discount_value;
    }
  };

  const filteredCoupons = coupons.filter(coupon =>
    coupon.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coupon.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="h-6 w-6 text-primary" />
            Coupons & Discounts
          </h1>
          <p className="text-muted-foreground">Create and manage promotional codes</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingCoupon(null); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Coupon
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Coupons</p>
                <p className="text-2xl font-bold">{coupons.length}</p>
              </div>
              <Ticket className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{coupons.filter(c => c.is_active).length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Uses</p>
                <p className="text-2xl font-bold">{coupons.reduce((sum, c) => sum + (c.used_count || 0), 0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold">
                  {coupons.filter(c => c.expires_at && new Date(c.expires_at) < new Date()).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search coupons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Coupons</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Coupons Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredCoupons.length === 0 ? (
            <div className="p-8 text-center">
              <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No coupons found</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowModal(true)}>
                Create your first coupon
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Code</th>
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium">Discount</th>
                    <th className="text-left p-4 font-medium">Usage</th>
                    <th className="text-left p-4 font-medium">Valid Period</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoupons.map((coupon) => (
                    <tr key={coupon.id} className="border-t hover:bg-muted/30">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded font-mono text-sm">{coupon.code}</code>
                          <Button variant="ghost" size="sm" onClick={() => copyCode(coupon.code)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{coupon.name}</p>
                          {coupon.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-xs">{coupon.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getDiscountTypeIcon(coupon.discount_type)}
                          <span>{getDiscountDisplay(coupon)}</span>
                        </div>
                        {coupon.min_purchase && (
                          <p className="text-xs text-muted-foreground">Min: ${coupon.min_purchase}</p>
                        )}
                      </td>
                      <td className="p-4">
                        <span>{coupon.used_count || 0}</span>
                        {coupon.usage_limit && <span className="text-muted-foreground"> / {coupon.usage_limit}</span>}
                      </td>
                      <td className="p-4 text-sm">
                        {coupon.starts_at && (
                          <p>From: {new Date(coupon.starts_at).toLocaleDateString()}</p>
                        )}
                        {coupon.expires_at && (
                          <p>Until: {new Date(coupon.expires_at).toLocaleDateString()}</p>
                        )}
                        {!coupon.starts_at && !coupon.expires_at && (
                          <span className="text-muted-foreground">No limit</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                          {coupon.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleToggleActive(coupon)}>
                            <ToggleLeft className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(coupon)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(coupon.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Coupon Code</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., SUMMER20"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                  <Button type="button" variant="outline" onClick={generateCode}>
                    <Zap className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Leave empty to auto-generate</p>
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="Summer Sale 20% Off"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Internal description for this coupon..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Discount Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value) => setFormData({ ...formData, discount_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Off</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount Off</SelectItem>
                    <SelectItem value="free_shipping">Free Shipping</SelectItem>
                    <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.discount_type !== 'free_shipping' && formData.discount_type !== 'buy_x_get_y' && (
                <div className="space-y-2">
                  <Label>Discount Value</Label>
                  <Input
                    type="number"
                    placeholder={formData.discount_type === 'percentage' ? '20' : '10.00'}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}
            </div>

            {/* BOGO Fields */}
            {formData.discount_type === 'buy_x_get_y' && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Buy Quantity</Label>
                  <Input
                    type="number"
                    placeholder="2"
                    value={formData.buy_quantity}
                    onChange={(e) => setFormData({ ...formData, buy_quantity: parseInt(e.target.value) || '' })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Get Quantity</Label>
                  <Input
                    type="number"
                    placeholder="1"
                    value={formData.get_quantity}
                    onChange={(e) => setFormData({ ...formData, get_quantity: parseInt(e.target.value) || '' })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Get Discount %</Label>
                  <Input
                    type="number"
                    placeholder="100 (free)"
                    value={formData.get_discount}
                    onChange={(e) => setFormData({ ...formData, get_discount: parseFloat(e.target.value) || '' })}
                  />
                </div>
              </div>
            )}

            {/* Limits */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Minimum Purchase</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.min_purchase}
                  onChange={(e) => setFormData({ ...formData, min_purchase: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Discount</Label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={formData.max_discount}
                  onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Usage Limit</Label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">Coupon can be used at checkout</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Stackable</Label>
                  <p className="text-sm text-muted-foreground">Can be combined with other coupons</p>
                </div>
                <Switch
                  checked={formData.is_stackable}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_stackable: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>First Order Only</Label>
                  <p className="text-sm text-muted-foreground">Only valid for customer's first order</p>
                </div>
                <Switch
                  checked={formData.first_order_only}
                  onCheckedChange={(checked) => setFormData({ ...formData, first_order_only: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
