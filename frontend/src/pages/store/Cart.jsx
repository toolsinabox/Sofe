import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ArrowLeft, Truck, MapPin, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useCart } from './StoreLayout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, getCartTotal } = useCart();
  
  // Shipping calculator state
  const [shippingPostcode, setShippingPostcode] = useState('');
  const [shippingSuburb, setShippingSuburb] = useState('');
  const [suburbs, setSuburbs] = useState([]);
  const [loadingSuburbs, setLoadingSuburbs] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [shippingCalculated, setShippingCalculated] = useState(false);

  // Fetch suburbs when postcode changes
  useEffect(() => {
    const fetchSuburbs = async () => {
      if (shippingPostcode.length >= 4) {
        setLoadingSuburbs(true);
        try {
          const response = await axios.get(`${API}/shipping/suburbs?postcode=${shippingPostcode}`);
          setSuburbs(response.data.suburbs || []);
          if (response.data.suburbs?.length === 1) {
            setShippingSuburb(response.data.suburbs[0].suburb);
          } else {
            setShippingSuburb('');
          }
          setShippingCalculated(false);
          setSelectedShipping(null);
        } catch (error) {
          console.error('Error fetching suburbs:', error);
          setSuburbs([]);
        } finally {
          setLoadingSuburbs(false);
        }
      } else {
        setSuburbs([]);
        setShippingSuburb('');
        setShippingCalculated(false);
        setSelectedShipping(null);
      }
    };
    
    const debounceTimer = setTimeout(fetchSuburbs, 300);
    return () => clearTimeout(debounceTimer);
  }, [shippingPostcode]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const calculateShipping = async () => {
    if (!shippingPostcode || cart.length === 0) return;
    
    setCalculatingShipping(true);
    try {
      // Build items array with shipping dimensions
      const items = cart.map(item => {
        const itemData = {
          weight: item.weight || 0.5,
          quantity: item.quantity
        };
        
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
        postcode: shippingPostcode,
        suburb: shippingSuburb || null,
        country: 'AU',
        items: items,
        cart_total: subtotal
      });
      
      setShippingOptions(response.data.options || []);
      setShippingCalculated(true);
      
      // Auto-select first non-pickup option, or pickup if that's all there is
      if (response.data.options?.length > 0) {
        const defaultOption = response.data.options.find(o => o.id !== 'pickup') || response.data.options[0];
        setSelectedShipping(defaultOption);
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
  const gstAmount = selectedShipping?.gst_amount || (subtotal * 0.1);
  const total = subtotal + shippingCost;

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center bg-white rounded-lg border border-gray-200 p-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <ShoppingBag size={40} className="text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
          <p className="text-gray-500 mb-8">Looks like you haven't added any items to your cart yet.</p>
          <Link to="/store/products">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              Start Shopping
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/store" className="hover:text-orange-500">Home</Link>
        <span>/</span>
        <span className="text-gray-900">Shopping Cart</span>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 text-sm">
              <div className="col-span-6">Product</div>
              <div className="col-span-2 text-center">Price</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            {/* Items */}
            {cart.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 items-center">
                <div className="col-span-12 md:col-span-6 flex items-center gap-4">
                  <img
                    src={item.image || 'https://via.placeholder.com/100'}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                  <div>
                    <Link to={`/store/product/${item.id}`}>
                      <h3 className="font-semibold text-gray-900 hover:text-orange-500 transition-colors">
                        {item.name}
                      </h3>
                    </Link>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-sm text-red-500 hover:text-red-600 mt-1 flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
                <div className="col-span-4 md:col-span-2 text-center">
                  <span className="md:hidden text-gray-500 text-sm">Price: </span>
                  <span className="font-semibold text-gray-900">{formatCurrency(item.price)}</span>
                </div>
                <div className="col-span-4 md:col-span-2 flex justify-center">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-2 hover:bg-gray-100 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-2 hover:bg-gray-100 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div className="col-span-4 md:col-span-2 text-right">
                  <span className="md:hidden text-gray-500 text-sm">Total: </span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Link to="/store/products" className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-semibold">
              <ArrowLeft size={18} /> Continue Shopping
            </Link>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
            
            {/* Shipping Calculator */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Truck size={18} className="text-orange-500" />
                Calculate Shipping
              </h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-600 text-sm">Postcode</Label>
                  <Input
                    placeholder="e.g., 2000"
                    value={shippingPostcode}
                    onChange={(e) => setShippingPostcode(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-600 text-sm flex items-center gap-1">
                    Suburb
                    {loadingSuburbs && <Loader2 className="w-3 h-3 animate-spin" />}
                  </Label>
                  <Select 
                    value={shippingSuburb} 
                    onValueChange={setShippingSuburb}
                    disabled={suburbs.length === 0}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={suburbs.length === 0 ? "Enter postcode" : "Select suburb"} />
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
                <Button
                  onClick={calculateShipping}
                  disabled={!shippingPostcode || calculatingShipping}
                  className="w-full bg-gray-800 hover:bg-gray-900 text-white"
                >
                  {calculatingShipping ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <MapPin className="w-4 h-4 mr-2" />
                  )}
                  {calculatingShipping ? 'Calculating...' : 'Calculate'}
                </Button>
              </div>

              {/* Shipping Options */}
              {shippingCalculated && shippingOptions.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Select shipping method:</p>
                  {shippingOptions.map((option, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedShipping?.id === option.id 
                          ? 'border-orange-500 bg-orange-50' 
                          : 'border-gray-200 hover:border-gray-300'
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
                          <p className="font-medium text-gray-900 text-sm">{option.name}</p>
                          <p className="text-xs text-gray-500">{option.description}</p>
                        </div>
                      </div>
                      <span className={`font-bold text-sm ${option.price === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                        {option.price === 0 ? 'FREE' : formatCurrency(option.price)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium text-gray-900">
                  {!shippingCalculated ? (
                    <span className="text-gray-500 text-sm">Calculate above</span>
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
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-orange-500">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {!shippingCalculated && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-700">
                  Please enter your postcode to calculate shipping before checkout.
                </p>
              </div>
            )}

            <Link 
              to={shippingCalculated && selectedShipping ? "/store/checkout" : "#"}
              onClick={(e) => {
                if (!shippingCalculated || !selectedShipping) {
                  e.preventDefault();
                  alert('Please calculate shipping and select a shipping method before proceeding to checkout.');
                } else {
                  // Store shipping info in sessionStorage for checkout
                  sessionStorage.setItem('shippingInfo', JSON.stringify({
                    postcode: shippingPostcode,
                    suburb: shippingSuburb,
                    selectedShipping: selectedShipping
                  }));
                }
              }}
            >
              <Button 
                className={`w-full mt-6 py-6 text-lg ${
                  shippingCalculated && selectedShipping 
                    ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!shippingCalculated || !selectedShipping}
              >
                Proceed to Checkout <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>

            <p className="text-xs text-gray-500 text-center mt-4">
              Secure checkout. Your information is protected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
