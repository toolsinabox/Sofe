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
import { 
  Truck, Plus, Search, Building2, Phone, Mail, Globe, MapPin,
  Edit, Trash2, Star, Package, DollarSign, Clock, FileText
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MerchantSuppliers() {
  const [activeTab, setActiveTab] = useState('suppliers');
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    code: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: 'Australia',
    postal_code: '',
    payment_terms: 'NET30',
    lead_time_days: 7,
    min_order_value: '',
    notes: ''
  });

  const [poForm, setPOForm] = useState({
    supplier_id: '',
    items: [],
    expected_date: '',
    notes: '',
    shipping_cost: 0
  });

  const [poItems, setPOItems] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [suppliersRes, posRes, productsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/operations/suppliers`),
        axios.get(`${BACKEND_URL}/api/operations/purchase-orders`),
        axios.get(`${BACKEND_URL}/api/products`)
      ]);
      setSuppliers(suppliersRes.data.suppliers || []);
      setPurchaseOrders(posRes.data.purchase_orders || []);
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

  const saveSupplier = async () => {
    try {
      if (editingSupplier) {
        await axios.put(`${BACKEND_URL}/api/operations/suppliers/${editingSupplier.id}`, supplierForm);
      } else {
        await axios.post(`${BACKEND_URL}/api/operations/suppliers`, supplierForm);
      }
      setShowModal(false);
      setEditingSupplier(null);
      resetSupplierForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save supplier:', error);
      alert(error.response?.data?.detail || 'Failed to save');
    }
  };

  const deleteSupplier = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/operations/suppliers/${id}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const resetSupplierForm = () => {
    setSupplierForm({
      name: '',
      code: '',
      contact_name: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      city: '',
      state: '',
      country: 'Australia',
      postal_code: '',
      payment_terms: 'NET30',
      lead_time_days: 7,
      min_order_value: '',
      notes: ''
    });
  };

  const openEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name || '',
      code: supplier.code || '',
      contact_name: supplier.contact_name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      website: supplier.website || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      country: supplier.country || 'Australia',
      postal_code: supplier.postal_code || '',
      payment_terms: supplier.payment_terms || 'NET30',
      lead_time_days: supplier.lead_time_days || 7,
      min_order_value: supplier.min_order_value || '',
      notes: supplier.notes || ''
    });
    setShowModal(true);
  };

  const createPO = async () => {
    try {
      const data = {
        supplier_id: poForm.supplier_id,
        items: poItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost
        })),
        expected_date: poForm.expected_date,
        notes: poForm.notes,
        shipping_cost: poForm.shipping_cost
      };
      
      await axios.post(`${BACKEND_URL}/api/operations/purchase-orders`, data);
      setShowPOModal(false);
      resetPOForm();
      fetchData();
    } catch (error) {
      console.error('Failed to create PO:', error);
      alert(error.response?.data?.detail || 'Failed to create purchase order');
    }
  };

  const resetPOForm = () => {
    setPOForm({
      supplier_id: '',
      items: [],
      expected_date: '',
      notes: '',
      shipping_cost: 0
    });
    setPOItems([]);
  };

  const addPOItem = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product && !poItems.find(i => i.product_id === productId)) {
      setPOItems([...poItems, {
        product_id: productId,
        name: product.name,
        sku: product.sku,
        quantity: 1,
        unit_cost: product.cost || product.price || 0
      }]);
    }
  };

  const removePOItem = (productId) => {
    setPOItems(poItems.filter(i => i.product_id !== productId));
  };

  const updatePOItem = (productId, field, value) => {
    setPOItems(poItems.map(item => 
      item.product_id === productId ? { ...item, [field]: parseFloat(value) || 0 } : item
    ));
  };

  const getPOTotal = () => {
    return poItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0) + (poForm.shipping_cost || 0);
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'secondary',
      pending: 'default',
      approved: 'default',
      ordered: 'default',
      partial: 'warning',
      received: 'success',
      cancelled: 'destructive'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Suppliers & Purchase Orders
          </h1>
          <p className="text-muted-foreground">Manage suppliers and track purchase orders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetPOForm(); setShowPOModal(true); }}>
            <FileText className="h-4 w-4 mr-2" />
            New PO
          </Button>
          <Button onClick={() => { resetSupplierForm(); setEditingSupplier(null); setShowModal(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Suppliers</p>
                <p className="text-2xl font-bold">{suppliers.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active POs</p>
                <p className="text-2xl font-bold">
                  {purchaseOrders.filter(po => !['received', 'cancelled'].includes(po.status)).length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Value</p>
                <p className="text-2xl font-bold">
                  ${purchaseOrders
                    .filter(po => !['received', 'cancelled'].includes(po.status))
                    .reduce((sum, po) => sum + (po.total || 0), 0)
                    .toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Lead Time</p>
                <p className="text-2xl font-bold">
                  {suppliers.length > 0 
                    ? Math.round(suppliers.reduce((sum, s) => sum + (s.lead_time_days || 7), 0) / suppliers.length)
                    : 0} days
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
        </TabsList>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="p-8 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No suppliers found</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowModal(true)}>
                    Add your first supplier
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">Supplier</th>
                        <th className="text-left p-4 font-medium">Contact</th>
                        <th className="text-left p-4 font-medium">Terms</th>
                        <th className="text-right p-4 font-medium">Total Orders</th>
                        <th className="text-right p-4 font-medium">Total Spent</th>
                        <th className="text-right p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSuppliers.map((supplier) => (
                        <tr key={supplier.id} className="border-t hover:bg-muted/30">
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{supplier.name}</p>
                              {supplier.code && <p className="text-sm text-muted-foreground">{supplier.code}</p>}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1 text-sm">
                              {supplier.contact_name && <p>{supplier.contact_name}</p>}
                              {supplier.email && (
                                <p className="flex items-center gap-1 text-muted-foreground">
                                  <Mail className="h-3 w-3" /> {supplier.email}
                                </p>
                              )}
                              {supplier.phone && (
                                <p className="flex items-center gap-1 text-muted-foreground">
                                  <Phone className="h-3 w-3" /> {supplier.phone}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm">
                              <p>{supplier.payment_terms || 'N/A'}</p>
                              <p className="text-muted-foreground">{supplier.lead_time_days || 7} days lead time</p>
                            </div>
                          </td>
                          <td className="p-4 text-right">{supplier.total_orders || 0}</td>
                          <td className="p-4 text-right font-mono">${(supplier.total_spent || 0).toFixed(2)}</td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => openEditSupplier(supplier)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteSupplier(supplier.id)}>
                                <Trash2 className="h-4 w-4" />
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
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders">
          <Card>
            <CardContent className="p-0">
              {purchaseOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No purchase orders yet</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowPOModal(true)}>
                    Create first purchase order
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">PO Number</th>
                        <th className="text-left p-4 font-medium">Supplier</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-right p-4 font-medium">Items</th>
                        <th className="text-right p-4 font-medium">Total</th>
                        <th className="text-left p-4 font-medium">Expected</th>
                        <th className="text-left p-4 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseOrders.map((po) => (
                        <tr key={po.id} className="border-t hover:bg-muted/30">
                          <td className="p-4 font-mono font-medium">{po.po_number}</td>
                          <td className="p-4">{po.supplier_name}</td>
                          <td className="p-4">{getStatusBadge(po.status)}</td>
                          <td className="p-4 text-right">{po.items?.length || 0}</td>
                          <td className="p-4 text-right font-mono font-bold">${(po.total || 0).toFixed(2)}</td>
                          <td className="p-4 text-sm">
                            {po.expected_date ? new Date(po.expected_date).toLocaleDateString() : '-'}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {po.created_at ? new Date(po.created_at).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Supplier Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier Name *</Label>
                <Input
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="ABC Supplies"
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier Code</Label>
                <Input
                  value={supplierForm.code}
                  onChange={(e) => setSupplierForm({ ...supplierForm, code: e.target.value })}
                  placeholder="ABC-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={supplierForm.contact_name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contact_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={supplierForm.website}
                  onChange={(e) => setSupplierForm({ ...supplierForm, website: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={supplierForm.address}
                onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={supplierForm.city}
                  onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={supplierForm.state}
                  onChange={(e) => setSupplierForm({ ...supplierForm, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={supplierForm.country}
                  onChange={(e) => setSupplierForm({ ...supplierForm, country: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Postal Code</Label>
                <Input
                  value={supplierForm.postal_code}
                  onChange={(e) => setSupplierForm({ ...supplierForm, postal_code: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Select
                  value={supplierForm.payment_terms}
                  onValueChange={(val) => setSupplierForm({ ...supplierForm, payment_terms: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COD">COD</SelectItem>
                    <SelectItem value="NET7">NET 7</SelectItem>
                    <SelectItem value="NET15">NET 15</SelectItem>
                    <SelectItem value="NET30">NET 30</SelectItem>
                    <SelectItem value="NET60">NET 60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lead Time (days)</Label>
                <Input
                  type="number"
                  value={supplierForm.lead_time_days}
                  onChange={(e) => setSupplierForm({ ...supplierForm, lead_time_days: parseInt(e.target.value) || 7 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Min Order Value</Label>
                <Input
                  type="number"
                  value={supplierForm.min_order_value}
                  onChange={(e) => setSupplierForm({ ...supplierForm, min_order_value: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={supplierForm.notes}
                onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={saveSupplier}>{editingSupplier ? 'Update' : 'Add'} Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Order Modal */}
      <Dialog open={showPOModal} onOpenChange={setShowPOModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Supplier *</Label>
              <Select
                value={poForm.supplier_id}
                onValueChange={(val) => setPOForm({ ...poForm, supplier_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Add Products</Label>
              <Select onValueChange={addPOItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Add products" />
                </SelectTrigger>
                <SelectContent>
                  {products.filter(p => !poItems.find(i => i.product_id === p.id)).map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {poItems.length > 0 && (
              <div className="space-y-2">
                {poItems.map((item) => (
                  <div key={item.product_id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Qty:</Label>
                      <Input
                        type="number"
                        className="w-20"
                        value={item.quantity}
                        onChange={(e) => updatePOItem(item.product_id, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Cost:</Label>
                      <Input
                        type="number"
                        className="w-24"
                        value={item.unit_cost}
                        onChange={(e) => updatePOItem(item.product_id, 'unit_cost', e.target.value)}
                      />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removePOItem(item.product_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expected Delivery Date</Label>
                <Input
                  type="date"
                  value={poForm.expected_date}
                  onChange={(e) => setPOForm({ ...poForm, expected_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Shipping Cost</Label>
                <Input
                  type="number"
                  value={poForm.shipping_cost}
                  onChange={(e) => setPOForm({ ...poForm, shipping_cost: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={poForm.notes}
                onChange={(e) => setPOForm({ ...poForm, notes: e.target.value })}
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${getPOTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPOModal(false)}>Cancel</Button>
            <Button onClick={createPO} disabled={!poForm.supplier_id || poItems.length === 0}>
              Create Purchase Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
