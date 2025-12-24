import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { 
  RotateCcw, Search, Package, DollarSign, Clock, CheckCircle, XCircle,
  Eye, Truck, CreditCard, AlertTriangle, Calendar, User, Mail, ChevronRight
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MerchantReturns() {
  const [returns, setReturns] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  
  const [approvalData, setApprovalData] = useState({
    refund_amount: 0,
    merchant_notes: ''
  });
  
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [returnsRes, statsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/returns`, {
          params: { status: statusFilter !== 'all' ? statusFilter : undefined }
        }),
        axios.get(`${BACKEND_URL}/api/returns/stats`)
      ]);
      setReturns(returnsRes.data.returns || []);
      setStats(statsRes.data || {});
    } catch (error) {
      console.error('Failed to fetch returns:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async () => {
    if (!selectedReturn) return;
    try {
      await axios.post(`${BACKEND_URL}/api/returns/${selectedReturn.id}/approve`, approvalData);
      setShowApproveModal(false);
      setSelectedReturn(null);
      setApprovalData({ refund_amount: 0, merchant_notes: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to approve return:', error);
      alert('Failed to approve return');
    }
  };

  const handleReject = async () => {
    if (!selectedReturn) return;
    try {
      await axios.post(`${BACKEND_URL}/api/returns/${selectedReturn.id}/reject`, { reason: rejectionReason });
      setShowRejectModal(false);
      setSelectedReturn(null);
      setRejectionReason('');
      fetchData();
    } catch (error) {
      console.error('Failed to reject return:', error);
      alert('Failed to reject return');
    }
  };

  const handleReceive = async (returnId) => {
    try {
      await axios.post(`${BACKEND_URL}/api/returns/${returnId}/receive`);
      fetchData();
    } catch (error) {
      console.error('Failed to mark as received:', error);
    }
  };

  const handleRefund = async (returnId) => {
    if (!window.confirm('Process refund for this return?')) return;
    try {
      await axios.post(`${BACKEND_URL}/api/returns/${returnId}/refund`);
      fetchData();
    } catch (error) {
      console.error('Failed to process refund:', error);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      received: 'bg-purple-100 text-purple-800',
      refunded: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  const getReasonLabel = (reason) => {
    const labels = {
      defective: 'Defective Product',
      wrong_item: 'Wrong Item Received',
      not_as_described: 'Not as Described',
      changed_mind: 'Changed Mind',
      other: 'Other'
    };
    return labels[reason] || reason;
  };

  const filteredReturns = returns.filter(ret =>
    ret.return_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ret.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ret.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ret.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Returns & Refunds</h1>
          <p className="text-gray-500">Manage customer return requests and refunds</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <RotateCcw className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total || 0}</p>
                <p className="text-sm text-gray-500">Total Returns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending || 0}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approved || 0}</p>
                <p className="text-sm text-gray-500">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.received || 0}</p>
                <p className="text-sm text-gray-500">Received</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${(stats.total_refunded || 0).toFixed(2)}</p>
                <p className="text-sm text-gray-500">Refunded</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search returns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Returns List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : filteredReturns.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <RotateCcw className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No return requests yet</p>
              <p className="text-sm mt-2">Return requests from customers will appear here</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredReturns.map(ret => (
                <div key={ret.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{ret.return_number}</span>
                        {getStatusBadge(ret.status)}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {ret.customer_name}
                        </span>
                        <span className="flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3" /> {ret.customer_email}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        <span>Order: {ret.order_number}</span>
                        <span className="mx-2">•</span>
                        <span>{ret.items?.length || 0} item(s)</span>
                        <span className="mx-2">•</span>
                        <span>{getReasonLabel(ret.reason)}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(ret.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <div className="text-lg font-semibold">${(ret.refund_amount || 0).toFixed(2)}</div>
                        <div className="text-xs text-gray-500">Refund Amount</div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => { setSelectedReturn(ret); setShowDetailModal(true); }}
                        >
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                        
                        {ret.status === 'pending' && (
                          <>
                            <Button 
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => { 
                                setSelectedReturn(ret); 
                                setApprovalData({ refund_amount: ret.refund_amount || 0, merchant_notes: '' });
                                setShowApproveModal(true); 
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button 
                              size="sm"
                              variant="destructive"
                              onClick={() => { setSelectedReturn(ret); setShowRejectModal(true); }}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        
                        {ret.status === 'approved' && (
                          <Button size="sm" onClick={() => handleReceive(ret.id)}>
                            <Truck className="w-4 h-4 mr-1" /> Mark Received
                          </Button>
                        )}
                        
                        {ret.status === 'received' && (
                          <Button 
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleRefund(ret.id)}
                          >
                            <CreditCard className="w-4 h-4 mr-1" /> Process Refund
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Return Details - {selectedReturn?.return_number}</DialogTitle>
          </DialogHeader>
          
          {selectedReturn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedReturn.status)}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Order Number</Label>
                  <div className="mt-1 font-medium">{selectedReturn.order_number}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Customer</Label>
                  <div className="mt-1">{selectedReturn.customer_name}</div>
                  <div className="text-sm text-gray-500">{selectedReturn.customer_email}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Refund Amount</Label>
                  <div className="mt-1 font-semibold text-lg">${(selectedReturn.refund_amount || 0).toFixed(2)}</div>
                </div>
              </div>
              
              <div>
                <Label className="text-gray-500">Reason</Label>
                <div className="mt-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  {getReasonLabel(selectedReturn.reason)}
                </div>
                {selectedReturn.description && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                    {selectedReturn.description}
                  </div>
                )}
              </div>
              
              <div>
                <Label className="text-gray-500">Items</Label>
                <div className="mt-2 space-y-2">
                  {selectedReturn.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-sm text-gray-500">SKU: {item.sku || 'N/A'}</div>
                      </div>
                      <div className="text-right">
                        <div>Qty: {item.quantity}</div>
                        <div className="text-sm text-gray-500">${(item.price || 0).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {selectedReturn.merchant_notes && (
                <div>
                  <Label className="text-gray-500">Merchant Notes</Label>
                  <div className="mt-1 p-3 bg-yellow-50 rounded-lg text-sm">
                    {selectedReturn.merchant_notes}
                  </div>
                </div>
              )}
              
              {selectedReturn.tracking_number && (
                <div>
                  <Label className="text-gray-500">Tracking Number</Label>
                  <div className="mt-1">{selectedReturn.tracking_number}</div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Return</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Refund Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={approvalData.refund_amount}
                onChange={(e) => setApprovalData({...approvalData, refund_amount: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={approvalData.merchant_notes}
                onChange={(e) => setApprovalData({...approvalData, merchant_notes: e.target.value})}
                placeholder="Internal notes about this approval..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>Cancel</Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              Approve Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Return</DialogTitle>
          </DialogHeader>
          
          <div>
            <Label>Reason for Rejection</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this return is being rejected..."
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
