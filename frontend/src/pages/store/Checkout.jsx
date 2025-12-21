import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Lock, Check, ChevronLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { useCart } from './StoreLayout';

const Checkout = () => {
  const { cart, getCartTotal } = useCart();
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [orderPlaced, setOrderPlaced] = useState(false);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const subtotal = getCartTotal();
  const shipping = subtotal > 50 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const handlePlaceOrder = () => {
    setOrderPlaced(true);
  };

  if (orderPlaced) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full mx-auto mb-6 flex items-center justify-center">
          <Check size={40} className="text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Order Placed Successfully!</h1>
        <p className="text-gray-500 mb-2">Thank you for your purchase.</p>
        <p className="text-gray-500 mb-8">Order #ORD-2024-{Math.floor(Math.random() * 10000).toString().padStart(4, '0')}</p>
        <p className="text-gray-600 mb-8">
          We've sent a confirmation email to your inbox with order details and tracking information.
        </p>
        <Link to="/store">
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
            Continue Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back Link */}
      <Link to="/store/cart" className="inline-flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-8">
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
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > s ? <Check size={20} /> : s}
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-1 rounded ${
                    step > s ? 'bg-emerald-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Shipping */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Shipping Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input placeholder="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input type="tel" placeholder="+1 (555) 000-0000" />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input placeholder="123 Main St" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input placeholder="New York" />
                </div>
                <div className="space-y-2">
                  <Label>ZIP Code</Label>
                  <Input placeholder="10001" />
                </div>
              </div>
              <Button
                onClick={() => setStep(2)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6"
              >
                Continue to Shipping Method
              </Button>
            </div>
          )}

          {/* Step 2: Shipping Method */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Shipping Method</h2>
              <RadioGroup defaultValue="standard">
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-emerald-500 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="standard" id="standard" />
                      <div>
                        <p className="font-medium text-gray-900">Standard Shipping</p>
                        <p className="text-sm text-gray-500">5-7 business days</p>
                      </div>
                    </div>
                    <span className="font-medium">{subtotal > 50 ? 'Free' : '$9.99'}</span>
                  </label>
                  <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-emerald-500 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="express" id="express" />
                      <div>
                        <p className="font-medium text-gray-900">Express Shipping</p>
                        <p className="text-sm text-gray-500">2-3 business days</p>
                      </div>
                    </div>
                    <span className="font-medium">$14.99</span>
                  </label>
                  <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-emerald-500 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="overnight" id="overnight" />
                      <div>
                        <p className="font-medium text-gray-900">Overnight Shipping</p>
                        <p className="text-sm text-gray-500">Next business day</p>
                      </div>
                    </div>
                    <span className="font-medium">$24.99</span>
                  </label>
                </div>
              </RadioGroup>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 py-6"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-6"
                >
                  Continue to Payment
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-emerald-500 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                    <RadioGroupItem value="card" id="card" />
                    <CreditCard size={20} />
                    <span className="font-medium text-gray-900">Credit Card</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-emerald-500 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                    <RadioGroupItem value="paypal" id="paypal" />
                    <span className="font-bold text-blue-600">PayPal</span>
                  </label>
                </div>
              </RadioGroup>

              {paymentMethod === 'card' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Card Number</Label>
                    <Input placeholder="1234 5678 9012 3456" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input placeholder="MM/YY" />
                    </div>
                    <div className="space-y-2">
                      <Label>CVV</Label>
                      <Input placeholder="123" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Name on Card</Label>
                    <Input placeholder="John Doe" />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Lock size={16} />
                Your payment information is encrypted and secure.
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1 py-6"
                >
                  Back
                </Button>
                <Button
                  onClick={handlePlaceOrder}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-6"
                >
                  Place Order
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-gray-50 rounded-2xl p-6 sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
            <div className="space-y-4 mb-6">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg"
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
                  {shipping === 0 ? 'Free' : formatCurrency(shipping)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium text-gray-900">{formatCurrency(tax)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-emerald-600">{formatCurrency(total)}</span>
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
