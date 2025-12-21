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
    if (status === 'out_of_stock') return 'bg-red-500/20 text-red-400';
    if (status === 'low_stock') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-emerald-500/20 text-emerald-400';
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
        <Card className="bg-[#151b28] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Products</p>
                <p className="text-2xl font-bold text-white">{inventory.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                <Package size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#151b28] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Units</p>
                <p className="text-2xl font-bold text-white">{totalUnits.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <TrendingUp size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#151b28] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-400">{lowStockItems.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                <AlertTriangle size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#151b28] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Out of Stock</p>
                <p className="text-2xl font-bold text-red-400">{outOfStockItems.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                <TrendingDown size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-yellow-400" size={24} />
              <div>
                <p className="text-yellow-400 font-medium">Inventory Alert</p>
                <p className="text-yellow-400/70 text-sm">
                  {lowStockItems.length} items low on stock, {outOfStockItems.length} items out of stock.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
          <Download size={16} className="mr-2" />
          Export
        </Button>
      </div>

      {/* Inventory Table */}
      <Card className="bg-[#151b28] border-gray-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading inventory...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">SKU</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Product Name</th>
                    <th 
                      className="text-left py-4 px-6 text-gray-400 font-medium text-sm cursor-pointer hover:text-white"
                      onClick={() => handleSort('stock')}
                    >
                      <div className="flex items-center gap-2">
                        Stock
                        <ArrowUpDown size={14} />
                      </div>
                    </th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Status</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Update Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-6">
                        <span className="text-cyan-400 font-mono text-sm">{item.sku}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-white font-medium">{item.name}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${
                            item.stock === 0 ? 'text-red-400' :
                            item.stock <= 10 ? 'text-yellow-400' :
                            'text-white'
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
                            className="w-24 bg-gray-800/50 border-gray-700 text-white text-sm"
                            min="0"
                            id={`stock-${item.id}`}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
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
