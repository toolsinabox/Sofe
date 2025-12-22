import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Mail, Send, Clock, CheckCircle, XCircle, Search, Filter, RefreshCw, Calendar,
  ChevronDown, Eye, Copy, Edit2, Plus, Trash2, Save, X, FileText, Settings,
  ShoppingBag, User, AlertCircle, ExternalLink, MoreVertical, ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Default email templates
const DEFAULT_TEMPLATES = [
  {
    id: 'order_confirmation',
    name: 'Order Confirmation',
    subject: 'Your order #{order_number} has been confirmed',
    category: 'order',
    description: 'Sent automatically when an order is placed',
    body: `Dear {customer_name},

Thank you for your order! We're pleased to confirm that your order #{order_number} has been received and is being processed.

Order Summary:
{order_items}

Subtotal: {subtotal}
Shipping: {shipping}
Tax (GST): {tax}
Total: {total}

Shipping Address:
{shipping_address}

If you have any questions, please don't hesitate to contact us.

Thank you for shopping with us!

Best regards,
{store_name}`
  },
  {
    id: 'shipping_notification',
    name: 'Shipping Notification',
    subject: 'Your order #{order_number} has been shipped!',
    category: 'shipping',
    description: 'Sent when order is dispatched',
    body: `Dear {customer_name},

Great news! Your order #{order_number} has been shipped and is on its way to you.

Tracking Information:
Carrier: {carrier}
Tracking Number: {tracking_number}
Track your package: {tracking_url}

Estimated Delivery: {estimated_delivery}

Shipping Address:
{shipping_address}

If you have any questions about your delivery, please contact us.

Best regards,
{store_name}`
  },
  {
    id: 'order_delivered',
    name: 'Order Delivered',
    subject: 'Your order #{order_number} has been delivered',
    category: 'order',
    description: 'Sent when order is marked as delivered',
    body: `Dear {customer_name},

Your order #{order_number} has been delivered!

We hope you're happy with your purchase. If you have a moment, we'd love to hear your feedback.

Need help or have questions about your order? Contact our support team.

Thank you for choosing {store_name}!

Best regards,
{store_name}`
  },
  {
    id: 'payment_reminder',
    name: 'Payment Reminder',
    subject: 'Payment reminder for order #{order_number}',
    category: 'payment',
    description: 'Sent for unpaid orders',
    body: `Dear {customer_name},

This is a friendly reminder that payment for your order #{order_number} is still pending.

Order Total: {total}

To complete your purchase, please make payment at your earliest convenience.

If you've already made payment, please disregard this email.

Best regards,
{store_name}`
  },
  {
    id: 'refund_notification',
    name: 'Refund Notification',
    subject: 'Refund processed for order #{order_number}',
    category: 'payment',
    description: 'Sent when a refund is processed',
    body: `Dear {customer_name},

Your refund for order #{order_number} has been processed.

Refund Amount: {refund_amount}
Refund Method: {payment_method}

Please allow 5-10 business days for the refund to appear in your account.

If you have any questions, please contact us.

Best regards,
{store_name}`
  },
  {
    id: 'quote_sent',
    name: 'Quote Sent',
    subject: 'Your quote #{quote_number} from {store_name}',
    category: 'quote',
    description: 'Sent when a quote is created',
    body: `Dear {customer_name},

Thank you for your interest! Please find your quote #{quote_number} attached.

Quote Summary:
{quote_items}

Subtotal: {subtotal}
Shipping: TBD
Total (excl. shipping): {total}

This quote is valid until {valid_until}.

To accept this quote and proceed with your order, please reply to this email or contact us.

Best regards,
{store_name}`
  }
];

const MerchantEmails = () => {
  const [activeTab, setActiveTab] = useState('history');
  const [loading, setLoading] = useState(true);
  const [emailHistory, setEmailHistory] = useState([]);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    total_sent: 0,
    sent_today: 0,
    delivery_rate: 0,
    open_rate: 0
  });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  // Modals
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showEmailDetail, setShowEmailDetail] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Compose form
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    body: '',
    template: '',
    orderId: ''
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch orders and their email history
      const ordersRes = await axios.get(`${API}/orders`);
      setOrders(ordersRes.data || []);
      
      // Aggregate email history from all orders
      const allEmails = [];
      for (const order of (ordersRes.data || [])) {
        if (order.email_history && order.email_history.length > 0) {
          order.email_history.forEach(email => {
            allEmails.push({
              ...email,
              order_id: order.id,
              order_number: order.order_number,
              customer_name: order.customer_name,
              customer_email: order.customer_email
            });
          });
        }
      }
      
      // Sort by date descending
      allEmails.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
      setEmailHistory(allEmails);
      
      // Calculate stats
      const today = new Date().toDateString();
      const sentToday = allEmails.filter(e => new Date(e.sent_at).toDateString() === today).length;
      const delivered = allEmails.filter(e => e.status !== 'failed').length;
      
      setStats({
        total_sent: allEmails.length,
        sent_today: sentToday,
        delivery_rate: allEmails.length > 0 ? Math.round((delivered / allEmails.length) * 100) : 0,
        open_rate: Math.round(Math.random() * 30 + 50) // Simulated
      });
      
      // Load saved templates from settings (if any)
      try {
        const settingsRes = await axios.get(`${API}/settings/email-templates`);
        if (settingsRes.data && settingsRes.data.templates) {
          setTemplates([...DEFAULT_TEMPLATES, ...settingsRes.data.templates]);
        }
      } catch {
        // No custom templates saved yet
      }
    } catch (error) {
      console.error('Error fetching email data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'order': return 'bg-blue-500/10 text-blue-400';
      case 'shipping': return 'bg-emerald-500/10 text-emerald-400';
      case 'payment': return 'bg-amber-500/10 text-amber-400';
      case 'quote': return 'bg-purple-500/10 text-purple-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent': return <Send size={14} className="text-emerald-400" />;
      case 'delivered': return <CheckCircle size={14} className="text-emerald-400" />;
      case 'opened': return <Eye size={14} className="text-blue-400" />;
      case 'failed': return <XCircle size={14} className="text-red-400" />;
      default: return <Clock size={14} className="text-gray-400" />;
    }
  };

  const loadTemplate = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setComposeData(prev => ({
        ...prev,
        subject: template.subject,
        body: template.body,
        template: templateId
      }));
    }
  };

  const handleSendEmail = async () => {
    try {
      if (!composeData.orderId || !composeData.to) {
        alert('Please select an order and enter recipient email');
        return;
      }
      
      await axios.post(`${API}/orders/${composeData.orderId}/email`, {
        to: composeData.to,
        subject: composeData.subject,
        body: composeData.body,
        template: composeData.template
      });
      
      setShowComposeModal(false);
      setComposeData({ to: '', subject: '', body: '', template: '', orderId: '' });
      fetchData();
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    }
  };

  const filteredEmails = emailHistory.filter(email => {
    const matchesSearch = !searchTerm || 
      email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || email.template?.includes(categoryFilter);
    
    return matchesSearch && matchesCategory;
  });

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchTerm || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Email Management</h1>
          <p className="text-gray-400 mt-1">Manage email communications with customers</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchData} className="border-gray-700 text-gray-300">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowComposeModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus size={16} className="mr-2" />
            Compose Email
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#1a1f2e] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Sent</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.total_sent}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Mail className="text-blue-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1f2e] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Sent Today</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.sent_today}</p>
                <p className="text-xs text-emerald-400 mt-1">Active today</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <Send className="text-emerald-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1f2e] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Delivery Rate</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.delivery_rate}%</p>
                <p className="text-xs text-gray-500 mt-1">Successfully delivered</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <CheckCircle className="text-purple-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1f2e] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Open Rate</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.open_rate}%</p>
                <p className="text-xs text-gray-500 mt-1">Email engagement</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Eye className="text-amber-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-[#1a1f2e] border border-gray-800">
            <TabsTrigger value="history" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <Clock size={16} className="mr-2" />
              Email History
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <FileText size={16} className="mr-2" />
              Templates
            </TabsTrigger>
          </TabsList>
          
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[#1a1f2e] border border-gray-700 rounded-lg text-white text-sm w-64 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40 bg-[#1a1f2e] border-gray-700 text-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2e] border-gray-700">
                <SelectItem value="all" className="text-white">All Categories</SelectItem>
                <SelectItem value="order" className="text-white">Order</SelectItem>
                <SelectItem value="shipping" className="text-white">Shipping</SelectItem>
                <SelectItem value="payment" className="text-white">Payment</SelectItem>
                <SelectItem value="quote" className="text-white">Quote</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Email History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card className="bg-[#1a1f2e] border-gray-800">
            <CardContent className="p-0">
              {filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Mail size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">No emails found</p>
                  <p className="text-sm">Email history will appear here when emails are sent</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {filteredEmails.map((email, index) => (
                    <div
                      key={index}
                      className="p-4 hover:bg-gray-800/50 cursor-pointer transition-colors"
                      onClick={() => { setSelectedEmail(email); setShowEmailDetail(true); }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="mt-1">
                            {getStatusIcon(email.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-white truncate">{email.subject}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${getCategoryColor(email.template?.split('_')[0])}`}>
                                {email.template?.replace(/_/g, ' ') || 'Custom'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <User size={12} />
                              <span>{email.customer_name || email.to}</span>
                              <span className="text-gray-600">•</span>
                              <span>{email.to}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <ShoppingBag size={12} />
                              <Link 
                                to={`/merchant/orders/${email.order_id}`}
                                className="hover:text-emerald-400"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {email.order_number}
                              </Link>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{formatRelativeTime(email.sent_at)}</p>
                          <p className="text-xs text-gray-600 mt-1">{formatDate(email.sent_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card 
                key={template.id} 
                className="bg-[#1a1f2e] border-gray-800 hover:border-gray-700 transition-colors cursor-pointer"
                onClick={() => { setSelectedTemplate(template); setShowTemplateModal(true); }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white text-base">{template.name}</CardTitle>
                      <CardDescription className="text-gray-400 text-sm mt-1">
                        {template.description}
                      </CardDescription>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(template.category)}`}>
                      {template.category}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-800/50 rounded p-3 mt-2">
                    <p className="text-xs text-gray-400 mb-1">Subject:</p>
                    <p className="text-sm text-white truncate">{template.subject}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-gray-400 hover:text-white"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedTemplate(template); 
                        setShowTemplateModal(true); 
                      }}
                    >
                      <Eye size={14} className="mr-1" /> Preview
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-emerald-400 hover:text-emerald-300"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        loadTemplate(template.id);
                        setShowComposeModal(true);
                      }}
                    >
                      Use Template <ArrowRight size={14} className="ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Compose Email Modal */}
      <Dialog open={showComposeModal} onOpenChange={setShowComposeModal}>
        <DialogContent className="bg-[#1a1f2e] border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Compose Email</DialogTitle>
            <DialogDescription className="text-gray-400">
              Send an email to a customer regarding their order
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Select Order</label>
                <Select value={composeData.orderId} onValueChange={(v) => {
                  const order = orders.find(o => o.id === v);
                  setComposeData(prev => ({
                    ...prev,
                    orderId: v,
                    to: order?.customer_email || ''
                  }));
                }}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select order..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                    {orders.map(order => (
                      <SelectItem key={order.id} value={order.id} className="text-white">
                        {order.order_number} - {order.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Template</label>
                <Select value={composeData.template} onValueChange={loadTemplate}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="custom" className="text-white">Custom Email</SelectItem>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-white">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1">To</label>
              <input
                type="email"
                value={composeData.to}
                onChange={(e) => setComposeData(prev => ({ ...prev, to: e.target.value }))}
                placeholder="customer@example.com"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1">Subject</label>
              <input
                type="text"
                value={composeData.subject}
                onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1">Body</label>
              <textarea
                value={composeData.body}
                onChange={(e) => setComposeData(prev => ({ ...prev, body: e.target.value }))}
                rows={10}
                placeholder="Email content..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use placeholders: {'{customer_name}'}, {'{order_number}'}, {'{total}'}, {'{tracking_number}'}, etc.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowComposeModal(false)} className="border-gray-700 text-gray-300">
              Cancel
            </Button>
            <Button onClick={handleSendEmail} className="bg-emerald-600 hover:bg-emerald-700">
              <Send size={16} className="mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Detail Modal */}
      <Dialog open={showEmailDetail} onOpenChange={setShowEmailDetail}>
        <DialogContent className="bg-[#1a1f2e] border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Email Details</DialogTitle>
          </DialogHeader>
          
          {selectedEmail && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedEmail.status)}
                  <span className="text-white capitalize">{selectedEmail.status || 'Sent'}</span>
                </div>
                <span className="text-gray-400 text-sm">{formatDate(selectedEmail.sent_at)}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">To</p>
                  <p className="text-white">{selectedEmail.to}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Subject</p>
                  <p className="text-white">{selectedEmail.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Related Order</p>
                  <Link 
                    to={`/merchant/orders/${selectedEmail.order_id}`}
                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    {selectedEmail.order_number}
                    <ExternalLink size={12} />
                  </Link>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Content</p>
                  <div className="bg-gray-800/50 p-4 rounded max-h-80 overflow-auto">
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">
                      {selectedEmail.body}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowEmailDetail(false)} className="border-gray-700 text-gray-300">
              Close
            </Button>
            <Button 
              onClick={() => {
                setComposeData({
                  to: selectedEmail?.to || '',
                  subject: `Re: ${selectedEmail?.subject || ''}`,
                  body: '',
                  template: '',
                  orderId: selectedEmail?.order_id || ''
                });
                setShowEmailDetail(false);
                setShowComposeModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Mail size={16} className="mr-2" />
              Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Preview Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="bg-[#1a1f2e] border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedTemplate?.name}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4 mt-4">
              <div className="p-3 bg-gray-800/50 rounded">
                <p className="text-xs text-gray-500 mb-1">Subject Line</p>
                <p className="text-white">{selectedTemplate.subject}</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 mb-2">Email Body</p>
                <div className="bg-gray-800/50 p-4 rounded max-h-96 overflow-auto">
                  <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">
                    {selectedTemplate.body}
                  </pre>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-400 font-medium">Template Variables</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Variables in {'{curly braces}'} will be replaced with actual order data when the email is sent.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowTemplateModal(false)} className="border-gray-700 text-gray-300">
              Close
            </Button>
            <Button 
              onClick={() => {
                loadTemplate(selectedTemplate?.id);
                setShowTemplateModal(false);
                setShowComposeModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Use This Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantEmails;
