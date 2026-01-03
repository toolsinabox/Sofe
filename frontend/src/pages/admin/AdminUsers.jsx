import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  User,
  Shield,
  ShieldCheck,
  RefreshCw,
  X,
  AlertCircle,
  Key,
  LogIn,
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
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminUsers = () => {
  const { token, user: currentUser, login } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'merchant',
    is_active: true
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const params = new URLSearchParams();
      
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await axios.get(`${API_URL}/api/admin/users?${params}`, { headers });
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token, roleFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'merchant',
      is_active: true
    });
  };

  const handleAddUser = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      setError('Name, email, and password are required');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/api/admin/users`, formData, { headers });
      setIsAddModalOpen(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = async () => {
    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const updateData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        is_active: formData.is_active
      };
      await axios.put(`${API_URL}/api/admin/users/${selectedUser.id}`, updateData, { headers });
      setIsEditModalOpen(false);
      setSelectedUser(null);
      resetForm();
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/api/admin/users/${selectedUser.id}`, { headers });
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete user');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      is_active: user.is_active !== false
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const openResetPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setIsResetPasswordModalOpen(true);
  };

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
        `${API_URL}/api/admin/users/${selectedUser.id}/reset-password`,
        { new_password: newPassword },
        { headers }
      );
      
      setSuccess(`Password reset successfully for ${selectedUser.email}`);
      setIsResetPasswordModalOpen(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  const handleImpersonate = async (user) => {
    setSaving(true);
    setError(null);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_URL}/api/admin/users/${user.id}/impersonate`, {}, { headers });
      
      // Copy token to clipboard
      navigator.clipboard.writeText(res.data.access_token);
      
      setSuccess(`Login token copied for ${user.email}! Use it to login as this user.`);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to impersonate user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-400 text-sm">Manage admin and merchant accounts</p>
        </div>
        <button 
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-lg text-gray-300 text-sm transition-all disabled:opacity-50 mr-3"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={18} />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check size={18} />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40 bg-gray-800/50 border-gray-700 text-gray-300">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1f2e] border-gray-700">
              <SelectItem value="all" className="text-gray-300">All Roles</SelectItem>
              <SelectItem value="admin" className="text-gray-300">Admin</SelectItem>
              <SelectItem value="merchant" className="text-gray-300">Merchant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
        >
          <Plus size={18} className="mr-2" />
          Add User
        </Button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="bg-[#151b28] border-gray-800">
              <CardContent className="p-4">
                <div className="animate-pulse flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/3"></div>
                  </div>
                  <div className="h-6 bg-gray-700 rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16">
          <User size={64} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No users found</h3>
          <p className="text-gray-400 mb-6">
            {searchQuery || roleFilter !== 'all' 
              ? 'Try adjusting your filters'
              : 'Get started by adding your first user'}
          </p>
          {!searchQuery && roleFilter === 'all' && (
            <Button 
              onClick={() => { resetForm(); setIsAddModalOpen(true); }}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
            >
              <Plus size={18} className="mr-2" />
              Add User
            </Button>
          )}
        </div>
      ) : (
        /* Users List */
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id} className="bg-[#151b28] border-gray-800 hover:border-gray-700 transition-all duration-300 group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      user.role === 'admin' 
                        ? 'bg-gradient-to-br from-purple-500 to-pink-600' 
                        : 'bg-gradient-to-br from-cyan-500 to-blue-600'
                    }`}>
                      {user.role === 'admin' ? (
                        <ShieldCheck size={24} className="text-white" />
                      ) : (
                        <User size={24} className="text-white" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold">{user.name}</h3>
                        {currentUser?.id === user.id && (
                          <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">You</span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        <div className="flex items-center gap-1">
                          {user.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                          {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                        </div>
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.is_active !== false
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {user.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded hover:bg-gray-800 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical size={18} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-gray-700">
                        <DropdownMenuItem 
                          onClick={() => openEditModal(user)}
                          className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer"
                        >
                          <Edit size={16} className="mr-2" /> Edit
                        </DropdownMenuItem>
                        {currentUser?.id !== user.id && (
                          <>
                            <DropdownMenuItem 
                              onClick={() => handleImpersonate(user)}
                              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 cursor-pointer"
                            >
                              <LogIn size={16} className="mr-2" /> Login As
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openResetPasswordModal(user)}
                              className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 cursor-pointer"
                            >
                              <Key size={16} className="mr-2" /> Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteModal(user)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                            >
                              <Trash2 size={16} className="mr-2" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add User Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Name *</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white" 
                placeholder="Enter name" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Email Address *</Label>
              <Input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white" 
                placeholder="user@example.com" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Password *</Label>
              <Input 
                type="password" 
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white" 
                placeholder="Enter password" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-gray-300">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-gray-700">
                  <SelectItem value="merchant" className="text-gray-300">Merchant</SelectItem>
                  <SelectItem value="admin" className="text-gray-300">Admin</SelectItem>
                </SelectContent>
              </Select>
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
                onClick={handleAddUser}
                disabled={saving}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
              >
                {saving ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Name *</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white" 
                placeholder="Enter name" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Email Address *</Label>
              <Input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white" 
                placeholder="user@example.com" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-gray-300">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1f2e] border-gray-700">
                    <SelectItem value="merchant" className="text-gray-300">Merchant</SelectItem>
                    <SelectItem value="admin" className="text-gray-300">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Status</Label>
                <Select 
                  value={formData.is_active ? 'active' : 'inactive'} 
                  onValueChange={(v) => setFormData({ ...formData, is_active: v === 'active' })}
                >
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-gray-300">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1f2e] border-gray-700">
                    <SelectItem value="active" className="text-gray-300">Active</SelectItem>
                    <SelectItem value="inactive" className="text-gray-300">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                onClick={handleEditUser}
                disabled={saving}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-red-400">Delete User</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 mt-4">
              <p className="text-gray-300">
                Are you sure you want to delete <span className="text-white font-semibold">{selectedUser.name}</span>? 
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
                  onClick={handleDeleteUser}
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {saving ? 'Deleting...' : 'Delete User'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
