import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CreditCard, Lock, Check, ChevronLeft, Truck, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useCart } from './StoreLayout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, getCartTotal, clearCart } = useCart();
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Shipping state
  const [suburbs, setSuburbs] = useState([]);
  const [loadingSuburbs, setLoadingSuburbs] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [shippingCalculated, setShippingCalculated] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    suburb: '',
    state: '',
    postcode: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: ''
  });

  // Load shipping info from cart page if available
  useEffect(() => {
    const savedShipping = sessionStorage.getItem('shippingInfo');
    if (savedShipping) {
      try {
        const info = JSON.parse(savedShipping);
        setFormData(prev => ({
          ...prev,
          postcode: info.postcode || '',
          suburb: info.suburb || ''
        }));
        if (info.selectedShipping) {
          setSelectedShipping(info.selectedShipping);
          setShippingCalculated(true);
        }
      } catch (e) {
        console.error('Error loading shipping info:', e);
      }
    }
  }, []);

  // Fetch suburbs when postcode changes
  useEffect(() => {
    const fetchSuburbs = async () => {
      if (formData.postcode.length >= 4) {
        setLoadingSuburbs(true);
        try {
          const response = await axios.get(`${API}/shipping/suburbs?postcode=${formData.postcode}`);
          setSuburbs(response.data.suburbs || []);
          // Auto-select if only one suburb
          if (response.data.suburbs?.length === 1) {
            setFormData(prev => ({ 
              ...prev, 
              suburb: response.data.suburbs[0].suburb,
              state: response.data.suburbs[0].state 
            }));
          }
          // Reset shipping when postcode changes
          setShippingCalculated(false);
          setSelectedShipping(null);
          setShippingOptions([]);
        } catch (error) {
          console.error('Error fetching suburbs:', error);
          setSuburbs([]);
        } finally {
          setLoadingSuburbs(false);
        }
      } else {
        setSuburbs([]);
        setShippingCalculated(false);
        setSelectedShipping(null);
        setShippingOptions([]);
      }
    };
    
    const debounceTimer = setTimeout(fetchSuburbs, 300);
    return () => clearTimeout(debounceTimer);
  }, [formData.postcode]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSuburbChange = (suburb) => {
    const selectedSuburb = suburbs.find(s => s.suburb === suburb);
    setFormData(prev => ({ 
      ...prev, 
      suburb: suburb,
      state: selectedSuburb?.state || prev.state
    }));
    // Reset shipping when suburb changes
    setShippingCalculated(false);
    setSelectedShipping(null);
  };

  const calculateShipping = async () => {
    if (!formData.postcode || cart.length === 0) return;
    
    setCalculatingShipping(true);
    try {
      // Build items array with shipping dimensions for ALL cart items
      const items = cart.map(item => {
        const itemData = {
          weight: item.weight || 0.5,
          quantity: item.quantity
        };
        
        // Use shipping dimensions if available, fall back to regular dimensions
        if (item.shipping_length && item.shipping_width && item.shipping_height) {
          itemData.shipping_length = item.shipping_length;
          itemData.shipping_width = item.shipping_width;
          itemData.shipping_height = item.shipping_height;
        } else if (item.length && item.width && item.height) {
          itemData.shipping_length = item.length;
          itemData.shipping_width = item.width;
          itemData.shipping_height = item.height;
        }
        
        return itemData;
      });

      const response = await axios.post(`${API}/shipping/calculate`, {
        postcode: formData.postcode,
        suburb: formData.suburb || null,
        country: 'AU',
        items: items,
        cart_total: subtotal
      });
      
      setShippingOptions(response.data.options || []);
      setShippingCalculated(true);
      
      // Auto-select first option
      if (response.data.options?.length > 0) {
        setSelectedShipping(response.data.options[0]);
      }
    } catch (error) {
      console.error('Error calculating shipping:', error);
      setShippingOptions([]);
    } finally {
      setCalculatingShipping(false);
    }
  };

  const subtotal = getCartTotal();
  const shippingCost = selectedShipping?.price || 0;
  const total = subtotal + shippingCost;

  const canProceedToPayment = () => {
    return formData.firstName && 
           formData.lastName && 
           formData.email && 
           formData.address && 
           formData.postcode && 
           formData.suburb &&
           shippingCalculated && 
           selectedShipping;
  };

  const handlePlaceOrder = async () => {
    if (!selectedShipping) {
      alert('Please select a shipping method before placing your order.');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        customer_name: `${formData.firstName} ${formData.lastName}`,
        customer_email: formData.email,
        customer_phone: formData.phone,
        shipping_address: `${formData.address}, ${formData.suburb}, ${formData.state} ${formData.postcode}`,
        items: cart.map(item => ({
          product_id: item.id,
          product_name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        })),
        subtotal,
        shipping: shippingCost,
        shipping_method: selectedShipping.name,
        shipping_carrier: selectedShipping.carrier,
        tax: selectedShipping.gst_amount || 0,
        total,
        payment_method: paymentMethod
      };

      const response = await axios.post(`${API}/orders`, orderData);
      setOrderNumber(response.data.order_number);
      setOrderPlaced(true);
      clearCart();
      sessionStorage.removeItem('shippingInfo');
    } catch (error) {
      console.error('Error placing order:', error);
      alert('There was an error placing your order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0 && !orderPlaced) {
    navigate('/store/cart');
    return null;
  }

  if (orderPlaced) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Check size={40} className="text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Order Placed Successfully!</h1>
          <p className="text-gray-500 mb-2">Thank you for your purchase.</p>
          <p className="text-lg font-semibold text-orange-500 mb-8">Order #{orderNumber}</p>
          <p className="text-gray-600 mb-8">
            We've sent a confirmation email to <strong>{formData.email}</strong> with order details and tracking information.
          </p>
          <Link to="/store">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back Link */}
      <Link to="/store/cart" className="inline-flex items-center gap-2 text-gray-600 hover:text-orange-500 mb-8">
        <ChevronLeft size={20} />
        Back to Cart
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Checkout Form */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mb-8">
            {[1, 2].map((s) => (
              <React.Fragment key={s}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold border-2 ${
                  step >= s ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 text-gray-400'
                }`}>
                  {step > s ? <Check size={20} /> : s}
                </div>
                {s < 2 && (
                  <div className={`flex-1 h-1 rounded ${
                    step > s ? 'bg-orange-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Shipping Address & Method */}
          {step === 1 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Shipping Information</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="John" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name *</Label>
                    <Input name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Doe" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="john@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="+61 400 000 000" />
                </div>
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Input name="address" value={formData.address} onChange={handleInputChange} placeholder="123 Main St" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Postcode *
                      {loadingSuburbs && <Loader2 className="w-3 h-3 animate-spin" />}
                    </Label>
                    <Input 
                      name="postcode" 
                      value={formData.postcode} 
                      onChange={handleInputChange} 
                      placeholder="2000" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Suburb *</Label>
                    <Select 
                      value={formData.suburb} 
                      onValueChange={handleSuburbChange}
                      disabled={suburbs.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={suburbs.length === 0 ? "Enter postcode first" : "Select suburb"} />
                      </SelectTrigger>
                      <SelectContent>
                        {suburbs.map((s, idx) => (
                          <SelectItem key={idx} value={s.suburb}>
                            {s.suburb} ({s.state})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Calculate Shipping Button */}
                {formData.postcode && formData.suburb && !shippingCalculated && (
                  <Button
                    onClick={calculateShipping}
                    disabled={calculatingShipping}
                    className="w-full bg-gray-800 hover:bg-gray-900 text-white py-4"
                  >
                    {calculatingShipping ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Calculating Shipping...
                      </>
                    ) : (
                      <>
                        <Truck className="w-4 h-4 mr-2" />
                        Calculate Shipping Options
                      </>
                    )}
                  </Button>
                )}

                {/* Shipping Options */}
                {shippingCalculated && shippingOptions.length > 0 && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Truck size={18} className="text-orange-500" />
                      Select Shipping Method *
                    </h3>
                    <div className="space-y-3">
                      {shippingOptions.map((option, idx) => (
                        <label
                          key={idx}
                          className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedShipping?.id === option.id 
                              ? 'border-orange-500 bg-orange-50' 
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="shipping"
                              checked={selectedShipping?.id === option.id}
                              onChange={() => setSelectedShipping(option)}
                              className="text-orange-500"
                            />
                            <div>
                              <p className="font-medium text-gray-900">{option.name}</p>
                              <p className="text-sm text-gray-500">{option.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`font-bold ${option.price === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                              {option.price === 0 ? 'FREE' : formatCurrency(option.price)}
                            </span>
                            {option.price > 0 && option.gst_amount > 0 && (
                              <p className="text-xs text-gray-500">
                                {option.tax_inclusive ? 'incl. GST' : '+ GST'}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {shippingCalculated && shippingOptions.length === 0 && (
                  <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">
                      No shipping options available for this location. Please check your address or contact support.
                    </p>
                  </div>
                )}

                {/* Warning if shipping not calculated */}
                {!shippingCalculated && formData.postcode && formData.suburb && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-700">
                      Please calculate shipping options before proceeding to payment.
                    </p>
                  </div>
                )}

                <Button
                  onClick={() => setStep(2)}
                  disabled={!canProceedToPayment()}
                  className={`w-full py-6 mt-4 ${
                    canProceedToPayment() 
                      ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Continue to Payment
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Method</h2>
              
              {/* Shipping Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Shipping to:</h3>
                <p className="text-gray-600 text-sm">
                  {formData.firstName} {formData.lastName}<br />
                  {formData.address}<br />
                  {formData.suburb}, {formData.state} {formData.postcode}
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <strong>Shipping Method:</strong> {selectedShipping?.name} - {' '}
                    <span className={selectedShipping?.price === 0 ? 'text-green-600 font-semibold' : 'font-semibold'}>
                      {selectedShipping?.price === 0 ? 'FREE' : formatCurrency(selectedShipping?.price || 0)}
                    </span>
                  </p>
                </div>
              </div>

              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-orange-500 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                    <RadioGroupItem value="card" id="card" />
                    <CreditCard size={20} />
                    <span className="font-medium text-gray-900">Credit Card</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-orange-500 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                    <RadioGroupItem value="paypal" id="paypal" />
                    <span className="font-bold text-blue-600">PayPal</span>
                  </label>
                </div>
              </RadioGroup>

              {paymentMethod === 'card' && (
                <div className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <Label>Card Number</Label>
                    <Input name="cardNumber" value={formData.cardNumber} onChange={handleInputChange} placeholder="1234 5678 9012 3456" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input name="expiryDate" value={formData.expiryDate} onChange={handleInputChange} placeholder="MM/YY" />
                    </div>
                    <div className="space-y-2">
                      <Label>CVV</Label>
                      <Input name="cvv" value={formData.cvv} onChange={handleInputChange} placeholder="123" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Name on Card</Label>
                    <Input name="cardName" value={formData.cardName} onChange={handleInputChange} placeholder="John Doe" />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-500 mt-6">
                <Lock size={16} />
                Your payment information is encrypted and secure.
              </div>

              <div className="flex gap-4 mt-6">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 py-6 border-gray-300">
                  Back
                </Button>
                <Button
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-6"
                >
                  {loading ? 'Processing...' : 'Place Order'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
            <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <img
                    src={item.image || 'https://via.placeholder.com/80'}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 text-sm line-clamp-1">{item.name}</h3>
                    <p className="text-gray-500 text-sm">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium text-gray-900">
                  {!shippingCalculated ? (
                    <span className="text-gray-500 text-sm">Enter address</span>
                  ) : selectedShipping ? (
                    selectedShipping.price === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      formatCurrency(shippingCost)
                    )
                  ) : (
                    <span className="text-gray-500 text-sm">Select method</span>
                  )}
                </span>
              </div>
              {selectedShipping && selectedShipping.gst_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">GST (included)</span>
                  <span className="text-gray-500">{formatCurrency(selectedShipping.gst_amount)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-orange-500">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
