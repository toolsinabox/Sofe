import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Mail,
  Printer,
  Edit,
  User,
  Phone,
  MapPin,
  Building,
  Calendar,
  DollarSign,
  MessageSquare,
  Plus,
  Copy,
  AlertCircle,
  ChevronDown,
  Send,
  Download,
  Timer,
  ShoppingCart,
  Trash2,
  Save,
  ExternalLink,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantQuoteDetail = () => {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit states
  const [editedItems, setEditedItems] = useState([]);
  const [editedShipping, setEditedShipping] = useState(0);
  const [editedDiscount, setEditedDiscount] = useState(0);
  
  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  
  // Form states
  const [newStatus, setNewStatus] = useState('');
  const [merchantNote, setMerchantNote] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [extendDays, setExtendDays] = useState(30);

  useEffect(() => {
    if (quoteId) {
      fetchQuote();
    }
  }, [quoteId]);

  const fetchQuote = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/quotes/${quoteId}`);
      setQuote(response.data);
      setNewStatus(response.data.status);
      setMerchantNote(response.data.merchant_notes || '');
      setEditedItems(response.data.items || []);
      setEditedShipping(response.data.shipping || 0);
    } catch (error) {
      console.error('Error fetching quote:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuoteStatus = async () => {
    try {
      await axios.put(`${API}/quotes/${quoteId}`, { status: newStatus });
      fetchQuote();
      setShowStatusModal(false);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const convertToOrder = async () => {
    try {
      const response = await axios.post(`${API}/quotes/${quoteId}/convert-to-order`);
      setShowConvertModal(false);
      fetchQuote();
      if (response.data?.order_id) {
        navigate(`/merchant/orders/${response.data.order_id}`);
      }
    } catch (error) {
      console.error('Error converting quote:', error);
      alert(error.response?.data?.detail || 'Failed to convert quote');
    }
  };

  const deleteQuote = async () => {
    try {
      await axios.delete(`${API}/quotes/${quoteId}`);
      navigate('/merchant/quotes');
    } catch (error) {
      console.error('Error deleting quote:', error);
    }
  };

  const saveMerchantNote = async () => {
    try {
      await axios.put(`${API}/quotes/${quoteId}`, {
        merchant_notes: merchantNote
      });
      fetchQuote();
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const sendQuoteEmail = async () => {
    try {
      await axios.post(`${API}/quotes/${quoteId}/send`, {
        subject: emailSubject,
        body: emailBody
      });
      await axios.put(`${API}/quotes/${quoteId}`, { status: 'sent' });
      setShowEmailModal(false);
      fetchQuote();
    } catch (error) {
      console.error('Error sending quote:', error);
    }
  };

  const extendValidity = async () => {
    try {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + extendDays);
      await axios.put(`${API}/quotes/${quoteId}`, {
        valid_until: newDate.toISOString()
      });
      setShowExtendModal(false);
      fetchQuote();
    } catch (error) {
      console.error('Error extending validity:', error);
    }
  };

  const saveQuoteChanges = async () => {
    try {
      const subtotal = editedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const tax = subtotal * 0.1;
      const total = subtotal + editedShipping + tax - editedDiscount;
      
      await axios.put(`${API}/quotes/${quoteId}`, {
        items: editedItems,
        shipping: editedShipping,
        subtotal: subtotal,
        tax: tax,
        total: total
      });
      setIsEditing(false);
      fetchQuote();
    } catch (error) {
      console.error('Error saving quote:', error);
    }
  };

  const updateItemPrice = (index, newPrice) => {
    const updated = [...editedItems];
    updated[index].price = parseFloat(newPrice) || 0;
    setEditedItems(updated);
  };

  const updateItemQuantity = (index, newQty) => {
    const updated = [...editedItems];
    updated[index].quantity = parseInt(newQty) || 1;
    setEditedItems(updated);
  };

  const removeItem = (index) => {
    const updated = editedItems.filter((_, i) => i !== index);
    setEditedItems(updated);
  };

  const printQuote = () => {
    window.open(`${API}/quotes/${quoteId}/print`, '_blank');
  };

  const downloadQuotePDF = async () => {
    try {
      const response = await axios.get(`${API}/quotes/${quoteId}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quote-${quote.quote_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const copyQuoteNumber = () => {
    navigator.clipboard.writeText(quote.quote_number);
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
      pending: { icon: Clock, color: 'bg-yellow-50 text-yellow-600 border-yellow-500/30', label: 'Pending', bgColor: 'bg-yellow-500' },
      sent: { icon: Send, color: 'bg-blue-50 text-blue-600 border-blue-500/30', label: 'Sent', bgColor: 'bg-blue-500' },
      accepted: { icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600 border-emerald-500/30', label: 'Accepted', bgColor: 'bg-emerald-500' },
      rejected: { icon: XCircle, color: 'bg-red-50 text-red-600 border-red-500/30', label: 'Rejected', bgColor: 'bg-red-500' },
      expired: { icon: Timer, color: 'bg-gray-500/20 text-gray-500 border-gray-500/30', label: 'Expired', bgColor: 'bg-gray-500' },
      converted: { icon: ShoppingCart, color: 'bg-purple-50 text-purple-600 border-purple-500/30', label: 'Converted', bgColor: 'bg-purple-500' }
    };
    return configs[status] || configs.pending;
  };

  const isExpired = () => {
    if (!quote?.valid_until) return false;
    return new Date(quote.valid_until) < new Date() && quote.status !== 'converted' && quote.status !== 'rejected';
  };

  const getDaysUntilExpiry = () => {
    if (!quote?.valid_until) return null;
    const days = Math.ceil((new Date(quote.valid_until) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  // Calculate totals for editing
  const calculateTotals = () => {
    const subtotal = editedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1;
    const total = subtotal + editedShipping + tax - editedDiscount;
    return { subtotal, tax, total };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-gray-500" size={32} />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto text-red-600 mb-4" size={48} />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Quote Not Found</h2>
        <p className="text-gray-500 mb-4">The quote you are looking for does not exist or has been deleted.</p>
        <Button onClick={() => navigate('/merchant/quotes')} className="bg-amber-600 hover:bg-amber-700">
          Back to Quotes
        </Button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(quote.status);
  const StatusIcon = statusConfig.icon;
  const expired = isExpired();
  const daysLeft = getDaysUntilExpiry();
  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/merchant/quotes')}
            className="text-gray-500 hover:text-gray-700 hover:bg-white"
          >
            <ArrowLeft size={18} className="mr-1" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{quote.quote_number}</h1>
              <button onClick={copyQuoteNumber} className="text-gray-500 hover:text-gray-700">
                <Copy size={16} />
              </button>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${
                expired ? 'bg-gray-500/20 text-gray-500 border-gray-500/30' : statusConfig.color
              }`}>
                <StatusIcon size={14} />
                {expired ? 'Expired' : statusConfig.label}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Created {formatDate(quote.created_at)} • 
              {expired ? (
                <span className="text-red-600 ml-1">Expired {formatDate(quote.valid_until, false)}</span>
              ) : daysLeft !== null && daysLeft > 0 ? (
                <span className={`ml-1 ${daysLeft <= 7 ? 'text-yellow-600' : 'text-gray-500'}`}>
                  Valid for {daysLeft} more day{daysLeft !== 1 ? 's' : ''}
                </span>
              ) : null}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {quote.status !== 'converted' && (
            <>
              {isEditing ? (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => { setIsEditing(false); setEditedItems(quote.items); }}
                    className="border-gray-200 text-gray-700 hover:bg-white"
                  >
                    Cancel
                  </Button>
                  <Button onClick={saveQuoteChanges} className="bg-emerald-600 hover:bg-emerald-700">
                    <Save size={16} className="mr-2" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(true)}
                    className="border-gray-200 text-gray-700 hover:bg-white"
                  >
                    <Edit size={16} className="mr-2" />
                    Edit Quote
                  </Button>
                  {quote.status === 'pending' && (
                    <Button 
                      onClick={() => {
                        setEmailSubject(`Quote ${quote.quote_number} from Tools in a Box`);
                        setShowEmailModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send size={16} className="mr-2" />
                      Send to Customer
                    </Button>
                  )}
                  {(quote.status === 'accepted' || quote.status === 'sent') && (
                    <Button 
                      onClick={() => setShowConvertModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <ShoppingCart size={16} className="mr-2" />
                      Convert to Order
                    </Button>
                  )}
                </>
              )}
            </>
          )}
          
          {quote.status === 'converted' && quote.converted_order_id && (
            <Button 
              onClick={() => navigate(`/merchant/orders/${quote.converted_order_id}`)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <ExternalLink size={16} className="mr-2" />
              View Order
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-white">
                <Printer size={16} className="mr-2" />
                Print
                <ChevronDown size={14} className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border-gray-200">
              <DropdownMenuItem onClick={printQuote} className="text-gray-700 hover:text-gray-700 hover:bg-gray-100/50 cursor-pointer">
                <Printer size={14} className="mr-2" /> Print Quote
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadQuotePDF} className="text-gray-700 hover:text-gray-700 hover:bg-gray-100/50 cursor-pointer">
                <Download size={14} className="mr-2" /> Download PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-white px-2">
                <ChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border-gray-200 w-56">
              <DropdownMenuItem onClick={() => setShowStatusModal(true)} className="text-gray-700 hover:text-gray-700 hover:bg-gray-100/50 cursor-pointer">
                <RefreshCw size={14} className="mr-2" /> Update Status
              </DropdownMenuItem>
              {(expired || (daysLeft !== null && daysLeft < 7)) && quote.status !== 'converted' && (
                <DropdownMenuItem onClick={() => setShowExtendModal(true)} className="text-gray-700 hover:text-gray-700 hover:bg-gray-100/50 cursor-pointer">
                  <Calendar size={14} className="mr-2" /> Extend Validity
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-gray-700 hover:text-gray-700 hover:bg-gray-100/50 cursor-pointer">
                <Copy size={14} className="mr-2" /> Duplicate Quote
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)} 
                className="text-red-600 hover:text-red-300 hover:bg-gray-100/50 cursor-pointer"
              >
                <Trash2 size={14} className="mr-2" /> Delete Quote
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expiration Warning */}
      {expired && quote.status !== 'converted' && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-red-600">This quote has expired. Extend the validity to continue.</p>
          </div>
          <Button onClick={() => setShowExtendModal(true)} size="sm" className="bg-red-600 hover:bg-red-700">
            Extend Validity
          </Button>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quote Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quote Items */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <ShoppingBag size={20} />
                Quote Items ({(isEditing ? editedItems : quote.items)?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-800">
                {(isEditing ? editedItems : quote.items)?.map((item, index) => (
                  <div key={index} className="p-4 flex items-center gap-4">
                    <img 
                      src={item.image || 'https://via.placeholder.com/80'} 
                      alt={item.product_name}
                      className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                    />
                    <div className="flex-1">
                      <h4 className="text-gray-900 font-medium">{item.product_name}</h4>
                      <p className="text-gray-500 text-sm">SKU: {item.sku || item.product_id}</p>
                    </div>
                    {isEditing ? (
                      <>
                        <div className="text-right">
                          <label className="text-gray-500 text-xs block mb-1">Price</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateItemPrice(index, e.target.value)}
                            className="w-24 bg-white border border-gray-200 rounded px-2 py-1 text-gray-900 text-right"
                          />
                        </div>
                        <div className="text-right">
                          <label className="text-gray-500 text-xs block mb-1">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, e.target.value)}
                            className="w-16 bg-white border border-gray-200 rounded px-2 py-1 text-gray-900 text-right"
                          />
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className="text-gray-500 text-xs mb-1">Line Total</p>
                          <p className="text-gray-900 font-bold">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                        <button 
                          onClick={() => removeItem(index)}
                          className="p-2 text-red-600 hover:text-red-300 hover:bg-red-500/10 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-right">
                          <p className="text-gray-900 font-medium">{formatCurrency(item.price)}</p>
                          <p className="text-gray-500 text-sm">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className="text-gray-900 font-bold">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Quote Totals */}
              <div className="border-t border-gray-200 p-4 bg-white/30">
                <div className="space-y-2 max-w-xs ml-auto">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>{formatCurrency(isEditing ? totals.subtotal : quote.subtotal)}</span>
                  </div>
                  {isEditing && (
                    <div className="flex justify-between items-center text-gray-500">
                      <span>Discount</span>
                      <input
                        type="number"
                        step="0.01"
                        value={editedDiscount}
                        onChange={(e) => setEditedDiscount(parseFloat(e.target.value) || 0)}
                        className="w-24 bg-white border border-gray-200 rounded px-2 py-1 text-gray-900 text-right"
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-center text-gray-500">
                    <span>Shipping</span>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editedShipping}
                        onChange={(e) => setEditedShipping(parseFloat(e.target.value) || 0)}
                        className="w-24 bg-white border border-gray-200 rounded px-2 py-1 text-gray-900 text-right"
                      />
                    ) : (
                      <span>{quote.shipping > 0 ? formatCurrency(quote.shipping) : 'TBD'}</span>
                    )}
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>GST (10%)</span>
                    <span>{formatCurrency(isEditing ? totals.tax : quote.tax)}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 text-lg font-bold pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>{formatCurrency(isEditing ? totals.total : quote.total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Notes */}
          {quote.notes && (
            <Card className="bg-white border-gray-200">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <MessageSquare size={20} />
                  Customer Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-gray-700">{quote.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Merchant Notes */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="border-b border-gray-200 flex flex-row items-center justify-between">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <FileText size={20} />
                Internal Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <textarea
                value={merchantNote}
                onChange={(e) => setMerchantNote(e.target.value)}
                placeholder="Add internal notes (not visible to customer)..."
                rows={3}
                className="w-full bg-white/50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none"
              />
              {merchantNote !== (quote.merchant_notes || '') && (
                <div className="flex justify-end mt-3">
                  <Button onClick={saveMerchantNote} size="sm" className="bg-amber-600 hover:bg-amber-700">
                    Save Note
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Customer & Quote Info */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <User size={20} />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-gray-900 font-bold text-lg">
                  {quote.customer_name?.charAt(0) || 'C'}
                </div>
                <div>
                  <p className="text-gray-900 font-medium">{quote.customer_name}</p>
                  {quote.company_name && (
                    <p className="text-gray-500 text-sm flex items-center gap-1">
                      <Building size={12} />
                      {quote.company_name}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-gray-700">
                  <Mail size={16} className="text-gray-500" />
                  <a href={`mailto:${quote.customer_email}`} className="hover:text-amber-400">{quote.customer_email}</a>
                </div>
                {quote.customer_phone && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Phone size={16} className="text-gray-500" />
                    <a href={`tel:${quote.customer_phone}`} className="hover:text-amber-400">{quote.customer_phone}</a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <MapPin size={20} />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-gray-700 whitespace-pre-line">{quote.shipping_address}</p>
            </CardContent>
          </Card>

          {/* Quote Details */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <FileText size={20} />
                Quote Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Quote Number</span>
                <span className="text-gray-900 font-mono">{quote.quote_number}</span>
              </div>
              {quote.purchase_order && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Customer PO</span>
                  <span className="text-gray-900">{quote.purchase_order}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status</span>
                <span className={`px-2 py-0.5 rounded text-sm ${statusConfig.color}`}>
                  {expired ? 'Expired' : statusConfig.label}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-900">{formatDate(quote.created_at, false)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Valid Until</span>
                <span className={`${expired ? 'text-red-600' : daysLeft !== null && daysLeft <= 7 ? 'text-yellow-600' : 'text-gray-900'}`}>
                  {formatDate(quote.valid_until, false)}
                </span>
              </div>
              {quote.converted_order_id && (
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-gray-500">Converted Order</span>
                  <Link 
                    to={`/merchant/orders/${quote.converted_order_id}`}
                    className="text-purple-600 hover:underline"
                  >
                    View Order
                  </Link>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-gray-900 font-medium">Quote Total</span>
                <span className="text-gray-900 font-bold text-lg">{formatCurrency(quote.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {quote.status !== 'converted' && (
            <Card className="bg-white border-gray-200">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-gray-900">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {quote.status === 'pending' && (
                  <Button 
                    onClick={() => {
                      setEmailSubject(`Quote ${quote.quote_number} from Tools in a Box`);
                      setShowEmailModal(true);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Send size={16} className="mr-2" />
                    Send Quote to Customer
                  </Button>
                )}
                {(quote.status === 'accepted' || quote.status === 'sent') && (
                  <Button 
                    onClick={() => setShowConvertModal(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <ShoppingCart size={16} className="mr-2" />
                    Convert to Order
                  </Button>
                )}
                <Button 
                  variant="outline"
                  onClick={() => setShowStatusModal(true)}
                  className="w-full border-gray-200 text-gray-700 hover:bg-white"
                >
                  <RefreshCw size={16} className="mr-2" />
                  Update Status
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Update Status Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle>Update Quote Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="bg-white/50 border-gray-200 text-gray-900">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowStatusModal(false)} className="border-gray-200 text-gray-700">
              Cancel
            </Button>
            <Button onClick={updateQuoteStatus} className="bg-amber-600 hover:bg-amber-700">
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Order Modal */}
      <Dialog open={showConvertModal} onOpenChange={setShowConvertModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle>Convert Quote to Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <p className="text-emerald-600 text-sm flex items-center gap-2">
                <CheckCircle size={16} />
                This will create a new order and deduct stock from inventory.
              </p>
            </div>
            <div className="p-4 bg-white/50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Items</span>
                <span className="text-gray-900">{quote.items?.length || 0} items</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-900 font-medium">Total</span>
                <span className="text-gray-900 font-bold">{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowConvertModal(false)} className="border-gray-200 text-gray-700">
              Cancel
            </Button>
            <Button onClick={convertToOrder} className="bg-emerald-600 hover:bg-emerald-700">
              <ShoppingCart size={14} className="mr-2" />
              Convert to Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Validity Modal */}
      <Dialog open={showExtendModal} onOpenChange={setShowExtendModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle>Extend Quote Validity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-gray-500 block mb-2">Extend by</label>
              <Select value={extendDays.toString()} onValueChange={(v) => setExtendDays(parseInt(v))}>
                <SelectTrigger className="bg-white/50 border-gray-200 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-gray-500 text-sm">
              New expiry date: {formatDate(new Date(Date.now() + extendDays * 24 * 60 * 60 * 1000), false)}
            </p>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowExtendModal(false)} className="border-gray-200 text-gray-700">
              Cancel
            </Button>
            <Button onClick={extendValidity} className="bg-amber-600 hover:bg-amber-700">
              Extend Validity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">Delete Quote?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500">
              Are you sure you want to delete this quote? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white border-gray-200 text-gray-700 hover:bg-gray-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={deleteQuote} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Quote Email Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Quote to Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-3 bg-white/50 rounded-lg">
              <p className="text-gray-500 text-sm">To: {quote.customer_email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-2">Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-white/50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-2">Message</label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Add a personalized message..."
                rows={6}
                className="w-full bg-white/50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none"
              />
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-amber-400 text-sm">
                The quote details and PDF will be automatically attached.
              </p>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowEmailModal(false)} className="border-gray-200 text-gray-700">
              Cancel
            </Button>
            <Button onClick={sendQuoteEmail} className="bg-amber-600 hover:bg-amber-700">
              <Send size={14} className="mr-2" />
              Send Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantQuoteDetail;
