import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  MoreVertical,
  Eye,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar,
  DollarSign,
  Mail,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowRight,
  Send,
  Edit,
  Trash2,
  Copy,
  Building,
  User,
  ShoppingCart,
  Timer,
  TrendingUp,
  ArrowUpRight
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

const MerchantQuotes = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalQuotes, setTotalQuotes] = useState(0);
  const quotesPerPage = 20;
  
  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  
  // Form states
  const [newStatus, setNewStatus] = useState('');
  const [merchantNote, setMerchantNote] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  // Statistics
  const [stats, setStats] = useState({
    totalQuotes: 0,
    pendingQuotes: 0,
    acceptedQuotes: 0,
    totalValue: 0,
    conversionRate: 0
  });

  useEffect(() => {
    fetchQuotes();
    fetchStats();
  }, [statusFilter, currentPage]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      let url = `${API}/quotes?limit=${quotesPerPage}&skip=${(currentPage - 1) * quotesPerPage}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      const response = await axios.get(url);
      setQuotes(response.data);
      setTotalQuotes(response.data.length);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/quotes/stats`);
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      // Set default stats based on current data
      const pending = quotes.filter(q => q.status === 'pending').length;
      const accepted = quotes.filter(q => q.status === 'accepted' || q.status === 'converted').length;
      const total = quotes.reduce((sum, q) => sum + (q.total || 0), 0);
      setStats({
        totalQuotes: quotes.length,
        pendingQuotes: pending,
        acceptedQuotes: accepted,
        totalValue: total,
        conversionRate: quotes.length > 0 ? (accepted / quotes.length * 100).toFixed(1) : 0
      });
    }
  };

  const updateQuoteStatus = async () => {
    if (!selectedQuote || !newStatus) return;
    try {
      await axios.put(`${API}/quotes/${selectedQuote.id}`, { status: newStatus });
      fetchQuotes();
      setShowStatusModal(false);
      setSelectedQuote(null);
    } catch (error) {
      console.error('Error updating quote status:', error);
    }
  };

  const convertToOrder = async () => {
    if (!selectedQuote) return;
    try {
      const response = await axios.post(`${API}/quotes/${selectedQuote.id}/convert-to-order`);
      setShowConvertModal(false);
      setSelectedQuote(null);
      fetchQuotes();
      // Navigate to the new order
      if (response.data?.order_id) {
        navigate(`/merchant/orders/${response.data.order_id}`);
      }
    } catch (error) {
      console.error('Error converting quote:', error);
      alert(error.response?.data?.detail || 'Failed to convert quote');
    }
  };

  const deleteQuote = async () => {
    if (!selectedQuote) return;
    try {
      await axios.delete(`${API}/quotes/${selectedQuote.id}`);
      setShowDeleteDialog(false);
      setSelectedQuote(null);
      fetchQuotes();
    } catch (error) {
      console.error('Error deleting quote:', error);
    }
  };

  const addMerchantNote = async () => {
    if (!selectedQuote || !merchantNote.trim()) return;
    try {
      await axios.put(`${API}/quotes/${selectedQuote.id}`, {
        merchant_notes: merchantNote
      });
      setShowNoteModal(false);
      setMerchantNote('');
      fetchQuotes();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const sendQuoteEmail = async () => {
    if (!selectedQuote) return;
    try {
      await axios.post(`${API}/quotes/${selectedQuote.id}/send`, {
        subject: emailSubject,
        body: emailBody
      });
      // Update status to 'sent'
      await axios.put(`${API}/quotes/${selectedQuote.id}`, { status: 'sent' });
      setShowEmailModal(false);
      setEmailSubject('');
      setEmailBody('');
      fetchQuotes();
    } catch (error) {
      console.error('Error sending quote:', error);
    }
  };

  const duplicateQuote = async (quote) => {
    try {
      const newQuote = {
        ...quote,
        id: undefined,
        quote_number: undefined,
        status: 'pending',
        created_at: undefined,
        updated_at: undefined
      };
      await axios.post(`${API}/quotes`, newQuote);
      fetchQuotes();
    } catch (error) {
      console.error('Error duplicating quote:', error);
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
      year: 'numeric'
    });
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { icon: Clock, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Pending' },
      sent: { icon: Send, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Sent' },
      accepted: { icon: CheckCircle, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Accepted' },
      rejected: { icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Rejected' },
      expired: { icon: Timer, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'Expired' },
      converted: { icon: ShoppingCart, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Converted' }
    };
    return configs[status] || configs.pending;
  };

  const isExpired = (validUntil) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const getDaysUntilExpiry = (validUntil) => {
    if (!validUntil) return null;
    const days = Math.ceil((new Date(validUntil) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = 
      quote.quote_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const quoteCounts = {
    all: quotes.length,
    pending: quotes.filter(q => q.status === 'pending').length,
    sent: quotes.filter(q => q.status === 'sent').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
    rejected: quotes.filter(q => q.status === 'rejected').length,
    expired: quotes.filter(q => q.status === 'expired').length,
    converted: quotes.filter(q => q.status === 'converted').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Quotes</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.totalQuotes || quotes.length}</p>
                <p className="text-amber-400 text-sm mt-1 flex items-center gap-1">
                  <FileText size={14} /> All time
                </p>
              </div>
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <FileText className="text-amber-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending Review</p>
                <p className="text-3xl font-bold text-white mt-1">{quoteCounts.pending + quoteCounts.sent}</p>
                <p className="text-yellow-400 text-sm mt-1">Awaiting response</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <Clock className="text-yellow-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Quote Value</p>
                <p className="text-3xl font-bold text-white mt-1">{formatCurrency(stats.totalValue || quotes.reduce((s, q) => s + (q.total || 0), 0))}</p>
                <p className="text-emerald-400 text-sm mt-1 flex items-center gap-1">
                  <ArrowUpRight size={14} /> Pipeline value
                </p>
              </div>
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <DollarSign className="text-emerald-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Conversion Rate</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {quotes.length > 0 ? ((quoteCounts.converted / quotes.length) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-purple-400 text-sm mt-1 flex items-center gap-1">
                  <TrendingUp size={14} /> Quote to order
                </p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <TrendingUp className="text-purple-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['all', 'pending', 'sent', 'accepted', 'rejected', 'expired', 'converted'].map((status) => {
          const config = status !== 'all' ? getStatusConfig(status) : null;
          return (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                statusFilter === status
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-gray-800/50 text-gray-400 border border-gray-800 hover:text-white hover:border-gray-700'
              }`}
            >
              {config && <config.icon size={14} />}
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="px-1.5 py-0.5 rounded bg-gray-800/80 text-xs">
                {quoteCounts[status]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search by quote #, customer, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={() => fetchQuotes()} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
            <Download size={16} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Quotes Table */}
      <Card className="bg-[#151b28] border-gray-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="animate-spin mx-auto text-gray-500 mb-2" size={24} />
              <p className="text-gray-500">Loading quotes...</p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto text-gray-600 mb-3" size={48} />
              <p className="text-gray-400 font-medium">No quotes found</p>
              <p className="text-gray-500 text-sm mt-1">Quote requests from customers will appear here</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-800/30">
                      <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Quote</th>
                      <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Customer</th>
                      <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Items</th>
                      <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Total</th>
                      <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Status</th>
                      <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Valid Until</th>
                      <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Created</th>
                      <th className="text-right py-4 px-6 text-gray-400 font-medium text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuotes.map((quote) => {
                      const statusConfig = getStatusConfig(quote.status);
                      const StatusIcon = statusConfig.icon;
                      const expired = isExpired(quote.valid_until) && quote.status !== 'converted' && quote.status !== 'rejected';
                      const daysLeft = getDaysUntilExpiry(quote.valid_until);
                      
                      return (
                        <tr 
                          key={quote.id} 
                          className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
                          onClick={() => navigate(`/merchant/quotes/${quote.id}`)}
                        >
                          <td className="py-4 px-6">
                            <div>
                              <span className="text-white font-medium">{quote.quote_number}</span>
                              {quote.purchase_order && (
                                <p className="text-gray-500 text-xs mt-0.5">PO: {quote.purchase_order}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div>
                              <p className="text-white font-medium">{quote.customer_name}</p>
                              {quote.company_name && (
                                <p className="text-gray-500 text-sm flex items-center gap-1">
                                  <Building size={12} />
                                  {quote.company_name}
                                </p>
                              )}
                              <p className="text-gray-500 text-sm">{quote.customer_email}</p>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              {quote.items?.slice(0, 2).map((item, idx) => (
                                <img 
                                  key={idx}
                                  src={item.image || 'https://via.placeholder.com/32'} 
                                  alt="" 
                                  className="w-8 h-8 rounded object-cover border border-gray-700"
                                />
                              ))}
                              {(quote.items?.length || 0) > 2 && (
                                <span className="text-gray-400 text-xs">+{quote.items.length - 2}</span>
                              )}
                              <span className="text-gray-400 text-sm ml-1">
                                {quote.items?.reduce((sum, i) => sum + i.quantity, 0) || 0} items
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-white font-medium">{formatCurrency(quote.total)}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              expired ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' : statusConfig.color
                            }`}>
                              <StatusIcon size={12} />
                              {expired ? 'Expired' : statusConfig.label}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div>
                              <span className={`text-sm ${expired ? 'text-red-400' : daysLeft !== null && daysLeft <= 7 ? 'text-yellow-400' : 'text-gray-400'}`}>
                                {formatDate(quote.valid_until)}
                              </span>
                              {daysLeft !== null && daysLeft > 0 && !expired && (
                                <p className="text-gray-500 text-xs">
                                  {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-gray-400 text-sm">
                            {formatDate(quote.created_at)}
                          </td>
                          <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-2 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
                                  <MoreVertical size={18} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-gray-700 w-56">
                                <DropdownMenuItem 
                                  className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer"
                                  onClick={() => navigate(`/merchant/quotes/${quote.id}`)}
                                >
                                  <Eye size={14} className="mr-2" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-gray-700" />
                                {quote.status === 'pending' && (
                                  <DropdownMenuItem 
                                    className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer"
                                    onClick={() => {
                                      setSelectedQuote(quote);
                                      setEmailSubject(`Quote ${quote.quote_number} from Tools in a Box`);
                                      setShowEmailModal(true);
                                    }}
                                  >
                                    <Send size={14} className="mr-2" /> Send to Customer
                                  </DropdownMenuItem>
                                )}
                                {(quote.status === 'accepted' || quote.status === 'sent') && (
                                  <DropdownMenuItem 
                                    className="text-emerald-400 hover:text-emerald-300 hover:bg-gray-700/50 cursor-pointer"
                                    onClick={() => { setSelectedQuote(quote); setShowConvertModal(true); }}
                                  >
                                    <ShoppingCart size={14} className="mr-2" /> Convert to Order
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer"
                                  onClick={() => { setSelectedQuote(quote); setNewStatus(quote.status); setShowStatusModal(true); }}
                                >
                                  <RefreshCw size={14} className="mr-2" /> Update Status
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer"
                                  onClick={() => { setSelectedQuote(quote); setMerchantNote(quote.merchant_notes || ''); setShowNoteModal(true); }}
                                >
                                  <FileText size={14} className="mr-2" /> Add Note
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer"
                                  onClick={() => duplicateQuote(quote)}
                                >
                                  <Copy size={14} className="mr-2" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-gray-700" />
                                <DropdownMenuItem 
                                  className="text-red-400 hover:text-red-300 hover:bg-gray-700/50 cursor-pointer"
                                  onClick={() => { setSelectedQuote(quote); setShowDeleteDialog(true); }}
                                >
                                  <Trash2 size={14} className="mr-2" /> Delete Quote
                                </DropdownMenuItem>
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
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
                <p className="text-gray-400 text-sm">
                  Showing {((currentPage - 1) * quotesPerPage) + 1} - {Math.min(currentPage * quotesPerPage, totalQuotes)} of {totalQuotes} quotes
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <span className="text-gray-400 text-sm px-2">
                    Page {currentPage} of {Math.ceil(totalQuotes / quotesPerPage) || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage >= Math.ceil(totalQuotes / quotesPerPage)}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
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
        <DialogContent className="bg-[#151b28] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Update Quote Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Quote: {selectedQuote?.quote_number}</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-gray-700">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowStatusModal(false)} className="border-gray-700 text-gray-300">
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
        <DialogContent className="bg-[#151b28] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Convert Quote to Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <p className="text-emerald-400 text-sm flex items-center gap-2">
                <CheckCircle size={16} />
                This will create a new order and deduct stock from inventory.
              </p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Quote</span>
                <span className="text-white">{selectedQuote?.quote_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Customer</span>
                <span className="text-white">{selectedQuote?.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Items</span>
                <span className="text-white">{selectedQuote?.items?.length || 0} items</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-700">
                <span className="text-white font-medium">Total</span>
                <span className="text-white font-bold">{formatCurrency(selectedQuote?.total)}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowConvertModal(false)} className="border-gray-700 text-gray-300">
              Cancel
            </Button>
            <Button onClick={convertToOrder} className="bg-emerald-600 hover:bg-emerald-700">
              <ShoppingCart size={14} className="mr-2" />
              Convert to Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#151b28] border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Quote?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete quote {selectedQuote?.quote_number}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={deleteQuote} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Note Modal */}
      <Dialog open={showNoteModal} onOpenChange={setShowNoteModal}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Merchant Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Quote: {selectedQuote?.quote_number}</label>
              <textarea
                value={merchantNote}
                onChange={(e) => setMerchantNote(e.target.value)}
                placeholder="Internal notes (not visible to customer)..."
                rows={4}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowNoteModal(false)} className="border-gray-700 text-gray-300">
              Cancel
            </Button>
            <Button onClick={addMerchantNote} className="bg-amber-600 hover:bg-amber-700">
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Quote Email Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Quote to Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <p className="text-gray-400 text-sm">To: {selectedQuote?.customer_email}</p>
              {selectedQuote?.company_name && (
                <p className="text-gray-400 text-sm">{selectedQuote.company_name}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Message</label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Add a personalized message..."
                rows={6}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none"
              />
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-amber-400 text-sm">
                The quote details and PDF will be automatically attached to this email.
              </p>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowEmailModal(false)} className="border-gray-700 text-gray-300">
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

export default MerchantQuotes;
