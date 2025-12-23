import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  Filter,
  Download,
  Mail,
  MoreVertical,
  Eye,
  UserPlus,
  Star,
  ShoppingBag,
  DollarSign
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter]);

  const fetchCustomers = async () => {
    try {
      let url = `${API}/customers?limit=50`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      const response = await axios.get(url);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'vip': return 'bg-purple-100 text-purple-700';
      case 'inactive': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalCustomers = customers.length;
  const vipCustomers = customers.filter(c => c.status === 'vip').length;
  const totalRevenue = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
  const totalOrders = customers.reduce((sum, c) => sum + (c.total_orders || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <UserPlus size={24} className="text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">VIP Customers</p>
                <p className="text-2xl font-bold text-purple-600">{vipCustomers}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <Star size={24} className="text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <DollarSign size={24} className="text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Avg Order Value</p>
                <p className="text-2xl font-bold text-cyan-600">{formatCurrency(avgOrderValue)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">
                <ShoppingBag size={24} className="text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-white border-gray-200 text-gray-700">
              <Filter size={16} className="mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all" className="text-gray-700">All Status</SelectItem>
              <SelectItem value="active" className="text-gray-700">Active</SelectItem>
              <SelectItem value="vip" className="text-gray-700">VIP</SelectItem>
              <SelectItem value="inactive" className="text-gray-700">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50">
          <Download size={16} className="mr-2" />
          Export
        </Button>
      </div>

      {/* Customers Table */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading customers...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No customers found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-4 px-6 text-gray-600 font-medium text-sm">Customer</th>
                    <th className="text-left py-4 px-6 text-gray-600 font-medium text-sm">Contact</th>
                    <th className="text-left py-4 px-6 text-gray-600 font-medium text-sm">Orders</th>
                    <th className="text-left py-4 px-6 text-gray-600 font-medium text-sm">Total Spent</th>
                    <th className="text-left py-4 px-6 text-gray-600 font-medium text-sm">Status</th>
                    <th className="text-right py-4 px-6 text-gray-600 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-semibold">
                            {customer.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-gray-900 font-medium">{customer.name}</p>
                            <p className="text-gray-500 text-sm">ID: {customer.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-gray-700">{customer.email}</p>
                        <p className="text-gray-500 text-sm">{customer.phone || 'No phone'}</p>
                      </td>
                      <td className="py-4 px-6 text-gray-900 font-medium">
                        {customer.total_orders || 0}
                      </td>
                      <td className="py-4 px-6 text-emerald-600 font-medium">
                        {formatCurrency(customer.total_spent || 0)}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}>
                          {customer.status?.toUpperCase() || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors">
                              <MoreVertical size={18} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border-gray-200">
                            <DropdownMenuItem className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 cursor-pointer">
                              <Eye size={16} className="mr-2" /> View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 cursor-pointer">
                              <ShoppingBag size={16} className="mr-2" /> View Orders
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 cursor-pointer">
                              <Mail size={16} className="mr-2" /> Send Email
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchantCustomers;
