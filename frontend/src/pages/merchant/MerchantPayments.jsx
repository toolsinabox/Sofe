import React, { useState } from 'react';
import { CreditCard, DollarSign, Settings, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const MerchantPayments = () => {
  const [activeGateway, setActiveGateway] = useState('stripe');
  const [gateways, setGateways] = useState({
    stripe: {
      enabled: true,
      live_mode: false,
      publishable_key: 'pk_test_xxxxxxxxxxxxx',
      secret_key: 'sk_test_xxxxxxxxxxxxx'
    },
    paypal: {
      enabled: false,
      client_id: '',
      client_secret: ''
    },
    afterpay: {
      enabled: false,
      merchant_id: '',
      secret_key: ''
    }
  });
  
  const [paymentSettings, setPaymentSettings] = useState({
    currency: 'AUD',
    tax_rate: '10',
    tax_inclusive: true,
    require_billing: true,
    allow_guest_checkout: true
  });

  const paymentGateways = [
    { id: 'stripe', name: 'Stripe', icon: '💳', description: 'Credit/Debit cards, Apple Pay, Google Pay' },
    { id: 'paypal', name: 'PayPal', icon: '🅿️', description: 'PayPal balance and cards' },
    { id: 'afterpay', name: 'Afterpay', icon: '🛒', description: 'Buy now, pay later' }
  ];

  const handleSave = () => {
    // Save payment settings
    console.log('Saving payment settings:', { gateways, paymentSettings });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Payment Settings</h1>
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
          <Check size={16} className="mr-2" /> Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Payment Gateways List */}
        <div className="col-span-1 space-y-3">
          <h2 className="text-lg font-semibold text-white mb-4">Payment Gateways</h2>
          {paymentGateways.map(gateway => (
            <button
              key={gateway.id}
              onClick={() => setActiveGateway(gateway.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                activeGateway === gateway.id
                  ? 'bg-blue-600/20 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750'
              }`}
            >
              <span className="text-2xl">{gateway.icon}</span>
              <div className="text-left flex-1">
                <p className="font-medium">{gateway.name}</p>
                <p className="text-xs text-gray-400">{gateway.description}</p>
              </div>
              {gateways[gateway.id]?.enabled && (
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
              )}
            </button>
          ))}
        </div>

        {/* Gateway Configuration */}
        <div className="col-span-2">
          {activeGateway === 'stripe' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">💳</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Stripe</h3>
                    <p className="text-sm text-gray-400">Accept cards, digital wallets, and more</p>
                  </div>
                </div>
                <Switch
                  checked={gateways.stripe.enabled}
                  onCheckedChange={(checked) => setGateways({
                    ...gateways,
                    stripe: { ...gateways.stripe, enabled: checked }
                  })}
                />
              </div>
              
              {gateways.stripe.enabled && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-900">
                    <span className="text-gray-400">Mode:</span>
                    <button
                      onClick={() => setGateways({
                        ...gateways,
                        stripe: { ...gateways.stripe, live_mode: false }
                      })}
                      className={`px-3 py-1 rounded ${!gateways.stripe.live_mode ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400'}`}
                    >
                      Test
                    </button>
                    <button
                      onClick={() => setGateways({
                        ...gateways,
                        stripe: { ...gateways.stripe, live_mode: true }
                      })}
                      className={`px-3 py-1 rounded ${gateways.stripe.live_mode ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-400'}`}
                    >
                      Live
                    </button>
                  </div>
                  
                  <div>
                    <Label className="text-gray-300">Publishable Key</Label>
                    <Input
                      value={gateways.stripe.publishable_key}
                      onChange={(e) => setGateways({
                        ...gateways,
                        stripe: { ...gateways.stripe, publishable_key: e.target.value }
                      })}
                      placeholder="pk_test_..."
                      className="bg-gray-700 border-gray-600 text-white mt-1 font-mono text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-gray-300">Secret Key</Label>
                    <Input
                      type="password"
                      value={gateways.stripe.secret_key}
                      onChange={(e) => setGateways({
                        ...gateways,
                        stripe: { ...gateways.stripe, secret_key: e.target.value }
                      })}
                      placeholder="sk_test_..."
                      className="bg-gray-700 border-gray-600 text-white mt-1 font-mono text-sm"
                    />
                  </div>
                  
                  <a
                    href="https://dashboard.stripe.com/apikeys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                  >
                    Get your API keys from Stripe Dashboard <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
          )}

          {activeGateway === 'paypal' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🅿️</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">PayPal</h3>
                    <p className="text-sm text-gray-400">Accept PayPal payments</p>
                  </div>
                </div>
                <Switch
                  checked={gateways.paypal.enabled}
                  onCheckedChange={(checked) => setGateways({
                    ...gateways,
                    paypal: { ...gateways.paypal, enabled: checked }
                  })}
                />
              </div>
              
              {gateways.paypal.enabled && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Client ID</Label>
                    <Input
                      value={gateways.paypal.client_id}
                      onChange={(e) => setGateways({
                        ...gateways,
                        paypal: { ...gateways.paypal, client_id: e.target.value }
                      })}
                      placeholder="Enter PayPal Client ID"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Client Secret</Label>
                    <Input
                      type="password"
                      value={gateways.paypal.client_secret}
                      onChange={(e) => setGateways({
                        ...gateways,
                        paypal: { ...gateways.paypal, client_secret: e.target.value }
                      })}
                      placeholder="Enter PayPal Client Secret"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeGateway === 'afterpay' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🛒</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Afterpay</h3>
                    <p className="text-sm text-gray-400">Buy now, pay later option</p>
                  </div>
                </div>
                <Switch
                  checked={gateways.afterpay.enabled}
                  onCheckedChange={(checked) => setGateways({
                    ...gateways,
                    afterpay: { ...gateways.afterpay, enabled: checked }
                  })}
                />
              </div>
              
              {gateways.afterpay.enabled && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Merchant ID</Label>
                    <Input
                      value={gateways.afterpay.merchant_id}
                      onChange={(e) => setGateways({
                        ...gateways,
                        afterpay: { ...gateways.afterpay, merchant_id: e.target.value }
                      })}
                      placeholder="Enter Afterpay Merchant ID"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Secret Key</Label>
                    <Input
                      type="password"
                      value={gateways.afterpay.secret_key}
                      onChange={(e) => setGateways({
                        ...gateways,
                        afterpay: { ...gateways.afterpay, secret_key: e.target.value }
                      })}
                      placeholder="Enter Afterpay Secret Key"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* General Payment Settings */}
          <div className="bg-gray-800 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Settings size={20} /> General Settings
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Currency</Label>
                <select
                  value={paymentSettings.currency}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, currency: e.target.value })}
                  className="w-full h-10 px-3 bg-gray-700 border border-gray-600 rounded-md text-white mt-1"
                >
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
              <div>
                <Label className="text-gray-300">Tax Rate (%)</Label>
                <Input
                  type="number"
                  value={paymentSettings.tax_rate}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, tax_rate: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
            </div>
            
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">Tax Inclusive Pricing</p>
                  <p className="text-sm text-gray-400">Display prices including tax</p>
                </div>
                <Switch
                  checked={paymentSettings.tax_inclusive}
                  onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, tax_inclusive: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">Require Billing Address</p>
                  <p className="text-sm text-gray-400">Collect billing address at checkout</p>
                </div>
                <Switch
                  checked={paymentSettings.require_billing}
                  onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, require_billing: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">Guest Checkout</p>
                  <p className="text-sm text-gray-400">Allow checkout without account</p>
                </div>
                <Switch
                  checked={paymentSettings.allow_guest_checkout}
                  onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, allow_guest_checkout: checked })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantPayments;
