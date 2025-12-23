import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package,
  Download, Calendar, ArrowUpRight, ArrowDownRight, Target, RefreshCw,
  PieChart, Activity, Layers, Filter
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MerchantAdvancedAnalytics() {
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [salesSummary, setSalesSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [customerOverview, setCustomerOverview] = useState(null);
  const [customerSegments, setCustomerSegments] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [inventoryOverview, setInventoryOverview] = useState(null);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        dashboardRes,
        salesRes,
        categoryRes,
        productRes,
        customerRes,
        segmentsRes,
        topCustomersRes,
        inventoryRes
      ] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/analytics/dashboard`, { params: { period } }),
        axios.get(`${BACKEND_URL}/api/analytics/sales/summary`, { params: { period } }),
        axios.get(`${BACKEND_URL}/api/analytics/sales/by-category`, { params: { period } }),
        axios.get(`${BACKEND_URL}/api/analytics/sales/by-product`, { params: { period } }),
        axios.get(`${BACKEND_URL}/api/analytics/customers/overview`, { params: { period } }),
        axios.get(`${BACKEND_URL}/api/analytics/customers/segments`),
        axios.get(`${BACKEND_URL}/api/analytics/customers/top`, { params: { period, limit: 10 } }),
        axios.get(`${BACKEND_URL}/api/analytics/inventory/overview`)
      ]);
      
      setDashboard(dashboardRes.data);
      setSalesSummary(salesRes.data);
      setCategoryData(categoryRes.data.categories || []);
      setProductData(productRes.data.products || []);
      setCustomerOverview(customerRes.data);
      setCustomerSegments(segmentsRes.data.segments || []);
      setTopCustomers(topCustomersRes.data.customers || []);
      setInventoryOverview(inventoryRes.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const exportReport = async (type) => {
    try {
      window.open(`${BACKEND_URL}/api/analytics/export/${type}?period=${period}&format=csv`, '_blank');
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const KPICard = ({ title, value, change, prefix = '', suffix = '', icon: Icon, color }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">
              {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
            </p>
            {change !== undefined && (
              <div className={`flex items-center gap-1 mt-1 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                <span>{Math.abs(change)}% vs previous</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${color || 'bg-primary/10'}`}>
            <Icon className={`h-6 w-6 ${color ? 'text-white' : 'text-primary'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Advanced Analytics
          </h1>
          <p className="text-muted-foreground">Comprehensive insights into your business performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="365d">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => fetchAllData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPICard
          title="Revenue"
          value={dashboard?.kpis?.revenue?.value || 0}
          change={dashboard?.kpis?.revenue?.change}
          prefix="$"
          icon={DollarSign}
          color="bg-green-500"
        />
        <KPICard
          title="Orders"
          value={dashboard?.kpis?.orders?.value || 0}
          change={dashboard?.kpis?.orders?.change}
          icon={ShoppingCart}
          color="bg-blue-500"
        />
        <KPICard
          title="Avg Order Value"
          value={dashboard?.kpis?.average_order_value?.value || 0}
          change={dashboard?.kpis?.average_order_value?.change}
          prefix="$"
          icon={Target}
          color="bg-purple-500"
        />
        <KPICard
          title="New Customers"
          value={dashboard?.kpis?.new_customers?.value || 0}
          change={dashboard?.kpis?.new_customers?.change}
          icon={Users}
          color="bg-orange-500"
        />
        <KPICard
          title="Items Sold"
          value={dashboard?.kpis?.items_sold?.value || 0}
          change={dashboard?.kpis?.items_sold?.change}
          icon={Package}
          color="bg-pink-500"
        />
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Daily Sales Chart */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Daily Sales</CardTitle>
                  <CardDescription>Revenue over time</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => exportReport('sales')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-end gap-1">
                  {salesSummary?.daily_sales?.slice(-30).map((day, i) => {
                    const maxRevenue = Math.max(...(salesSummary?.daily_sales?.map(d => d.revenue) || [1]));
                    const height = (day.revenue / maxRevenue) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-primary/80 hover:bg-primary rounded-t transition-all cursor-pointer group relative"
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${day.date}: $${day.revenue.toFixed(2)}`}
                      >
                        <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg whitespace-nowrap z-10">
                          <p className="font-medium">{day.date}</p>
                          <p>${day.revenue.toFixed(2)}</p>
                          <p>{day.orders} orders</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{salesSummary?.daily_sales?.[0]?.date}</span>
                  <span>{salesSummary?.daily_sales?.[salesSummary?.daily_sales?.length - 1]?.date}</span>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Sales by Category</CardTitle>
                <CardDescription>Revenue distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryData.slice(0, 8).map((cat, i) => {
                    const totalRevenue = categoryData.reduce((sum, c) => sum + c.revenue, 0);
                    const percentage = totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0;
                    return (
                      <div key={cat.category_id || i}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{cat.category || 'Uncategorized'}</span>
                          <span className="text-sm text-muted-foreground">${cat.revenue.toFixed(2)}</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Best performers in this period</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">#</th>
                      <th className="text-left p-3 font-medium">Product</th>
                      <th className="text-right p-3 font-medium">Units Sold</th>
                      <th className="text-right p-3 font-medium">Revenue</th>
                      <th className="text-right p-3 font-medium">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productData.map((product, i) => (
                      <tr key={product.product_id} className="border-b hover:bg-muted/30">
                        <td className="p-3 text-muted-foreground">{i + 1}</td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">{product.sku}</p>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono">{product.quantity}</td>
                        <td className="p-3 text-right font-mono font-bold">${product.revenue.toFixed(2)}</td>
                        <td className="p-3 text-right">{product.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{customerOverview?.total_customers || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Repeat Rate</p>
                <p className="text-2xl font-bold">{customerOverview?.repeat_rate || 0}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Avg Lifetime Value</p>
                <p className="text-2xl font-bold">${customerOverview?.average_lifetime_value?.toFixed(2) || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">New This Period</p>
                <p className="text-2xl font-bold">{customerOverview?.new_customers || 0}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Customer Segments */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Segments</CardTitle>
                <CardDescription>Distribution by behavior</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customerSegments.map((segment) => (
                    <div key={segment.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{segment.name}</p>
                        <p className="text-xs text-muted-foreground">{segment.criteria}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{segment.count}</p>
                        <p className="text-xs text-muted-foreground">${segment.revenue?.toFixed(2) || 0}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Customers */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Top Customers</CardTitle>
                  <CardDescription>By revenue</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => exportReport('customers')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topCustomers.slice(0, 5).map((customer, i) => (
                    <div key={customer.customer_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground w-4">{i + 1}.</span>
                        <div>
                          <p className="font-medium">{customer.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{customer.order_count} orders</p>
                        </div>
                      </div>
                      <span className="font-bold">${customer.total_spent?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{inventoryOverview?.total_products || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Stock Value</p>
                <p className="text-2xl font-bold">${inventoryOverview?.total_stock_value?.toFixed(2) || 0}</p>
              </CardContent>
            </Card>
            <Card className={inventoryOverview?.out_of_stock_count > 0 ? 'border-red-300 bg-red-50/50' : ''}>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className={`text-2xl font-bold ${inventoryOverview?.out_of_stock_count > 0 ? 'text-red-600' : ''}`}>
                  {inventoryOverview?.out_of_stock_count || 0}
                </p>
              </CardContent>
            </Card>
            <Card className={inventoryOverview?.low_stock_count > 0 ? 'border-orange-300 bg-orange-50/50' : ''}>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className={`text-2xl font-bold ${inventoryOverview?.low_stock_count > 0 ? 'text-orange-600' : ''}`}>
                  {inventoryOverview?.low_stock_count || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Out of Stock */}
            {inventoryOverview?.out_of_stock?.length > 0 && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600">Out of Stock Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {inventoryOverview.out_of_stock.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.sku}</p>
                        </div>
                        <Button size="sm" variant="outline">Restock</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Low Stock */}
            {inventoryOverview?.low_stock?.length > 0 && (
              <Card className="border-orange-200">
                <CardHeader>
                  <CardTitle className="text-orange-600">Low Stock Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {inventoryOverview.low_stock.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.sku}</p>
                        </div>
                        <span className="font-bold">{item.stock} left</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Button variant="outline" onClick={() => exportReport('inventory')}>
            <Download className="h-4 w-4 mr-2" />
            Export Full Inventory Report
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
