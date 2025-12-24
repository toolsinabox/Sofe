import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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
  Warehouse, Plus, Search, MapPin, Package, ArrowRightLeft, AlertTriangle,
  Edit, Trash2, Eye, CheckCircle, Clock, TrendingDown, Bell, Box
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MerchantWarehouses() {
  const [activeTab, setActiveTab] = useState('warehouses');
  const [warehouses, setWarehouses] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [warehouseStock, setWarehouseStock] = useState([]);

  const [warehouseForm, setWarehouseForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    country: 'Australia',
    postal_code: '',
    phone: '',
    email: '',
    is_active: true,
    is_default: false,
    capacity: '',
    notes: ''
  });

  const [transferForm, setTransferForm] = useState({
    from_warehouse_id: '',
    to_warehouse_id: '',
    items: [],
    notes: ''
  });

  const [transferItems, setTransferItems] = useState([{ product_id: '', quantity: 1 }]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [warehousesRes, transfersRes, alertsRes, productsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/operations/warehouses`),
        axios.get(`${BACKEND_URL}/api/operations/stock-transfers`),
        axios.get(`${BACKEND_URL}/api/operations/alerts`),
        axios.get(`${BACKEND_URL}/api/products`)
      ]);
      setWarehouses(warehousesRes.data.warehouses || []);
      setTransfers(transfersRes.data.transfers || []);
      setAlerts(alertsRes.data.alerts || []);
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

  const fetchWarehouseStock = async (warehouseId) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/operations/warehouses/${warehouseId}/stock`);
      setWarehouseStock(res.data.stock || []);
    } catch (error) {
      console.error('Failed to fetch warehouse stock:', error);
    }
  };

  const saveWarehouse = async () => {
    try {
      if (editingWarehouse) {
        await axios.put(`${BACKEND_URL}/api/operations/warehouses/${editingWarehouse.id}`, warehouseForm);
      } else {
        await axios.post(`${BACKEND_URL}/api/operations/warehouses`, warehouseForm);
      }
      setShowModal(false);
      setEditingWarehouse(null);
      resetWarehouseForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save warehouse:', error);
      alert(error.response?.data?.detail || 'Failed to save');
    }
  };

  const deleteWarehouse = async (id) => {
    if (!window.confirm('Delete this warehouse?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/operations/warehouses/${id}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const createTransfer = async () => {
    try {
      const items = transferItems.filter(item => item.product_id && item.quantity > 0);
      await axios.post(`${BACKEND_URL}/api/operations/stock-transfers`, {
        ...transferForm,
        items
      });
      setShowTransferModal(false);
      resetTransferForm();
      fetchData();
    } catch (error) {
      console.error('Failed to create transfer:', error);
      alert(error.response?.data?.detail || 'Failed to create transfer');
    }
  };

  const shipTransfer = async (transferId) => {
    try {
      await axios.post(`${BACKEND_URL}/api/operations/stock-transfers/${transferId}/ship`);
      fetchData();
    } catch (error) {
      console.error('Failed to ship transfer:', error);
    }
  };

  const receiveTransfer = async (transferId) => {
    try {
      const transfer = transfers.find(t => t.id === transferId);
      await axios.post(`${BACKEND_URL}/api/operations/stock-transfers/${transferId}/receive`, 
        transfer.items.map(item => ({ product_id: item.product_id, quantity_received: item.quantity }))
      );
      fetchData();
    } catch (error) {
      console.error('Failed to receive transfer:', error);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      await axios.post(`${BACKEND_URL}/api/operations/alerts/${alertId}/resolve`);
      fetchData();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const resetWarehouseForm = () => {
    setWarehouseForm({
      name: '', code: '', address: '', city: '', state: '', country: 'Australia',
      postal_code: '', phone: '', email: '', is_active: true, is_default: false, capacity: '', notes: ''
    });
  };

  const resetTransferForm = () => {
    setTransferForm({ from_warehouse_id: '', to_warehouse_id: '', items: [], notes: '' });
    setTransferItems([{ product_id: '', quantity: 1 }]);
  };

  const openEditWarehouse = (warehouse) => {
    setEditingWarehouse(warehouse);
    setWarehouseForm({
      name: warehouse.name || '',
      code: warehouse.code || '',
      address: warehouse.address || '',
      city: warehouse.city || '',
      state: warehouse.state || '',
      country: warehouse.country || 'Australia',
      postal_code: warehouse.postal_code || '',
      phone: warehouse.phone || '',
      email: warehouse.email || '',
      is_active: warehouse.is_active ?? true,
      is_default: warehouse.is_default || false,
      capacity: warehouse.capacity || '',
      notes: warehouse.notes || ''
    });
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_transit: 'bg-blue-100 text-blue-800',
      shipped: 'bg-blue-100 text-blue-800',
      received: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status?.replace('_', ' ')}</Badge>;
  };

  const getAlertTypeBadge = (type) => {
    const styles = {
      low_stock: 'bg-orange-100 text-orange-800',
      out_of_stock: 'bg-red-100 text-red-800',
      overstock: 'bg-purple-100 text-purple-800',
      expiring: 'bg-yellow-100 text-yellow-800'
    };
    return <Badge className={styles[type] || 'bg-gray-100'}>{type?.replace('_', ' ')}</Badge>;
  };

  const filteredWarehouses = warehouses.filter(w =>
    w.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Management</h1>
          <p className="text-gray-500">Manage inventory across multiple locations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetTransferForm(); setShowTransferModal(true); }}>
            <ArrowRightLeft className="w-4 h-4 mr-2" /> Stock Transfer
          </Button>
          <Button onClick={() => { resetWarehouseForm(); setEditingWarehouse(null); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Warehouse
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Warehouse className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{warehouses.length}</p>
                <p className="text-sm text-gray-500">Warehouses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ArrowRightLeft className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{transfers.filter(t => t.status === 'pending' || t.status === 'in_transit').length}</p>
                <p className="text-sm text-gray-500">Active Transfers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alerts.filter(a => !a.resolved).length}</p>
                <p className="text-sm text-gray-500">Active Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-sm text-gray-500">Total Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
          <TabsTrigger value="transfers">Stock Transfers</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {alerts.filter(a => !a.resolved).length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {alerts.filter(a => !a.resolved).length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses">
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search warehouses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-8 text-gray-500">Loading...</div>
            ) : filteredWarehouses.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-8 text-center text-gray-500">
                  <Warehouse className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No warehouses yet</p>
                  <Button variant="link" onClick={() => setShowModal(true)}>Add your first warehouse</Button>
                </CardContent>
              </Card>
            ) : (
              filteredWarehouses.map(warehouse => (
                <Card key={warehouse.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{warehouse.name}</h3>
                        <p className="text-sm text-gray-500">{warehouse.code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {warehouse.is_default && <Badge className="bg-blue-100 text-blue-800">Default</Badge>}
                        <Badge className={warehouse.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {warehouse.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{warehouse.city || 'No location'}, {warehouse.state}</span>
                      </div>
                      {warehouse.capacity && (
                        <div className="flex items-center gap-2">
                          <Box className="w-4 h-4" />
                          <span>Capacity: {warehouse.capacity}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-3 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => { setSelectedWarehouse(warehouse); fetchWarehouseStock(warehouse.id); }}
                      >
                        <Eye className="w-4 h-4 mr-1" /> Stock
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditWarehouse(warehouse)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteWarehouse(warehouse.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Stock Transfers Tab */}
        <TabsContent value="transfers">
          <Card>
            <CardContent className="p-0">
              {transfers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No stock transfers yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {transfers.map(transfer => (
                    <div key={transfer.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{transfer.reference || `Transfer #${transfer.id?.slice(0,8)}`}</span>
                          {getStatusBadge(transfer.status)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {warehouses.find(w => w.id === transfer.from_warehouse_id)?.name || 'Unknown'} 
                          <ArrowRightLeft className="w-4 h-4 inline mx-2" />
                          {warehouses.find(w => w.id === transfer.to_warehouse_id)?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {transfer.items?.length || 0} items • Created {new Date(transfer.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {transfer.status === 'pending' && (
                          <Button variant="outline" size="sm" onClick={() => shipTransfer(transfer.id)}>
                            Ship
                          </Button>
                        )}
                        {(transfer.status === 'shipped' || transfer.status === 'in_transit') && (
                          <Button variant="outline" size="sm" onClick={() => receiveTransfer(transfer.id)}>
                            Receive
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardContent className="p-0">
              {alerts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No inventory alerts</p>
                </div>
              ) : (
                <div className="divide-y">
                  {alerts.map(alert => (
                    <div key={alert.id} className={`p-4 hover:bg-gray-50 flex items-center justify-between ${alert.resolved ? 'opacity-50' : ''}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getAlertTypeBadge(alert.alert_type)}
                          {alert.resolved && <Badge className="bg-gray-100 text-gray-600">Resolved</Badge>}
                        </div>
                        <div className="font-medium">{alert.product_name || 'Product'}</div>
                        <div className="text-sm text-gray-500">{alert.message || `Stock: ${alert.current_stock}`}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {warehouses.find(w => w.id === alert.warehouse_id)?.name || 'All Warehouses'} • {new Date(alert.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {!alert.resolved && (
                        <Button variant="outline" size="sm" onClick={() => resolveAlert(alert.id)}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Resolve
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Warehouse Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Warehouse Name *</Label>
              <Input
                value={warehouseForm.name}
                onChange={(e) => setWarehouseForm({...warehouseForm, name: e.target.value})}
                placeholder="Main Warehouse"
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                value={warehouseForm.code}
                onChange={(e) => setWarehouseForm({...warehouseForm, code: e.target.value})}
                placeholder="WH-001"
              />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input
                value={warehouseForm.address}
                onChange={(e) => setWarehouseForm({...warehouseForm, address: e.target.value})}
                placeholder="123 Industrial Ave"
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={warehouseForm.city}
                onChange={(e) => setWarehouseForm({...warehouseForm, city: e.target.value})}
                placeholder="Sydney"
              />
            </div>
            <div>
              <Label>State</Label>
              <Input
                value={warehouseForm.state}
                onChange={(e) => setWarehouseForm({...warehouseForm, state: e.target.value})}
                placeholder="NSW"
              />
            </div>
            <div>
              <Label>Postal Code</Label>
              <Input
                value={warehouseForm.postal_code}
                onChange={(e) => setWarehouseForm({...warehouseForm, postal_code: e.target.value})}
                placeholder="2000"
              />
            </div>
            <div>
              <Label>Country</Label>
              <Input
                value={warehouseForm.country}
                onChange={(e) => setWarehouseForm({...warehouseForm, country: e.target.value})}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={warehouseForm.phone}
                onChange={(e) => setWarehouseForm({...warehouseForm, phone: e.target.value})}
                placeholder="+61 2 1234 5678"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={warehouseForm.email}
                onChange={(e) => setWarehouseForm({...warehouseForm, email: e.target.value})}
                placeholder="warehouse@store.com"
              />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input
                value={warehouseForm.capacity}
                onChange={(e) => setWarehouseForm({...warehouseForm, capacity: e.target.value})}
                placeholder="1000 units"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={warehouseForm.is_active}
                  onCheckedChange={(v) => setWarehouseForm({...warehouseForm, is_active: v})}
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={warehouseForm.is_default}
                  onCheckedChange={(v) => setWarehouseForm({...warehouseForm, is_default: v})}
                />
                <Label>Default</Label>
              </div>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={warehouseForm.notes}
                onChange={(e) => setWarehouseForm({...warehouseForm, notes: e.target.value})}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={saveWarehouse}>
              {editingWarehouse ? 'Update' : 'Create'} Warehouse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Transfer Modal */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Stock Transfer</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Warehouse *</Label>
                <Select 
                  value={transferForm.from_warehouse_id} 
                  onValueChange={(v) => setTransferForm({...transferForm, from_warehouse_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.is_active).map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Warehouse *</Label>
                <Select 
                  value={transferForm.to_warehouse_id} 
                  onValueChange={(v) => setTransferForm({...transferForm, to_warehouse_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.is_active && w.id !== transferForm.from_warehouse_id).map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Items to Transfer</Label>
              {transferItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Select 
                    value={item.product_id} 
                    onValueChange={(v) => {
                      const newItems = [...transferItems];
                      newItems[idx].product_id = v;
                      setTransferItems(newItems);
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...transferItems];
                      newItems[idx].quantity = parseInt(e.target.value) || 1;
                      setTransferItems(newItems);
                    }}
                    className="w-24"
                    placeholder="Qty"
                  />
                  {transferItems.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setTransferItems(transferItems.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setTransferItems([...transferItems, { product_id: '', quantity: 1 }])}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={transferForm.notes}
                onChange={(e) => setTransferForm({...transferForm, notes: e.target.value})}
                placeholder="Transfer notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>Cancel</Button>
            <Button 
              onClick={createTransfer}
              disabled={!transferForm.from_warehouse_id || !transferForm.to_warehouse_id || transferItems.every(i => !i.product_id)}
            >
              Create Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warehouse Stock View Modal */}
      <Dialog open={!!selectedWarehouse} onOpenChange={() => setSelectedWarehouse(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stock at {selectedWarehouse?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="divide-y">
            {warehouseStock.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No stock data available</div>
            ) : (
              warehouseStock.map(item => (
                <div key={item.product_id} className="py-3 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{item.product_name || 'Product'}</div>
                    <div className="text-sm text-gray-500">SKU: {item.sku || 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{item.quantity} units</div>
                    {item.quantity <= (item.low_stock_threshold || 10) && (
                      <Badge className="bg-orange-100 text-orange-800">Low Stock</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedWarehouse(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
