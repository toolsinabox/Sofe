import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Mail,
  Printer,
  FileText,
  Edit,
  MoreVertical,
  User,
  Phone,
  MapPin,
  Building,
  CreditCard,
  Calendar,
  Hash,
  DollarSign,
  MessageSquare,
  Plus,
  ExternalLink,
  Copy,
  AlertCircle,
  ChevronDown,
  Send,
  Download,
  History,
  Tag,
  Percent,
  ShoppingBag
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantOrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  
  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  // Form states
  const [newStatus, setNewStatus] = useState('');
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('internal');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCarrier, setTrackingCarrier] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  // Activity/Timeline data
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
      fetchTimeline();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/orders/${orderId}`);
      setOrder(response.data);
      setNewStatus(response.data.status);
      if (response.data.tracking_number) {
        setTrackingNumber(response.data.tracking_number);
        setTrackingCarrier(response.data.tracking_carrier || '');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const response = await axios.get(`${API}/orders/${orderId}/timeline`);
      setTimeline(response.data || []);
    } catch (error) {
      console.error('Error fetching timeline:', error);
      // Set default timeline
      setTimeline([]);
    }
  };

  const updateOrderStatus = async (notify = false) => {
    try {
      await axios.patch(`${API}/orders/${orderId}/status?status=${newStatus}&notify=${notify}`);
      fetchOrder();
      fetchTimeline();
      setShowStatusModal(false);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const addOrderNote = async () => {
    if (!newNote.trim()) return;
    try {
      await axios.post(`${API}/orders/${orderId}/notes`, {
        note: newNote,
        type: noteType,
        notify_customer: noteType === 'customer'
      });
      setShowNoteModal(false);
      setNewNote('');
      fetchOrder();
      fetchTimeline();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const updateTracking = async () => {
    try {
      await axios.patch(`${API}/orders/${orderId}/tracking`, {
        tracking_number: trackingNumber,
        carrier: trackingCarrier,
        notify_customer: true
      });
      // Also update status to shipped if not already
      if (order.status === 'processing' || order.status === 'pending') {
        await axios.patch(`${API}/orders/${orderId}/status?status=shipped`);
      }
      setShowTrackingModal(false);
      fetchOrder();
      fetchTimeline();
    } catch (error) {
      console.error('Error updating tracking:', error);
    }
  };

  const processRefund = async () => {
    try {
      await axios.post(`${API}/orders/${orderId}/refund`, {
        amount: parseFloat(refundAmount),
        reason: refundReason
      });
      setShowRefundModal(false);
      setRefundAmount('');
      setRefundReason('');
      fetchOrder();
      fetchTimeline();
    } catch (error) {
      console.error('Error processing refund:', error);
    }
  };

  const sendEmail = async () => {
    try {
      await axios.post(`${API}/orders/${orderId}/email`, {
        template: emailTemplate,
        subject: emailSubject,
        body: emailBody
      });
      setShowEmailModal(false);
      setEmailSubject('');
      setEmailBody('');
      fetchTimeline();
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  const printInvoice = () => {
    window.open(`${API}/orders/${orderId}/invoice?print=true`, '_blank');
  };

  const printPackingSlip = () => {
    window.open(`${API}/orders/${orderId}/packing-slip?print=true`, '_blank');
  };

  const downloadInvoice = async () => {
    try {
      const response = await axios.get(`${API}/orders/${orderId}/invoice/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${order.order_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading invoice:', error);
    }
  };

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(order.order_number);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  const formatDate = (dateString, includeTime = true) => {
    if (!dateString) return 'N/A';
    const options = {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return new Date(dateString).toLocaleDateString('en-AU', options);
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { icon: Clock, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Pending', bgColor: 'bg-yellow-500' },
      processing: { icon: Package, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Processing', bgColor: 'bg-blue-500' },
      shipped: { icon: Truck, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Shipped', bgColor: 'bg-purple-500' },
      delivered: { icon: CheckCircle, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Delivered', bgColor: 'bg-emerald-500' },
      cancelled: { icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Cancelled', bgColor: 'bg-red-500' },
      refunded: { icon: RefreshCw, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Refunded', bgColor: 'bg-orange-500' }
    };
    return configs[status] || configs.pending;
  };

  const getPaymentStatusConfig = (status) => {
    const configs = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pending' },
      paid: { color: 'bg-emerald-500/20 text-emerald-400', label: 'Paid' },
      failed: { color: 'bg-red-500/20 text-red-400', label: 'Failed' },
      refunded: { color: 'bg-orange-500/20 text-orange-400', label: 'Refunded' },
      partial_refund: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Partial Refund' }
    };
    return configs[status] || configs.pending;
  };

  const getPaymentMethodLabel = (method) => {
    const methods = {
      card: 'Credit Card',
      bank_transfer: 'Bank Transfer',
      pay_later: 'Pay on Invoice',
      paypal: 'PayPal',
      afterpay: 'Afterpay',
      quote: 'Quote Conversion'
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-gray-500\" size={32} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto text-red-400 mb-4\" size={48} />
        <h2 className="text-xl font-semibold text-white mb-2">Order Not Found</h2>
        <p className="text-gray-400 mb-4">The order you're looking for doesn't exist or has been deleted.</p>
        <Button onClick={() => navigate('/merchant/orders')} className="bg-emerald-600 hover:bg-emerald-700">
          Back to Orders
        </Button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const paymentConfig = getPaymentStatusConfig(order.payment_status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/merchant/orders')}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <ArrowLeft size={18} className="mr-1" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{order.order_number}</h1>
              <button onClick={copyOrderNumber} className="text-gray-400 hover:text-white">
                <Copy size={16} />
              </button>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
                <StatusIcon size={14} />
                {statusConfig.label}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${paymentConfig.color}`}>
                {paymentConfig.label}
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Placed on {formatDate(order.created_at)} • Last updated {formatDate(order.updated_at)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowEmailModal(true)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <Mail size={16} className="mr-2" />
            Email
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                <Printer size={16} className="mr-2" />
                Print
                <ChevronDown size={14} className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1a1f2e] border-gray-700">
              <DropdownMenuItem onClick={printInvoice} className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer">
                <FileText size={14} className="mr-2" /> Print Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={printPackingSlip} className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer">
                <Package size={14} className="mr-2" /> Print Packing Slip
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadInvoice} className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer">
                <Download size={14} className="mr-2" /> Download PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                Actions
                <ChevronDown size={14} className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1a1f2e] border-gray-700 w-56">
              <DropdownMenuItem onClick={() => setShowStatusModal(true)} className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer">
                <RefreshCw size={14} className="mr-2" /> Update Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowTrackingModal(true)} className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer">
                <Truck size={14} className="mr-2" /> {order.tracking_number ? 'Update' : 'Add'} Tracking
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowNoteModal(true)} className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer">
                <MessageSquare size={14} className="mr-2" /> Add Note
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-700" />
              {order.payment_status === 'paid' && (
                <DropdownMenuItem onClick={() => setShowRefundModal(true)} className="text-orange-400 hover:text-orange-300 hover:bg-gray-700/50 cursor-pointer">
                  <RefreshCw size={14} className="mr-2" /> Process Refund
                </DropdownMenuItem>
              )}
              {order.status !== 'cancelled' && (
                <DropdownMenuItem 
                  onClick={() => { setNewStatus('cancelled'); setShowStatusModal(true); }} 
                  className="text-red-400 hover:text-red-300 hover:bg-gray-700/50 cursor-pointer"
                >
                  <XCircle size={14} className="mr-2" /> Cancel Order
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status Progress Bar */}
      <Card className="bg-[#151b28] border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {['pending', 'processing', 'shipped', 'delivered'].map((step, index, arr) => {
              const stepConfig = getStatusConfig(step);
              const StepIcon = stepConfig.icon;
              const isActive = arr.indexOf(order.status) >= index || order.status === step;
              const isCurrent = order.status === step;
              
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isActive ? stepConfig.bgColor : 'bg-gray-700'
                    } ${isCurrent ? 'ring-4 ring-offset-2 ring-offset-[#151b28] ring-emerald-500/30' : ''}`}>
                      <StepIcon className="text-white" size={20} />
                    </div>
                    <span className={`text-sm mt-2 ${isActive ? 'text-white' : 'text-gray-500'}`}>
                      {stepConfig.label}
                    </span>
                  </div>
                  {index < arr.length - 1 && (
                    <div className={`flex-1 h-1 mx-4 rounded ${
                      arr.indexOf(order.status) > index ? 'bg-emerald-500' : 'bg-gray-700'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card className="bg-[#151b28] border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white flex items-center gap-2">
                <ShoppingBag size={20} />
                Order Items ({order.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-800">
                {order.items?.map((item, index) => (
                  <div key={index} className="p-4 flex items-center gap-4">
                    <img 
                      src={item.image || 'https://via.placeholder.com/80'} 
                      alt={item.product_name}
                      className="w-20 h-20 rounded-lg object-cover border border-gray-700"
                    />
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{item.product_name}</h4>
                      <p className="text-gray-400 text-sm">SKU: {item.sku || item.product_id}</p>
                      {item.variant && (
                        <p className="text-gray-500 text-sm">{item.variant}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">{formatCurrency(item.price)}</p>
                      <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className="text-white font-bold">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Order Totals */}
              <div className="border-t border-gray-800 p-4 bg-gray-800/30">
                <div className="space-y-2 max-w-xs ml-auto">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Percent size={14} />
                        Discount
                      </span>
                      <span>-{formatCurrency(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-400">
                    <span>Shipping</span>
                    <span>{order.shipping > 0 ? formatCurrency(order.shipping) : 'FREE'}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>GST (10%)</span>
                    <span>{formatCurrency(order.tax)}</span>
                  </div>
                  <div className="flex justify-between text-white text-lg font-bold pt-2 border-t border-gray-700">
                    <span>Total</span>
                    <span>{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping & Tracking */}
          {order.tracking_number && (
            <Card className="bg-[#151b28] border-gray-800">
              <CardHeader className="border-b border-gray-800">
                <CardTitle className="text-white flex items-center gap-2">
                  <Truck size={20} />
                  Shipping & Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div>
                    <p className="text-gray-400 text-sm">Carrier</p>
                    <p className="text-white font-medium capitalize">{order.tracking_carrier || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Tracking Number</p>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-mono">{order.tracking_number}</p>
                      <button 
                        onClick={() => navigator.clipboard.writeText(order.tracking_number)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                    <ExternalLink size={14} className="mr-2" />
                    Track Package
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Notes */}
          <Card className="bg-[#151b28] border-gray-800">
            <CardHeader className="border-b border-gray-800 flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare size={20} />
                Notes & Comments
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowNoteModal(true)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <Plus size={14} className="mr-1" />
                Add Note
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {order.notes ? (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">Customer Note</span>
                      <span className="text-gray-500 text-xs">{formatDate(order.created_at)}</span>
                    </div>
                    <p className="text-gray-300 text-sm">{order.notes}</p>
                  </div>
                  {order.internal_notes?.map((note, idx) => (
                    <div key={idx} className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">Internal</span>
                        <span className="text-gray-500 text-xs">{formatDate(note.created_at)}</span>
                        <span className="text-gray-500 text-xs">by {note.author}</span>
                      </div>
                      <p className="text-gray-300 text-sm">{note.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No notes yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Customer & Payment Info */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card className="bg-[#151b28] border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white flex items-center gap-2">
                <User size={20} />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                  {order.customer_name?.charAt(0) || 'C'}
                </div>
                <div>
                  <p className="text-white font-medium">{order.customer_name}</p>
                  <Link to={`/merchant/customers?email=${order.customer_email}`} className="text-emerald-400 text-sm hover:underline">
                    View Customer
                  </Link>
                </div>
              </div>
              
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-gray-300">
                  <Mail size={16} className="text-gray-500" />
                  <a href={`mailto:${order.customer_email}`} className="hover:text-emerald-400">{order.customer_email}</a>
                </div>
                {order.customer_phone && (
                  <div className="flex items-center gap-3 text-gray-300">
                    <Phone size={16} className="text-gray-500" />
                    <a href={`tel:${order.customer_phone}`} className="hover:text-emerald-400">{order.customer_phone}</a>
                  </div>
                )}
                {order.company_name && (
                  <div className="flex items-center gap-3 text-gray-300">
                    <Building size={16} className="text-gray-500" />
                    <span>{order.company_name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card className="bg-[#151b28] border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white flex items-center gap-2">
                <MapPin size={20} />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-gray-300 whitespace-pre-line">{order.shipping_address}</p>
            </CardContent>
          </Card>

          {/* Billing Address */}
          {order.billing_address && order.billing_address !== order.shipping_address && (
            <Card className="bg-[#151b28] border-gray-800">
              <CardHeader className="border-b border-gray-800">
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard size={20} />
                  Billing Address
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-gray-300 whitespace-pre-line">{order.billing_address}</p>
              </CardContent>
            </Card>
          )}

          {/* Payment Information */}
          <Card className="bg-[#151b28] border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign size={20} />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Method</span>
                <span className="text-white">{getPaymentMethodLabel(order.payment_method)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Status</span>
                <span className={`px-2 py-0.5 rounded text-sm ${paymentConfig.color}`}>
                  {paymentConfig.label}
                </span>
              </div>
              {order.payment_intent_id && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Transaction ID</span>
                  <span className="text-white font-mono text-sm">{order.payment_intent_id.slice(-8)}</span>
                </div>
              )}
              {order.purchase_order && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">PO Number</span>
                  <span className="text-white">{order.purchase_order}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                <span className="text-white font-medium">Total Paid</span>
                <span className="text-white font-bold text-lg">{formatCurrency(order.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="bg-[#151b28] border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white flex items-center gap-2">
                <History size={20} />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Order Created */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Plus className="text-emerald-400" size={14} />
                  </div>
                  <div>
                    <p className="text-white text-sm">Order Created</p>
                    <p className="text-gray-500 text-xs">{formatDate(order.created_at)}</p>
                  </div>
                </div>
                
                {/* Payment */}
                {order.payment_status === 'paid' && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="text-emerald-400" size={14} />
                    </div>
                    <div>
                      <p className="text-white text-sm">Payment Received</p>
                      <p className="text-gray-500 text-xs">{formatCurrency(order.total)} via {getPaymentMethodLabel(order.payment_method)}</p>
                    </div>
                  </div>
                )}
                
                {/* Tracking Added */}
                {order.tracking_number && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Truck className="text-purple-400" size={14} />
                    </div>
                    <div>
                      <p className="text-white text-sm">Tracking Added</p>
                      <p className="text-gray-500 text-xs">{order.tracking_carrier} - {order.tracking_number}</p>
                    </div>
                  </div>
                )}
                
                {/* Timeline events from API */}
                {timeline.map((event, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Clock className="text-blue-400" size={14} />
                    </div>
                    <div>
                      <p className="text-white text-sm">{event.description}</p>
                      <p className="text-gray-500 text-xs">{formatDate(event.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Update Status Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">New Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-gray-700">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="notifyStatus" className="rounded bg-gray-700 border-gray-600" defaultChecked />
              <label htmlFor="notifyStatus" className="text-sm text-gray-400">Send status update email to customer</label>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowStatusModal(false)} className="border-gray-700 text-gray-300">
              Cancel
            </Button>
            <Button onClick={() => updateOrderStatus(true)} className="bg-emerald-600 hover:bg-emerald-700">
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Modal */}
      <Dialog open={showNoteModal} onOpenChange={setShowNoteModal}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Add Order Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Note Type</label>
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-gray-700">
                  <SelectItem value="internal">Internal Note (staff only)</SelectItem>
                  <SelectItem value="customer">Customer Note (visible to customer)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Note</label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter note..."
                rows={4}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowNoteModal(false)} className="border-gray-700 text-gray-300">
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
        <DialogContent className="bg-[#151b28] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>{order.tracking_number ? 'Update' : 'Add'} Tracking Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Shipping Carrier</label>
              <Select value={trackingCarrier} onValueChange={setTrackingCarrier}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-gray-700">
                  <SelectItem value="auspost">Australia Post</SelectItem>
                  <SelectItem value="startrack">StarTrack</SelectItem>
                  <SelectItem value="tnt">TNT</SelectItem>
                  <SelectItem value="dhl">DHL</SelectItem>
                  <SelectItem value="fedex">FedEx</SelectItem>
                  <SelectItem value="ups">UPS</SelectItem>
                  <SelectItem value="aramex">Aramex</SelectItem>
                  <SelectItem value="sendle">Sendle</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Tracking Number</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="notifyTracking" className="rounded bg-gray-700 border-gray-600" defaultChecked />
              <label htmlFor="notifyTracking" className="text-sm text-gray-400">Send tracking email to customer</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="markShipped" className="rounded bg-gray-700 border-gray-600" defaultChecked />
              <label htmlFor="markShipped" className="text-sm text-gray-400">Mark order as shipped</label>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowTrackingModal(false)} className="border-gray-700 text-gray-300">
              Cancel
            </Button>
            <Button onClick={updateTracking} className="bg-emerald-600 hover:bg-emerald-700">
              Save Tracking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Modal */}
      <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-orange-400 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                This action cannot be undone. Please verify the refund amount.
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Order Total: {formatCurrency(order.total)}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="0.00"
                  max={order.total}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-8 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <button 
                onClick={() => setRefundAmount(order.total.toString())}
                className="text-emerald-400 text-sm mt-1 hover:underline"
              >
                Full refund
              </button>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Reason for Refund</label>
              <Select value={refundReason} onValueChange={setRefundReason}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-gray-700">
                  <SelectItem value="customer_request">Customer Request</SelectItem>
                  <SelectItem value="damaged">Damaged Product</SelectItem>
                  <SelectItem value="wrong_item">Wrong Item Sent</SelectItem>
                  <SelectItem value="not_received">Not Received</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="notifyRefund" className="rounded bg-gray-700 border-gray-600" defaultChecked />
              <label htmlFor="notifyRefund" className="text-sm text-gray-400">Notify customer about refund</label>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowRefundModal(false)} className="border-gray-700 text-gray-300">
              Cancel
            </Button>
            <Button onClick={processRefund} className="bg-orange-600 hover:bg-orange-700">
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Email to Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Email Template</label>
              <Select value={emailTemplate} onValueChange={setEmailTemplate}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Select template or write custom" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-gray-700">
                  <SelectItem value="order_confirmation">Order Confirmation</SelectItem>
                  <SelectItem value="shipping_update">Shipping Update</SelectItem>
                  <SelectItem value="delivery_confirmation">Delivery Confirmation</SelectItem>
                  <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
                  <SelectItem value="custom">Custom Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">To: {order.customer_email}</label>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Message</label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Email message..."
                rows={6}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowEmailModal(false)} className="border-gray-700 text-gray-300">
              Cancel
            </Button>
            <Button onClick={sendEmail} className="bg-emerald-600 hover:bg-emerald-700">
              <Send size={14} className="mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantOrderDetail;
