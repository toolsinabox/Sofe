import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Package, Truck, CheckCircle, XCircle, Clock, RefreshCw, Mail, Printer, FileText,
  Edit, Edit3, User, Phone, MapPin, Building, CreditCard, Calendar, DollarSign, MessageSquare,
  Plus, Copy, AlertCircle, ChevronDown, Send, Download, History, ShoppingBag, Save, X, Check,
  ExternalLink, Trash2, MoreVertical, Box, PackageCheck, ClipboardList, Barcode, Scale, Hash,
  Receipt, Eye, Undo2, ChevronRight, AlertTriangle, Info, Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Carrier configurations with tracking URL patterns
const CARRIERS = [
  { id: 'auspost', name: 'Australia Post', trackingUrl: 'https://auspost.com.au/mypost/track/#/details/' },
  { id: 'startrack', name: 'StarTrack', trackingUrl: 'https://startrack.com.au/track/' },
  { id: 'tnt', name: 'TNT', trackingUrl: 'https://www.tnt.com/express/en_au/site/tracking.html?searchType=con&cons=' },
  { id: 'dhl', name: 'DHL', trackingUrl: 'https://www.dhl.com/au-en/home/tracking/tracking-express.html?submit=1&tracking-id=' },
  { id: 'fedex', name: 'FedEx', trackingUrl: 'https://www.fedex.com/fedextrack/?trknbr=' },
  { id: 'ups', name: 'UPS', trackingUrl: 'https://www.ups.com/track?tracknum=' },
  { id: 'aramex', name: 'Aramex', trackingUrl: 'https://www.aramex.com/track/results?ShipmentNumber=' },
  { id: 'sendle', name: 'Sendle', trackingUrl: 'https://track.sendle.com/tracking?ref=' },
  { id: 'couriers_please', name: 'Couriers Please', trackingUrl: 'https://www.couriersplease.com.au/tools-track/no/' },
  { id: 'toll', name: 'Toll', trackingUrl: 'https://www.mytoll.com/?trackingId=' },
  { id: 'hunter', name: 'Hunter Express', trackingUrl: 'https://www.hunterexpress.com.au/tracking/' },
  { id: 'other', name: 'Other', trackingUrl: '' }
];

const MerchantOrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  
  // Edit mode states
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [isEditingBilling, setIsEditingBilling] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  
  // Edited data
  const [editedItems, setEditedItems] = useState([]);
  const [editedShipping, setEditedShipping] = useState({});
  const [editedBilling, setEditedBilling] = useState({});
  const [editedCustomer, setEditedCustomer] = useState({});
  const [editedDiscount, setEditedDiscount] = useState(0);
  const [editedShippingCost, setEditedShippingCost] = useState(0);
  
  // Modal states
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  
  // Fulfillment states
  const [fulfillmentStep, setFulfillmentStep] = useState('pick'); // pick, pack, dispatch
  const [pickedItems, setPickedItems] = useState([]);
  const [packedItems, setPackedItems] = useState([]);
  const [packageWeight, setPackageWeight] = useState('');
  const [packageDimensions, setPackageDimensions] = useState({ length: '', width: '', height: '' });
  
  // Tracking states
  const [trackingCarrier, setTrackingCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [notifyCustomerTracking, setNotifyCustomerTracking] = useState(true);
  
  // Email states
  const [emailTemplate, setEmailTemplate] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailHistory, setEmailHistory] = useState([]);
  
  // Note states
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('internal');
  
  // Refund states
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundItems, setRefundItems] = useState([]);
  const [restockItems, setRestockItems] = useState(true);
  
  // Product search for adding items
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Timeline
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
      fetchTimeline();
      fetchEmailHistory();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/orders/${orderId}`);
      const orderData = response.data;
      setOrder(orderData);
      setEditedItems(orderData.items || []);
      setEditedDiscount(orderData.discount || 0);
      setEditedShippingCost(orderData.shipping || 0);
      setEditedShipping({
        address: orderData.shipping_address || '',
        city: orderData.shipping_city || '',
        state: orderData.shipping_state || '',
        postcode: orderData.shipping_postcode || '',
        country: orderData.shipping_country || 'AU'
      });
      setEditedBilling({
        address: orderData.billing_address || '',
        city: orderData.billing_city || '',
        state: orderData.billing_state || '',
        postcode: orderData.billing_postcode || '',
        country: orderData.billing_country || 'AU'
      });
      setEditedCustomer({
        name: orderData.customer_name || '',
        email: orderData.customer_email || '',
        phone: orderData.customer_phone || '',
        company: orderData.company_name || ''
      });
      if (orderData.tracking_number) {
        setTrackingNumber(orderData.tracking_number);
        setTrackingCarrier(orderData.tracking_carrier || '');
      }
      // Initialize picked/packed items based on fulfillment status
      if (orderData.fulfillment_status === 'picked' || orderData.fulfillment_status === 'packed' || orderData.fulfillment_status === 'dispatched') {
        setPickedItems(orderData.items?.map(i => i.product_id) || []);
      }
      if (orderData.fulfillment_status === 'packed' || orderData.fulfillment_status === 'dispatched') {
        setPackedItems(orderData.items?.map(i => i.product_id) || []);
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
      setTimeline([]);
    }
  };

  const fetchEmailHistory = async () => {
    try {
      const response = await axios.get(`${API}/orders/${orderId}/emails`);
      setEmailHistory(response.data || []);
    } catch (error) {
      setEmailHistory([]);
    }
  };

  const searchProducts = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await axios.get(`${API}/products?search=${query}&limit=10`);
      setSearchResults(response.data || []);
    } catch (error) {
      setSearchResults([]);
    }
  };

  // Save functions
  const saveOrderItems = async () => {
    setSaving(true);
    try {
      const subtotal = editedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const tax = (subtotal - editedDiscount + editedShippingCost) * 0.1;
      const total = subtotal - editedDiscount + editedShippingCost + tax;
      
      await axios.patch(`${API}/orders/${orderId}`, {
        items: editedItems,
        subtotal,
        discount: editedDiscount,
        shipping: editedShippingCost,
        tax,
        total
      });
      setIsEditingItems(false);
      fetchOrder();
      fetchTimeline();
    } catch (error) {
      console.error('Error saving items:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveCustomerInfo = async () => {
    setSaving(true);
    try {
      await axios.patch(`${API}/orders/${orderId}`, {
        customer_name: editedCustomer.name,
        customer_email: editedCustomer.email,
        customer_phone: editedCustomer.phone,
        company_name: editedCustomer.company
      });
      setIsEditingCustomer(false);
      fetchOrder();
    } catch (error) {
      console.error('Error saving customer:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveShippingAddress = async () => {
    setSaving(true);
    try {
      const address = `${editedShipping.address}\n${editedShipping.city}, ${editedShipping.state} ${editedShipping.postcode}\n${editedShipping.country}`;
      await axios.patch(`${API}/orders/${orderId}`, {
        shipping_address: address,
        shipping_city: editedShipping.city,
        shipping_state: editedShipping.state,
        shipping_postcode: editedShipping.postcode,
        shipping_country: editedShipping.country
      });
      setIsEditingShipping(false);
      fetchOrder();
    } catch (error) {
      console.error('Error saving shipping:', error);
    } finally {
      setSaving(false);
    }
  };

  // Fulfillment functions
  const handlePickItem = (productId) => {
    setPickedItems(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handlePackItem = (productId) => {
    setPackedItems(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const completePicking = async () => {
    try {
      await axios.patch(`${API}/orders/${orderId}/fulfillment`, {
        status: 'picked',
        picked_items: pickedItems,
        picked_at: new Date().toISOString()
      });
      setFulfillmentStep('pack');
      fetchOrder();
      fetchTimeline();
    } catch (error) {
      console.error('Error completing picking:', error);
    }
  };

  const completePacking = async () => {
    try {
      await axios.patch(`${API}/orders/${orderId}/fulfillment`, {
        status: 'packed',
        packed_items: packedItems,
        package_weight: packageWeight,
        package_dimensions: packageDimensions,
        packed_at: new Date().toISOString()
      });
      setFulfillmentStep('dispatch');
      fetchOrder();
      fetchTimeline();
    } catch (error) {
      console.error('Error completing packing:', error);
    }
  };

  const completeDispatch = async () => {
    if (!trackingCarrier || !trackingNumber) {
      alert('Please select a carrier and enter tracking number');
      return;
    }
    try {
      const carrier = CARRIERS.find(c => c.id === trackingCarrier);
      const url = carrier?.trackingUrl ? carrier.trackingUrl + trackingNumber : trackingUrl;
      
      await axios.patch(`${API}/orders/${orderId}/fulfillment`, {
        status: 'dispatched',
        tracking_carrier: trackingCarrier,
        tracking_number: trackingNumber,
        tracking_url: url,
        dispatched_at: new Date().toISOString()
      });
      
      // Also update order status to shipped
      await axios.patch(`${API}/orders/${orderId}/status?status=shipped&notify=${notifyCustomerTracking}`);
      
      setShowFulfillmentModal(false);
      fetchOrder();
      fetchTimeline();
    } catch (error) {
      console.error('Error completing dispatch:', error);
    }
  };

  // Quick status update
  const updateStatus = async (status) => {
    try {
      await axios.patch(`${API}/orders/${orderId}/status?status=${status}&notify=true`);
      fetchOrder();
      fetchTimeline();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Add tracking separately
  const saveTracking = async () => {
    try {
      const carrier = CARRIERS.find(c => c.id === trackingCarrier);
      const url = carrier?.trackingUrl ? carrier.trackingUrl + trackingNumber : trackingUrl;
      
      await axios.patch(`${API}/orders/${orderId}/tracking`, {
        tracking_carrier: trackingCarrier,
        tracking_number: trackingNumber,
        tracking_url: url,
        notify_customer: notifyCustomerTracking
      });
      
      setShowTrackingModal(false);
      fetchOrder();
      fetchTimeline();
    } catch (error) {
      console.error('Error saving tracking:', error);
    }
  };

  // Email functions
  const loadEmailTemplate = (template) => {
    setEmailTemplate(template);
    const templates = {
      order_confirmation: {
        subject: `Order Confirmation - ${order?.order_number}`,
        body: `Dear ${order?.customer_name},\n\nThank you for your order!\n\nYour order ${order?.order_number} has been confirmed and is being processed.\n\nOrder Total: $${order?.total?.toFixed(2)}\n\nWe will notify you when your order ships.\n\nThank you for shopping with us!`
      },
      shipping_notification: {
        subject: `Your Order Has Shipped - ${order?.order_number}`,
        body: `Dear ${order?.customer_name},\n\nGreat news! Your order ${order?.order_number} has been shipped.\n\nTracking Number: ${order?.tracking_number || '[Tracking Number]'}\nCarrier: ${CARRIERS.find(c => c.id === order?.tracking_carrier)?.name || '[Carrier]'}\n\nTrack your package: ${order?.tracking_url || '[Tracking URL]'}\n\nThank you for shopping with us!`
      },
      delivery_confirmation: {
        subject: `Your Order Has Been Delivered - ${order?.order_number}`,
        body: `Dear ${order?.customer_name},\n\nYour order ${order?.order_number} has been delivered!\n\nWe hope you love your purchase. If you have any questions, please don't hesitate to contact us.\n\nThank you for shopping with us!`
      },
      payment_reminder: {
        subject: `Payment Reminder - ${order?.order_number}`,
        body: `Dear ${order?.customer_name},\n\nThis is a friendly reminder that payment for order ${order?.order_number} is still pending.\n\nOrder Total: $${order?.total?.toFixed(2)}\n\nPlease complete your payment at your earliest convenience.\n\nIf you have already made payment, please disregard this message.`
      },
      custom: { subject: '', body: '' }
    };
    setEmailSubject(templates[template]?.subject || '');
    setEmailBody(templates[template]?.body || '');
  };

  const sendEmail = async () => {
    try {
      await axios.post(`${API}/orders/${orderId}/email`, {
        template: emailTemplate,
        subject: emailSubject,
        body: emailBody,
        to: order?.customer_email
      });
      setShowEmailModal(false);
      fetchEmailHistory();
      fetchTimeline();
      alert('Email sent successfully!');
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  // Note functions
  const addNote = async () => {
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

  // Refund functions
  const processRefund = async () => {
    try {
      await axios.post(`${API}/orders/${orderId}/refund`, {
        amount: parseFloat(refundAmount),
        reason: refundReason,
        items: refundItems,
        restock: restockItems
      });
      setShowRefundModal(false);
      fetchOrder();
      fetchTimeline();
    } catch (error) {
      console.error('Error processing refund:', error);
    }
  };

  // Cancel order
  const cancelOrder = async () => {
    try {
      await axios.patch(`${API}/orders/${orderId}/status?status=cancelled&notify=true`);
      setShowCancelDialog(false);
      fetchOrder();
      fetchTimeline();
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  };

  // Item editing functions
  const updateItemPrice = (index, price) => {
    const updated = [...editedItems];
    updated[index].price = parseFloat(price) || 0;
    setEditedItems(updated);
  };

  const updateItemQuantity = (index, qty) => {
    const updated = [...editedItems];
    updated[index].quantity = parseInt(qty) || 1;
    setEditedItems(updated);
  };

  const removeItem = (index) => {
    setEditedItems(editedItems.filter((_, i) => i !== index));
  };

  const addItemToOrder = (product) => {
    const newItem = {
      product_id: product.id,
      product_name: product.name,
      sku: product.sku || product.id,
      price: product.price,
      quantity: 1,
      image: product.images?.[0] || product.image
    };
    setEditedItems([...editedItems, newItem]);
    setShowAddItemModal(false);
    setProductSearch('');
    setSearchResults([]);
  };

  // Utility functions
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(value || 0);
  };

  const formatDate = (dateString, includeTime = true) => {
    if (!dateString) return 'N/A';
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return new Date(dateString).toLocaleDateString('en-AU', options);
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { icon: Clock, color: 'bg-yellow-50 text-yellow-600 border-yellow-500/30', label: 'Pending', bg: 'bg-yellow-500' },
      processing: { icon: Package, color: 'bg-blue-50 text-blue-600 border-blue-500/30', label: 'Processing', bg: 'bg-blue-500' },
      shipped: { icon: Truck, color: 'bg-purple-50 text-purple-600 border-purple-500/30', label: 'Shipped', bg: 'bg-purple-500' },
      delivered: { icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600 border-emerald-500/30', label: 'Delivered', bg: 'bg-emerald-500' },
      cancelled: { icon: XCircle, color: 'bg-red-50 text-red-600 border-red-500/30', label: 'Cancelled', bg: 'bg-red-500' },
      refunded: { icon: Undo2, color: 'bg-orange-50 text-orange-600 border-orange-500/30', label: 'Refunded', bg: 'bg-orange-500' }
    };
    return configs[status] || configs.pending;
  };

  const getFulfillmentConfig = (status) => {
    const configs = {
      unfulfilled: { color: 'text-yellow-600', label: 'Unfulfilled' },
      picked: { color: 'text-blue-600', label: 'Picked' },
      packed: { color: 'text-purple-600', label: 'Packed' },
      dispatched: { color: 'text-emerald-600', label: 'Dispatched' }
    };
    return configs[status] || configs.unfulfilled;
  };

  const getPaymentConfig = (status) => {
    const configs = {
      pending: { color: 'bg-yellow-50 text-yellow-600', label: 'Pending' },
      paid: { color: 'bg-emerald-50 text-emerald-600', label: 'Paid' },
      failed: { color: 'bg-red-50 text-red-600', label: 'Failed' },
      refunded: { color: 'bg-orange-50 text-orange-600', label: 'Refunded' },
      partial_refund: { color: 'bg-yellow-50 text-yellow-600', label: 'Partial Refund' }
    };
    return configs[status] || configs.pending;
  };

  const calculateTotals = () => {
    const subtotal = editedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = (subtotal - editedDiscount + editedShippingCost) * 0.1;
    const total = subtotal - editedDiscount + editedShippingCost + tax;
    return { subtotal, tax, total };
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-gray-500" size={32} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto text-red-600 mb-4" size={48} />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
        <Button onClick={() => navigate('/merchant/orders')} className="bg-emerald-600 hover:bg-emerald-700">
          Back to Orders
        </Button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const paymentConfig = getPaymentConfig(order.payment_status);
  const fulfillmentConfig = getFulfillmentConfig(order.fulfillment_status);
  const StatusIcon = statusConfig.icon;
  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/merchant/orders')} className="text-gray-500 hover:text-gray-700 hover:bg-white mt-1">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
              <button onClick={() => copyToClipboard(order.order_number)} className="text-gray-500 hover:text-gray-700">
                <Copy size={16} />
              </button>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
                <StatusIcon size={14} />
                {statusConfig.label}
              </span>
              <span className={`px-2.5 py-1 rounded text-xs font-medium ${paymentConfig.color}`}>
                {paymentConfig.label}
              </span>
              <span className={`px-2.5 py-1 rounded text-xs font-medium bg-white ${fulfillmentConfig.color}`}>
                {fulfillmentConfig.label}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              {formatDate(order.created_at)} • Last updated {formatDate(order.updated_at)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick fulfillment button based on current status */}
          {order.status === 'pending' && (
            <Button onClick={() => updateStatus('processing')} className="bg-blue-600 hover:bg-blue-700">
              <Package size={16} className="mr-2" />
              Start Processing
            </Button>
          )}
          {order.status === 'processing' && (!order.fulfillment_status || order.fulfillment_status === 'unfulfilled') && (
            <Button onClick={() => { setFulfillmentStep('pick'); setShowFulfillmentModal(true); }} className="bg-amber-600 hover:bg-amber-700">
              <ClipboardList size={16} className="mr-2" />
              Pick Items
            </Button>
          )}
          {order.fulfillment_status === 'picked' && (
            <Button onClick={() => { setFulfillmentStep('pack'); setShowFulfillmentModal(true); }} className="bg-purple-600 hover:bg-purple-700">
              <Box size={16} className="mr-2" />
              Pack Order
            </Button>
          )}
          {order.fulfillment_status === 'packed' && (
            <Button onClick={() => { setFulfillmentStep('dispatch'); setShowFulfillmentModal(true); }} className="bg-emerald-600 hover:bg-emerald-700">
              <Truck size={16} className="mr-2" />
              Dispatch
            </Button>
          )}
          {order.status === 'shipped' && (
            <Button onClick={() => updateStatus('delivered')} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle size={16} className="mr-2" />
              Mark Delivered
            </Button>
          )}
          
          <Button variant="outline" onClick={() => { loadEmailTemplate(''); setShowEmailModal(true); }} className="border-gray-200 text-gray-700 hover:bg-white">
            <Mail size={16} className="mr-2" />
            Email
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-white">
                <Printer size={16} className="mr-2" />
                Print
                <ChevronDown size={14} className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border-gray-200">
              <DropdownMenuItem onClick={() => setShowInvoicePreview(true)} className="text-gray-700 hover:text-gray-700 hover:bg-gray-100/50 cursor-pointer">
                <Eye size={14} className="mr-2" /> Preview Invoice
              </DropdownMenuItem>
              <DropdownMenuItem className="text-gray-700 hover:text-gray-700 hover:bg-gray-100/50 cursor-pointer">
                <Receipt size={14} className="mr-2" /> Print Invoice
              </DropdownMenuItem>
              <DropdownMenuItem className="text-gray-700 hover:text-gray-700 hover:bg-gray-100/50 cursor-pointer">
                <Package size={14} className="mr-2" /> Print Packing Slip
              </DropdownMenuItem>
              <DropdownMenuItem className="text-gray-700 hover:text-gray-700 hover:bg-gray-100/50 cursor-pointer">
                <Barcode size={14} className="mr-2" /> Print Shipping Label
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem className="text-gray-700 hover:text-gray-700 hover:bg-gray-100/50 cursor-pointer">
                <Download size={14} className="mr-2" /> Download PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-white px-2">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-gray-200 w-56">
              <DropdownMenuItem onClick={() => setShowTrackingModal(true)} className="text-gray-700 hover:text-gray-700 hover:bg-gray-100/50 cursor-pointer">
                <Truck size={14} className="mr-2" /> {order.tracking_number ? 'Update' : 'Add'} Tracking
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowNoteModal(true)} className="text-gray-700 hover:text-gray-700 hover:bg-gray-100/50 cursor-pointer">
                <MessageSquare size={14} className="mr-2" /> Add Note
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200" />
              {order.payment_status === 'paid' && order.status !== 'refunded' && (
                <DropdownMenuItem onClick={() => setShowRefundModal(true)} className="text-orange-600 hover:text-orange-300 hover:bg-gray-100/50 cursor-pointer">
                  <Undo2 size={14} className="mr-2" /> Process Refund
                </DropdownMenuItem>
              )}
              {order.status !== 'cancelled' && order.status !== 'delivered' && (
                <DropdownMenuItem onClick={() => setShowCancelDialog(true)} className="text-red-600 hover:text-red-300 hover:bg-gray-100/50 cursor-pointer">
                  <XCircle size={14} className="mr-2" /> Cancel Order
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Fulfillment Progress Bar */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {[
              { key: 'pending', icon: Clock, label: 'Order Placed' },
              { key: 'processing', icon: Package, label: 'Processing' },
              { key: 'picked', icon: ClipboardList, label: 'Picked', fulfillment: true },
              { key: 'packed', icon: Box, label: 'Packed', fulfillment: true },
              { key: 'shipped', icon: Truck, label: 'Shipped' },
              { key: 'delivered', icon: CheckCircle, label: 'Delivered' }
            ].map((step, index, arr) => {
              const StepIcon = step.icon;
              let isActive = false;
              let isCompleted = false;
              
              if (step.fulfillment) {
                const fulfillmentOrder = ['unfulfilled', 'picked', 'packed', 'dispatched'];
                const currentFulfillmentIndex = fulfillmentOrder.indexOf(order.fulfillment_status || 'unfulfilled');
                const stepFulfillmentIndex = fulfillmentOrder.indexOf(step.key);
                isActive = stepFulfillmentIndex === currentFulfillmentIndex;
                isCompleted = stepFulfillmentIndex < currentFulfillmentIndex;
              } else {
                const statusOrder = ['pending', 'processing', 'shipped', 'delivered'];
                const currentStatusIndex = statusOrder.indexOf(order.status);
                const stepIndex = statusOrder.indexOf(step.key);
                isActive = stepIndex === currentStatusIndex;
                isCompleted = stepIndex < currentStatusIndex;
              }
              
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isCompleted ? 'bg-emerald-500' : isActive ? 'bg-blue-500 ring-4 ring-blue-500/30' : 'bg-gray-300'
                    }`}>
                      {isCompleted ? <Check className="text-gray-900" size={18} /> : <StepIcon className="text-gray-900" size={18} />}
                    </div>
                    <span className={`text-xs mt-2 ${isActive ? 'text-gray-900 font-medium' : isCompleted ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < arr.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white/50 border border-gray-200">
          <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-600">
            Overview
          </TabsTrigger>
          <TabsTrigger value="items" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-600">
            Items ({order.items?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="shipping" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-600">
            Shipping
          </TabsTrigger>
          <TabsTrigger value="emails" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-600">
            Emails
          </TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-600">
            Notes & History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Summary */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-white border-gray-200">
                <CardHeader className="border-b border-gray-200 flex flex-row items-center justify-between">
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <ShoppingBag size={20} />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-800">
                    {order.items?.slice(0, 3).map((item, index) => (
                      <div key={index} className="p-4 flex items-center gap-4">
                        <img src={item.image || 'https://via.placeholder.com/60'} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-gray-900 font-medium truncate">{item.product_name}</h4>
                          <p className="text-gray-500 text-sm">SKU: {item.sku || item.product_id?.slice(0, 8)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-900">{formatCurrency(item.price)} × {item.quantity}</p>
                          <p className="text-emerald-600 font-medium">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                    {(order.items?.length || 0) > 3 && (
                      <div className="p-4 text-center">
                        <button onClick={() => setActiveTab('items')} className="text-emerald-600 hover:underline text-sm">
                          View all {order.items.length} items →
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-200 p-4 bg-white/30">
                    <div className="space-y-2 max-w-xs ml-auto">
                      <div className="flex justify-between text-gray-500 text-sm">
                        <span>Subtotal</span>
                        <span>{formatCurrency(order.subtotal)}</span>
                      </div>
                      {order.discount > 0 && (
                        <div className="flex justify-between text-emerald-600 text-sm">
                          <span>Discount</span>
                          <span>-{formatCurrency(order.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-500 text-sm">
                        <span>Shipping</span>
                        <span>{order.shipping > 0 ? formatCurrency(order.shipping) : 'FREE'}</span>
                      </div>
                      <div className="flex justify-between text-gray-500 text-sm">
                        <span>GST (10%)</span>
                        <span>{formatCurrency(order.tax)}</span>
                      </div>
                      <div className="flex justify-between text-gray-900 font-bold pt-2 border-t border-gray-200">
                        <span>Total</span>
                        <span className="text-lg">{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tracking Card */}
              {order.tracking_number && (
                <Card className="bg-white border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <Truck className="text-purple-600" size={24} />
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Tracking</p>
                          <p className="text-gray-900 font-medium">{CARRIERS.find(c => c.id === order.tracking_carrier)?.name || order.tracking_carrier}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded text-sm">{order.tracking_number}</code>
                            <button onClick={() => copyToClipboard(order.tracking_number)} className="text-gray-500 hover:text-gray-700">
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => window.open(order.tracking_url, '_blank')} className="border-gray-200 text-gray-700">
                        <ExternalLink size={14} className="mr-2" />
                        Track Package
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Customer Card */}
              <Card className="bg-white border-gray-200">
                <CardHeader className="border-b border-gray-200 flex flex-row items-center justify-between py-3">
                  <CardTitle className="text-gray-900 text-base flex items-center gap-2">
                    <User size={18} />
                    Customer
                  </CardTitle>
                  <button onClick={() => setIsEditingCustomer(!isEditingCustomer)} className="text-gray-500 hover:text-gray-700">
                    <Edit3 size={16} />
                  </button>
                </CardHeader>
                <CardContent className="p-4">
                  {isEditingCustomer ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editedCustomer.name}
                        onChange={(e) => setEditedCustomer({...editedCustomer, name: e.target.value})}
                        placeholder="Name"
                        className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900 text-sm"
                      />
                      <input
                        type="email"
                        value={editedCustomer.email}
                        onChange={(e) => setEditedCustomer({...editedCustomer, email: e.target.value})}
                        placeholder="Email"
                        className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900 text-sm"
                      />
                      <input
                        type="tel"
                        value={editedCustomer.phone}
                        onChange={(e) => setEditedCustomer({...editedCustomer, phone: e.target.value})}
                        placeholder="Phone"
                        className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900 text-sm"
                      />
                      <input
                        type="text"
                        value={editedCustomer.company}
                        onChange={(e) => setEditedCustomer({...editedCustomer, company: e.target.value})}
                        placeholder="Company"
                        className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveCustomerInfo} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 flex-1">
                          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                          <span className="ml-1">Save</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setIsEditingCustomer(false)} className="border-gray-200">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-gray-900 font-bold">
                          {order.customer_name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <p className="text-gray-900 font-medium">{order.customer_name}</p>
                          {order.company_name && <p className="text-gray-500 text-sm">{order.company_name}</p>}
                        </div>
                      </div>
                      <div className="space-y-2 pt-2">
                        <a href={`mailto:${order.customer_email}`} className="flex items-center gap-2 text-gray-700 text-sm hover:text-emerald-600">
                          <Mail size={14} className="text-gray-500" />
                          {order.customer_email}
                        </a>
                        {order.customer_phone && (
                          <a href={`tel:${order.customer_phone}`} className="flex items-center gap-2 text-gray-700 text-sm hover:text-emerald-600">
                            <Phone size={14} className="text-gray-500" />
                            {order.customer_phone}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card className="bg-white border-gray-200">
                <CardHeader className="border-b border-gray-200 flex flex-row items-center justify-between py-3">
                  <CardTitle className="text-gray-900 text-base flex items-center gap-2">
                    <MapPin size={18} />
                    Shipping Address
                  </CardTitle>
                  <button onClick={() => setIsEditingShipping(!isEditingShipping)} className="text-gray-500 hover:text-gray-700">
                    <Edit3 size={16} />
                  </button>
                </CardHeader>
                <CardContent className="p-4">
                  {isEditingShipping ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editedShipping.address}
                        onChange={(e) => setEditedShipping({...editedShipping, address: e.target.value})}
                        placeholder="Street Address"
                        className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900 text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editedShipping.city}
                          onChange={(e) => setEditedShipping({...editedShipping, city: e.target.value})}
                          placeholder="City"
                          className="bg-white border border-gray-200 rounded px-3 py-2 text-gray-900 text-sm"
                        />
                        <input
                          type="text"
                          value={editedShipping.state}
                          onChange={(e) => setEditedShipping({...editedShipping, state: e.target.value})}
                          placeholder="State"
                          className="bg-white border border-gray-200 rounded px-3 py-2 text-gray-900 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editedShipping.postcode}
                          onChange={(e) => setEditedShipping({...editedShipping, postcode: e.target.value})}
                          placeholder="Postcode"
                          className="bg-white border border-gray-200 rounded px-3 py-2 text-gray-900 text-sm"
                        />
                        <input
                          type="text"
                          value={editedShipping.country}
                          onChange={(e) => setEditedShipping({...editedShipping, country: e.target.value})}
                          placeholder="Country"
                          className="bg-white border border-gray-200 rounded px-3 py-2 text-gray-900 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveShippingAddress} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 flex-1">
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setIsEditingShipping(false)} className="border-gray-200">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 text-sm whitespace-pre-line">{order.shipping_address || 'No address provided'}</p>
                  )}
                </CardContent>
              </Card>

              {/* Payment Info */}
              <Card className="bg-white border-gray-200">
                <CardHeader className="border-b border-gray-200 py-3">
                  <CardTitle className="text-gray-900 text-base flex items-center gap-2">
                    <CreditCard size={18} />
                    Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Method</span>
                    <span className="text-gray-900 capitalize">{order.payment_method?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${paymentConfig.color}`}>{paymentConfig.label}</span>
                  </div>
                  {order.payment_intent_id && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Transaction</span>
                      <span className="text-gray-900 font-mono text-xs">{order.payment_intent_id.slice(-12)}</span>
                    </div>
                  )}
                  {order.purchase_order && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">PO Number</span>
                      <span className="text-gray-900">{order.purchase_order}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items">
          <Card className="bg-white border-gray-200">
            <CardHeader className="border-b border-gray-200 flex flex-row items-center justify-between">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <ShoppingBag size={20} />
                Order Items
              </CardTitle>
              <div className="flex gap-2">
                {isEditingItems ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setShowAddItemModal(true)} className="border-gray-200 text-gray-700">
                      <Plus size={14} className="mr-1" /> Add Item
                    </Button>
                    <Button size="sm" onClick={saveOrderItems} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                      {saving ? <RefreshCw size={14} className="animate-spin mr-1" /> : <Save size={14} className="mr-1" />}
                      Save Changes
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setIsEditingItems(false); setEditedItems(order.items); }} className="border-gray-200">
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setIsEditingItems(true)} className="border-gray-200 text-gray-700">
                    <Edit3 size={14} className="mr-1" /> Edit Items
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-white/30">
                    <th className="text-left py-3 px-4 text-gray-500 font-medium text-sm">Product</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium text-sm">SKU</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium text-sm">Price</th>
                    <th className="text-center py-3 px-4 text-gray-500 font-medium text-sm">Qty</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium text-sm">Total</th>
                    {isEditingItems && <th className="w-10"></th>}
                  </tr>
                </thead>
                <tbody>
                  {(isEditingItems ? editedItems : order.items)?.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img src={item.image || 'https://via.placeholder.com/48'} alt="" className="w-12 h-12 rounded object-cover border border-gray-200" />
                          <span className="text-gray-900">{item.product_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-500 text-sm font-mono">{item.sku || item.product_id?.slice(0, 8)}</td>
                      <td className="py-4 px-4 text-right">
                        {isEditingItems ? (
                          <input
                            type="number"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateItemPrice(index, e.target.value)}
                            className="w-24 bg-white border border-gray-200 rounded px-2 py-1 text-gray-900 text-right text-sm"
                          />
                        ) : (
                          <span className="text-gray-900">{formatCurrency(item.price)}</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {isEditingItems ? (
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, e.target.value)}
                            className="w-16 bg-white border border-gray-200 rounded px-2 py-1 text-gray-900 text-center text-sm"
                          />
                        ) : (
                          <span className="text-gray-900">{item.quantity}</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right text-gray-900 font-medium">{formatCurrency(item.price * item.quantity)}</td>
                      {isEditingItems && (
                        <td className="py-4 px-2">
                          <button onClick={() => removeItem(index)} className="p-1 text-red-600 hover:text-red-300 hover:bg-red-500/10 rounded">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Totals */}
              <div className="border-t border-gray-200 p-4 bg-white/30">
                <div className="space-y-2 max-w-sm ml-auto">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>{formatCurrency(isEditingItems ? totals.subtotal : order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-500">
                    <span>Discount</span>
                    {isEditingItems ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editedDiscount}
                        onChange={(e) => setEditedDiscount(parseFloat(e.target.value) || 0)}
                        className="w-24 bg-white border border-gray-200 rounded px-2 py-1 text-gray-900 text-right text-sm"
                      />
                    ) : (
                      <span className="text-emerald-600">-{formatCurrency(order.discount || 0)}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-gray-500">
                    <span>Shipping</span>
                    {isEditingItems ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editedShippingCost}
                        onChange={(e) => setEditedShippingCost(parseFloat(e.target.value) || 0)}
                        className="w-24 bg-white border border-gray-200 rounded px-2 py-1 text-gray-900 text-right text-sm"
                      />
                    ) : (
                      <span>{order.shipping > 0 ? formatCurrency(order.shipping) : 'FREE'}</span>
                    )}
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>GST (10%)</span>
                    <span>{formatCurrency(isEditingItems ? totals.tax : order.tax)}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 text-lg font-bold pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>{formatCurrency(isEditingItems ? totals.total : order.total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipping Tab */}
        <TabsContent value="shipping">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tracking Info */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Truck size={20} />
                  Tracking Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {order.tracking_number ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="text-emerald-600" size={24} />
                        <div>
                          <p className="text-emerald-600 font-medium">Shipment Created</p>
                          <p className="text-gray-500 text-sm">Tracking number has been added</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-500 text-sm mb-1">Carrier</p>
                        <p className="text-gray-900 font-medium">{CARRIERS.find(c => c.id === order.tracking_carrier)?.name || order.tracking_carrier}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm mb-1">Tracking Number</p>
                        <div className="flex items-center gap-2">
                          <code className="text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded">{order.tracking_number}</code>
                          <button onClick={() => copyToClipboard(order.tracking_number)} className="text-gray-500 hover:text-gray-700">
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => window.open(order.tracking_url, '_blank')} className="bg-purple-600 hover:bg-purple-700 flex-1">
                        <ExternalLink size={14} className="mr-2" />
                        Track Package
                      </Button>
                      <Button variant="outline" onClick={() => setShowTrackingModal(true)} className="border-gray-200 text-gray-700">
                        <Edit3 size={14} className="mr-2" />
                        Update
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Truck className="mx-auto text-gray-600 mb-3" size={48} />
                    <p className="text-gray-500 mb-4">No tracking information added yet</p>
                    <Button onClick={() => setShowTrackingModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus size={14} className="mr-2" />
                      Add Tracking
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipping Details */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <MapPin size={20} />
                  Shipping Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <p className="text-gray-500 text-sm mb-1">Delivery Address</p>
                  <p className="text-gray-900 whitespace-pre-line">{order.shipping_address || 'No address provided'}</p>
                </div>
                {order.shipping_method && (
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Shipping Method</p>
                    <p className="text-gray-900">{order.shipping_method}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500 text-sm mb-1">Shipping Cost</p>
                  <p className="text-gray-900">{order.shipping > 0 ? formatCurrency(order.shipping) : 'FREE'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Emails Tab */}
        <TabsContent value="emails">
          <Card className="bg-white border-gray-200">
            <CardHeader className="border-b border-gray-200 flex flex-row items-center justify-between">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Mail size={20} />
                Email History
              </CardTitle>
              <Button onClick={() => { loadEmailTemplate(''); setShowEmailModal(true); }} className="bg-emerald-600 hover:bg-emerald-700">
                <Send size={14} className="mr-2" />
                Send Email
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {emailHistory.length > 0 ? (
                <div className="space-y-3">
                  {emailHistory.map((email, index) => (
                    <div key={index} className="p-4 bg-white/50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-gray-900 font-medium">{email.subject}</p>
                          <p className="text-gray-500 text-sm">To: {email.to}</p>
                        </div>
                        <span className="text-gray-500 text-xs">{formatDate(email.sent_at)}</span>
                      </div>
                      <p className="text-gray-500 text-sm mt-2 line-clamp-2">{email.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Mail className="mx-auto text-gray-600 mb-3" size={48} />
                  <p className="text-gray-500 mb-4">No emails sent yet</p>
                  <div className="flex justify-center gap-2">
                    <Button onClick={() => { loadEmailTemplate('order_confirmation'); setShowEmailModal(true); }} variant="outline" className="border-gray-200 text-gray-700">
                      Order Confirmation
                    </Button>
                    <Button onClick={() => { loadEmailTemplate('shipping_notification'); setShowEmailModal(true); }} variant="outline" className="border-gray-200 text-gray-700">
                      Shipping Update
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes & History Tab */}
        <TabsContent value="notes">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notes */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="border-b border-gray-200 flex flex-row items-center justify-between">
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <MessageSquare size={20} />
                  Notes
                </CardTitle>
                <Button size="sm" onClick={() => setShowNoteModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus size={14} className="mr-1" /> Add Note
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                {order.notes || order.internal_notes?.length > 0 ? (
                  <div className="space-y-3">
                    {order.notes && (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">Customer Note</span>
                        </div>
                        <p className="text-gray-700 text-sm">{order.notes}</p>
                      </div>
                    )}
                    {order.internal_notes?.map((note, idx) => (
                      <div key={idx} className="p-3 bg-white/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${note.type === 'customer' ? 'bg-blue-50 text-blue-600' : 'bg-yellow-50 text-yellow-600'}`}>
                            {note.type === 'customer' ? 'Customer Visible' : 'Internal'}
                          </span>
                          <span className="text-gray-500 text-xs">{formatDate(note.created_at)}</span>
                        </div>
                        <p className="text-gray-700 text-sm">{note.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No notes yet</p>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <History size={20} />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Plus className="text-emerald-600" size={14} />
                    </div>
                    <div>
                      <p className="text-gray-900 text-sm">Order Created</p>
                      <p className="text-gray-500 text-xs">{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                  {order.payment_status === 'paid' && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="text-emerald-600" size={14} />
                      </div>
                      <div>
                        <p className="text-gray-900 text-sm">Payment Received</p>
                        <p className="text-gray-500 text-xs">{formatCurrency(order.total)}</p>
                      </div>
                    </div>
                  )}
                  {timeline.map((event, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Clock className="text-blue-600" size={14} />
                      </div>
                      <div>
                        <p className="text-gray-900 text-sm">{event.description}</p>
                        <p className="text-gray-500 text-xs">{formatDate(event.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Fulfillment Modal */}
      <Dialog open={showFulfillmentModal} onOpenChange={setShowFulfillmentModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {fulfillmentStep === 'pick' && <><ClipboardList size={20} /> Pick Items</>}
              {fulfillmentStep === 'pack' && <><Box size={20} /> Pack Order</>}
              {fulfillmentStep === 'dispatch' && <><Truck size={20} /> Dispatch Order</>}
            </DialogTitle>
          </DialogHeader>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 py-4">
            {['pick', 'pack', 'dispatch'].map((step, idx) => (
              <React.Fragment key={step}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  fulfillmentStep === step ? 'bg-emerald-500 text-gray-900' : 
                  ['pick', 'pack', 'dispatch'].indexOf(fulfillmentStep) > idx ? 'bg-emerald-500/50 text-gray-900' : 'bg-gray-100 text-gray-500'
                }`}>
                  {idx + 1}
                </div>
                {idx < 2 && <div className={`w-12 h-0.5 ${['pick', 'pack', 'dispatch'].indexOf(fulfillmentStep) > idx ? 'bg-emerald-500' : 'bg-gray-300'}`} />}
              </React.Fragment>
            ))}
          </div>

          {/* Pick Step */}
          {fulfillmentStep === 'pick' && (
            <div className="space-y-4">
              <p className="text-gray-500">Select items as you pick them from the warehouse:</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {order.items?.map((item, idx) => (
                  <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    pickedItems.includes(item.product_id) ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/50 border-gray-200 hover:border-gray-200'
                  }`} onClick={() => handlePickItem(item.product_id)}>
                    <input type="checkbox" checked={pickedItems.includes(item.product_id)} onChange={() => {}} className="rounded" />
                    <img src={item.image || 'https://via.placeholder.com/40'} alt="" className="w-10 h-10 rounded object-cover" />
                    <div className="flex-1">
                      <p className="text-gray-900 text-sm">{item.product_name}</p>
                      <p className="text-gray-500 text-xs">SKU: {item.sku || item.product_id?.slice(0,8)} • Qty: {item.quantity}</p>
                    </div>
                    {pickedItems.includes(item.product_id) && <CheckCircle className="text-emerald-600" size={20} />}
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <p className="text-gray-500">{pickedItems.length} of {order.items?.length} items picked</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowFulfillmentModal(false)} className="border-gray-200">Cancel</Button>
                  <Button onClick={completePicking} disabled={pickedItems.length !== order.items?.length} className="bg-emerald-600 hover:bg-emerald-700">
                    Complete Picking <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Pack Step */}
          {fulfillmentStep === 'pack' && (
            <div className="space-y-4">
              <p className="text-gray-500">Pack items and enter package details:</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <PackageCheck className="text-emerald-600" size={20} />
                    <div className="flex-1">
                      <p className="text-gray-900 text-sm">{item.product_name} × {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-500 text-sm block mb-1">Package Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={packageWeight}
                    onChange={(e) => setPackageWeight(e.target.value)}
                    placeholder="e.g. 1.5"
                    className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-sm block mb-1">Dimensions (cm)</label>
                  <div className="flex gap-2">
                    <input type="number" placeholder="L" value={packageDimensions.length} onChange={(e) => setPackageDimensions({...packageDimensions, length: e.target.value})} className="w-full bg-white border border-gray-200 rounded px-2 py-2 text-gray-900 text-center" />
                    <input type="number" placeholder="W" value={packageDimensions.width} onChange={(e) => setPackageDimensions({...packageDimensions, width: e.target.value})} className="w-full bg-white border border-gray-200 rounded px-2 py-2 text-gray-900 text-center" />
                    <input type="number" placeholder="H" value={packageDimensions.height} onChange={(e) => setPackageDimensions({...packageDimensions, height: e.target.value})} className="w-full bg-white border border-gray-200 rounded px-2 py-2 text-gray-900 text-center" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <Button variant="outline" onClick={() => setFulfillmentStep('pick')} className="border-gray-200">Back</Button>
                <Button onClick={completePacking} className="bg-purple-600 hover:bg-purple-700">
                  Complete Packing <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Dispatch Step */}
          {fulfillmentStep === 'dispatch' && (
            <div className="space-y-4">
              <p className="text-gray-500">Enter shipping carrier and tracking details:</p>
              <div>
                <label className="text-gray-500 text-sm block mb-2">Shipping Carrier *</label>
                <Select value={trackingCarrier} onValueChange={setTrackingCarrier}>
                  <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {CARRIERS.map(carrier => (
                      <SelectItem key={carrier.id} value={carrier.id}>{carrier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-gray-500 text-sm block mb-2">Tracking Number *</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900"
                />
              </div>
              {trackingCarrier === 'other' && (
                <div>
                  <label className="text-gray-500 text-sm block mb-2">Tracking URL</label>
                  <input
                    type="url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="notifyCustomer" checked={notifyCustomerTracking} onChange={(e) => setNotifyCustomerTracking(e.target.checked)} className="rounded" />
                <label htmlFor="notifyCustomer" className="text-gray-500 text-sm">Send shipping notification email to customer</label>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <Button variant="outline" onClick={() => setFulfillmentStep('pack')} className="border-gray-200">Back</Button>
                <Button onClick={completeDispatch} disabled={!trackingCarrier || !trackingNumber} className="bg-emerald-600 hover:bg-emerald-700">
                  <Truck size={16} className="mr-2" />
                  Dispatch Order
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tracking Modal */}
      <Dialog open={showTrackingModal} onOpenChange={setShowTrackingModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle>Tracking Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-gray-500 text-sm block mb-2">Carrier</label>
              <Select value={trackingCarrier} onValueChange={setTrackingCarrier}>
                <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {CARRIERS.map(carrier => (
                    <SelectItem key={carrier.id} value={carrier.id}>{carrier.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-gray-500 text-sm block mb-2">Tracking Number</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
                className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="notifyTrack" checked={notifyCustomerTracking} onChange={(e) => setNotifyCustomerTracking(e.target.checked)} className="rounded" />
              <label htmlFor="notifyTrack" className="text-gray-500 text-sm">Notify customer via email</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTrackingModal(false)} className="border-gray-200">Cancel</Button>
            <Button onClick={saveTracking} className="bg-emerald-600 hover:bg-emerald-700">Save Tracking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-gray-500 text-sm block mb-2">Template</label>
              <Select value={emailTemplate} onValueChange={loadEmailTemplate}>
                <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                  <SelectValue placeholder="Select template or custom" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="order_confirmation">Order Confirmation</SelectItem>
                  <SelectItem value="shipping_notification">Shipping Notification</SelectItem>
                  <SelectItem value="delivery_confirmation">Delivery Confirmation</SelectItem>
                  <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
                  <SelectItem value="custom">Custom Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-white/50 rounded">
              <p className="text-gray-500 text-sm">To: <span className="text-gray-900">{order?.customer_email}</span></p>
            </div>
            <div>
              <label className="text-gray-500 text-sm block mb-2">Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900"
              />
            </div>
            <div>
              <label className="text-gray-500 text-sm block mb-2">Message</label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={8}
                className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailModal(false)} className="border-gray-200">Cancel</Button>
            <Button onClick={sendEmail} className="bg-emerald-600 hover:bg-emerald-700">
              <Send size={14} className="mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Modal */}
      <Dialog open={showNoteModal} onOpenChange={setShowNoteModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-gray-500 text-sm block mb-2">Note Type</label>
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="internal">Internal (Staff Only)</SelectItem>
                  <SelectItem value="customer">Customer Visible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-gray-500 text-sm block mb-2">Note</label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={4}
                placeholder="Enter note..."
                className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteModal(false)} className="border-gray-200">Cancel</Button>
            <Button onClick={addNote} className="bg-emerald-600 hover:bg-emerald-700">Add Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Modal */}
      <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-start gap-3">
              <AlertTriangle className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-orange-600 text-sm">This action cannot be undone. Please verify the refund details.</p>
            </div>
            <div>
              <label className="text-gray-500 text-sm block mb-2">Refund Amount (Max: {formatCurrency(order?.total)})</label>
              <input
                type="number"
                step="0.01"
                max={order?.total}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900"
              />
              <button onClick={() => setRefundAmount(order?.total?.toString())} className="text-emerald-600 text-sm mt-1 hover:underline">Full refund</button>
            </div>
            <div>
              <label className="text-gray-500 text-sm block mb-2">Reason</label>
              <Select value={refundReason} onValueChange={setRefundReason}>
                <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="customer_request">Customer Request</SelectItem>
                  <SelectItem value="damaged">Damaged Product</SelectItem>
                  <SelectItem value="wrong_item">Wrong Item</SelectItem>
                  <SelectItem value="not_received">Not Received</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="restock" checked={restockItems} onChange={(e) => setRestockItems(e.target.checked)} className="rounded" />
              <label htmlFor="restock" className="text-gray-500 text-sm">Restock items to inventory</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundModal(false)} className="border-gray-200">Cancel</Button>
            <Button onClick={processRefund} className="bg-orange-600 hover:bg-orange-700">Process Refund</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Modal */}
      <Dialog open={showAddItemModal} onOpenChange={setShowAddItemModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle>Add Item to Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-gray-500 text-sm block mb-2">Search Products</label>
              <input
                type="text"
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); searchProducts(e.target.value); }}
                placeholder="Search by name or SKU..."
                className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {searchResults.map(product => (
                  <div key={product.id} onClick={() => addItemToOrder(product)} className="flex items-center gap-3 p-3 bg-white/50 rounded-lg cursor-pointer hover:bg-white transition-colors">
                    <img src={product.images?.[0] || product.image || 'https://via.placeholder.com/40'} alt="" className="w-10 h-10 rounded object-cover" />
                    <div className="flex-1">
                      <p className="text-gray-900 text-sm">{product.name}</p>
                      <p className="text-gray-500 text-xs">SKU: {product.sku || product.id?.slice(0,8)} • {formatCurrency(product.price)}</p>
                    </div>
                    <Plus className="text-emerald-600" size={20} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-white border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500">
              Are you sure you want to cancel this order? This will notify the customer and update inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white border-gray-200 text-gray-700 hover:bg-gray-100">Keep Order</AlertDialogCancel>
            <AlertDialogAction onClick={cancelOrder} className="bg-red-600 hover:bg-red-700">Cancel Order</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice Preview Modal */}
      <Dialog open={showInvoicePreview} onOpenChange={setShowInvoicePreview}>
        <DialogContent className="bg-white text-gray-900 max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-2xl font-bold">INVOICE</h1>
                <p className="text-gray-500">#{order?.order_number}</p>
              </div>
              <div className="text-right">
                <h2 className="font-bold text-lg">TOOLS IN A BOX</h2>
                <p className="text-gray-500 text-sm">ABN: XX XXX XXX XXX</p>
                <p className="text-gray-500 text-sm">support@toolsinabox.com.au</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-gray-500 text-sm mb-2">BILL TO</h3>
                <p className="font-medium">{order?.customer_name}</p>
                {order?.company_name && <p>{order.company_name}</p>}
                <p className="text-gray-600 whitespace-pre-line text-sm">{order?.shipping_address}</p>
                <p className="text-gray-600 text-sm">{order?.customer_email}</p>
              </div>
              <div className="text-right">
                <h3 className="font-semibold text-gray-500 text-sm mb-2">INVOICE DETAILS</h3>
                <p><span className="text-gray-500">Date:</span> {formatDate(order?.created_at, false)}</p>
                <p><span className="text-gray-500">Due:</span> Due on Receipt</p>
                {order?.purchase_order && <p><span className="text-gray-500">PO:</span> {order.purchase_order}</p>}
              </div>
            </div>
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 text-gray-500 text-sm">ITEM</th>
                  <th className="text-right py-2 text-gray-500 text-sm">QTY</th>
                  <th className="text-right py-2 text-gray-500 text-sm">PRICE</th>
                  <th className="text-right py-2 text-gray-500 text-sm">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {order?.items?.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-3">
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-gray-500 text-sm">SKU: {item.sku || item.product_id?.slice(0,8)}</p>
                    </td>
                    <td className="text-right py-3">{item.quantity}</td>
                    <td className="text-right py-3">{formatCurrency(item.price)}</td>
                    <td className="text-right py-3 font-medium">{formatCurrency(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(order?.subtotal)}</span></div>
                {order?.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(order.discount)}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{order?.shipping > 0 ? formatCurrency(order.shipping) : 'FREE'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">GST (10%)</span><span>{formatCurrency(order?.tax)}</span></div>
                <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Total</span><span>{formatCurrency(order?.total)}</span></div>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t text-center text-gray-500 text-sm">
              <p>Thank you for your business!</p>
              <p>For questions, contact support@toolsinabox.com.au</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantOrderDetail;
