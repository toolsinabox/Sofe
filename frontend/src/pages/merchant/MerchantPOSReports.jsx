import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart3,
  Calendar,
  Download,
  FileText,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  Banknote,
  Clock,
  User,
  ArrowUpCircle,
  ArrowDownCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Loader2,
  Receipt,
  Wallet,
  Building2,
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantPOSReports = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyReport, setDailyReport] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [cashMovements, setCashMovements] = useState([]);
  const [summary, setSummary] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [registers, setRegisters] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('all');
  const [selectedRegister, setSelectedRegister] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [dateRange, setDateRange] = useState('today');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [selectedDate, selectedOutlet, selectedRegister]);

  const fetchInitialData = async () => {
    try {
      const [outletsRes, registersRes, summaryRes] = await Promise.all([
        axios.get(`${API}/pos/outlets`),
        axios.get(`${API}/pos/registers`),
        axios.get(`${API}/pos/reports/summary`)
      ]);
      setOutlets(outletsRes.data);
      setRegisters(registersRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = { date: selectedDate };
      if (selectedOutlet !== 'all') params.outlet_id = selectedOutlet;

      const [dailyRes, transactionsRes, shiftsRes, movementsRes] = await Promise.all([
        axios.get(`${API}/pos/reports/daily`, { params }),
        axios.get(`${API}/pos/transactions`, { params: { ...params, limit: 100 } }),
        axios.get(`${API}/pos/shifts`, { params: { limit: 50 } }),
        axios.get(`${API}/pos/cash-movements`, { params: selectedRegister !== 'all' ? { register_id: selectedRegister } : {} })
      ]);

      setDailyReport(dailyRes.data);
      setTransactions(transactionsRes.data.transactions || []);
      setShifts(shiftsRes.data || []);
      setCashMovements(movementsRes.data || []);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (direction) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + direction);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Export to CSV
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        let cell = row[header];
        if (typeof cell === 'object') cell = JSON.stringify(cell);
        if (typeof cell === 'string' && cell.includes(',')) cell = `"${cell}"`;
        return cell;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${selectedDate}.csv`;
    link.click();
  };

  const exportDailyReport = () => {
    if (!dailyReport) return;
    
    const reportData = [
      { metric: 'Date', value: dailyReport.date },
      { metric: 'Total Sales', value: formatCurrency(dailyReport.total_sales) },
      { metric: 'Total Transactions', value: dailyReport.total_transactions },
      { metric: 'Total Items Sold', value: dailyReport.total_items },
      { metric: 'Average Transaction', value: formatCurrency(dailyReport.average_transaction) },
      ...Object.entries(dailyReport.payment_breakdown || {}).map(([method, amount]) => ({
        metric: `${method.toUpperCase()} Payments`,
        value: formatCurrency(amount)
      }))
    ];
    
    exportToCSV(reportData, 'daily_report');
  };

  const exportTransactions = () => {
    const exportData = transactions.map(t => ({
      transaction_number: t.transaction_number,
      date: formatDateTime(t.created_at),
      customer: t.customer_name || 'Walk-in',
      items: t.items?.length || 0,
      subtotal: t.subtotal,
      discount: t.discount_total,
      tax: t.tax_total,
      total: t.total,
      payment_method: t.payments?.[0]?.method || 'N/A',
      staff: t.staff_name || 'N/A',
      status: t.status
    }));
    exportToCSV(exportData, 'transactions');
  };

  const exportShifts = () => {
    const exportData = shifts.map(s => ({
      staff: s.staff_name,
      opened: formatDateTime(s.opened_at),
      closed: s.closed_at ? formatDateTime(s.closed_at) : 'Still Open',
      opening_float: s.opening_float,
      expected_cash: s.expected_cash,
      actual_cash: s.actual_cash || 'N/A',
      variance: s.variance || 'N/A',
      status: s.status
    }));
    exportToCSV(exportData, 'shifts');
  };

  const getVarianceColor = (variance) => {
    if (variance === null || variance === undefined) return 'text-gray-500';
    if (variance === 0) return 'text-emerald-600';
    if (variance > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  const getVarianceIcon = (variance) => {
    if (variance === null || variance === undefined) return null;
    if (variance === 0) return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    if (variance > 0) return <ArrowUpCircle className="w-4 h-4 text-blue-600" />;
    return <ArrowDownCircle className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            POS Reports
          </h1>
          <p className="text-gray-500 text-sm mt-1">Sales, shifts, and cash management reports</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchReportData}
            className="border-gray-200 text-gray-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-xs sm:text-sm">Today&apos;s Sales</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(summary.today?.sales)}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {summary.today?.transactions || 0} transactions
                  </p>
                </div>
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-xs sm:text-sm">All Time Sales</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(summary.all_time?.sales)}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {summary.all_time?.transactions || 0} transactions
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-xs sm:text-sm">Avg Transaction</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(summary.today?.transactions > 0 
                      ? summary.today?.sales / summary.today?.transactions 
                      : 0
                    )}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">Today</p>
                </div>
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-xs sm:text-sm">Open Shifts</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">
                    {summary.open_shifts || 0}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">Active registers</p>
                </div>
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Date & Filters */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            {/* Date Picker */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDateChange(-1)}
                className="text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg">
                <Calendar className="w-4 h-4 text-gray-500" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-0 text-gray-900 text-sm p-0 h-auto w-auto"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDateChange(1)}
                className="text-gray-500 hover:text-gray-700"
                disabled={selectedDate >= new Date().toISOString().split('T')[0]}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                <SelectTrigger className="w-36 bg-white border-gray-200 text-gray-900 text-sm">
                  <Building2 className="w-4 h-4 mr-2 text-gray-500" />
                  <SelectValue placeholder="Outlet" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all" className="text-gray-900">All Outlets</SelectItem>
                  {outlets.map(o => (
                    <SelectItem key={o.id} value={o.id} className="text-gray-900">{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedRegister} onValueChange={setSelectedRegister}>
                <SelectTrigger className="w-36 bg-white border-gray-200 text-gray-900 text-sm">
                  <Monitor className="w-4 h-4 mr-2 text-gray-500" />
                  <SelectValue placeholder="Register" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all" className="text-gray-900">All Registers</SelectItem>
                  {registers.map(r => (
                    <SelectItem key={r.id} value={r.id} className="text-gray-900">{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Date Buttons */}
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant={selectedDate === new Date().toISOString().split('T')[0] ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className={selectedDate === new Date().toISOString().split('T')[0] ? 'bg-emerald-600' : 'text-gray-500'}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setSelectedDate(yesterday.toISOString().split('T')[0]);
                }}
                className="text-gray-500"
              >
                Yesterday
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList className="bg-white/50 p-1">
          <TabsTrigger value="daily" className="data-[state=active]:bg-emerald-600">
            <BarChart3 className="w-4 h-4 mr-2" />
            Daily Summary
          </TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-emerald-600">
            <Receipt className="w-4 h-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="shifts" className="data-[state=active]:bg-emerald-600">
            <Clock className="w-4 h-4 mr-2" />
            Shifts
          </TabsTrigger>
          <TabsTrigger value="cash" className="data-[state=active]:bg-emerald-600">
            <Wallet className="w-4 h-4 mr-2" />
            Cash Movements
          </TabsTrigger>
        </TabsList>

        {/* Daily Summary Tab */}
        <TabsContent value="daily" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : dailyReport ? (
            <>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportDailyReport}
                  className="border-gray-200 text-gray-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Sales Summary */}
                <Card className="bg-white border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-gray-900 text-sm flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Sales Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">Total Sales</span>
                      <span className="text-gray-900 font-semibold text-lg">{formatCurrency(dailyReport.total_sales)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">Transactions</span>
                      <span className="text-gray-900 font-medium">{dailyReport.total_transactions}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">Items Sold</span>
                      <span className="text-gray-900 font-medium">{dailyReport.total_items}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-gray-500 text-sm">Average Sale</span>
                      <span className="text-emerald-600 font-semibold">{formatCurrency(dailyReport.average_transaction)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Methods */}
                <Card className="bg-white border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-gray-900 text-sm flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      Payment Methods
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(dailyReport.payment_breakdown || {}).length > 0 ? (
                      Object.entries(dailyReport.payment_breakdown).map(([method, amount]) => (
                        <div key={method} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {method === 'cash' ? (
                              <Banknote className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <CreditCard className="w-4 h-4 text-blue-600" />
                            )}
                            <span className="text-gray-500 text-sm capitalize">{method}</span>
                          </div>
                          <span className="text-gray-900 font-medium">{formatCurrency(amount)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm text-center py-4">No payments recorded</p>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="bg-white border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-gray-900 text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">Items per Sale</span>
                      <span className="text-gray-900 font-medium">
                        {dailyReport.total_transactions > 0 
                          ? (dailyReport.total_items / dailyReport.total_transactions).toFixed(1)
                          : '0'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">Cash Ratio</span>
                      <span className="text-gray-900 font-medium">
                        {dailyReport.total_sales > 0 
                          ? Math.round(((dailyReport.payment_breakdown?.cash || 0) / dailyReport.total_sales) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">Card Ratio</span>
                      <span className="text-gray-900 font-medium">
                        {dailyReport.total_sales > 0 
                          ? Math.round(((dailyReport.payment_breakdown?.card || 0) / dailyReport.total_sales) * 100)
                          : 0}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No data for selected date</p>
            </div>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-500 text-sm">{transactions.length} transactions</p>
            <Button
              variant="outline"
              size="sm"
              onClick={exportTransactions}
              className="border-gray-200 text-gray-700"
              disabled={transactions.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/50">
                    <tr>
                      <th className="text-left text-xs text-gray-500 font-medium p-3">Transaction</th>
                      <th className="text-left text-xs text-gray-500 font-medium p-3">Time</th>
                      <th className="text-left text-xs text-gray-500 font-medium p-3">Customer</th>
                      <th className="text-left text-xs text-gray-500 font-medium p-3">Items</th>
                      <th className="text-left text-xs text-gray-500 font-medium p-3">Payment</th>
                      <th className="text-right text-xs text-gray-500 font-medium p-3">Total</th>
                      <th className="text-center text-xs text-gray-500 font-medium p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-500">
                          No transactions for selected date
                        </td>
                      </tr>
                    ) : (
                      transactions.map((trans) => (
                        <tr 
                          key={trans.id} 
                          className="hover:bg-white/30 cursor-pointer"
                          onClick={() => setSelectedTransaction(trans)}
                        >
                          <td className="p-3">
                            <span className="text-gray-900 text-sm font-medium">{trans.transaction_number}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-gray-500 text-sm">{formatTime(trans.created_at)}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-gray-700 text-sm">{trans.customer_name || 'Walk-in'}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-gray-500 text-sm">{trans.items?.length || 0} items</span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              {trans.payments?.[0]?.method === 'cash' ? (
                                <Banknote className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <CreditCard className="w-4 h-4 text-blue-600" />
                              )}
                              <span className="text-gray-700 text-sm capitalize">{trans.payments?.[0]?.method}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-gray-900 font-semibold">{formatCurrency(trans.total)}</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              trans.status === 'completed' 
                                ? 'bg-emerald-50 text-emerald-600' 
                                : trans.status === 'refunded'
                                  ? 'bg-red-50 text-red-600'
                                  : 'bg-gray-500/20 text-gray-500'
                            }`}>
                              {trans.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shifts Tab */}
        <TabsContent value="shifts" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-500 text-sm">{shifts.length} shifts</p>
            <Button
              variant="outline"
              size="sm"
              onClick={exportShifts}
              className="border-gray-200 text-gray-700"
              disabled={shifts.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/50">
                    <tr>
                      <th className="text-left text-xs text-gray-500 font-medium p-3">Staff</th>
                      <th className="text-left text-xs text-gray-500 font-medium p-3">Opened</th>
                      <th className="text-left text-xs text-gray-500 font-medium p-3">Closed</th>
                      <th className="text-right text-xs text-gray-500 font-medium p-3">Opening</th>
                      <th className="text-right text-xs text-gray-500 font-medium p-3">Expected</th>
                      <th className="text-right text-xs text-gray-500 font-medium p-3">Actual</th>
                      <th className="text-right text-xs text-gray-500 font-medium p-3">Variance</th>
                      <th className="text-center text-xs text-gray-500 font-medium p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {shifts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-gray-500">
                          No shifts recorded
                        </td>
                      </tr>
                    ) : (
                      shifts.map((shift) => (
                        <tr key={shift.id} className="hover:bg-white/30">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-900 text-sm">{shift.staff_name}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-gray-500 text-sm">{formatDateTime(shift.opened_at)}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-gray-500 text-sm">
                              {shift.closed_at ? formatDateTime(shift.closed_at) : '-'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-gray-700 text-sm">{formatCurrency(shift.opening_float)}</span>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-gray-900 font-medium">{formatCurrency(shift.expected_cash)}</span>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-gray-700 text-sm">
                              {shift.actual_cash !== null ? formatCurrency(shift.actual_cash) : '-'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {getVarianceIcon(shift.variance)}
                              <span className={`text-sm font-medium ${getVarianceColor(shift.variance)}`}>
                                {shift.variance !== null ? formatCurrency(shift.variance) : '-'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              shift.status === 'open' 
                                ? 'bg-emerald-50 text-emerald-600' 
                                : 'bg-gray-500/20 text-gray-500'
                            }`}>
                              {shift.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Movements Tab */}
        <TabsContent value="cash" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-500 text-sm">{cashMovements.length} movements</p>
          </div>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/50">
                    <tr>
                      <th className="text-left text-xs text-gray-500 font-medium p-3">Type</th>
                      <th className="text-left text-xs text-gray-500 font-medium p-3">Amount</th>
                      <th className="text-left text-xs text-gray-500 font-medium p-3">Reason</th>
                      <th className="text-left text-xs text-gray-500 font-medium p-3">Staff</th>
                      <th className="text-left text-xs text-gray-500 font-medium p-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {cashMovements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-500">
                          No cash movements recorded
                        </td>
                      </tr>
                    ) : (
                      cashMovements.map((movement) => (
                        <tr key={movement.id} className="hover:bg-white/30">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {movement.type === 'in' ? (
                                <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <ArrowUpCircle className="w-4 h-4 text-red-600" />
                              )}
                              <span className={`text-sm font-medium ${
                                movement.type === 'in' ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                                Cash {movement.type === 'in' ? 'In' : 'Out'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`font-medium ${
                              movement.type === 'in' ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {movement.type === 'in' ? '+' : '-'}{formatCurrency(movement.amount)}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-gray-700 text-sm">{movement.reason}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-gray-500 text-sm">{movement.staff_name}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-gray-500 text-sm">{formatDateTime(movement.created_at)}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction Detail Modal */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              Transaction Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="p-3 bg-white/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Transaction #</span>
                  <span className="text-gray-900 font-medium">{selectedTransaction.transaction_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Date</span>
                  <span className="text-gray-700 text-sm">{formatDateTime(selectedTransaction.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Staff</span>
                  <span className="text-gray-700 text-sm">{selectedTransaction.staff_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Customer</span>
                  <span className="text-gray-700 text-sm">{selectedTransaction.customer_name || 'Walk-in'}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <p className="text-gray-500 text-sm mb-2">Items</p>
                <div className="space-y-2">
                  {selectedTransaction.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.quantity}x {item.name}</span>
                      <span className="text-gray-900">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-900">{formatCurrency(selectedTransaction.subtotal)}</span>
                </div>
                {selectedTransaction.discount_total > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="text-red-600">-{formatCurrency(selectedTransaction.discount_total)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax</span>
                  <span className="text-gray-900">{formatCurrency(selectedTransaction.tax_total)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total</span>
                  <span className="text-emerald-600">{formatCurrency(selectedTransaction.total)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-2">
                  {selectedTransaction.payments?.[0]?.method === 'cash' ? (
                    <Banknote className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  )}
                  <span className="text-gray-700 capitalize">{selectedTransaction.payments?.[0]?.method}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  selectedTransaction.status === 'completed' 
                    ? 'bg-emerald-50 text-emerald-600' 
                    : 'bg-red-50 text-red-600'
                }`}>
                  {selectedTransaction.status}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantPOSReports;
