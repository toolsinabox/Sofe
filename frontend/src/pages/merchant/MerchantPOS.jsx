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
  X,
  Check,
  Loader2,
  ShoppingCart,
  Package,
  Percent,
  Clock,
  ChevronRight,
  ChevronDown,
  Printer,
  LogIn,
  LogOut,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  Settings,
  RefreshCw,
  AlertTriangle,
  Building2,
  Monitor,
  PlayCircle,
  StopCircle,
  Wallet,
  History,
  Calculator,
  RotateCcw,
  UserPlus,
  Lock,
  Mail,
  Phone,
  Shield,
  Receipt,
  Send,
  FileText,
  CheckCircle2,
  StickyNote,
  ChevronLeft,
  Calendar,
  Truck,
  MapPin,
  PenLine,
  Menu,
  Grid3X3,
  Tag,
  PauseCircle,
  XCircle,
  Users,
  Image
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useAuth } from '../../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantPOS = () => {
  const { user } = useAuth();
  const searchInputRef = useRef(null);
  
  // Core State
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
  const [cartDiscount, setCartDiscount] = useState({ type: 'fixed', value: 0 });
  const [showDiscount, setShowDiscount] = useState(false);
  
  // Payment Terms State (Phase 2)
  const [paymentTerm, setPaymentTerm] = useState('pay_in_full'); // pay_in_full, pay_later, layby
  const [initialPaymentType, setInitialPaymentType] = useState('none'); // none, percent_10, percent_20, custom
  const [initialPaymentAmount, setInitialPaymentAmount] = useState('');
  const [laybyDueDate, setLaybyDueDate] = useState('');
  const [laybyDuePeriod, setLaybyDuePeriod] = useState(''); // 4_weeks, 8_weeks, custom
  
  // Shipping State (Phase 3)
  const [shipToCustomer, setShipToCustomer] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [signatureRequired, setSignatureRequired] = useState(false);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [showShippingOptions, setShowShippingOptions] = useState(false);
  
  // Default shipping methods (can be configured in store settings later)
  const shippingMethods = [
    { id: 'pickup', name: 'Pickup - In Store', price: 0, description: 'Collect from store' },
    { id: 'standard', name: 'Standard Delivery', price: 15.00, description: '3-5 business days' },
    { id: 'express', name: 'Express Delivery', price: 25.00, description: '1-2 business days' },
    { id: 'same_day', name: 'Same Day Delivery', price: 50.00, description: 'Delivered today' },
    { id: 'depot', name: 'Depot Delivery', price: 35.00, description: 'Deliver to nearest depot' }
  ];
  
  // All products for browsing
  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Returns/Refunds State
  const [showReturns, setShowReturns] = useState(false);
  const [returnTransactionSearch, setReturnTransactionSearch] = useState('');
  const [returnTransaction, setReturnTransaction] = useState(null);
  const [returnableItems, setReturnableItems] = useState([]);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [processingReturn, setProcessingReturn] = useState(false);
  
  // Customer Management State
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ 
    firstName: '',
    lastName: '', 
    company: '',
    email: '', 
    phone: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingPostcode: '',
    sameAsDelivery: true,
    deliveryAddress: '',
    deliveryCity: '',
    deliveryState: '',
    deliveryPostcode: ''
  });
  const [addingCustomer, setAddingCustomer] = useState(false);
  
  // Discount Permission State
  const [discountSettings, setDiscountSettings] = useState(null);
  const [showDiscountApproval, setShowDiscountApproval] = useState(false);
  const [pendingDiscount, setPendingDiscount] = useState(null);
  
  // Outlet/Register/Shift State
  const [outlets, setOutlets] = useState([]);
  const [registers, setRegisters] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [selectedRegister, setSelectedRegister] = useState(null);
  const [currentShift, setCurrentShift] = useState(null);
  const [showSetup, setShowSetup] = useState(true);
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [showCashMovement, setShowCashMovement] = useState(false);
  const [showShiftHistory, setShowShiftHistory] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('');
  const [closingData, setClosingData] = useState({ actualCash: '', closingFloat: '', notes: '' });
  const [cashMovement, setCashMovement] = useState({ type: 'in', amount: '', reason: '' });
  const [shiftHistory, setShiftHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Confirm Sale State (Phase 1)
  const [showConfirmSale, setShowConfirmSale] = useState(false);
  const [saleStatus, setSaleStatus] = useState('completed');
  const [saleNote, setSaleNote] = useState('');
  const [showSaleNote, setShowSaleNote] = useState(false);
  const [emailReceipt, setEmailReceipt] = useState(true);
  const [receiptEmail, setReceiptEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [completingSale, setCompletingSale] = useState(false);

  // Sale status options matching Maropost
  const saleStatusOptions = [
    { value: 'new', label: 'New' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'pick', label: 'Pick' },
    { value: 'pack', label: 'Pack' },
    { value: 'completed', label: 'Completed' }
  ];

  // Initialize POS
  useEffect(() => {
    initializePOS();
    fetchAllProducts();
  }, []);

  const initializePOS = async () => {
    setLoading(true);
    try {
      // Try to init POS (creates default outlet/register if none exist)
      await axios.post(`${API}/pos/init`);
      
      // Get outlets and registers
      const [outletsRes, registersRes] = await Promise.all([
        axios.get(`${API}/pos/outlets`),
        axios.get(`${API}/pos/registers`)
      ]);
      
      setOutlets(outletsRes.data);
      setRegisters(registersRes.data);
      
      // Check for saved session
      const savedOutlet = localStorage.getItem('pos_outlet');
      const savedRegister = localStorage.getItem('pos_register');
      
      if (savedOutlet && savedRegister) {
        const outlet = outletsRes.data.find(o => o.id === savedOutlet);
        const register = registersRes.data.find(r => r.id === savedRegister);
        
        if (outlet && register) {
          setSelectedOutlet(outlet);
          setSelectedRegister(register);
          
          // Check for open shift
          const shiftRes = await axios.get(`${API}/pos/shifts/current`, {
            params: { register_id: register.id }
          });
          
          if (shiftRes.data) {
            setCurrentShift(shiftRes.data);
            setShowSetup(false);
          } else {
            setShowSetup(true);
          }
        }
      }
    } catch (error) {
      console.error('Error initializing POS:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all products for browsing
  const fetchAllProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await axios.get(`${API}/pos/products`, {
        params: { limit: 100 }
      });
      setAllProducts(response.data);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(response.data.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Filter products by category AND search query
  const filteredProducts = allProducts.filter(p => {
    // Category filter
    const categoryMatch = selectedCategory === 'all' || p.category === selectedCategory;
    
    // Search filter - match against name, SKU, or barcode
    const query = searchQuery.toLowerCase().trim();
    const searchMatch = !query || 
      p.name?.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query) ||
      p.barcode?.toLowerCase().includes(query);
    
    return categoryMatch && searchMatch;
  });

  // Handle outlet/register selection
  const handleSetupComplete = async () => {
    if (!selectedOutlet || !selectedRegister) {
      return;
    }
    
    // Save to localStorage
    localStorage.setItem('pos_outlet', selectedOutlet.id);
    localStorage.setItem('pos_register', selectedRegister.id);
    
    // Check for existing shift
    try {
      const shiftRes = await axios.get(`${API}/pos/shifts/current`, {
        params: { register_id: selectedRegister.id }
      });
      
      // Handle both null and empty object responses
      if (shiftRes.data && Object.keys(shiftRes.data).length > 0) {
        setCurrentShift(shiftRes.data);
        setShowSetup(false);
      } else {
        setShowOpenShift(true);
      }
    } catch (error) {
      console.error('Error checking shift:', error);
      setShowOpenShift(true);
    }
  };

  // Open a new shift
  const handleOpenShift = async () => {
    if (!openingFloat) return;
    
    setProcessing(true);
    try {
      const response = await axios.post(`${API}/pos/shifts/open`, null, {
        params: {
          register_id: selectedRegister.id,
          outlet_id: selectedOutlet.id,
          staff_id: user?.id || 'staff',
          staff_name: user?.name || 'Staff',
          opening_float: parseFloat(openingFloat)
        }
      });
      
      setCurrentShift(response.data);
      setShowOpenShift(false);
      setShowSetup(false);
      setOpeningFloat('');
    } catch (error) {
      console.error('Error opening shift:', error);
      alert(error.response?.data?.detail || 'Failed to open shift');
    } finally {
      setProcessing(false);
    }
  };

  // Close current shift (cash-up)
  const handleCloseShift = async () => {
    if (!closingData.actualCash || !closingData.closingFloat) return;
    
    setProcessing(true);
    try {
      const response = await axios.post(`${API}/pos/shifts/${currentShift.id}/close`, null, {
        params: {
          actual_cash: parseFloat(closingData.actualCash),
          closing_float: parseFloat(closingData.closingFloat),
          notes: closingData.notes || null
        }
      });
      
      // Show variance result
      const variance = response.data.variance;
      const varianceMsg = variance === 0 
        ? 'Cash balanced perfectly!' 
        : variance > 0 
          ? `Cash OVER by $${variance.toFixed(2)}` 
          : `Cash SHORT by $${Math.abs(variance).toFixed(2)}`;
      
      alert(`Shift closed!\n\nExpected: $${response.data.expected_cash.toFixed(2)}\nActual: $${response.data.actual_cash.toFixed(2)}\n\n${varianceMsg}`);
      
      setCurrentShift(null);
      setShowCloseShift(false);
      setClosingData({ actualCash: '', closingFloat: '', notes: '' });
      setShowSetup(true);
    } catch (error) {
      console.error('Error closing shift:', error);
      alert(error.response?.data?.detail || 'Failed to close shift');
    } finally {
      setProcessing(false);
    }
  };

  // Record cash movement (money in/out)
  const handleCashMovement = async () => {
    if (!cashMovement.amount || !cashMovement.reason) return;
    
    setProcessing(true);
    try {
      await axios.post(`${API}/pos/cash-movements`, {
        id: crypto.randomUUID(),
        shift_id: currentShift.id,
        register_id: selectedRegister.id,
        type: cashMovement.type,
        amount: parseFloat(cashMovement.amount),
        reason: cashMovement.reason,
        staff_id: user?.id || 'staff',
        staff_name: user?.name || 'Staff'
      });
      
      // Refresh shift data
      const shiftRes = await axios.get(`${API}/pos/shifts/current`, {
        params: { register_id: selectedRegister.id }
      });
      if (shiftRes.data) {
        setCurrentShift(shiftRes.data);
      }
      
      setShowCashMovement(false);
      setCashMovement({ type: 'in', amount: '', reason: '' });
    } catch (error) {
      console.error('Error recording cash movement:', error);
      alert('Failed to record cash movement');
    } finally {
      setProcessing(false);
    }
  };

  // Fetch shift history
  const fetchShiftHistory = async () => {
    try {
      const response = await axios.get(`${API}/pos/shifts`, {
        params: { register_id: selectedRegister?.id, limit: 10 }
      });
      setShiftHistory(response.data || []);
    } catch (error) {
      console.error('Error fetching shift history:', error);
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
        const newCart = [...prevCart];
        newCart[existingIndex].quantity += 1;
        newCart[existingIndex].subtotal = newCart[existingIndex].price * newCart[existingIndex].quantity;
        return newCart;
      } else {
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
  const updateQuantity = (index, newQuantity) => {
    setCart(prevCart => {
      const newCart = [...prevCart];
      newCart[index].quantity = Math.max(1, newQuantity);
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
    // Reset payment terms
    setPaymentTerm('pay_in_full');
    setInitialPaymentType('none');
    setInitialPaymentAmount('');
    setLaybyDueDate('');
    setLaybyDuePeriod('');
    // Reset shipping
    setShipToCustomer(false);
    setSelectedShipping(null);
    setSignatureRequired(false);
    setDeliveryInstructions('');
    setShowShippingOptions(false);
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
    
    const taxRate = 0.10;
    const taxableAmount = subtotal - discountAmount;
    const tax = taxableAmount * taxRate;
    
    // Add shipping cost
    const shippingCost = shipToCustomer && selectedShipping ? selectedShipping.price : 0;
    const total = taxableAmount + tax + shippingCost;
    
    return { subtotal, discountAmount, tax, shippingCost, total };
  };

  const { subtotal, discountAmount, tax, shippingCost, total } = calculateTotals();

  // Calculate initial payment amount for Pay Later / Layby
  const calculateInitialPayment = () => {
    if (paymentTerm === 'pay_in_full') return total;
    
    switch (initialPaymentType) {
      case 'none':
        return 0;
      case 'percent_10':
        return total * 0.10;
      case 'percent_20':
        return total * 0.20;
      case 'custom':
        return parseFloat(initialPaymentAmount) || 0;
      default:
        return 0;
    }
  };

  // Calculate layby due date
  const calculateLaybyDueDate = () => {
    if (laybyDuePeriod === 'custom' && laybyDueDate) {
      return laybyDueDate;
    }
    
    const today = new Date();
    if (laybyDuePeriod === '4_weeks') {
      today.setDate(today.getDate() + 28);
    } else if (laybyDuePeriod === '8_weeks') {
      today.setDate(today.getDate() + 56);
    }
    return today.toISOString().split('T')[0];
  };

  const initialPayment = calculateInitialPayment();
  const remainingBalance = total - initialPayment;

  const change = paymentMethod === 'cash' && cashReceived 
    ? Math.max(0, parseFloat(cashReceived) - (paymentTerm === 'pay_in_full' ? total : initialPayment)) 
    : 0;

  // Process payment
  const processPayment = async () => {
    if (cart.length === 0) return;
    
    // For Pay Later and Layby, customer is required
    if (paymentTerm !== 'pay_in_full' && !customer) {
      alert('Please add a customer for Pay Later or Layby orders');
      return;
    }
    
    setProcessing(true);
    
    try {
      const paymentAmount = paymentTerm === 'pay_in_full' ? total : initialPayment;
      
      const payments = [{
        method: paymentMethod,
        amount: paymentAmount,
        reference: paymentMethod === 'card' ? `CARD-${Date.now()}` : null,
        change_given: change
      }];
      
      // Build payment terms data
      const paymentTermsData = {
        type: paymentTerm,
        initial_payment: initialPayment,
        remaining_balance: remainingBalance,
        due_date: paymentTerm === 'layby' ? calculateLaybyDueDate() : null,
        status: paymentTerm === 'pay_in_full' ? 'paid' : 'partial'
      };
      
      // Build shipping data
      const shippingData = shipToCustomer && selectedShipping ? {
        method: selectedShipping.name,
        method_id: selectedShipping.id,
        cost: selectedShipping.price,
        signature_required: signatureRequired,
        delivery_instructions: deliveryInstructions || null,
        status: 'pending'
      } : null;
      
      const transactionData = {
        items: cart,
        payments: payments,
        customer_id: customer?.id || null,
        customer_name: customer?.name || null,
        customer_email: customer?.email || null,
        subtotal: subtotal,
        discount_total: discountAmount,
        tax_total: tax,
        shipping_total: shippingCost,
        total: total,
        notes: null,
        outlet_id: selectedOutlet?.id || null,
        register_id: selectedRegister?.id || null,
        staff_id: user?.id || null,
        staff_name: user?.name || 'Staff',
        payment_terms: paymentTermsData,
        shipping: shippingData
      };
      
      const response = await axios.post(`${API}/pos/transactions`, transactionData);
      
      setLastTransaction({
        ...transactionData,
        transaction_number: response.data.transaction_number,
        id: response.data.id,
        created_at: new Date().toISOString(),
        payment_terms: paymentTermsData,
        shipping: shippingData
      });
      
      // Update shift expected cash if cash payment
      if (paymentMethod === 'cash' && currentShift) {
        const shiftRes = await axios.get(`${API}/pos/shifts/current`, {
          params: { register_id: selectedRegister.id }
        });
        if (shiftRes.data) {
          setCurrentShift(shiftRes.data);
        }
      }
      
      // Set default email for receipt
      setReceiptEmail(transactionData.customer_email || '');
      setEmailReceipt(!!transactionData.customer_email);
      setSaleStatus('completed');
      setSaleNote('');
      
      setShowPayment(false);
      setShowConfirmSale(true);  // Show confirm sale instead of receipt
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

  // Quick add customer
  const handleQuickAddCustomer = async () => {
    if (!newCustomer.firstName || !newCustomer.lastName || !newCustomer.email) {
      alert('First name, last name, and email are required');
      return;
    }
    
    setAddingCustomer(true);
    try {
      // Combine first and last name for the API
      const fullName = `${newCustomer.firstName} ${newCustomer.lastName}`.trim();
      
      const params = {
        name: fullName,
        email: newCustomer.email,
        phone: newCustomer.phone || null,
        company: newCustomer.company || null,
        billing_address: newCustomer.billingAddress || null,
        billing_city: newCustomer.billingCity || null,
        billing_state: newCustomer.billingState || null,
        billing_postcode: newCustomer.billingPostcode || null,
      };
      
      // Add delivery address if different from billing
      if (!newCustomer.sameAsDelivery) {
        params.delivery_address = newCustomer.deliveryAddress || null;
        params.delivery_city = newCustomer.deliveryCity || null;
        params.delivery_state = newCustomer.deliveryState || null;
        params.delivery_postcode = newCustomer.deliveryPostcode || null;
      }
      
      const response = await axios.post(`${API}/pos/customers/quick-add`, null, { params });
      
      setCustomer(response.data);
      setShowAddCustomer(false);
      setShowCustomerSearch(false);
      setNewCustomer({ 
        firstName: '',
        lastName: '', 
        company: '',
        email: '', 
        phone: '',
        billingAddress: '',
        billingCity: '',
        billingState: '',
        billingPostcode: '',
        sameAsDelivery: true,
        deliveryAddress: '',
        deliveryCity: '',
        deliveryState: '',
        deliveryPostcode: ''
      });
      
      if (response.data.existing) {
        alert('Existing customer found and selected');
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('Failed to add customer');
    } finally {
      setAddingCustomer(false);
    }
  };

  // Fetch discount settings
  const fetchDiscountSettings = async () => {
    try {
      const response = await axios.get(`${API}/pos/discount-settings`);
      setDiscountSettings(response.data);
    } catch (error) {
      console.error('Error fetching discount settings:', error);
    }
  };

  // Check discount permission
  const checkDiscountPermission = (discountValue, discountType) => {
    if (!discountSettings) return { allowed: true };
    
    const userRole = user?.role || 'staff';
    const roleSettings = discountSettings.roles?.[userRole] || discountSettings.roles?.staff;
    
    if (!roleSettings) return { allowed: true };
    
    if (discountType === 'percentage') {
      if (discountValue > roleSettings.max_percentage) {
        return {
          allowed: false,
          maxAllowed: roleSettings.max_percentage,
          requiresApproval: roleSettings.requires_approval
        };
      }
    } else {
      if (discountValue > roleSettings.max_fixed) {
        return {
          allowed: false,
          maxAllowed: roleSettings.max_fixed,
          requiresApproval: roleSettings.requires_approval
        };
      }
    }
    
    return { allowed: true };
  };

  // Apply discount with permission check
  const applyDiscount = (type, value) => {
    const permission = checkDiscountPermission(value, type);
    
    if (!permission.allowed) {
      if (permission.requiresApproval) {
        setPendingDiscount({ type, value });
        setShowDiscountApproval(true);
      } else {
        alert(`Discount exceeds your limit. Maximum ${type === 'percentage' ? permission.maxAllowed + '%' : '$' + permission.maxAllowed}`);
        setCartDiscount({ type, value: permission.maxAllowed });
      }
    } else {
      setCartDiscount({ type, value });
    }
    setShowDiscount(false);
  };

  // Request discount approval
  const requestDiscountApproval = async () => {
    if (!pendingDiscount) return;
    
    try {
      await axios.post(`${API}/pos/discount-approval`, null, {
        params: {
          amount: pendingDiscount.value,
          discount_type: pendingDiscount.type,
          reason: 'Manager approval requested',
          staff_id: user?.id || 'staff',
          staff_name: user?.name || 'Staff'
        }
      });
      alert('Approval request submitted. Please wait for manager authorization.');
      setShowDiscountApproval(false);
      setPendingDiscount(null);
    } catch (error) {
      console.error('Error requesting approval:', error);
      alert('Failed to submit approval request');
    }
  };

  // Search for transaction to return
  const searchReturnTransaction = async () => {
    if (!returnTransactionSearch) return;
    
    try {
      // Try to find by transaction number or ID
      const response = await axios.get(`${API}/pos/transactions`, {
        params: { limit: 10 }
      });
      
      const found = response.data.transactions?.find(t => 
        t.transaction_number?.toLowerCase().includes(returnTransactionSearch.toLowerCase()) ||
        t.id === returnTransactionSearch
      );
      
      if (found) {
        // Get returnable items
        const returnableRes = await axios.get(`${API}/pos/transactions/${found.id}/returnable`);
        setReturnTransaction(returnableRes.data.transaction);
        setReturnableItems(returnableRes.data.returnable_items);
        setReturnItems([]);
      } else {
        alert('Transaction not found');
      }
    } catch (error) {
      console.error('Error searching transaction:', error);
      alert('Failed to find transaction');
    }
  };

  // Toggle item for return
  const toggleReturnItem = (item) => {
    setReturnItems(prev => {
      const existing = prev.find(i => i.product_id === item.product_id);
      if (existing) {
        return prev.filter(i => i.product_id !== item.product_id);
      } else {
        return [...prev, { ...item, return_qty: 1 }];
      }
    });
  };

  // Update return quantity
  const updateReturnQty = (productId, qty) => {
    setReturnItems(prev => prev.map(item => {
      if (item.product_id === productId) {
        const maxQty = returnableItems.find(ri => ri.product_id === productId)?.max_returnable || 1;
        return { ...item, return_qty: Math.min(Math.max(1, qty), maxQty) };
      }
      return item;
    }));
  };

  // Calculate return total
  const calculateReturnTotal = () => {
    return returnItems.reduce((sum, item) => sum + (item.price * item.return_qty), 0);
  };

  // Process return
  const processReturn = async () => {
    if (returnItems.length === 0 || !returnReason) {
      alert('Please select items and provide a reason');
      return;
    }
    
    setProcessingReturn(true);
    try {
      const returnData = {
        original_transaction_id: returnTransaction.id,
        items: returnItems.map(item => ({
          product_id: item.product_id,
          name: item.name,
          sku: item.sku,
          price: item.price,
          quantity: item.return_qty,
          reason: returnReason
        })),
        refund_method: refundMethod,
        refund_amount: calculateReturnTotal(),
        reason: returnReason,
        notes: null,
        outlet_id: selectedOutlet?.id,
        register_id: selectedRegister?.id,
        staff_id: user?.id,
        staff_name: user?.name || 'Staff'
      };
      
      const response = await axios.post(`${API}/pos/returns`, returnData);
      
      alert(`Return processed successfully!\nReturn #: ${response.data.return_number}\nRefund: $${calculateReturnTotal().toFixed(2)} (${refundMethod})`);
      
      // Refresh shift if cash refund
      if (refundMethod === 'cash' && currentShift) {
        const shiftRes = await axios.get(`${API}/pos/shifts/current`, {
          params: { register_id: selectedRegister.id }
        });
        if (shiftRes.data) {
          setCurrentShift(shiftRes.data);
        }
      }
      
      // Reset return state
      setShowReturns(false);
      setReturnTransaction(null);
      setReturnableItems([]);
      setReturnItems([]);
      setReturnReason('');
      setReturnTransactionSearch('');
      
    } catch (error) {
      console.error('Error processing return:', error);
      alert(error.response?.data?.detail || 'Failed to process return');
    } finally {
      setProcessingReturn(false);
    }
  };

  // Fetch discount settings on mount
  useEffect(() => {
    fetchDiscountSettings();
  }, []);

  // Print receipt
  const printReceipt = () => {
    window.print();
  };

  // Complete sale with status
  const completeSale = async () => {
    if (!lastTransaction) return;
    
    setCompletingSale(true);
    try {
      // Update order status based on selection
      await axios.put(`${API}/pos/transactions/${lastTransaction.id}/status`, null, {
        params: {
          status: saleStatus,
          notes: saleNote || null
        }
      });
      
      // Send email receipt if enabled
      if (emailReceipt && receiptEmail) {
        await sendEmailReceipt();
      }
      
      setShowConfirmSale(false);
      setShowReceipt(true);
      
    } catch (error) {
      console.error('Error completing sale:', error);
      alert(error.response?.data?.detail || 'Failed to complete sale');
    } finally {
      setCompletingSale(false);
    }
  };

  // Send email receipt
  const sendEmailReceipt = async () => {
    if (!lastTransaction || !receiptEmail) return;
    
    setSendingEmail(true);
    try {
      await axios.post(`${API}/pos/transactions/${lastTransaction.id}/email-receipt`, null, {
        params: { email: receiptEmail }
      });
      return true;
    } catch (error) {
      console.error('Error sending email receipt:', error);
      alert('Failed to send email receipt');
      return false;
    } finally {
      setSendingEmail(false);
    }
  };

  // Send email receipt manually (from receipt screen)
  const handleSendEmailReceipt = async () => {
    const success = await sendEmailReceipt();
    if (success) {
      alert('Email receipt sent successfully!');
    }
  };

  const quickCashAmounts = [20, 50, 100, 200];

  // Format time elapsed
  const formatTimeElapsed = (startTime) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000 / 60);
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading POS...</p>
        </div>
      </div>
    );
  }

  // Setup Screen - Select Outlet & Register
  if (showSetup && !currentShift) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#151b28] border-gray-800">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Monitor className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-white text-xl">POS Setup</CardTitle>
            <p className="text-gray-400 text-sm mt-1">Select your outlet and register to begin</p>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Outlet / Location</Label>
              <Select 
                value={selectedOutlet?.id || ''} 
                onValueChange={(value) => {
                  const outlet = outlets.find(o => o.id === value);
                  setSelectedOutlet(outlet);
                  setSelectedRegister(null);
                }}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select outlet..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {outlets.map(outlet => (
                    <SelectItem key={outlet.id} value={outlet.id} className="text-white hover:bg-gray-700">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {outlet.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-300">Register</Label>
              <Select 
                value={selectedRegister?.id || ''} 
                onValueChange={(value) => {
                  const register = registers.find(r => r.id === value);
                  setSelectedRegister(register);
                }}
                disabled={!selectedOutlet}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select register..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {registers.filter(r => r.outlet_id === selectedOutlet?.id).map(register => (
                    <SelectItem key={register.id} value={register.id} className="text-white hover:bg-gray-700">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-gray-400" />
                        {register.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleSetupComplete}
              disabled={!selectedOutlet || !selectedRegister}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 mt-4"
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              Continue
            </Button>
          </CardContent>
        </Card>
        
        {/* Open Shift Modal - must be rendered even in setup screen */}
        <Dialog open={showOpenShift} onOpenChange={setShowOpenShift}>
          <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-emerald-400" />
                Open Shift
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Enter your opening cash float to begin selling
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                  <Building2 className="w-4 h-4" />
                  <span>{selectedOutlet?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Monitor className="w-4 h-4" />
                  <span>{selectedRegister?.name}</span>
                </div>
              </div>
              
              <div>
                <Label className="text-gray-400 text-sm mb-2 block">Opening Float ($)</Label>
                <Input
                  type="number"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  placeholder="0.00"
                  className="bg-gray-800 border-gray-700 text-white text-xl text-center py-3"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">Enter the starting cash amount in the drawer</p>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {[100, 200, 300, 500].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => setOpeningFloat(amount.toString())}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>
            
            <DialogFooter>
              <Button
                onClick={handleOpenShift}
                disabled={processing || !openingFloat}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {processing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening...</>
                ) : (
                  <><PlayCircle className="w-4 h-4 mr-2" /> Open Shift</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Top Header Bar - Light Theme 2026 Style */}
      {currentShift && (
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="font-semibold text-slate-800">Shift Active</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-slate-500">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">{selectedOutlet?.name}</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-slate-500">
              <Monitor className="w-4 h-4" />
              <span className="text-sm">{selectedRegister?.name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{formatTimeElapsed(currentShift.opened_at)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-600 font-medium">
              <Wallet className="w-4 h-4" />
              <span className="text-sm">${currentShift.expected_cash?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReturns(true)}
              className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Returns</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCashMovement(true)}
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            >
              <DollarSign className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Cash In/Out</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                fetchShiftHistory();
                setShowShiftHistory(true);
              }}
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            >
              <History className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">History</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCloseShift(true)}
              className="border-rose-200 text-rose-600 hover:bg-rose-50"
            >
              <StopCircle className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">End Shift</span>
            </Button>
          </div>
        </div>
      )}

      {/* Main POS Interface - Maropost Style */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Categories (Collapsible) */}
        <div className={`bg-white border-r border-slate-200 transition-all duration-300 flex flex-col ${
          sidebarCollapsed ? 'w-16' : 'w-56'
        }`}>
          <div className="p-3 border-b border-slate-200 flex items-center justify-between">
            {!sidebarCollapsed && (
              <span className="font-semibold text-slate-700 text-sm">Categories</span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                selectedCategory === 'all' 
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/25' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Grid3X3 className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="text-sm font-medium">All Products</span>}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  selectedCategory === cat 
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/25' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Tag className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="text-sm font-medium truncate">{cat}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Center - Product Grid */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search products by name, SKU, or scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-12 py-3 bg-white border-slate-200 text-slate-800 rounded-xl shadow-sm focus:border-cyan-500 focus:ring-cyan-500/20 text-base"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Products Header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-700 font-semibold flex items-center gap-2">
              <Package className="w-5 h-5 text-cyan-500" />
              Products
              <span className="text-slate-400 font-normal text-sm">({filteredProducts.length})</span>
            </h2>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto">
            {loadingProducts ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Package className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">No products found</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={product.stock <= 0}
                    className={`group bg-white rounded-2xl p-3 text-left transition-all border-2 ${
                      product.stock > 0 
                        ? 'border-transparent hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer hover:-translate-y-0.5' 
                        : 'opacity-50 cursor-not-allowed border-transparent'
                    }`}
                  >
                    <div className="aspect-square bg-slate-100 rounded-xl mb-3 overflow-hidden">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-10 h-10 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <p className="text-slate-800 text-sm font-medium truncate">{product.name}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-cyan-600 font-bold">${product.price.toFixed(2)}</p>
                      <p className={`text-xs px-2 py-0.5 rounded-full ${
                        product.stock > 10 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : product.stock > 0 
                            ? 'bg-amber-100 text-amber-600' 
                            : 'bg-rose-100 text-rose-600'
                      }`}>
                        {product.stock > 0 ? product.stock : 'Out'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Cart (Maropost Style) */}
        <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-xl">
          {/* Customer Section */}
          <div className="p-4 border-b border-slate-200">
            {customer ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{customer.name}</p>
                    <p className="text-xs text-slate-500">{customer.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setCustomer(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCustomerSearch(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-cyan-500 hover:text-cyan-600 hover:bg-cyan-50/50 transition-all"
              >
                <UserPlus className="w-5 h-5" />
                <span className="font-medium">Add customer to sale</span>
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <ShoppingCart className="w-16 h-16 mb-4 opacity-30" />
                <p className="font-medium">Cart is empty</p>
                <p className="text-sm text-slate-400 mt-1">Click products to add them</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
                >
                  <div className="w-14 h-14 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{item.name}</p>
                    <p className="text-cyan-600 font-semibold">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-semibold text-slate-800">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(index)}
                    className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Totals Section */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-slate-700">${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Discount</span>
                <span className="text-rose-500">-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">GST (10%)</span>
              <span className="text-slate-700">${tax.toFixed(2)}</span>
            </div>
            {shippingCost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" />
                  Shipping
                </span>
                <span className="text-orange-500">${shippingCost.toFixed(2)}</span>
              </div>
            )}
            <div className="h-px bg-slate-200 my-2" />
            <div className="flex justify-between items-center">
              <span className="text-slate-700 font-semibold text-lg">Total</span>
              <span className="text-cyan-600 font-bold text-2xl">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 space-y-3 border-t border-slate-200">
            {/* Pay Now Button */}
            <Button
              onClick={() => setShowPayment(true)}
              disabled={cart.length === 0 || !currentShift}
              className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white rounded-xl shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:shadow-none"
            >
              <Wallet className="w-5 h-5 mr-2" />
              Pay Now
            </Button>
            
            {/* Secondary Actions */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDiscount(true)}
                disabled={cart.length === 0}
                className="border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <Percent className="w-4 h-4 mr-1" />
                Discount
              </Button>
              <Button
                variant="outline"
                className="border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl"
                disabled={cart.length === 0}
              >
                <PauseCircle className="w-4 h-4 mr-1" />
                Park
              </Button>
              <Button
                variant="outline"
                onClick={clearCart}
                disabled={cart.length === 0}
                className="border-rose-200 text-rose-500 hover:bg-rose-50 rounded-xl"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Void
              </Button>
            </div>
            
            {!currentShift && (
              <p className="text-center text-sm text-amber-600 bg-amber-50 rounded-lg py-2">
                Open a shift to process payments
              </p>
            )}
          </div>
        </div>
      </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-xs truncate">{item.name}</p>
                      <p className="text-gray-500 text-[10px]">${item.price.toFixed(2)}</p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(index, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded text-gray-300 hover:bg-gray-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-white text-xs font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded text-gray-300 hover:bg-gray-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <p className="text-white font-semibold text-xs w-14 text-right">${item.subtotal.toFixed(2)}</p>
                    
                    <button
                      onClick={() => removeFromCart(index)}
                      className="p-1 text-gray-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
            <CardContent className="p-3 sm:p-4 space-y-2">
              {customer ? (
                <button
                  onClick={() => setShowCustomerSearch(true)}
                  className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-white font-medium text-xs sm:text-sm truncate">{customer.name}</p>
                    <p className="text-gray-500 text-[10px] sm:text-xs truncate">{customer.email}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCustomer(null); }}
                    className="p-1 text-gray-400 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCustomerSearch(true)}
                    className="flex-1 flex items-center gap-2 p-2 sm:p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400 text-xs sm:text-sm">Search Customer</span>
                  </button>
                  <Button
                    onClick={() => setShowAddCustomer(true)}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              )}
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
              
              {shippingCost > 0 && (
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    Shipping
                  </span>
                  <span className="text-orange-400">${shippingCost.toFixed(2)}</span>
                </div>
              )}
              
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
              disabled={cart.length === 0 || !currentShift}
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
              disabled={cart.length === 0 || !currentShift}
              className="bg-blue-600 hover:bg-blue-700 text-white py-4 sm:py-6 text-sm sm:text-base"
            >
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Card
            </Button>
          </div>
          
          {!currentShift && (
            <p className="text-center text-xs text-yellow-400">Open a shift to process payments</p>
          )}
        </div>
      </div>

      {/* Open Shift Modal */}
      <Dialog open={showOpenShift} onOpenChange={setShowOpenShift}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-emerald-400" />
              Open Shift
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter your opening cash float to begin selling
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                <Building2 className="w-4 h-4" />
                <span>{selectedOutlet?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Monitor className="w-4 h-4" />
                <span>{selectedRegister?.name}</span>
              </div>
            </div>
            
            <div>
              <Label className="text-gray-400 text-sm mb-2 block">Opening Float ($)</Label>
              <Input
                type="number"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
                placeholder="0.00"
                className="bg-gray-800 border-gray-700 text-white text-xl text-center py-3"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">Enter the starting cash amount in the drawer</p>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {[100, 200, 300, 500].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  onClick={() => setOpeningFloat(amount.toString())}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  ${amount}
                </Button>
              ))}
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowOpenShift(false);
                setShowSetup(true);
              }}
              className="border-gray-700 text-gray-300"
            >
              Back
            </Button>
            <Button
              onClick={handleOpenShift}
              disabled={processing || !openingFloat}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {processing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening...</>
              ) : (
                <><PlayCircle className="w-4 h-4 mr-2" /> Start Shift</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift (Cash-Up) Modal */}
      <Dialog open={showCloseShift} onOpenChange={setShowCloseShift}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-orange-400" />
              Cash Up & Close Shift
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Shift Summary */}
            <div className="p-4 bg-gray-800/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Opening Float</span>
                <span className="text-white">${currentShift?.opening_float?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Cash Sales</span>
                <span className="text-emerald-400">
                  +${((currentShift?.expected_cash || 0) - (currentShift?.opening_float || 0)).toFixed(2)}
                </span>
              </div>
              <div className="h-px bg-gray-700 my-2" />
              <div className="flex justify-between font-semibold">
                <span className="text-gray-300">Expected Cash</span>
                <span className="text-white text-lg">${currentShift?.expected_cash?.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400 text-sm mb-2 block">Actual Cash Counted ($)</Label>
                <Input
                  type="number"
                  value={closingData.actualCash}
                  onChange={(e) => setClosingData(prev => ({ ...prev, actualCash: e.target.value }))}
                  placeholder="0.00"
                  className="bg-gray-800 border-gray-700 text-white text-center"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-sm mb-2 block">Closing Float ($)</Label>
                <Input
                  type="number"
                  value={closingData.closingFloat}
                  onChange={(e) => setClosingData(prev => ({ ...prev, closingFloat: e.target.value }))}
                  placeholder="0.00"
                  className="bg-gray-800 border-gray-700 text-white text-center"
                />
              </div>
            </div>
            
            {/* Variance Preview */}
            {closingData.actualCash && currentShift && (
              <div className={`p-3 rounded-lg text-center ${
                parseFloat(closingData.actualCash) === currentShift.expected_cash
                  ? 'bg-emerald-500/20 border border-emerald-500/30'
                  : parseFloat(closingData.actualCash) > currentShift.expected_cash
                    ? 'bg-blue-500/20 border border-blue-500/30'
                    : 'bg-red-500/20 border border-red-500/30'
              }`}>
                <p className="text-sm text-gray-400 mb-1">Variance</p>
                <p className={`text-xl font-bold ${
                  parseFloat(closingData.actualCash) === currentShift.expected_cash
                    ? 'text-emerald-400'
                    : parseFloat(closingData.actualCash) > currentShift.expected_cash
                      ? 'text-blue-400'
                      : 'text-red-400'
                }`}>
                  {parseFloat(closingData.actualCash) >= currentShift.expected_cash ? '+' : ''}
                  ${(parseFloat(closingData.actualCash) - currentShift.expected_cash).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {parseFloat(closingData.actualCash) === currentShift.expected_cash
                    ? 'Perfect balance!'
                    : parseFloat(closingData.actualCash) > currentShift.expected_cash
                      ? 'Cash over'
                      : 'Cash short'}
                </p>
              </div>
            )}
            
            <div>
              <Label className="text-gray-400 text-sm mb-2 block">Notes (Optional)</Label>
              <Input
                value={closingData.notes}
                onChange={(e) => setClosingData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any notes about this shift..."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCloseShift(false)}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCloseShift}
              disabled={processing || !closingData.actualCash || !closingData.closingFloat}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {processing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <><StopCircle className="w-4 h-4 mr-2" /> Close Shift</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash Movement Modal */}
      <Dialog open={showCashMovement} onOpenChange={setShowCashMovement}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-400" />
              Cash In / Out
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={cashMovement.type === 'in' ? 'default' : 'outline'}
                onClick={() => setCashMovement(prev => ({ ...prev, type: 'in' }))}
                className={cashMovement.type === 'in' ? 'bg-emerald-600' : 'border-gray-700 text-gray-300'}
              >
                <ArrowDownCircle className="w-4 h-4 mr-2" />
                Cash In
              </Button>
              <Button
                variant={cashMovement.type === 'out' ? 'default' : 'outline'}
                onClick={() => setCashMovement(prev => ({ ...prev, type: 'out' }))}
                className={cashMovement.type === 'out' ? 'bg-red-600' : 'border-gray-700 text-gray-300'}
              >
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                Cash Out
              </Button>
            </div>
            
            <div>
              <Label className="text-gray-400 text-sm mb-2 block">Amount ($)</Label>
              <Input
                type="number"
                value={cashMovement.amount}
                onChange={(e) => setCashMovement(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                className="bg-gray-800 border-gray-700 text-white text-xl text-center py-3"
              />
            </div>
            
            <div>
              <Label className="text-gray-400 text-sm mb-2 block">Reason</Label>
              <Input
                value={cashMovement.reason}
                onChange={(e) => setCashMovement(prev => ({ ...prev, reason: e.target.value }))}
                placeholder={cashMovement.type === 'in' ? 'e.g., Float top-up, Change' : 'e.g., Petty cash, Bank deposit'}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {[20, 50, 100].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  onClick={() => setCashMovement(prev => ({ ...prev, amount: amount.toString() }))}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  ${amount}
                </Button>
              ))}
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCashMovement(false)}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCashMovement}
              disabled={processing || !cashMovement.amount || !cashMovement.reason}
              className={cashMovement.type === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {processing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Recording...</>
              ) : (
                <><Check className="w-4 h-4 mr-2" /> Record</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal - Maropost Style with Payment Terms */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Wallet className="w-5 h-5 text-emerald-400" />
              Payment
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-2 space-y-4">
            {/* Payment Terms Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setPaymentTerm('pay_in_full')}
                className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  paymentTerm === 'pay_in_full' 
                    ? 'border-emerald-500 text-emerald-400' 
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Pay in full
              </button>
              <button
                onClick={() => setPaymentTerm('pay_later')}
                className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  paymentTerm === 'pay_later' 
                    ? 'border-blue-500 text-blue-400' 
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Pay later
              </button>
              <button
                onClick={() => setPaymentTerm('layby')}
                className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  paymentTerm === 'layby' 
                    ? 'border-purple-500 text-purple-400' 
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Layby
              </button>
            </div>
            
            {/* Amount Summary */}
            <div className="text-center py-3 bg-gray-800/50 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">
                {paymentTerm === 'pay_in_full' ? 'Amount Due' : 'Total Sale'}
              </p>
              <p className="text-3xl font-bold text-emerald-400">${total.toFixed(2)}</p>
            </div>
            
            {/* Pay Later Options */}
            {paymentTerm === 'pay_later' && (
              <div className="space-y-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-400 text-sm font-medium">Initial Payment</p>
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant={initialPaymentType === 'none' ? 'default' : 'outline'}
                    onClick={() => setInitialPaymentType('none')}
                    className={`text-xs ${initialPaymentType === 'none' ? 'bg-blue-600' : 'border-gray-700 text-gray-300'}`}
                  >
                    No
                  </Button>
                  <Button
                    variant={initialPaymentType === 'percent_10' ? 'default' : 'outline'}
                    onClick={() => setInitialPaymentType('percent_10')}
                    className={`text-xs ${initialPaymentType === 'percent_10' ? 'bg-blue-600' : 'border-gray-700 text-gray-300'}`}
                  >
                    10%
                  </Button>
                  <Button
                    variant={initialPaymentType === 'percent_20' ? 'default' : 'outline'}
                    onClick={() => setInitialPaymentType('percent_20')}
                    className={`text-xs ${initialPaymentType === 'percent_20' ? 'bg-blue-600' : 'border-gray-700 text-gray-300'}`}
                  >
                    20%
                  </Button>
                  <Button
                    variant={initialPaymentType === 'custom' ? 'default' : 'outline'}
                    onClick={() => setInitialPaymentType('custom')}
                    className={`text-xs ${initialPaymentType === 'custom' ? 'bg-blue-600' : 'border-gray-700 text-gray-300'}`}
                  >
                    Custom
                  </Button>
                </div>
                {initialPaymentType === 'custom' && (
                  <Input
                    type="number"
                    value={initialPaymentAmount}
                    onChange={(e) => setInitialPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                )}
                {initialPayment > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Pay now:</span>
                    <span className="text-blue-400 font-medium">${initialPayment.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Remaining:</span>
                  <span className="text-gray-300 font-medium">${remainingBalance.toFixed(2)}</span>
                </div>
                {!customer && (
                  <p className="text-yellow-400 text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Customer required for Pay Later
                  </p>
                )}
              </div>
            )}
            
            {/* Layby Options */}
            {paymentTerm === 'layby' && (
              <div className="space-y-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <p className="text-purple-400 text-sm font-medium">When does this need to be fully paid?</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={laybyDuePeriod === '4_weeks' ? 'default' : 'outline'}
                    onClick={() => setLaybyDuePeriod('4_weeks')}
                    className={`text-xs ${laybyDuePeriod === '4_weeks' ? 'bg-purple-600' : 'border-gray-700 text-gray-300'}`}
                  >
                    4 weeks
                  </Button>
                  <Button
                    variant={laybyDuePeriod === '8_weeks' ? 'default' : 'outline'}
                    onClick={() => setLaybyDuePeriod('8_weeks')}
                    className={`text-xs ${laybyDuePeriod === '8_weeks' ? 'bg-purple-600' : 'border-gray-700 text-gray-300'}`}
                  >
                    8 weeks
                  </Button>
                  <Button
                    variant={laybyDuePeriod === 'custom' ? 'default' : 'outline'}
                    onClick={() => setLaybyDuePeriod('custom')}
                    className={`text-xs ${laybyDuePeriod === 'custom' ? 'bg-purple-600' : 'border-gray-700 text-gray-300'}`}
                  >
                    Select date
                  </Button>
                </div>
                {laybyDuePeriod === 'custom' && (
                  <Input
                    type="date"
                    value={laybyDueDate}
                    onChange={(e) => setLaybyDueDate(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    min={new Date().toISOString().split('T')[0]}
                  />
                )}
                {laybyDuePeriod && (
                  <p className="text-purple-300 text-xs">
                    Due by: {calculateLaybyDueDate()}
                  </p>
                )}
                
                <div className="border-t border-purple-500/30 pt-3 mt-2">
                  <p className="text-purple-400 text-sm font-medium mb-2">Initial Payment</p>
                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      variant={initialPaymentType === 'none' ? 'default' : 'outline'}
                      onClick={() => setInitialPaymentType('none')}
                      className={`text-xs ${initialPaymentType === 'none' ? 'bg-purple-600' : 'border-gray-700 text-gray-300'}`}
                    >
                      No
                    </Button>
                    <Button
                      variant={initialPaymentType === 'percent_10' ? 'default' : 'outline'}
                      onClick={() => setInitialPaymentType('percent_10')}
                      className={`text-xs ${initialPaymentType === 'percent_10' ? 'bg-purple-600' : 'border-gray-700 text-gray-300'}`}
                    >
                      10%
                    </Button>
                    <Button
                      variant={initialPaymentType === 'percent_20' ? 'default' : 'outline'}
                      onClick={() => setInitialPaymentType('percent_20')}
                      className={`text-xs ${initialPaymentType === 'percent_20' ? 'bg-purple-600' : 'border-gray-700 text-gray-300'}`}
                    >
                      20%
                    </Button>
                    <Button
                      variant={initialPaymentType === 'custom' ? 'default' : 'outline'}
                      onClick={() => setInitialPaymentType('custom')}
                      className={`text-xs ${initialPaymentType === 'custom' ? 'bg-purple-600' : 'border-gray-700 text-gray-300'}`}
                    >
                      Custom
                    </Button>
                  </div>
                  {initialPaymentType === 'custom' && (
                    <Input
                      type="number"
                      value={initialPaymentAmount}
                      onChange={(e) => setInitialPaymentAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="bg-gray-800 border-gray-700 text-white mt-2"
                    />
                  )}
                </div>
                
                {initialPayment > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Pay now:</span>
                    <span className="text-purple-400 font-medium">${initialPayment.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Remaining:</span>
                  <span className="text-gray-300 font-medium">${remainingBalance.toFixed(2)}</span>
                </div>
                {!customer && (
                  <p className="text-yellow-400 text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Customer required for Layby
                  </p>
                )}
              </div>
            )}
            
            {/* Ship to Customer Toggle */}
            <div className="p-3 bg-gray-800/50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-orange-400" />
                  <span className="text-gray-300 text-sm font-medium">Ship to customer</span>
                </div>
                <button
                  onClick={() => {
                    setShipToCustomer(!shipToCustomer);
                    if (!shipToCustomer) {
                      setShowShippingOptions(true);
                    }
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    shipToCustomer ? 'bg-orange-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      shipToCustomer ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
              
              {/* Shipping Options */}
              {shipToCustomer && (
                <div className="space-y-3 pt-2 border-t border-gray-700">
                  {/* Shipping Method Dropdown */}
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs">Shipping Option</Label>
                    <Select 
                      value={selectedShipping?.id || ''} 
                      onValueChange={(value) => {
                        const method = shippingMethods.find(m => m.id === value);
                        setSelectedShipping(method);
                      }}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-sm">
                        <SelectValue placeholder="Select shipping option..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {shippingMethods.map(method => (
                          <SelectItem 
                            key={method.id} 
                            value={method.id}
                            className="text-white hover:bg-gray-700"
                          >
                            <div className="flex justify-between items-center w-full gap-4">
                              <span>{method.name}</span>
                              <span className="text-orange-400 font-medium">
                                {method.price === 0 ? 'FREE' : `$${method.price.toFixed(2)}`}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedShipping && (
                      <p className="text-gray-500 text-xs">{selectedShipping.description}</p>
                    )}
                  </div>
                  
                  {/* Signature Required Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">Signature required</span>
                    <button
                      onClick={() => setSignatureRequired(!signatureRequired)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        signatureRequired ? 'bg-orange-500' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          signatureRequired ? 'left-5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {/* Delivery Instructions */}
                  <div className="space-y-1">
                    <Label className="text-gray-400 text-xs flex items-center gap-1">
                      <PenLine className="w-3 h-3" />
                      Delivery instructions
                    </Label>
                    <textarea
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      placeholder="E.g., Leave at front door, Call on arrival..."
                      rows={2}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md text-white text-xs p-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  
                  {/* Shipping Cost Display */}
                  {selectedShipping && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                      <span className="text-gray-400 text-sm">Shipping Cost:</span>
                      <span className="text-orange-400 font-bold">
                        {selectedShipping.price === 0 ? 'FREE' : `$${selectedShipping.price.toFixed(2)}`}
                      </span>
                    </div>
                  )}
                  
                  {/* Warning if no customer */}
                  {!customer && (
                    <p className="text-yellow-400 text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Add customer for delivery address
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Payment Method Selection */}
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('cash')}
                  className={`${paymentMethod === 'cash' ? 'bg-emerald-600' : 'border-gray-700 text-gray-300'}`}
                >
                  <Banknote className="w-4 h-4 mr-2" />
                  Cash
                </Button>
                <Button
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('card')}
                  className={`${paymentMethod === 'card' ? 'bg-blue-600' : 'border-gray-700 text-gray-300'}`}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Card
                </Button>
              </div>
            </div>
            
            {/* Cash Payment Details */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3">
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
                  onClick={() => setCashReceived((paymentTerm === 'pay_in_full' ? total : initialPayment).toFixed(2))}
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Exact Amount (${(paymentTerm === 'pay_in_full' ? total : initialPayment).toFixed(2)})
                </Button>
                
                {change > 0 && (
                  <div className="text-center py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <p className="text-gray-400 text-sm mb-1">Change Due</p>
                    <p className="text-2xl font-bold text-emerald-400">${change.toFixed(2)}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Card Payment Details */}
            {paymentMethod === 'card' && (
              <div className="text-center py-4">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-blue-400" />
                <p className="text-gray-400">Present card to terminal</p>
                <p className="text-gray-500 text-sm mt-1">Click Complete when payment is confirmed</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowPayment(false)}
              className="border-gray-700 text-gray-300 w-full sm:w-auto"
            >
              Edit Sale
            </Button>
            <Button
              onClick={processPayment}
              disabled={
                processing || 
                (paymentTerm !== 'pay_in_full' && !customer) ||
                (paymentTerm === 'layby' && !laybyDuePeriod) ||
                (paymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < (paymentTerm === 'pay_in_full' ? total : initialPayment)))
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
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

      {/* Confirm Sale Modal (Phase 1 - Maropost Style) */}
      <Dialog open={showConfirmSale} onOpenChange={setShowConfirmSale}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              Confirm Sale
            </DialogTitle>
            {lastTransaction && (
              <p className="text-gray-400 text-sm mt-1">
                {lastTransaction.transaction_number}
              </p>
            )}
          </DialogHeader>
          
          {lastTransaction && (
            <div className="py-4 space-y-4">
              {/* Sale Summary */}
              <div className={`rounded-lg p-4 text-center ${
                lastTransaction.payment_terms?.type === 'pay_in_full' 
                  ? 'bg-emerald-500/10 border border-emerald-500/30' 
                  : lastTransaction.payment_terms?.type === 'layby'
                    ? 'bg-purple-500/10 border border-purple-500/30'
                    : 'bg-blue-500/10 border border-blue-500/30'
              }`}>
                <p className={`text-2xl font-bold ${
                  lastTransaction.payment_terms?.type === 'pay_in_full' 
                    ? 'text-emerald-400' 
                    : lastTransaction.payment_terms?.type === 'layby'
                      ? 'text-purple-400'
                      : 'text-blue-400'
                }`}>
                  ${lastTransaction.total.toFixed(2)}
                </p>
                <p className={`text-sm mt-1 ${
                  lastTransaction.payment_terms?.type === 'pay_in_full' 
                    ? 'text-emerald-300' 
                    : lastTransaction.payment_terms?.type === 'layby'
                      ? 'text-purple-300'
                      : 'text-blue-300'
                }`}>
                  {lastTransaction.payment_terms?.type === 'pay_in_full' 
                    ? 'Fully Paid' 
                    : lastTransaction.payment_terms?.type === 'layby'
                      ? `Layby - $${lastTransaction.payment_terms.initial_payment.toFixed(2)} paid`
                      : `Pay Later - $${lastTransaction.payment_terms.initial_payment.toFixed(2)} paid`
                  }
                </p>
                {lastTransaction.payment_terms?.type !== 'pay_in_full' && (
                  <p className="text-gray-400 text-xs mt-2">
                    Remaining: ${lastTransaction.payment_terms.remaining_balance.toFixed(2)}
                    {lastTransaction.payment_terms?.due_date && (
                      <span className="ml-2">| Due: {lastTransaction.payment_terms.due_date}</span>
                    )}
                  </p>
                )}
              </div>
              
              {/* Shipping Info */}
              {lastTransaction.shipping && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-4 h-4 text-orange-400" />
                    <span className="text-orange-400 text-sm font-medium">Shipping</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="text-gray-300">{lastTransaction.shipping.method}</p>
                    <p className="text-orange-300 font-medium">
                      {lastTransaction.shipping.cost === 0 ? 'FREE' : `$${lastTransaction.shipping.cost.toFixed(2)}`}
                    </p>
                    {lastTransaction.shipping.signature_required && (
                      <p className="text-gray-400">✍️ Signature required</p>
                    )}
                    {lastTransaction.shipping.delivery_instructions && (
                      <p className="text-gray-500 italic text-xs">&ldquo;{lastTransaction.shipping.delivery_instructions}&rdquo;</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Set Sale Status */}
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Set sale status
                </Label>
                <Select value={saleStatus} onValueChange={setSaleStatus}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {saleStatusOptions.map(option => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        className="text-white hover:bg-gray-700"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {saleStatus === 'completed' && 'Order will be marked as dispatched/fulfilled'}
                  {saleStatus === 'pick' && 'Order will go to Pick section for fulfillment'}
                  {saleStatus === 'pack' && 'Order will go to Pack section'}
                  {saleStatus === 'new' && 'Order will appear as new order'}
                  {saleStatus === 'on_hold' && 'Order will be placed on hold'}
                </p>
              </div>
              
              {/* Receipt Actions */}
              <div className="space-y-3 pt-2 border-t border-gray-700">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={printReceipt}
                    className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print Receipt
                  </Button>
                </div>
                
                {/* Email Receipt */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-300 text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Receipt
                    </Label>
                    <input
                      type="checkbox"
                      checked={emailReceipt}
                      onChange={(e) => setEmailReceipt(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                  {emailReceipt && (
                    <Input
                      type="email"
                      value={receiptEmail}
                      onChange={(e) => setReceiptEmail(e.target.value)}
                      placeholder="customer@email.com"
                      className="bg-gray-800 border-gray-700 text-white text-sm"
                    />
                  )}
                </div>
              </div>
              
              {/* Add Note */}
              <div className="pt-2 border-t border-gray-700">
                {!showSaleNote ? (
                  <Button
                    variant="ghost"
                    onClick={() => setShowSaleNote(true)}
                    className="text-gray-400 hover:text-white hover:bg-gray-800 w-full justify-start"
                  >
                    <StickyNote className="w-4 h-4 mr-2" />
                    Add Note +
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Order Note</Label>
                    <textarea
                      value={saleNote}
                      onChange={(e) => setSaleNote(e.target.value)}
                      placeholder="Add a note to this order..."
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md text-white text-sm p-2 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmSale(false);
                // Go back to add more items (restore cart from transaction)
              }}
              className="border-gray-700 text-gray-300 w-full sm:w-auto"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Sale
            </Button>
            <Button
              onClick={completeSale}
              disabled={completingSale || (emailReceipt && !receiptEmail)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
            >
              {completingSale ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Completing...</>
              ) : (
                <><Check className="w-4 h-4 mr-2" /> Complete Sale</>
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
              <div className="bg-white text-gray-900 p-4 rounded-lg text-sm print:p-0">
                <div className="text-center mb-4">
                  <h3 className="font-bold text-lg">{selectedOutlet?.name || 'Store'}</h3>
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
                  {lastTransaction.shipping_total > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>Shipping ({lastTransaction.shipping?.method})</span>
                      <span>${lastTransaction.shipping_total.toFixed(2)}</span>
                    </div>
                  )}
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
                
                {/* Shipping Details */}
                {lastTransaction.shipping && (
                  <div className="mt-3 pt-2 border-t border-gray-300 text-xs">
                    <p className="font-medium text-gray-700 flex items-center gap-1">
                      <span>🚚</span> Shipping Details
                    </p>
                    <p className="text-gray-600">{lastTransaction.shipping.method}</p>
                    {lastTransaction.shipping.signature_required && (
                      <p className="text-gray-600">✍️ Signature required</p>
                    )}
                    {lastTransaction.shipping.delivery_instructions && (
                      <p className="text-gray-500 italic">&ldquo;{lastTransaction.shipping.delivery_instructions}&rdquo;</p>
                    )}
                  </div>
                )}
                
                <div className="text-center mt-4 pt-2 border-t border-gray-300">
                  <p className="text-xs text-gray-600">Thank you for your purchase!</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={printReceipt}
              className="border-gray-700 text-gray-300 w-full sm:w-auto"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            {lastTransaction?.customer_email && (
              <Button
                variant="outline"
                onClick={handleSendEmailReceipt}
                disabled={sendingEmail}
                className="border-blue-600 text-blue-400 hover:bg-blue-600/10 w-full sm:w-auto"
              >
                {sendingEmail ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                ) : (
                  <><Mail className="w-4 h-4 mr-2" /> Email Tax Invoice</>
                )}
              </Button>
            )}
            <Button
              onClick={() => {
                setShowReceipt(false);
                searchInputRef.current?.focus();
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
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
            
            {/* Add New Customer Button */}
            <Button
              variant="outline"
              onClick={() => {
                setShowCustomerSearch(false);
                setShowAddCustomer(true);
              }}
              className="w-full border-dashed border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add New Customer
            </Button>
            
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
            <DialogTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-emerald-400" />
              Apply Discount
            </DialogTitle>
            {discountSettings && (
              <p className="text-xs text-gray-500 mt-1">
                Your limit: {cartDiscount.type === 'percentage' 
                  ? `${discountSettings.roles?.[user?.role || 'staff']?.max_percentage || 10}%`
                  : `$${discountSettings.roles?.[user?.role || 'staff']?.max_fixed || 50}`
                }
              </p>
            )}
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
              onClick={() => applyDiscount(cartDiscount.type, cartDiscount.value)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift History Modal */}
      <Dialog open={showShiftHistory} onOpenChange={setShowShiftHistory}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-400" />
              Shift History
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 max-h-96 overflow-y-auto">
            {shiftHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No shift history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shiftHistory.map((shift) => (
                  <div key={shift.id} className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{shift.staff_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        shift.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-600/50 text-gray-400'
                      }`}>
                        {shift.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                      <div>Opened: {new Date(shift.opened_at).toLocaleString()}</div>
                      {shift.closed_at && <div>Closed: {new Date(shift.closed_at).toLocaleString()}</div>}
                      <div>Opening: ${shift.opening_float?.toFixed(2)}</div>
                      <div>Expected: ${shift.expected_cash?.toFixed(2)}</div>
                      {shift.variance !== null && (
                        <div className={shift.variance === 0 ? 'text-emerald-400' : shift.variance > 0 ? 'text-blue-400' : 'text-red-400'}>
                          Variance: ${shift.variance?.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Returns Modal */}
      <Dialog open={showReturns} onOpenChange={setShowReturns}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-orange-400" />
              Process Return / Refund
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Search for the original transaction to process a return
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Transaction Search */}
            <div className="flex gap-2">
              <Input
                type="text"
                value={returnTransactionSearch}
                onChange={(e) => setReturnTransactionSearch(e.target.value)}
                placeholder="Enter transaction number (e.g., POS-20251222-0001)"
                className="bg-gray-800 border-gray-700 text-white flex-1"
                onKeyDown={(e) => e.key === 'Enter' && searchReturnTransaction()}
              />
              <Button
                onClick={searchReturnTransaction}
                className="bg-gray-700 hover:bg-gray-600"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Transaction Found */}
            {returnTransaction && (
              <div className="space-y-4">
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">{returnTransaction.transaction_number}</span>
                    <span className="text-gray-400 text-sm">
                      {new Date(returnTransaction.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Original Total: <span className="text-white">${returnTransaction.total?.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Returnable Items */}
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Select items to return:</Label>
                  {returnableItems.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4 text-center">
                      All items from this transaction have been returned
                    </p>
                  ) : (
                    returnableItems.map((item) => {
                      const isSelected = returnItems.some(ri => ri.product_id === item.product_id);
                      const selectedItem = returnItems.find(ri => ri.product_id === item.product_id);
                      
                      return (
                        <div
                          key={item.product_id}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-orange-500/20 border border-orange-500/50' : 'bg-gray-800/50 hover:bg-gray-800'
                          }`}
                          onClick={() => toggleReturnItem(item)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-600'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div>
                                <p className="text-white text-sm">{item.name}</p>
                                <p className="text-gray-500 text-xs">
                                  ${item.price.toFixed(2)} × {item.max_returnable} available
                                  {item.already_returned > 0 && ` (${item.already_returned} already returned)`}
                                </p>
                              </div>
                            </div>
                            
                            {isSelected && (
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => updateReturnQty(item.product_id, (selectedItem?.return_qty || 1) - 1)}
                                  className="w-6 h-6 bg-gray-700 rounded flex items-center justify-center"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-8 text-center text-white">{selectedItem?.return_qty || 1}</span>
                                <button
                                  onClick={() => updateReturnQty(item.product_id, (selectedItem?.return_qty || 1) + 1)}
                                  className="w-6 h-6 bg-gray-700 rounded flex items-center justify-center"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                {returnItems.length > 0 && (
                  <>
                    {/* Return Reason */}
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Return Reason</Label>
                      <Select value={returnReason} onValueChange={setReturnReason}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue placeholder="Select reason..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="customer_return" className="text-white">Customer Changed Mind</SelectItem>
                          <SelectItem value="defective" className="text-white">Defective Product</SelectItem>
                          <SelectItem value="wrong_item" className="text-white">Wrong Item</SelectItem>
                          <SelectItem value="damaged" className="text-white">Damaged in Transit</SelectItem>
                          <SelectItem value="other" className="text-white">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Refund Method */}
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Refund Method</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={refundMethod === 'cash' ? 'default' : 'outline'}
                          onClick={() => setRefundMethod('cash')}
                          className={refundMethod === 'cash' ? 'bg-emerald-600' : 'border-gray-700 text-gray-300'}
                        >
                          <Banknote className="w-4 h-4 mr-2" />
                          Cash
                        </Button>
                        <Button
                          variant={refundMethod === 'card' ? 'default' : 'outline'}
                          onClick={() => setRefundMethod('card')}
                          className={refundMethod === 'card' ? 'bg-blue-600' : 'border-gray-700 text-gray-300'}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Card
                        </Button>
                        <Button
                          variant={refundMethod === 'store_credit' ? 'default' : 'outline'}
                          onClick={() => setRefundMethod('store_credit')}
                          className={refundMethod === 'store_credit' ? 'bg-purple-600' : 'border-gray-700 text-gray-300'}
                        >
                          <Receipt className="w-4 h-4 mr-2" />
                          Store Credit
                        </Button>
                      </div>
                    </div>
                    
                    {/* Refund Total */}
                    <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                      <p className="text-gray-400 text-sm mb-1">Refund Amount</p>
                      <p className="text-3xl font-bold text-orange-400">${calculateReturnTotal().toFixed(2)}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowReturns(false);
                setReturnTransaction(null);
                setReturnableItems([]);
                setReturnItems([]);
                setReturnReason('');
                setReturnTransactionSearch('');
              }}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={processReturn}
              disabled={processingReturn || returnItems.length === 0 || !returnReason}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {processingReturn ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <><RotateCcw className="w-4 h-4 mr-2" /> Process Return</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Customer Modal */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              Add New Customer
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Basic Info - Names */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">First Name *</Label>
                <Input
                  value={newCustomer.firstName}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Last Name *</Label>
                <Input
                  value={newCustomer.lastName}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Smith"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            
            {/* Company */}
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Company Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={newCustomer.company}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Company Pty Ltd"
                  className="bg-gray-800 border-gray-700 text-white pl-10"
                />
              </div>
            </div>
            
            {/* Email & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@example.com"
                    className="bg-gray-800 border-gray-700 text-white pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="0400 000 000"
                    className="bg-gray-800 border-gray-700 text-white pl-10"
                  />
                </div>
              </div>
            </div>
            
            {/* Billing Address */}
            <div className="pt-2 border-t border-gray-700">
              <Label className="text-gray-300 text-sm font-medium">Billing Address</Label>
              <div className="mt-2 space-y-3">
                <Input
                  value={newCustomer.billingAddress}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, billingAddress: e.target.value }))}
                  placeholder="Street address"
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    value={newCustomer.billingCity}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, billingCity: e.target.value }))}
                    placeholder="City"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  <Select 
                    value={newCustomer.billingState} 
                    onValueChange={(value) => setNewCustomer(prev => ({ ...prev, billingState: value }))}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="NSW" className="text-white hover:bg-gray-700">NSW</SelectItem>
                      <SelectItem value="VIC" className="text-white hover:bg-gray-700">VIC</SelectItem>
                      <SelectItem value="QLD" className="text-white hover:bg-gray-700">QLD</SelectItem>
                      <SelectItem value="WA" className="text-white hover:bg-gray-700">WA</SelectItem>
                      <SelectItem value="SA" className="text-white hover:bg-gray-700">SA</SelectItem>
                      <SelectItem value="TAS" className="text-white hover:bg-gray-700">TAS</SelectItem>
                      <SelectItem value="ACT" className="text-white hover:bg-gray-700">ACT</SelectItem>
                      <SelectItem value="NT" className="text-white hover:bg-gray-700">NT</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={newCustomer.billingPostcode}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, billingPostcode: e.target.value }))}
                    placeholder="Postcode"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
            </div>
            
            {/* Delivery Address Toggle */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="sameAsDelivery"
                checked={newCustomer.sameAsDelivery}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, sameAsDelivery: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
              />
              <Label htmlFor="sameAsDelivery" className="text-gray-300 text-sm cursor-pointer">
                Delivery address same as billing
              </Label>
            </div>
            
            {/* Delivery Address (shown if different) */}
            {!newCustomer.sameAsDelivery && (
              <div className="pt-2 border-t border-gray-700">
                <Label className="text-gray-300 text-sm font-medium">Delivery Address</Label>
                <div className="mt-2 space-y-3">
                  <Input
                    value={newCustomer.deliveryAddress}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                    placeholder="Street address"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      value={newCustomer.deliveryCity}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, deliveryCity: e.target.value }))}
                      placeholder="City"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    <Select 
                      value={newCustomer.deliveryState} 
                      onValueChange={(value) => setNewCustomer(prev => ({ ...prev, deliveryState: value }))}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="NSW" className="text-white hover:bg-gray-700">NSW</SelectItem>
                        <SelectItem value="VIC" className="text-white hover:bg-gray-700">VIC</SelectItem>
                        <SelectItem value="QLD" className="text-white hover:bg-gray-700">QLD</SelectItem>
                        <SelectItem value="WA" className="text-white hover:bg-gray-700">WA</SelectItem>
                        <SelectItem value="SA" className="text-white hover:bg-gray-700">SA</SelectItem>
                        <SelectItem value="TAS" className="text-white hover:bg-gray-700">TAS</SelectItem>
                        <SelectItem value="ACT" className="text-white hover:bg-gray-700">ACT</SelectItem>
                        <SelectItem value="NT" className="text-white hover:bg-gray-700">NT</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={newCustomer.deliveryPostcode}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, deliveryPostcode: e.target.value }))}
                      placeholder="Postcode"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddCustomer(false);
                setNewCustomer({ 
                  firstName: '',
                  lastName: '', 
                  company: '',
                  email: '', 
                  phone: '',
                  billingAddress: '',
                  billingCity: '',
                  billingState: '',
                  billingPostcode: '',
                  sameAsDelivery: true,
                  deliveryAddress: '',
                  deliveryCity: '',
                  deliveryState: '',
                  deliveryPostcode: ''
                });
              }}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuickAddCustomer}
              disabled={addingCustomer || !newCustomer.firstName || !newCustomer.lastName || !newCustomer.email}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {addingCustomer ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" /> Add Customer</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount Approval Modal */}
      <Dialog open={showDiscountApproval} onOpenChange={setShowDiscountApproval}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-yellow-400" />
              Discount Requires Approval
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-medium">Permission Required</span>
              </div>
              <p className="text-gray-400 text-sm">
                The discount of {pendingDiscount?.type === 'percentage' 
                  ? `${pendingDiscount?.value}%` 
                  : `$${pendingDiscount?.value}`} exceeds your authorization limit.
              </p>
            </div>
            
            <p className="text-gray-400 text-sm">
              You can request manager approval to apply this discount.
            </p>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDiscountApproval(false);
                setPendingDiscount(null);
              }}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={requestDiscountApproval}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <Shield className="w-4 h-4 mr-2" />
              Request Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantPOS;
