import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  MoreVertical,
  Eye,
  Package,
  Printer,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar,
  DollarSign,
  Mail,
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CreditCard,
  Building,
  MapPin,
  Phone,
  User,
  Hash,
  ShoppingBag,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const ordersPerPage = 20;
  
  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [newNote, setNewNote] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCarrier, setTrackingCarrier] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  // Statistics
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    todayOrders: 0,
    todayRevenue: 0
  });

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [statusFilter, paymentFilter, dateFilter, currentPage]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = `${API}/orders?limit=${ordersPerPage}&skip=${(currentPage - 1) * ordersPerPage}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (paymentFilter !== 'all') url += `&payment_status=${paymentFilter}`;
      const response = await axios.get(url);
      setOrders(response.data);
      // For pagination
      const countResponse = await axios.get(`${API}/orders/count${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`);
      setTotalOrders(countResponse.data?.count || response.data.length);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/orders/stats`);
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateOrderStatus = async (orderId, status, notify = false) => {
    try {
      await axios.patch(`${API}/orders/${orderId}/status?status=${status}&notify=${notify}`);
      fetchOrders();
      fetchStats();
      setShowStatusModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const addOrderNote = async () => {
    if (!selectedOrder || !newNote.trim()) return;
    try {
      await axios.post(`${API}/orders/${selectedOrder.id}/notes`, { note: newNote });
      setShowNoteModal(false);
      setNewNote('');
      fetchOrders();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const updateTracking = async () => {
    if (!selectedOrder) return;
    try {
      await axios.patch(`${API}/orders/${selectedOrder.id}/tracking`, {
        tracking_number: trackingNumber,
        carrier: trackingCarrier
      });
      setShowTrackingModal(false);
      setTrackingNumber('');
      setTrackingCarrier('');
      fetchOrders();
    } catch (error) {
      console.error('Error updating tracking:', error);
    }
  };

  const deleteOrder = async () => {
    if (!selectedOrder) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/orders/${selectedOrder.id}`);
      setShowDeleteModal(false);
      setSelectedOrder(null);
      fetchOrders();
      fetchStats();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert(error.response?.data?.detail || 'Failed to delete order');
    } finally {
      setDeleting(false);
    }
  };

  const exportOrders = async (format = 'csv') => {
    try {
      const response = await axios.get(`${API}/orders/export?format=${format}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting orders:', error);
    }
  };

  const bulkUpdateStatus = async (status) => {
    if (selectedOrders.length === 0) return;
    try {
      await Promise.all(selectedOrders.map(id => 
        axios.patch(`${API}/orders/${id}/status?status=${status}`)
      ));
      setSelectedOrders([]);
      fetchOrders();
    } catch (error) {
      console.error('Error bulk updating orders:', error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { icon: Clock, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Pending' },
      processing: { icon: Package, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Processing' },
      shipped: { icon: Truck, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Shipped' },
      delivered: { icon: CheckCircle, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Delivered' },
      cancelled: { icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Cancelled' },
      refunded: { icon: RefreshCw, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Refunded' }
    };
    return configs[status] || configs.pending;
  };

  const getPaymentStatusConfig = (status) => {
    const configs = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pending' },
      paid: { color: 'bg-emerald-500/20 text-emerald-400', label: 'Paid' },
      failed: { color: 'bg-red-500/20 text-red-400', label: 'Failed' },
      refunded: { color: 'bg-orange-500/20 text-orange-400', label: 'Refunded' }
    };
    return configs[status] || configs.pending;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const orderCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleAllOrders = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id));
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-white border-gray-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Total Orders</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.totalOrders || orders.length}</p>
                <p className="text-blue-600 text-xs mt-0.5 flex items-center gap-1">
                  <ArrowUpRight size={10} /> +{stats.todayOrders || 0} today
                </p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <ShoppingBag className="text-blue-600" size={18} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-emerald-600 text-xs mt-0.5 flex items-center gap-1">
                  <ArrowUpRight size={10} /> {formatCurrency(stats.todayRevenue)} today
                </p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <DollarSign className="text-emerald-600" size={18} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Pending Orders</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.pendingOrders || orderCounts.pending}</p>
                <p className="text-yellow-600 text-xs mt-0.5">Requires attention</p>
              </div>
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="text-yellow-600" size={18} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Avg Order Value</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{formatCurrency(stats.avgOrderValue)}</p>
                <p className="text-purple-600 text-xs mt-0.5 flex items-center gap-1">
                  <TrendingUp size={10} /> All time
                </p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <TrendingUp className="text-purple-600" size={18} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => {
          const config = status !== 'all' ? getStatusConfig(status) : null;
          return (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                statusFilter === status
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-50 text-gray-500 border border-gray-200 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {config && <config.icon size={12} />}
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="px-1 py-0.5 rounded bg-white text-xs">
                {orderCounts[status]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search, Filters, and Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search by order #, customer name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
            />
          </div>
          
          {/* Payment Status Filter */}
          <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-40 bg-gray-50 border-gray-200 text-gray-700">
              <CreditCard size={14} className="mr-2" />
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Date Filter */}
          <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-40 bg-gray-50 border-gray-200 text-gray-700">
              <Calendar size={14} className="mr-2" />
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Bulk Actions */}
        <div className="flex items-center gap-2">
          {selectedOrders.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-100">
                  Bulk Actions ({selectedOrders.length})
                  <ChevronDown size={14} className="ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border-gray-200">
                <DropdownMenuItem onClick={() => bulkUpdateStatus('processing')} className="text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 cursor-pointer">
                  <Package size={14} className="mr-2" /> Mark as Processing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkUpdateStatus('shipped')} className="text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 cursor-pointer">
                  <Truck size={14} className="mr-2" /> Mark as Shipped
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkUpdateStatus('delivered')} className="text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 cursor-pointer">
                  <CheckCircle size={14} className="mr-2" /> Mark as Delivered
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-200" />
                <DropdownMenuItem className="text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 cursor-pointer">
                  <Printer size={14} className="mr-2" /> Print Packing Slips
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 cursor-pointer">
                  <FileText size={14} className="mr-2" /> Print Invoices
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <Button onClick={() => fetchOrders()} variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-100">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-100">
                <Download size={16} className="mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border-gray-200">
              <DropdownMenuItem onClick={() => exportOrders('csv')} className="text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 cursor-pointer">
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportOrders('xlsx')} className="text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 cursor-pointer">
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportOrders('pdf')} className="text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 cursor-pointer">
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Orders Table */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="animate-spin mx-auto text-gray-500 mb-2" size={24} />
              <p className="text-gray-500">Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBag className="mx-auto text-gray-600 mb-3" size={48} />
              <p className="text-gray-500 font-medium">No orders found</p>
              <p className="text-gray-500 text-sm mt-1">Orders will appear here when customers place them</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="py-4 px-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                          onChange={toggleAllOrders}
                          className="rounded bg-white border-gray-300 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                        />
                      </th>
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">Order</th>
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">Customer</th>
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">Items</th>
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">Total</th>
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">Status</th>
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">Payment</th>
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">Date</th>
                      <th className="text-right py-4 px-4 text-gray-500 font-medium text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      const statusConfig = getStatusConfig(order.status);
                      const paymentConfig = getPaymentStatusConfig(order.payment_status);
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <tr 
                          key={order.id} 
                          className={`border-b border-gray-200/50 hover:bg-gray-50 transition-colors cursor-pointer ${
                            selectedOrders.includes(order.id) ? 'bg-emerald-500/5' : ''
                          }`}
                          onClick={() => navigate(`/merchant/orders/${order.id}`)}
                        >
                          <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedOrders.includes(order.id)}
                              onChange={() => toggleOrderSelection(order.id)}
                              className="rounded bg-white border-gray-300 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <span className="text-gray-900 font-medium">{order.order_number}</span>
                              {order.purchase_order && (
                                <p className="text-gray-500 text-xs mt-0.5">PO: {order.purchase_order}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <p className="text-gray-900 font-medium">{order.customer_name}</p>
                              <p className="text-gray-500 text-sm">{order.customer_email}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              {order.items?.slice(0, 2).map((item, idx) => (
                                <img 
                                  key={idx}
                                  src={item.image || 'https://via.placeholder.com/32'} 
                                  alt="" 
                                  className="w-8 h-8 rounded object-cover border border-gray-200"
                                />
                              ))}
                              {(order.items?.length || 0) > 2 && (
                                <span className="text-gray-500 text-xs">+{order.items.length - 2}</span>
                              )}
                              <span className="text-gray-500 text-sm ml-1">
                                {order.items?.reduce((sum, i) => sum + i.quantity, 0) || 0} items
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-gray-900 font-medium">{formatCurrency(order.total)}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                              <StatusIcon size={12} />
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${paymentConfig.color}`}>
                              {paymentConfig.label}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-500 text-sm">
                            {formatDate(order.created_at)}
                          </td>
                          <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors">
                                  <MoreVertical size={18} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white border-gray-200 w-56">
                                <DropdownMenuItem 
                                  className="text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 cursor-pointer"
                                  onClick={() => navigate(`/merchant/orders/${order.id}`)}
                                >
                                  <Eye size={14} className="mr-2" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-gray-200" />
                                <DropdownMenuItem 
                                  className="text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 cursor-pointer"
                                  onClick={() => { setSelectedOrder(order); setNewStatus(order.status); setShowStatusModal(true); }}
                                >
                                  <RefreshCw size={14} className="mr-2" /> Update Status
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 cursor-pointer"
                                  onClick={() => { setSelectedOrder(order); setShowTrackingModal(true); }}
                                >
                                  <Truck size={14} className="mr-2" /> Add Tracking
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 cursor-pointer"
                                  onClick={() => { setSelectedOrder(order); setShowNoteModal(true); }}
                                >
                                  <FileText size={14} className="mr-2" /> Add Note
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-gray-200" />
                                <DropdownMenuItem className="text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 cursor-pointer">
                                  <Mail size={14} className="mr-2" /> Email Customer
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 cursor-pointer">
                                  <Printer size={14} className="mr-2" /> Print Invoice
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 cursor-pointer">
                                  <FileText size={14} className="mr-2" /> Packing Slip
                                </DropdownMenuItem>
                                {order.status === 'cancelled' && (
                                  <>
                                    <DropdownMenuSeparator className="bg-gray-200" />
                                    <DropdownMenuItem 
                                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                                      onClick={() => { setSelectedOrder(order); setShowDeleteModal(true); }}
                                    >
                                      <Trash2 size={14} className="mr-2" /> Delete Order
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <p className="text-gray-500 text-sm">
                  Showing {((currentPage - 1) * ordersPerPage) + 1} - {Math.min(currentPage * ordersPerPage, totalOrders)} of {totalOrders} orders
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <span className="text-gray-500 text-sm px-2">
                    Page {currentPage} of {Math.ceil(totalOrders / ordersPerPage) || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage >= Math.ceil(totalOrders / ordersPerPage)}
                    className="border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Update Status Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-gray-500 block mb-2">Order: {selectedOrder?.order_number}</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="notify" className="rounded bg-white border-gray-300" />
              <label htmlFor="notify" className="text-sm text-gray-500">Notify customer via email</label>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowStatusModal(false)} className="border-gray-200 text-gray-700">
              Cancel
            </Button>
            <Button onClick={() => updateOrderStatus(selectedOrder?.id, newStatus)} className="bg-emerald-600 hover:bg-emerald-700">
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Modal */}
      <Dialog open={showNoteModal} onOpenChange={setShowNoteModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle>Add Order Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-gray-500 block mb-2">Order: {selectedOrder?.order_number}</label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter note..."
                rows={4}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowNoteModal(false)} className="border-gray-200 text-gray-700">
              Cancel
            </Button>
            <Button onClick={addOrderNote} className="bg-emerald-600 hover:bg-emerald-700">
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Tracking Modal */}
      <Dialog open={showTrackingModal} onOpenChange={setShowTrackingModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle>Add Tracking Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-gray-500 block mb-2">Order: {selectedOrder?.order_number}</label>
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-2">Carrier</label>
              <Select value={trackingCarrier} onValueChange={setTrackingCarrier}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900">
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="auspost">Australia Post</SelectItem>
                  <SelectItem value="startrack">StarTrack</SelectItem>
                  <SelectItem value="tnt">TNT</SelectItem>
                  <SelectItem value="dhl">DHL</SelectItem>
                  <SelectItem value="fedex">FedEx</SelectItem>
                  <SelectItem value="aramex">Aramex</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-2">Tracking Number</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="notifyTracking" className="rounded bg-white border-gray-300" defaultChecked />
              <label htmlFor="notifyTracking" className="text-sm text-gray-500">Send tracking email to customer</label>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowTrackingModal(false)} className="border-gray-200 text-gray-700">
              Cancel
            </Button>
            <Button onClick={updateTracking} className="bg-emerald-600 hover:bg-emerald-700">
              Save Tracking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Order Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 size={20} />
              Delete Order
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
              <p className="text-red-400 text-sm">
                <strong>Warning:</strong> This action cannot be undone. The order and all its data will be permanently deleted.
              </p>
            </div>
            {selectedOrder && (
              <div className="space-y-2 text-sm">
                <p className="text-gray-500">
                  Order: <span className="text-gray-900 font-medium">{selectedOrder.order_number}</span>
                </p>
                <p className="text-gray-500">
                  Customer: <span className="text-gray-900">{selectedOrder.customer_name}</span>
                </p>
                <p className="text-gray-500">
                  Total: <span className="text-gray-900">${selectedOrder.total?.toFixed(2)}</span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => { setShowDeleteModal(false); setSelectedOrder(null); }} 
              className="border-gray-200 text-gray-700"
            >
              Cancel
            </Button>
            <Button 
              onClick={deleteOrder} 
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-gray-900"
            >
              {deleting ? 'Deleting...' : 'Delete Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantOrders;
