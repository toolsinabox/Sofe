import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { 
  Package, Plus, Search, Trash2, Edit, DollarSign, Percent,
  ShoppingCart, TrendingUp, Eye, Image, Layers, Tag
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MerchantBundles() {
  const [bundles, setBundles] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBundle, setEditingBundle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bundle_price: 0,
    discount_type: 'fixed',
    is_active: true,
    starts_at: '',
    ends_at: ''
  });

  const [selectedProducts, setSelectedProducts] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [bundlesRes, productsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/marketing/bundles`),
        axios.get(`${BACKEND_URL}/api/products`)
      ]);
      setBundles(bundlesRes.data.bundles || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculateOriginalPrice = () => {
    return selectedProducts.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id);
      return sum + (product?.price || 0) * (item.quantity || 1);
    }, 0);
  };

  const calculateSavings = () => {
    const original = calculateOriginalPrice();
    return original - (formData.bundle_price || 0);
  };

  const calculateSavingsPercent = () => {
    const original = calculateOriginalPrice();
    if (original === 0) return 0;
    return Math.round(((original - formData.bundle_price) / original) * 100);
  };

  const saveBundle = async () => {
    try {
      const data = {
        ...formData,
        items: selectedProducts.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity || 1,
          is_required: item.is_required !== false
        }))
      };

      if (editingBundle) {
        await axios.put(`${BACKEND_URL}/api/marketing/bundles/${editingBundle.id}`, data);
      } else {
        await axios.post(`${BACKEND_URL}/api/marketing/bundles`, data);
      }
      
      setShowModal(false);
      setEditingBundle(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save bundle:', error);
      alert(error.response?.data?.detail || 'Failed to save bundle');
    }
  };

  const deleteBundle = async (id) => {
    if (!window.confirm('Delete this bundle?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/marketing/bundles/${id}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete bundle:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      bundle_price: 0,
      discount_type: 'fixed',
      is_active: true,
      starts_at: '',
      ends_at: ''
    });
    setSelectedProducts([]);
  };

  const openEdit = (bundle) => {
    setEditingBundle(bundle);
    setFormData({
      name: bundle.name || '',
      description: bundle.description || '',
      bundle_price: bundle.bundle_price || 0,
      discount_type: bundle.discount_type || 'fixed',
      is_active: bundle.is_active !== false,
      starts_at: bundle.starts_at ? bundle.starts_at.slice(0, 16) : '',
      ends_at: bundle.ends_at ? bundle.ends_at.slice(0, 16) : ''
    });
    setSelectedProducts(bundle.items?.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity || 1,
      is_required: item.is_required !== false
    })) || []);
    setShowModal(true);
  };

  const addProduct = (productId) => {
    if (!selectedProducts.find(p => p.product_id === productId)) {
      setSelectedProducts([...selectedProducts, { product_id: productId, quantity: 1, is_required: true }]);
    }
  };

  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.product_id !== productId));
  };

  const updateProductQuantity = (productId, quantity) => {
    setSelectedProducts(selectedProducts.map(p =>
      p.product_id === productId ? { ...p, quantity: parseInt(quantity) || 1 } : p
    ));
  };

  const filteredBundles = bundles.filter(b =>
    b.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-indigo-500" />
            Product Bundles
          </h1>
          <p className="text-muted-foreground">Create product combinations at discounted prices</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingBundle(null); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Bundle
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bundles</p>
                <p className="text-2xl font-bold">{bundles.length}</p>
              </div>
              <Layers className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Bundles</p>
                <p className="text-2xl font-bold">{bundles.filter(b => b.is_active).length}</p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sold</p>
                <p className="text-2xl font-bold">{bundles.reduce((sum, b) => sum + (b.sold_count || 0), 0)}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Savings</p>
                <p className="text-2xl font-bold">
                  {bundles.length > 0 
                    ? Math.round(bundles.reduce((sum, b) => sum + ((b.savings || 0) / (b.original_price || 1) * 100), 0) / bundles.length)
                    : 0}%
                </p>
              </div>
              <Percent className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search bundles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Bundles Grid */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : filteredBundles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No bundles created yet</p>
            <Button onClick={() => setShowModal(true)}>Create your first bundle</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBundles.map((bundle) => (
            <Card key={bundle.id} className="overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{bundle.name}</h3>
                    <p className="text-indigo-100 text-sm">{bundle.items?.length || 0} products</p>
                  </div>
                  <Badge variant={bundle.is_active ? 'secondary' : 'outline'} className="bg-white/20">
                    {bundle.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <CardContent className="pt-4">
                {bundle.description && (
                  <p className="text-sm text-muted-foreground mb-4">{bundle.description}</p>
                )}
                
                <div className="space-y-2 mb-4">
                  {bundle.items?.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{item.product_name || item.product?.name || 'Product'}</span>
                      {item.quantity > 1 && <Badge variant="outline">x{item.quantity}</Badge>}
                    </div>
                  ))}
                  {bundle.items?.length > 3 && (
                    <p className="text-sm text-muted-foreground">+{bundle.items.length - 3} more</p>
                  )}
                </div>

                <div className="flex items-end justify-between pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground line-through">${bundle.original_price?.toFixed(2)}</p>
                    <p className="text-2xl font-bold text-green-600">${bundle.bundle_price?.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-100 text-green-800">
                      Save ${bundle.savings?.toFixed(2)}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{bundle.sold_count || 0} sold</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(bundle)}>
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => deleteBundle(bundle.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBundle ? 'Edit Bundle' : 'Create Product Bundle'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bundle Name</Label>
                <Input
                  placeholder="e.g., Ultimate Starter Kit"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Bundle Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.bundle_price}
                  onChange={(e) => setFormData({ ...formData, bundle_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what's included in this bundle..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Product Selection */}
            <div className="space-y-2">
              <Label>Add Products</Label>
              <Select onValueChange={addProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Select products to add" />
                </SelectTrigger>
                <SelectContent>
                  {products.filter(p => !selectedProducts.find(sp => sp.product_id === p.id)).map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - ${product.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProducts.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Products</Label>
                {selectedProducts.map((item) => {
                  const product = products.find(p => p.id === item.product_id);
                  return (
                    <div key={item.product_id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{product?.name || 'Product'}</p>
                        <p className="text-sm text-muted-foreground">${product?.price || 0} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Qty:</Label>
                        <Input
                          type="number"
                          className="w-20"
                          value={item.quantity}
                          onChange={(e) => updateProductQuantity(item.product_id, e.target.value)}
                        />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeProduct(item.product_id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Price Summary */}
            {selectedProducts.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span>Original Price:</span>
                  <span className="font-medium">${calculateOriginalPrice().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bundle Price:</span>
                  <span className="font-medium">${(formData.bundle_price || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600 font-bold border-t pt-2">
                  <span>Customer Saves:</span>
                  <span>${calculateSavings().toFixed(2)} ({calculateSavingsPercent()}%)</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={formData.ends_at}
                  onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">Bundle is available for purchase</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={saveBundle} disabled={selectedProducts.length < 2}>
              {editingBundle ? 'Update' : 'Create'} Bundle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
