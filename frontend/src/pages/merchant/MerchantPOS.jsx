import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  User,
  Receipt,
  X,
  Check,
  AlertCircle,
  Loader2,
  ShoppingCart,
  Package,
  Calculator,
  Percent,
  Clock,
  ChevronRight,
  Printer
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { useAuth } from '../../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantPOS = () => {
  const { user } = useAuth();
  const searchInputRef = useRef(null);
  
  // State
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [outlet, setOutlet] = useState(null);
  const [register, setRegister] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [cartDiscount, setCartDiscount] = useState({ type: 'fixed', value: 0 });
  const [showDiscount, setShowDiscount] = useState(false);

  // Initialize POS
  useEffect(() => {
    initializePOS();
  }, []);

  const initializePOS = async () => {
    try {
      // Try to init POS (creates default outlet/register if none exist)
      await axios.post(`${API}/pos/init`);
      
      // Get outlets and registers
      const [outletsRes, registersRes] = await Promise.all([
        axios.get(`${API}/pos/outlets`),
        axios.get(`${API}/pos/registers`)
      ]);
      
      if (outletsRes.data.length > 0) {
        setOutlet(outletsRes.data[0]);
      }
      if (registersRes.data.length > 0) {
        setRegister(registersRes.data[0]);
      }
      
      setInitialized(true);
    } catch (error) {
      console.error('Error initializing POS:', error);
      setInitialized(true); // Still allow use
    }
  };

  // Search products
  const searchProducts = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const response = await axios.get(`${API}/pos/products`, {
        params: { search: query }
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchProducts]);

  // Handle barcode scan (Enter key)
  const handleSearchKeyDown = async (e) => {
    if (e.key === 'Enter' && searchQuery) {
      // Try exact barcode match first
      try {
        const response = await axios.get(`${API}/pos/products`, {
          params: { barcode: searchQuery }
        });
        if (response.data.length === 1) {
          addToCart(response.data[0]);
          setSearchQuery('');
          setSearchResults([]);
          return;
        }
      } catch (error) {
        console.error('Barcode search error:', error);
      }
      
      // If only one search result, add it
      if (searchResults.length === 1) {
        addToCart(searchResults[0]);
        setSearchQuery('');
        setSearchResults([]);
      }
    }
  };

  // Add to cart
  const addToCart = (product) => {
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.product_id === product.id);
      
      if (existingIndex >= 0) {
        // Increase quantity
        const newCart = [...prevCart];
        newCart[existingIndex].quantity += 1;
        newCart[existingIndex].subtotal = newCart[existingIndex].price * newCart[existingIndex].quantity;
        return newCart;
      } else {
        // Add new item
        return [...prevCart, {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          quantity: 1,
          discount: 0,
          discount_type: 'fixed',
          subtotal: product.price,
          image: product.image,
          stock: product.stock
        }];
      }
    });
    
    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  // Update quantity
  const updateQuantity = (index, delta) => {
    setCart(prevCart => {
      const newCart = [...prevCart];
      newCart[index].quantity = Math.max(1, newCart[index].quantity + delta);
      newCart[index].subtotal = newCart[index].price * newCart[index].quantity;
      return newCart;
    });
  };

  // Remove from cart
  const removeFromCart = (index) => {
    setCart(prevCart => prevCart.filter((_, i) => i !== index));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setCustomer(null);
    setCartDiscount({ type: 'fixed', value: 0 });
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    let discountAmount = 0;
    
    if (cartDiscount.value > 0) {
      if (cartDiscount.type === 'percentage') {
        discountAmount = subtotal * (cartDiscount.value / 100);
      } else {
        discountAmount = cartDiscount.value;
      }
    }
    
    const taxRate = 0.10; // 10% GST
    const taxableAmount = subtotal - discountAmount;
    const tax = taxableAmount * taxRate;
    const total = taxableAmount + tax;
    
    return { subtotal, discountAmount, tax, total };
  };

  const { subtotal, discountAmount, tax, total } = calculateTotals();

  // Calculate change
  const change = paymentMethod === 'cash' && cashReceived 
    ? Math.max(0, parseFloat(cashReceived) - total) 
    : 0;

  // Process payment
  const processPayment = async () => {
    if (cart.length === 0) return;
    
    setProcessing(true);
    
    try {
      const payments = [{
        method: paymentMethod,
        amount: total,
        reference: paymentMethod === 'card' ? `CARD-${Date.now()}` : null,
        change_given: change
      }];
      
      const transactionData = {
        items: cart,
        payments: payments,
        customer_id: customer?.id || null,
        customer_name: customer?.name || null,
        customer_email: customer?.email || null,
        subtotal: subtotal,
        discount_total: discountAmount,
        tax_total: tax,
        total: total,
        notes: null,
        outlet_id: outlet?.id || null,
        register_id: register?.id || null,
        staff_id: user?.id || null,
        staff_name: user?.name || 'Staff'
      };
      
      const response = await axios.post(`${API}/pos/transactions`, transactionData);
      
      setLastTransaction({
        ...transactionData,
        transaction_number: response.data.transaction_number,
        id: response.data.id,
        created_at: new Date().toISOString()
      });
      
      setShowPayment(false);
      setShowReceipt(true);
      clearCart();
      setCashReceived('');
      
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Search customers
  const searchCustomers = async (query) => {
    if (!query || query.length < 2) {
      setCustomers([]);
      return;
    }
    try {
      const response = await axios.get(`${API}/customers`, {
        params: { search: query }
      });
      setCustomers(response.data);
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  };

  // Print receipt
  const printReceipt = () => {
    window.print();
  };

  // Quick cash amounts
  const quickCashAmounts = [20, 50, 100, 200];

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-3 sm:gap-4">
      {/* Left Panel - Products & Cart */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search products or scan barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 bg-gray-800 border-gray-700 text-white text-sm sm:text-base placeholder-gray-500 focus:border-emerald-500"
            autoFocus
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-500" />
          )}
          
          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-64 sm:max-h-80 overflow-y-auto">
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-gray-700 transition-colors text-left"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-xs sm:text-sm truncate">{product.name}</p>
                    <p className="text-gray-500 text-[10px] sm:text-xs">{product.sku}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-emerald-400 font-semibold text-sm sm:text-base">${product.price.toFixed(2)}</p>
                    <p className={`text-[10px] sm:text-xs ${product.stock > 0 ? 'text-gray-500' : 'text-red-400'}`}>
                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart Items */}
        <Card className="flex-1 bg-[#151b28] border-gray-800 overflow-hidden flex flex-col">
          <CardHeader className="py-2 sm:py-3 px-3 sm:px-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm sm:text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                Cart ({cart.length} items)
              </CardTitle>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs h-7 px-2"
                >
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 py-8">
                <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 mb-3 opacity-30" />
                <p className="text-xs sm:text-sm">Cart is empty</p>
                <p className="text-[10px] sm:text-xs text-gray-600 mt-1">Search or scan products to add</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-800/50 rounded-lg"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-xs sm:text-sm truncate">{item.name}</p>
                    <p className="text-gray-500 text-[10px] sm:text-xs">${item.price.toFixed(2)} each</p>
                  </div>
                  
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={() => updateQuantity(index, -1)}
                      className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-gray-700 rounded text-gray-300 hover:bg-gray-600 transition-colors"
                    >
                      <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    <span className="w-6 sm:w-8 text-center text-white text-xs sm:text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(index, 1)}
                      className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-gray-700 rounded text-gray-300 hover:bg-gray-600 transition-colors"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                  
                  <div className="text-right w-16 sm:w-20">
                    <p className="text-white font-semibold text-xs sm:text-sm">${item.subtotal.toFixed(2)}</p>
                  </div>
                  
                  <button
                    onClick={() => removeFromCart(index)}
                    className="p-1 sm:p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Summary & Actions */}
      <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-3">
        {/* Customer */}
        <Card className="bg-[#151b28] border-gray-800">
          <CardContent className="p-3 sm:p-4">
            <button
              onClick={() => setShowCustomerSearch(true)}
              className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-700 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              </div>
              <div className="flex-1 text-left min-w-0">
                {customer ? (
                  <>
                    <p className="text-white font-medium text-xs sm:text-sm truncate">{customer.name}</p>
                    <p className="text-gray-500 text-[10px] sm:text-xs truncate">{customer.email}</p>
                  </>
                ) : (
                  <p className="text-gray-400 text-xs sm:text-sm">Add Customer (Optional)</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card className="bg-[#151b28] border-gray-800">
          <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-white">${subtotal.toFixed(2)}</span>
            </div>
            
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-400">Discount</span>
                <span className="text-red-400">-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-400">Tax (GST 10%)</span>
              <span className="text-white">${tax.toFixed(2)}</span>
            </div>
            
            <div className="h-px bg-gray-700" />
            
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold text-base sm:text-lg">Total</span>
              <span className="text-emerald-400 font-bold text-xl sm:text-2xl">${total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => setShowDiscount(true)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800 text-xs sm:text-sm py-2 sm:py-2.5"
          >
            <Percent className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
            Discount
          </Button>
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 text-xs sm:text-sm py-2 sm:py-2.5"
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
            Hold
          </Button>
        </div>

        {/* Payment Buttons */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-auto">
          <Button
            onClick={() => {
              setPaymentMethod('cash');
              setShowPayment(true);
            }}
            disabled={cart.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white py-4 sm:py-6 text-sm sm:text-base"
          >
            <Banknote className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Cash
          </Button>
          <Button
            onClick={() => {
              setPaymentMethod('card');
              setShowPayment(true);
            }}
            disabled={cart.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white py-4 sm:py-6 text-sm sm:text-base"
          >
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Card
          </Button>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {paymentMethod === 'cash' ? (
                <><Banknote className="w-5 h-5 text-emerald-400" /> Cash Payment</>
              ) : (
                <><CreditCard className="w-5 h-5 text-blue-400" /> Card Payment</>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="text-center py-4 bg-gray-800/50 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Amount Due</p>
              <p className="text-3xl font-bold text-emerald-400">${total.toFixed(2)}</p>
            </div>
            
            {paymentMethod === 'cash' && (
              <>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Cash Received</label>
                  <Input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    className="bg-gray-800 border-gray-700 text-white text-xl text-center py-3"
                    autoFocus
                  />
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {quickCashAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      onClick={() => setCashReceived(amount.toString())}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => setCashReceived(total.toFixed(2))}
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Exact Amount (${total.toFixed(2)})
                </Button>
                
                {change > 0 && (
                  <div className="text-center py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <p className="text-gray-400 text-sm mb-1">Change Due</p>
                    <p className="text-2xl font-bold text-emerald-400">${change.toFixed(2)}</p>
                  </div>
                )}
              </>
            )}
            
            {paymentMethod === 'card' && (
              <div className="text-center py-6">
                <CreditCard className="w-16 h-16 mx-auto mb-4 text-blue-400" />
                <p className="text-gray-400">Present card to terminal</p>
                <p className="text-gray-500 text-sm mt-2">Click Complete when payment is confirmed</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPayment(false)}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={processPayment}
              disabled={processing || (paymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < total))}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {processing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <><Check className="w-4 h-4 mr-2" /> Complete Payment</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400" />
              Payment Successful
            </DialogTitle>
          </DialogHeader>
          
          {lastTransaction && (
            <div className="py-4">
              {/* Receipt Preview */}
              <div className="bg-white text-gray-900 p-4 rounded-lg text-sm print:p-0">
                <div className="text-center mb-4">
                  <h3 className="font-bold text-lg">{outlet?.name || 'Store'}</h3>
                  <p className="text-gray-600 text-xs">{lastTransaction.transaction_number}</p>
                  <p className="text-gray-600 text-xs">{new Date(lastTransaction.created_at).toLocaleString()}</p>
                </div>
                
                <div className="border-t border-b border-gray-300 py-2 mb-2">
                  {lastTransaction.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs py-1">
                      <span>{item.quantity}x {item.name}</span>
                      <span>${item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${lastTransaction.subtotal.toFixed(2)}</span>
                  </div>
                  {lastTransaction.discount_total > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount</span>
                      <span>-${lastTransaction.discount_total.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>GST (10%)</span>
                    <span>${lastTransaction.tax_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-300">
                    <span>Total</span>
                    <span>${lastTransaction.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span>{lastTransaction.payments[0].method.toUpperCase()}</span>
                    <span>${lastTransaction.payments[0].amount.toFixed(2)}</span>
                  </div>
                  {lastTransaction.payments[0].change_given > 0 && (
                    <div className="flex justify-between">
                      <span>Change</span>
                      <span>${lastTransaction.payments[0].change_given.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                
                <div className="text-center mt-4 pt-2 border-t border-gray-300">
                  <p className="text-xs text-gray-600">Thank you for your purchase!</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={printReceipt}
              className="border-gray-700 text-gray-300"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              onClick={() => {
                setShowReceipt(false);
                searchInputRef.current?.focus();
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              New Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Search Modal */}
      <Dialog open={showCustomerSearch} onOpenChange={setShowCustomerSearch}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <Input
              type="text"
              placeholder="Search customers..."
              onChange={(e) => searchCustomers(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCustomer(c);
                    setShowCustomerSearch(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{c.name}</p>
                    <p className="text-gray-500 text-xs">{c.email}</p>
                  </div>
                </button>
              ))}
            </div>
            
            {customer && (
              <Button
                variant="outline"
                onClick={() => {
                  setCustomer(null);
                  setShowCustomerSearch(false);
                }}
                className="w-full border-gray-700 text-gray-300"
              >
                Remove Customer
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Discount Modal */}
      <Dialog open={showDiscount} onOpenChange={setShowDiscount}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={cartDiscount.type === 'fixed' ? 'default' : 'outline'}
                onClick={() => setCartDiscount(prev => ({ ...prev, type: 'fixed' }))}
                className={cartDiscount.type === 'fixed' ? 'bg-emerald-600' : 'border-gray-700 text-gray-300'}
              >
                $ Fixed
              </Button>
              <Button
                variant={cartDiscount.type === 'percentage' ? 'default' : 'outline'}
                onClick={() => setCartDiscount(prev => ({ ...prev, type: 'percentage' }))}
                className={cartDiscount.type === 'percentage' ? 'bg-emerald-600' : 'border-gray-700 text-gray-300'}
              >
                % Percentage
              </Button>
            </div>
            
            <Input
              type="number"
              value={cartDiscount.value || ''}
              onChange={(e) => setCartDiscount(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
              placeholder={cartDiscount.type === 'fixed' ? 'Enter amount' : 'Enter percentage'}
              className="bg-gray-800 border-gray-700 text-white text-center text-xl py-3"
            />
            
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 20].map((val) => (
                <Button
                  key={val}
                  variant="outline"
                  onClick={() => setCartDiscount(prev => ({ ...prev, value: val }))}
                  className="border-gray-700 text-gray-300"
                >
                  {cartDiscount.type === 'fixed' ? `$${val}` : `${val}%`}
                </Button>
              ))}
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCartDiscount({ type: 'fixed', value: 0 });
                setShowDiscount(false);
              }}
              className="border-gray-700 text-gray-300"
            >
              Clear
            </Button>
            <Button
              onClick={() => setShowDiscount(false)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantPOS;
