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
  Zap, Plus, Search, Clock, Package, Percent, TrendingUp,
  Eye, Edit, Trash2, Calendar, Timer, ShoppingCart, AlertTriangle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MerchantFlashSales() {
  const [flashSales, setFlashSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_percentage: 20,
    starts_at: '',
    ends_at: '',
    is_active: true,
    show_countdown: true,
    show_stock: true,
    featured: false,
    products: []
  });

  const [selectedProducts, setSelectedProducts] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [salesRes, productsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/marketing/flash-sales`, { params: { include_expired: true } }),
        axios.get(`${BACKEND_URL}/api/products`)
      ]);
      setFlashSales(salesRes.data.flash_sales || []);
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

  const saveSale = async () => {
    try {
      const data = {
        ...formData,
        products: selectedProducts.map(p => ({
          product_id: p.id,
          sale_price: p.sale_price,
          original_price: p.price,
          quantity_limit: p.quantity_limit || null
        }))
      };

      if (editingSale) {
        await axios.put(`${BACKEND_URL}/api/marketing/flash-sales/${editingSale.id}`, data);
      } else {
        await axios.post(`${BACKEND_URL}/api/marketing/flash-sales`, data);
      }
      
      setShowModal(false);
      setEditingSale(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save flash sale:', error);
      alert(error.response?.data?.detail || 'Failed to save');
    }
  };

  const deleteSale = async (id) => {
    if (!window.confirm('Delete this flash sale?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/marketing/flash-sales/${id}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      discount_percentage: 20,
      starts_at: '',
      ends_at: '',
      is_active: true,
      show_countdown: true,
      show_stock: true,
      featured: false,
      products: []
    });
    setSelectedProducts([]);
  };

  const openEdit = (sale) => {
    setEditingSale(sale);
    setFormData({
      name: sale.name || '',
      description: sale.description || '',
      discount_percentage: sale.discount_percentage || 20,
      starts_at: sale.starts_at ? sale.starts_at.slice(0, 16) : '',
      ends_at: sale.ends_at ? sale.ends_at.slice(0, 16) : '',
      is_active: sale.is_active !== false,
      show_countdown: sale.show_countdown !== false,
      show_stock: sale.show_stock !== false,
      featured: sale.featured || false
    });
    
    // Map sale products to selected products
    const selected = (sale.products || []).map(sp => {
      const product = products.find(p => p.id === sp.product_id);
      return product ? {
        ...product,
        sale_price: sp.sale_price,
        quantity_limit: sp.quantity_limit
      } : null;
    }).filter(Boolean);
    setSelectedProducts(selected);
    
    setShowModal(true);
  };

  const addProduct = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product && !selectedProducts.find(p => p.id === productId)) {
      setSelectedProducts([...selectedProducts, {
        ...product,
        sale_price: product.price * (1 - (formData.discount_percentage / 100)),
        quantity_limit: null
      }]);
    }
  };

  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
  };

  const updateProductSalePrice = (productId, price) => {
    setSelectedProducts(selectedProducts.map(p => 
      p.id === productId ? { ...p, sale_price: parseFloat(price) || 0 } : p
    ));
  };

  const getSaleStatus = (sale) => {
    const now = new Date();
    const start = new Date(sale.starts_at);
    const end = new Date(sale.ends_at);
    
    if (!sale.is_active) return { status: 'inactive', label: 'Inactive', color: 'secondary' };
    if (now < start) return { status: 'scheduled', label: 'Scheduled', color: 'default' };
    if (now > end) return { status: 'ended', label: 'Ended', color: 'secondary' };
    return { status: 'active', label: 'Live Now', color: 'destructive' };
  };

  const getTimeRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const activeSales = flashSales.filter(s => {
    const now = new Date();
    return s.is_active && new Date(s.starts_at) <= now && new Date(s.ends_at) >= now;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            Flash Sales
          </h1>
          <p className="text-muted-foreground">Create time-limited deals to drive urgency</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingSale(null); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Flash Sale
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{flashSales.length}</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Live Now</p>
                <p className="text-2xl font-bold text-red-600">{activeSales.length}</p>
              </div>
              <Timer className="h-8 w-8 text-red-500 animate-pulse" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Products on Sale</p>
                <p className="text-2xl font-bold">
                  {activeSales.reduce((sum, s) => sum + (s.products?.length || 0), 0)}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Discount</p>
                <p className="text-2xl font-bold">
                  {flashSales.length > 0 
                    ? Math.round(flashSales.reduce((sum, s) => sum + (s.discount_percentage || 0), 0) / flashSales.length)
                    : 0}%
                </p>
              </div>
              <Percent className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flash Sales List */}
      <Card>
        <CardHeader>
          <CardTitle>All Flash Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : flashSales.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No flash sales yet</p>
              <Button onClick={() => setShowModal(true)}>Create your first flash sale</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {flashSales.map((sale) => {
                const status = getSaleStatus(sale);
                return (
                  <div 
                    key={sale.id} 
                    className={`border rounded-lg p-4 ${status.status === 'active' ? 'border-red-300 bg-red-50/30' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{sale.name}</h3>
                          <Badge variant={status.color}>
                            {status.status === 'active' && <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />}
                            {status.label}
                          </Badge>
                          {sale.featured && <Badge variant="outline">Featured</Badge>}
                        </div>
                        {sale.description && (
                          <p className="text-sm text-muted-foreground mt-1">{sale.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(sale.starts_at).toLocaleDateString()} - {new Date(sale.ends_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {sale.products?.length || 0} products
                          </span>
                          {sale.discount_percentage && (
                            <span className="flex items-center gap-1 text-green-600">
                              <Percent className="h-4 w-4" />
                              {sale.discount_percentage}% off
                            </span>
                          )}
                        </div>
                        {status.status === 'active' && (
                          <div className="mt-2 flex items-center gap-2 text-red-600">
                            <Timer className="h-4 w-4" />
                            <span className="font-medium">{getTimeRemaining(sale.ends_at)} remaining</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(sale)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteSale(sale.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSale ? 'Edit Flash Sale' : 'Create Flash Sale'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sale Name</Label>
                <Input
                  placeholder="Summer Flash Sale"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Discount %</Label>
                <Input
                  type="number"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Limited time only! Get amazing deals..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.ends_at}
                  onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                />
              </div>
            </div>

            {/* Product Selection */}
            <div className="space-y-2">
              <Label>Products</Label>
              <Select onValueChange={addProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Add products to this sale" />
                </SelectTrigger>
                <SelectContent>
                  {products.filter(p => !selectedProducts.find(sp => sp.id === p.id)).map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - ${product.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedProducts.length > 0 && (
                <div className="mt-4 space-y-2">
                  {selectedProducts.map((product) => (
                    <div key={product.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">Original: ${product.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Sale Price:</Label>
                        <Input
                          type="number"
                          className="w-24"
                          value={product.sale_price}
                          onChange={(e) => updateProductSalePrice(product.id, e.target.value)}
                        />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeProduct(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">Sale is visible to customers</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Countdown</Label>
                  <p className="text-sm text-muted-foreground">Display countdown timer on storefront</p>
                </div>
                <Switch
                  checked={formData.show_countdown}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_countdown: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Stock</Label>
                  <p className="text-sm text-muted-foreground">Display remaining stock to create urgency</p>
                </div>
                <Switch
                  checked={formData.show_stock}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_stock: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Featured Sale</Label>
                  <p className="text-sm text-muted-foreground">Highlight on homepage</p>
                </div>
                <Switch
                  checked={formData.featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={saveSale}>{editingSale ? 'Update' : 'Create'} Flash Sale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
