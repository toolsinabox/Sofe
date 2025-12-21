import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Mail,
  Store
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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
  DialogTrigger,
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
import { merchants } from '../../data/mock';

const AdminMerchants = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const filteredMerchants = merchants.filter(merchant => {
    const matchesSearch = merchant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      merchant.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || merchant.status === statusFilter;
    const matchesPlan = planFilter === 'all' || merchant.plan === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search merchants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-gray-800/50 border-gray-700 text-gray-300">
              <Filter size={16} className="mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1f2e] border-gray-700">
              <SelectItem value="all" className="text-gray-300">All Status</SelectItem>
              <SelectItem value="active" className="text-gray-300">Active</SelectItem>
              <SelectItem value="suspended" className="text-gray-300">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-40 bg-gray-800/50 border-gray-700 text-gray-300">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1f2e] border-gray-700">
              <SelectItem value="all" className="text-gray-300">All Plans</SelectItem>
              <SelectItem value="Starter" className="text-gray-300">Starter</SelectItem>
              <SelectItem value="Professional" className="text-gray-300">Professional</SelectItem>
              <SelectItem value="Enterprise" className="text-gray-300">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white">
              <Plus size={18} className="mr-2" />
              Add Merchant
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Add New Merchant</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Business Name</Label>
                <Input className="bg-gray-800/50 border-gray-700 text-white" placeholder="Enter business name" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Email Address</Label>
                <Input type="email" className="bg-gray-800/50 border-gray-700 text-white" placeholder="admin@business.com" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Plan</Label>
                <Select>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-gray-300">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1f2e] border-gray-700">
                    <SelectItem value="starter" className="text-gray-300">Starter</SelectItem>
                    <SelectItem value="professional" className="text-gray-300">Professional</SelectItem>
                    <SelectItem value="enterprise" className="text-gray-300">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white hover:bg-gray-800">
                  Cancel
                </Button>
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white">
                  Create Merchant
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Merchants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMerchants.map((merchant) => (
          <Card key={merchant.id} className="bg-[#151b28] border-gray-800 hover:border-gray-700 transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={merchant.logo}
                    alt={merchant.name}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  <div>
                    <h3 className="text-white font-semibold">{merchant.name}</h3>
                    <p className="text-gray-500 text-sm">{merchant.email}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded hover:bg-gray-800 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical size={18} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-gray-700">
                    <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer">
                      <Eye size={16} className="mr-2" /> View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer">
                      <Edit size={16} className="mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer">
                      <Mail size={16} className="mr-2" /> Send Email
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer">
                      <Trash2 size={16} className="mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  merchant.plan === 'Enterprise'
                    ? 'bg-purple-500/20 text-purple-400'
                    : merchant.plan === 'Professional'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {merchant.plan}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  merchant.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {merchant.status.charAt(0).toUpperCase() + merchant.status.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Revenue</p>
                  <p className="text-white font-semibold text-sm">{formatCurrency(merchant.revenue)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Orders</p>
                  <p className="text-white font-semibold text-sm">{merchant.orders.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Products</p>
                  <p className="text-white font-semibold text-sm">{merchant.products}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminMerchants;
