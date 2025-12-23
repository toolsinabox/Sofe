import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { 
  Gift, Plus, Search, CreditCard, DollarSign, Mail, Calendar,
  Eye, Copy, CheckCircle, XCircle, Clock, Send, TrendingUp
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MerchantGiftCards() {
  const [giftCards, setGiftCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [filter, setFilter] = useState('all');

  const [formData, setFormData] = useState({
    initial_balance: 50,
    recipient_email: '',
    recipient_name: '',
    message: '',
    template: 'default',
    send_email: true,
    expires_at: ''
  });

  const fetchGiftCards = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter === 'active') params.is_active = true;
      if (filter === 'has_balance') params.has_balance = true;
      
      const response = await axios.get(`${BACKEND_URL}/api/marketing/gift-cards`, { params });
      setGiftCards(response.data.gift_cards || []);
    } catch (error) {
      console.error('Failed to fetch gift cards:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchGiftCards();
  }, [fetchGiftCards]);

  const createGiftCard = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/marketing/gift-cards`, formData);
      setShowModal(false);
      resetForm();
      fetchGiftCards();
    } catch (error) {
      console.error('Failed to create gift card:', error);
      alert(error.response?.data?.detail || 'Failed to create gift card');
    }
  };

  const resetForm = () => {
    setFormData({
      initial_balance: 50,
      recipient_email: '',
      recipient_name: '',
      message: '',
      template: 'default',
      send_email: true,
      expires_at: ''
    });
  };

  const viewCard = async (cardId) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/marketing/gift-cards/${cardId}`);
      setSelectedCard(response.data);
    } catch (error) {
      console.error('Failed to fetch gift card details:', error);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  const filteredCards = giftCards.filter(card =>
    card.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = giftCards.reduce((sum, c) => sum + (c.initial_balance || 0), 0);
  const outstandingValue = giftCards.reduce((sum, c) => sum + (c.current_balance || 0), 0);
  const redeemedValue = totalValue - outstandingValue;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6 text-pink-500" />
            Gift Cards
          </h1>
          <p className="text-muted-foreground">Create and manage digital gift cards</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Gift Card
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Issued</p>
                <p className="text-2xl font-bold">{giftCards.length}</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold">${outstandingValue.toFixed(2)}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Redeemed</p>
                <p className="text-2xl font-bold">${redeemedValue.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, recipient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cards</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="has_balance">With Balance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Gift Cards Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredCards.length === 0 ? (
            <div className="p-8 text-center">
              <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No gift cards found</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowModal(true)}>
                Create your first gift card
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Code</th>
                    <th className="text-left p-4 font-medium">Recipient</th>
                    <th className="text-right p-4 font-medium">Initial</th>
                    <th className="text-right p-4 font-medium">Balance</th>
                    <th className="text-left p-4 font-medium">Created</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCards.map((card) => (
                    <tr key={card.id} className="border-t hover:bg-muted/30">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded font-mono text-sm">{card.code}</code>
                          <Button variant="ghost" size="sm" onClick={() => copyCode(card.code)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{card.recipient_name || 'Not specified'}</p>
                          <p className="text-sm text-muted-foreground">{card.recipient_email || '-'}</p>
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono">${card.initial_balance?.toFixed(2)}</td>
                      <td className="p-4 text-right font-mono font-bold">${card.current_balance?.toFixed(2)}</td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {card.purchased_at ? new Date(card.purchased_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-4">
                        {card.current_balance <= 0 ? (
                          <Badge variant="secondary">Fully Used</Badge>
                        ) : card.is_active ? (
                          <Badge variant="default" className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => viewCard(card.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Gift Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Select
                value={formData.initial_balance.toString()}
                onValueChange={(val) => setFormData({ ...formData, initial_balance: parseFloat(val) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">$25</SelectItem>
                  <SelectItem value="50">$50</SelectItem>
                  <SelectItem value="75">$75</SelectItem>
                  <SelectItem value="100">$100</SelectItem>
                  <SelectItem value="150">$150</SelectItem>
                  <SelectItem value="200">$200</SelectItem>
                  <SelectItem value="250">$250</SelectItem>
                  <SelectItem value="500">$500</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Or enter custom amount:</p>
              <Input
                type="number"
                value={formData.initial_balance}
                onChange={(e) => setFormData({ ...formData, initial_balance: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recipient Name</Label>
                <Input
                  placeholder="John Doe"
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Recipient Email</Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={formData.recipient_email}
                  onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Personal Message</Label>
              <Textarea
                placeholder="Happy Birthday! Enjoy your gift..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date (Optional)</Label>
              <Input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={createGiftCard}>Create Gift Card</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Card Modal */}
      <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gift Card Details</DialogTitle>
          </DialogHeader>
          {selectedCard && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl p-6 text-white">
                <div className="flex justify-between items-start mb-8">
                  <Gift className="h-8 w-8" />
                  <span className="text-lg font-semibold">${selectedCard.initial_balance?.toFixed(2)}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-pink-200 text-sm">Gift Card Code</p>
                  <p className="font-mono text-xl tracking-wider">{selectedCard.code}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-2xl font-bold">${selectedCard.current_balance?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={selectedCard.is_active ? 'default' : 'secondary'}>
                    {selectedCard.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              {selectedCard.recipient_name && (
                <div>
                  <p className="text-sm text-muted-foreground">Recipient</p>
                  <p className="font-medium">{selectedCard.recipient_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCard.recipient_email}</p>
                </div>
              )}

              {selectedCard.message && (
                <div>
                  <p className="text-sm text-muted-foreground">Message</p>
                  <p className="italic">"{selectedCard.message}"</p>
                </div>
              )}

              {selectedCard.transactions?.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Transaction History</p>
                  <div className="space-y-2">
                    {selectedCard.transactions.map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                        <span>{tx.type}</span>
                        <span className={tx.amount < 0 ? 'text-red-500' : 'text-green-500'}>
                          {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCard(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
