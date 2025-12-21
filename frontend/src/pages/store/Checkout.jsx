import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CreditCard, Lock, Check, ChevronLeft, Truck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
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
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: ''
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const subtotal = getCartTotal();
  const shipping = subtotal > 50 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const orderData = {
        customer_name: `${formData.firstName} ${formData.lastName}`,
        customer_email: formData.email,
        customer_phone: formData.phone,
        shipping_address: `${formData.address}, ${formData.city}, ${formData.zipCode}`,
        items: cart.map(item => ({
          product_id: item.id,
          product_name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        })),
        subtotal,
        shipping,
        tax,
        total,
        payment_method: paymentMethod
      };

      const response = await axios.post(`${API}/orders`, orderData);
      setOrderNumber(response.data.order_number);
      setOrderPlaced(true);
      clearCart();
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
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold border-2 ${
                  step >= s ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 text-gray-400'
                }`}>
                  {step > s ? <Check size={20} /> : s}
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-1 rounded ${
                    step > s ? 'bg-orange-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Shipping */}
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
                  <Input name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="+1 (555) 000-0000" />
                </div>
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Input name="address" value={formData.address} onChange={handleInputChange} placeholder="123 Main St" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Input name="city" value={formData.city} onChange={handleInputChange} placeholder="New York" required />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP Code *</Label>
                    <Input name="zipCode" value={formData.zipCode} onChange={handleInputChange} placeholder="10001" required />
                  </div>
                </div>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!formData.firstName || !formData.lastName || !formData.email || !formData.address || !formData.city || !formData.zipCode}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 mt-4"
                >
                  Continue to Shipping Method
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Shipping Method */}
          {step === 2 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Shipping Method</h2>
              <RadioGroup defaultValue="standard">
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-orange-500 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="standard" id="standard" />
                      <Truck size={20} className="text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900">Standard Shipping</p>
                        <p className="text-sm text-gray-500">5-7 business days</p>
                      </div>
                    </div>
                    <span className="font-semibold">{subtotal > 50 ? <span className="text-green-600">FREE</span> : '$9.99'}</span>
                  </label>
                  <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-orange-500 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="express" id="express" />
                      <Truck size={20} className="text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900">Express Shipping</p>
                        <p className="text-sm text-gray-500">2-3 business days</p>
                      </div>
                    </div>
                    <span className="font-semibold">$14.99</span>
                  </label>
                </div>
              </RadioGroup>
              <div className="flex gap-4 mt-6">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 py-6 border-gray-300">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-6">
                  Continue to Payment
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Method</h2>
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
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 py-6 border-gray-300">
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
                  {shipping === 0 ? <span className="text-green-600">FREE</span> : formatCurrency(shipping)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium text-gray-900">{formatCurrency(tax)}</span>
              </div>
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
