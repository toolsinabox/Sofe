import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  AlertTriangle,
  ArrowUpDown,
  Download,
  Package,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('stock');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await axios.get(`${API}/inventory`);
      setInventory(response.data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (productId, newStock) => {
    try {
      await axios.put(`${API}/inventory/${productId}?stock=${newStock}`);
      fetchInventory();
    } catch (error) {
      console.error('Error updating inventory:', error);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredInventory = inventory
    .filter(item => 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  const lowStockItems = inventory.filter(item => item.status === 'low_stock');
  const outOfStockItems = inventory.filter(item => item.status === 'out_of_stock');
  const totalUnits = inventory.reduce((sum, item) => sum + item.stock, 0);

  const getStatusColor = (status) => {
    if (status === 'out_of_stock') return 'bg-red-100 text-red-700';
    if (status === 'low_stock') return 'bg-yellow-100 text-yellow-700';
    return 'bg-emerald-100 text-emerald-700';
  };

  const getStatusLabel = (status) => {
    if (status === 'out_of_stock') return 'Out of Stock';
    if (status === 'low_stock') return 'Low Stock';
    return 'In Stock';
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Package size={24} className="text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Units</p>
                <p className="text-2xl font-bold text-gray-900">{totalUnits.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp size={24} className="text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center">
                <AlertTriangle size={24} className="text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockItems.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <TrendingDown size={24} className="text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50">
          <Download size={16} className="mr-2" />
          Export
        </Button>
      </div>

      {/* Inventory Table */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading inventory...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-4 px-6 text-gray-600 font-medium text-sm">SKU</th>
                    <th className="text-left py-4 px-6 text-gray-600 font-medium text-sm">Product Name</th>
                    <th 
                      className="text-left py-4 px-6 text-gray-600 font-medium text-sm cursor-pointer hover:text-gray-900"
                      onClick={() => handleSort('stock')}
                    >
                      <div className="flex items-center gap-2">
                        Stock
                        <ArrowUpDown size={14} />
                      </div>
                    </th>
                    <th className="text-left py-4 px-6 text-gray-600 font-medium text-sm">Status</th>
                    <th className="text-left py-4 px-6 text-gray-600 font-medium text-sm">Update Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <span className="text-blue-600 font-mono text-sm">{item.sku}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-gray-900 font-medium">{item.name}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${
                            item.stock === 0 ? 'text-red-600' :
                            item.stock <= 10 ? 'text-yellow-600' :
                            'text-gray-900'
                          }`}>
                            {item.stock}
                          </span>
                          <span className="text-gray-500 text-sm">units</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            defaultValue={item.stock}
                            className="w-24 bg-gray-50 border-gray-200 text-gray-900 text-sm"
                            min="0"
                            id={`stock-${item.id}`}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-200 text-gray-700 hover:bg-gray-50"
                            onClick={() => {
                              const input = document.getElementById(`stock-${item.id}`);
                              updateStock(item.id, parseInt(input.value) || 0);
                            }}
                          >
                            Update
                          </Button>
                        </div>
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

export default MerchantInventory;
