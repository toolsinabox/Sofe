import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Mail,
  Store,
  RefreshCw,
  X,
  AlertCircle,
  LogIn,
  Key,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useAuth } from '../../context/AuthContext';
import { getStoreUrl, isPreviewEnvironment } from '../../utils/platformDetect';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminMerchants = () => {
  const { token } = useAuth();
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [copiedToken, setCopiedToken] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    url: '',
    plan: 'Starter',
    status: 'active',
    logo: ''
  });

  const fetchMerchants = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const params = new URLSearchParams();
      
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (planFilter !== 'all') params.append('plan_id', planFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      // Use platform-stores endpoint to get multi-tenant stores
      const res = await axios.get(`${API_URL}/api/admin/platform-stores?${params}`, { headers });
      setMerchants(res.data);
    } catch (err) {
      console.error('Error fetching merchants:', err);
      setError(err.response?.data?.detail || 'Failed to load merchants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMerchants();
    }
  }, [token, statusFilter, planFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) fetchMerchants();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      url: '',
      plan: 'Starter',
      status: 'active',
      logo: ''
    });
  };

  const handleAddMerchant = async () => {
    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/api/admin/websites`, formData, { headers });
      setIsAddModalOpen(false);
      resetForm();
      fetchMerchants();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create merchant');
    } finally {
      setSaving(false);
    }
  };

  const handleEditMerchant = async () => {
    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/api/admin/websites/${selectedMerchant.id}`, formData, { headers });
      setIsEditModalOpen(false);
      setSelectedMerchant(null);
      resetForm();
      fetchMerchants();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update merchant');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMerchant = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/api/admin/websites/${selectedMerchant.id}`, { headers });
      setIsDeleteModalOpen(false);
      setSelectedMerchant(null);
      fetchMerchants();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete merchant');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (merchant) => {
    setSelectedMerchant(merchant);
    setFormData({
      name: merchant.name,
      email: merchant.email,
      url: merchant.url || '',
      plan: merchant.plan,
      status: merchant.status,
      logo: merchant.logo || ''
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (merchant) => {
    setSelectedMerchant(merchant);
    setIsViewModalOpen(true);
  };

  const openDeleteModal = (merchant) => {
    setSelectedMerchant(merchant);
    setIsDeleteModalOpen(true);
  };

  // Impersonate (Login As) function - actually logs into merchant dashboard
  const handleImpersonate = async (merchant) => {
    setSaving(true);
    setError(null);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_URL}/api/admin/stores/${merchant.id}/impersonate`, {}, { headers });
      
      const impersonateToken = res.data.token;
      const store = res.data.store;
      const owner = res.data.owner;
      
      // Store the impersonation token in localStorage
      localStorage.setItem('token', impersonateToken);
      localStorage.setItem('user', JSON.stringify({
        ...owner,
        role: 'merchant',
        store_id: store.id,
        impersonated: true,
        impersonated_by: 'admin'
      }));
      
      setSuccess(`Logged in as ${owner.email}. Redirecting to merchant dashboard...`);
      
      // Redirect to merchant dashboard
      setTimeout(() => {
        window.location.href = '/merchant';
      }, 1000);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to impersonate merchant');
    } finally {
      setSaving(false);
    }
  };

  // Reset password function
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/api/admin/stores/${selectedMerchant.id}/reset-owner-password`,
        { new_password: newPassword },
        { headers }
      );
      
      setSuccess(`Password reset successfully for ${selectedMerchant.owner_email || selectedMerchant.email}`);
      setIsResetPasswordModalOpen(false);
      setNewPassword('');
      setSelectedMerchant(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  const openResetPasswordModal = (merchant) => {
    setSelectedMerchant(merchant);
    setNewPassword('');
    setIsResetPasswordModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Merchants</h1>
          <p className="text-gray-400 text-sm">Manage all merchant websites on your platform</p>
        </div>
        <button 
          onClick={fetchMerchants}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-lg text-gray-300 text-sm transition-all disabled:opacity-50 mr-3"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-3 sm:px-4 py-2 sm:py-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-3 sm:px-4 py-2 sm:py-3 rounded-lg flex items-center gap-2 text-sm">
          <Check size={16} className="flex-shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search merchants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28 sm:w-36 bg-gray-800/50 border-gray-700 text-gray-300 text-xs sm:text-sm h-9 sm:h-10">
                <Filter size={14} className="mr-1 sm:mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2e] border-gray-700">
                <SelectItem value="all" className="text-gray-300 text-sm">All Status</SelectItem>
                <SelectItem value="active" className="text-gray-300 text-sm">Active</SelectItem>
                <SelectItem value="suspended" className="text-gray-300 text-sm">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-28 sm:w-40 bg-gray-800/50 border-gray-700 text-gray-300 text-xs sm:text-sm h-9 sm:h-10">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2e] border-gray-700">
                <SelectItem value="all" className="text-gray-300 text-sm">All Plans</SelectItem>
                <SelectItem value="Starter" className="text-gray-300 text-sm">Starter</SelectItem>
                <SelectItem value="Professional" className="text-gray-300 text-sm">Professional</SelectItem>
                <SelectItem value="Enterprise" className="text-gray-300 text-sm">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Add Button */}
        <Button 
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-sm h-9 sm:h-10"
        >
          <Plus size={16} className="mr-1.5" />
          Add Merchant
        </Button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="bg-[#151b28] border-gray-800">
              <CardContent className="p-4 sm:p-6">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-700 rounded-xl"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-700 rounded w-20"></div>
                    <div className="h-6 bg-gray-700 rounded w-16"></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                    <div className="h-8 bg-gray-700 rounded"></div>
                    <div className="h-8 bg-gray-700 rounded"></div>
                    <div className="h-8 bg-gray-700 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : merchants.length === 0 ? (
        <div className="text-center py-16">
          <Store size={64} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No merchants found</h3>
          <p className="text-gray-400 mb-6">
            {searchQuery || statusFilter !== 'all' || planFilter !== 'all' 
              ? 'Try adjusting your filters'
              : 'Get started by adding your first merchant'}
          </p>
          {!searchQuery && statusFilter === 'all' && planFilter === 'all' && (
            <Button 
              onClick={() => { resetForm(); setIsAddModalOpen(true); }}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
            >
              <Plus size={18} className="mr-2" />
              Add Merchant
            </Button>
          )}
        </div>
      ) : (
        /* Merchants Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {merchants.map((merchant) => (
            <Card key={merchant.id} className="bg-[#151b28] border-gray-800 hover:border-gray-700 transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {merchant.logo ? (
                      <img
                        src={merchant.logo.startsWith('/api') ? `${API_URL}${merchant.logo}` : merchant.logo}
                        alt={merchant.store_name || merchant.name}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                        <Store size={24} className="text-white" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-white font-semibold">{merchant.store_name || merchant.name}</h3>
                      <p className="text-gray-500 text-sm">{merchant.owner_email || merchant.email}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded hover:bg-gray-800 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={18} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-gray-700">
                      <DropdownMenuItem 
                        onClick={() => openViewModal(merchant)}
                        className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer"
                      >
                        <Eye size={16} className="mr-2" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleImpersonate(merchant)}
                        className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 cursor-pointer"
                      >
                        <LogIn size={16} className="mr-2" /> Login As Owner
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => openResetPasswordModal(merchant)}
                        className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 cursor-pointer"
                      >
                        <Key size={16} className="mr-2" /> Reset Password
                      </DropdownMenuItem>
                      {merchant.subdomain && (
                        <DropdownMenuItem 
                          onClick={() => window.open(getStoreUrl(merchant), '_blank')}
                          className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer"
                        >
                          <ExternalLink size={16} className="mr-2" /> Visit Store
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => openEditModal(merchant)}
                        className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer"
                      >
                        <Edit size={16} className="mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer">
                        <Mail size={16} className="mr-2" /> Send Email
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => openDeleteModal(merchant)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 size={16} className="mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    (merchant.plan_id || merchant.plan) === 'enterprise'
                      ? 'bg-purple-500/20 text-purple-400'
                      : (merchant.plan_id || merchant.plan) === 'professional'
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {(merchant.plan_id || merchant.plan || 'free').charAt(0).toUpperCase() + (merchant.plan_id || merchant.plan || 'free').slice(1)}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    merchant.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : merchant.status === 'trial'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {merchant.status?.charAt(0).toUpperCase() + merchant.status?.slice(1)}
                  </span>
                </div>

                {/* Store URL - shows custom domain if verified, otherwise subdomain */}
                <p className="text-gray-500 text-sm mb-4">
                  {merchant.custom_domain_verified && merchant.custom_domain 
                    ? merchant.custom_domain 
                    : `${merchant.subdomain}.getcelora.com`}
                </p>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Products</p>
                    <p className="text-white font-semibold text-sm">{formatCurrency(merchant.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Orders</p>
                    <p className="text-white font-semibold text-sm">{(merchant.order_count || merchant.orders || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Customers</p>
                    <p className="text-white font-semibold text-sm">{(merchant.customer_count || merchant.customers || 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Merchant Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Add New Merchant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Business Name *</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white" 
                placeholder="Enter business name" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Email Address *</Label>
              <Input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white" 
                placeholder="admin@business.com" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Website URL</Label>
              <Input 
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white" 
                placeholder="https://example.com" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Plan</Label>
                <Select value={formData.plan} onValueChange={(v) => setFormData({ ...formData, plan: v })}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-gray-300">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1f2e] border-gray-700">
                    <SelectItem value="Starter" className="text-gray-300">Starter</SelectItem>
                    <SelectItem value="Professional" className="text-gray-300">Professional</SelectItem>
                    <SelectItem value="Enterprise" className="text-gray-300">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-gray-300">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1f2e] border-gray-700">
                    <SelectItem value="active" className="text-gray-300">Active</SelectItem>
                    <SelectItem value="suspended" className="text-gray-300">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Logo URL</Label>
              <Input 
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white" 
                placeholder="https://example.com/logo.png" 
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button 
                variant="ghost" 
                onClick={() => setIsAddModalOpen(false)} 
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddMerchant}
                disabled={saving}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
              >
                {saving ? 'Creating...' : 'Create Merchant'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Merchant Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Edit Merchant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Business Name *</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white" 
                placeholder="Enter business name" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Email Address *</Label>
              <Input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white" 
                placeholder="admin@business.com" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Website URL</Label>
              <Input 
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white" 
                placeholder="https://example.com" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Plan</Label>
                <Select value={formData.plan} onValueChange={(v) => setFormData({ ...formData, plan: v })}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-gray-300">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1f2e] border-gray-700">
                    <SelectItem value="Starter" className="text-gray-300">Starter</SelectItem>
                    <SelectItem value="Professional" className="text-gray-300">Professional</SelectItem>
                    <SelectItem value="Enterprise" className="text-gray-300">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-gray-300">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1f2e] border-gray-700">
                    <SelectItem value="active" className="text-gray-300">Active</SelectItem>
                    <SelectItem value="suspended" className="text-gray-300">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Logo URL</Label>
              <Input 
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white" 
                placeholder="https://example.com/logo.png" 
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button 
                variant="ghost" 
                onClick={() => setIsEditModalOpen(false)} 
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEditMerchant}
                disabled={saving}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Merchant Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Merchant Details</DialogTitle>
          </DialogHeader>
          {selectedMerchant && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center gap-4">
                {selectedMerchant.logo ? (
                  <img
                    src={selectedMerchant.logo.startsWith('/api') ? `${API_URL}${selectedMerchant.logo}` : selectedMerchant.logo}
                    alt={selectedMerchant.name}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Store size={32} className="text-white" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedMerchant.name}</h3>
                  <p className="text-gray-400">{selectedMerchant.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-800/30 rounded-lg">
                  <p className="text-gray-400 text-sm">Plan</p>
                  <p className="text-white font-medium">{selectedMerchant.plan}</p>
                </div>
                <div className="p-4 bg-gray-800/30 rounded-lg">
                  <p className="text-gray-400 text-sm">Status</p>
                  <span className={`px-2 py-0.5 rounded text-sm font-medium ${
                    selectedMerchant.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {selectedMerchant.status?.charAt(0).toUpperCase() + selectedMerchant.status?.slice(1)}
                  </span>
                </div>
              </div>

              {selectedMerchant.url && (
                <div className="p-4 bg-gray-800/30 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Website URL</p>
                  <a 
                    href={selectedMerchant.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    {selectedMerchant.url}
                  </a>
                </div>
              )}

              {/* Subdomain & Custom Domain Info */}
              <div className="p-4 bg-gray-800/30 rounded-lg space-y-3">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Subdomain</p>
                  <p className="text-cyan-400 font-mono">{selectedMerchant.subdomain}.getcelora.com</p>
                </div>
                {selectedMerchant.custom_domain && (
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Custom Domain</p>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-mono">{selectedMerchant.custom_domain}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        selectedMerchant.custom_domain_verified
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {selectedMerchant.custom_domain_verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                )}
                {selectedMerchant.domain_verification_token && (
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Verification Token</p>
                    <code className="text-purple-400 bg-purple-500/10 px-2 py-1 rounded text-xs break-all">
                      {selectedMerchant.domain_verification_token}
                    </code>
                  </div>
                )}
                {selectedMerchant.theme && (
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Active Theme</p>
                    <p className="text-white">{selectedMerchant.theme}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-gray-800/30 rounded-lg text-center">
                  <p className="text-gray-400 text-xs mb-1">Revenue</p>
                  <p className="text-white font-semibold">{formatCurrency(selectedMerchant.revenue)}</p>
                </div>
                <div className="p-4 bg-gray-800/30 rounded-lg text-center">
                  <p className="text-gray-400 text-xs mb-1">Orders</p>
                  <p className="text-white font-semibold">{(selectedMerchant.orders || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-800/30 rounded-lg text-center">
                  <p className="text-gray-400 text-xs mb-1">Products</p>
                  <p className="text-white font-semibold">{(selectedMerchant.products || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-800/30 rounded-lg text-center">
                  <p className="text-gray-400 text-xs mb-1">Customers</p>
                  <p className="text-white font-semibold">{(selectedMerchant.customers || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="p-4 bg-gray-800/30 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Joined</p>
                <p className="text-white">{new Date(selectedMerchant.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
              </div>

              <div className="flex justify-end gap-3">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsViewModalOpen(false)} 
                  className="text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    setIsViewModalOpen(false);
                    openEditModal(selectedMerchant);
                  }}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                >
                  <Edit size={16} className="mr-2" />
                  Edit Merchant
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-red-400">Delete Merchant</DialogTitle>
          </DialogHeader>
          {selectedMerchant && (
            <div className="space-y-4 mt-4">
              <p className="text-gray-300">
                Are you sure you want to delete <span className="text-white font-semibold">{selectedMerchant.name}</span>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsDeleteModalOpen(false)} 
                  className="text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleDeleteMerchant}
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {saving ? 'Deleting...' : 'Delete Merchant'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={isResetPasswordModalOpen} onOpenChange={setIsResetPasswordModalOpen}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-yellow-400 flex items-center gap-2">
              <Key size={20} /> Reset Owner Password
            </DialogTitle>
          </DialogHeader>
          {selectedMerchant && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-gray-800/30 rounded-lg">
                <p className="text-gray-400 text-sm">Store</p>
                <p className="text-white font-medium">{selectedMerchant.store_name || selectedMerchant.name}</p>
                <p className="text-gray-400 text-sm mt-2">Owner Email</p>
                <p className="text-cyan-400">{selectedMerchant.owner_email || selectedMerchant.email}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-gray-300">New Password *</Label>
                <Input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-gray-800/50 border-gray-700 text-white" 
                  placeholder="Enter new password (min 6 characters)" 
                />
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-400 text-sm">
                  ⚠️ This will immediately change the store owner&apos;s password. 
                  Make sure to communicate the new password to them securely.
                </p>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button 
                  variant="ghost" 
                  onClick={() => { setIsResetPasswordModalOpen(false); setNewPassword(''); }} 
                  className="text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleResetPassword}
                  disabled={saving || !newPassword || newPassword.length < 6}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  {saving ? 'Resetting...' : 'Reset Password'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMerchants;
