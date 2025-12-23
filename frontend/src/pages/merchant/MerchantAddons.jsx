import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Check, 
  X, 
  ExternalLink, 
  Settings,
  ShoppingBag,
  Package,
  CreditCard,
  Mail,
  MessageSquare,
  BarChart3,
  Truck,
  Globe,
  Zap,
  Store,
  RefreshCw
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';

const MerchantAddons = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showConfigModal, setShowConfigModal] = useState(null);

  const categories = [
    { id: 'all', label: 'All Addons' },
    { id: 'marketplaces', label: 'Marketplaces' },
    { id: 'shipping', label: 'Shipping' },
    { id: 'payments', label: 'Payments' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'communication', label: 'Communication' },
  ];

  const [addons, setAddons] = useState([
    // Marketplaces
    {
      id: 'ebay',
      name: 'eBay',
      description: 'List and sell products on eBay Australia, manage orders and sync inventory automatically.',
      category: 'marketplaces',
      icon: '🛒',
      color: 'bg-yellow-500',
      installed: true,
      enabled: true,
      configurable: true,
      popular: true,
      features: ['Auto-sync inventory', 'Order management', 'Bulk listing', 'Promotion tools']
    },
    {
      id: 'amazon',
      name: 'Amazon AU',
      description: 'Expand your reach by selling on Amazon Australia marketplace.',
      category: 'marketplaces',
      icon: '📦',
      color: 'bg-orange-500',
      installed: true,
      enabled: false,
      configurable: true,
      popular: true,
      features: ['FBA integration', 'Prime eligibility', 'A+ content', 'Automated repricing']
    },
    {
      id: 'kogan',
      name: 'Kogan',
      description: 'Sell on Kogan Marketplace to reach millions of Australian shoppers.',
      category: 'marketplaces',
      icon: '🏪',
      color: 'bg-red-500',
      installed: false,
      enabled: false,
      configurable: true,
      features: ['Product sync', 'Order import', 'Stock management']
    },
    {
      id: 'catch',
      name: 'Catch.com.au',
      description: 'List products on Catch marketplace for increased visibility.',
      category: 'marketplaces',
      icon: '🎯',
      color: 'bg-purple-500',
      installed: false,
      enabled: false,
      configurable: true,
      features: ['Daily deals', 'Flash sales', 'Category management']
    },
    {
      id: 'google-shopping',
      name: 'Google Shopping',
      description: 'Show your products in Google Shopping results and drive traffic.',
      category: 'marketplaces',
      icon: '🔍',
      color: 'bg-blue-500',
      installed: true,
      enabled: true,
      configurable: true,
      popular: true,
      features: ['Product feed', 'Smart shopping', 'Performance max', 'Local inventory']
    },
    {
      id: 'facebook-shop',
      name: 'Facebook & Instagram Shop',
      description: 'Sell directly on Facebook and Instagram with shop integration.',
      category: 'marketplaces',
      icon: '📱',
      color: 'bg-blue-600',
      installed: false,
      enabled: false,
      configurable: true,
      features: ['Product catalog', 'Checkout on FB/IG', 'Shoppable posts', 'Ads integration']
    },
    // Shipping
    {
      id: 'startrack',
      name: 'StarTrack',
      description: 'Australia Post StarTrack integration for business shipping.',
      category: 'shipping',
      icon: '🚚',
      color: 'bg-red-600',
      installed: true,
      enabled: true,
      configurable: true,
      features: ['Live rates', 'Label printing', 'Tracking', 'Pickup booking']
    },
    {
      id: 'auspost',
      name: 'Australia Post',
      description: 'Domestic and international shipping with Australia Post.',
      category: 'shipping',
      icon: '📮',
      color: 'bg-red-500',
      installed: true,
      enabled: true,
      configurable: true,
      features: ['eParcel', 'Express post', 'Parcel lockers', 'International']
    },
    {
      id: 'sendle',
      name: 'Sendle',
      description: 'Carbon-neutral shipping for small businesses.',
      category: 'shipping',
      icon: '🌱',
      color: 'bg-green-500',
      installed: false,
      enabled: false,
      configurable: true,
      features: ['Flat rate shipping', 'Pickup service', 'Carbon neutral']
    },
    {
      id: 'shippit',
      name: 'Shippit',
      description: 'Multi-carrier shipping platform for smart delivery.',
      category: 'shipping',
      icon: '📦',
      color: 'bg-indigo-500',
      installed: false,
      enabled: false,
      configurable: true,
      features: ['Multi-carrier', 'Smart routing', 'Branded tracking']
    },
    // Payments
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Accept credit cards, Apple Pay, Google Pay and more.',
      category: 'payments',
      icon: '💳',
      color: 'bg-purple-600',
      installed: true,
      enabled: true,
      configurable: true,
      popular: true,
      features: ['Cards', 'Digital wallets', 'Subscriptions', 'Invoicing']
    },
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'Accept PayPal payments and Pay Later options.',
      category: 'payments',
      icon: '🅿️',
      color: 'bg-blue-700',
      installed: true,
      enabled: false,
      configurable: true,
      features: ['PayPal checkout', 'Pay in 4', 'Venmo', 'Buyer protection']
    },
    {
      id: 'afterpay',
      name: 'Afterpay',
      description: 'Buy now, pay later solution for Australian shoppers.',
      category: 'payments',
      icon: '🛍️',
      color: 'bg-teal-500',
      installed: false,
      enabled: false,
      configurable: true,
      features: ['4 installments', 'No interest', 'Instant approval']
    },
    {
      id: 'zippay',
      name: 'Zip Pay',
      description: 'Interest-free payment plans up to $1000.',
      category: 'payments',
      icon: '⚡',
      color: 'bg-indigo-600',
      installed: false,
      enabled: false,
      configurable: true,
      features: ['Pay later', 'Flexible plans', 'No annual fees']
    },
    // Marketing
    {
      id: 'mailchimp',
      name: 'Mailchimp',
      description: 'Email marketing automation and customer journeys.',
      category: 'marketing',
      icon: '📧',
      color: 'bg-yellow-400',
      installed: false,
      enabled: false,
      configurable: true,
      features: ['Email campaigns', 'Automation', 'Segmentation', 'Analytics']
    },
    {
      id: 'klaviyo',
      name: 'Klaviyo',
      description: 'Ecommerce email and SMS marketing platform.',
      category: 'marketing',
      icon: '📱',
      color: 'bg-green-600',
      installed: false,
      enabled: false,
      configurable: true,
      popular: true,
      features: ['Email flows', 'SMS marketing', 'Predictive analytics', 'A/B testing']
    },
    {
      id: 'google-ads',
      name: 'Google Ads',
      description: 'Run search, display and shopping ads on Google.',
      category: 'marketing',
      icon: '📈',
      color: 'bg-blue-500',
      installed: true,
      enabled: false,
      configurable: true,
      features: ['Search ads', 'Display ads', 'Remarketing', 'Conversion tracking']
    },
    {
      id: 'facebook-ads',
      name: 'Meta Ads',
      description: 'Advertise on Facebook and Instagram.',
      category: 'marketing',
      icon: '📣',
      color: 'bg-blue-600',
      installed: false,
      enabled: false,
      configurable: true,
      features: ['FB/IG ads', 'Pixel tracking', 'Custom audiences', 'Lookalikes']
    },
    // Analytics
    {
      id: 'google-analytics',
      name: 'Google Analytics 4',
      description: 'Track website traffic, conversions and user behavior.',
      category: 'analytics',
      icon: '📊',
      color: 'bg-orange-500',
      installed: true,
      enabled: true,
      configurable: true,
      features: ['Traffic analysis', 'Ecommerce tracking', 'Custom reports', 'Funnels']
    },
    {
      id: 'hotjar',
      name: 'Hotjar',
      description: 'Heatmaps, recordings and feedback tools.',
      category: 'analytics',
      icon: '🔥',
      color: 'bg-red-500',
      installed: false,
      enabled: false,
      configurable: true,
      features: ['Heatmaps', 'Session recording', 'Surveys', 'Feedback']
    },
    // Communication
    {
      id: 'zendesk',
      name: 'Zendesk',
      description: 'Customer support and help desk solution.',
      category: 'communication',
      icon: '💬',
      color: 'bg-green-500',
      installed: false,
      enabled: false,
      configurable: true,
      features: ['Ticketing', 'Live chat', 'Knowledge base', 'AI bots']
    },
    {
      id: 'intercom',
      name: 'Intercom',
      description: 'Customer messaging and engagement platform.',
      category: 'communication',
      icon: '💭',
      color: 'bg-blue-500',
      installed: false,
      enabled: false,
      configurable: true,
      features: ['Live chat', 'Chatbots', 'Product tours', 'Help center']
    },
    {
      id: 'sms-gateway',
      name: 'SMS Notifications',
      description: 'Send SMS order updates to customers.',
      category: 'communication',
      icon: '📲',
      color: 'bg-purple-500',
      installed: true,
      enabled: false,
      configurable: true,
      features: ['Order SMS', 'Shipping updates', 'Marketing SMS', 'Templates']
    },
  ]);

  const filteredAddons = addons.filter(addon => {
    const matchesSearch = addon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      addon.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || addon.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const installedCount = addons.filter(a => a.installed).length;
  const enabledCount = addons.filter(a => a.enabled).length;

  const toggleAddon = (addonId) => {
    setAddons(prev => prev.map(addon => {
      if (addon.id === addonId) {
        return { ...addon, enabled: !addon.enabled };
      }
      return addon;
    }));
  };

  const installAddon = (addonId) => {
    setAddons(prev => prev.map(addon => {
      if (addon.id === addonId) {
        return { ...addon, installed: true };
      }
      return addon;
    }));
  };

  const uninstallAddon = (addonId) => {
    if (window.confirm('Are you sure you want to uninstall this addon?')) {
      setAddons(prev => prev.map(addon => {
        if (addon.id === addonId) {
          return { ...addon, installed: false, enabled: false };
        }
        return addon;
      }));
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Addons & Integrations</h1>
          <p className="text-gray-500 text-xs">Extend your store with powerful integrations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500">{installedCount} installed</p>
            <p className="text-xs text-emerald-600">{enabledCount} active</p>
          </div>
          <Button size="sm" variant="outline" className="border-gray-200">
            <RefreshCw size={14} className="mr-1" /> Sync All
          </Button>
        </div>
      </div>

      {/* Search and Categories */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search addons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-gray-200 text-gray-900 h-8 text-sm"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-50 text-gray-500 hover:text-gray-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Popular Addons Banner */}
      {activeCategory === 'all' && (
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-blue-600" />
            <span className="font-medium text-gray-900 text-sm">Popular Integrations</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {addons.filter(a => a.popular).map(addon => (
              <span key={addon.id} className="px-2 py-1 bg-white rounded text-xs text-gray-600 border border-gray-200">
                {addon.icon} {addon.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Addons Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredAddons.map(addon => (
          <div
            key={addon.id}
            className={`bg-white rounded-lg border p-3 transition-all ${
              addon.enabled 
                ? 'border-emerald-200 shadow-sm' 
                : addon.installed 
                  ? 'border-gray-200' 
                  : 'border-gray-100 opacity-80'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 ${addon.color} rounded-lg flex items-center justify-center text-white text-sm`}>
                  {addon.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 text-sm">{addon.name}</h3>
                  {addon.installed && (
                    <span className={`text-xs ${addon.enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {addon.enabled ? '● Active' : '○ Inactive'}
                    </span>
                  )}
                </div>
              </div>
              {addon.popular && !addon.installed && (
                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                  Popular
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-gray-500 text-xs mb-3 line-clamp-2">{addon.description}</p>

            {/* Features */}
            {addon.installed && (
              <div className="flex flex-wrap gap-1 mb-3">
                {addon.features.slice(0, 3).map((feature, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-gray-50 text-gray-500 text-xs rounded">
                    {feature}
                  </span>
                ))}
                {addon.features.length > 3 && (
                  <span className="px-1.5 py-0.5 text-gray-400 text-xs">
                    +{addon.features.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              {addon.installed ? (
                <>
                  <Switch
                    checked={addon.enabled}
                    onCheckedChange={() => toggleAddon(addon.id)}
                  />
                  <div className="flex gap-1">
                    {addon.configurable && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-gray-500 hover:text-gray-900"
                        onClick={() => setShowConfigModal(addon)}
                      >
                        <Settings size={14} />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => uninstallAddon(addon.id)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700 h-7 text-xs"
                  onClick={() => installAddon(addon.id)}
                >
                  <Plus size={14} className="mr-1" /> Install
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredAddons.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Package size={32} className="mx-auto mb-2 opacity-50" />
          <p>No addons found matching your search</p>
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-4 border border-gray-200 mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 ${showConfigModal.color} rounded-lg flex items-center justify-center text-white text-sm`}>
                  {showConfigModal.icon}
                </div>
                <h3 className="font-semibold text-gray-900">{showConfigModal.name} Settings</h3>
              </div>
              <button onClick={() => setShowConfigModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-gray-700 text-sm">API Key</label>
                <Input placeholder="Enter API key" className="bg-gray-50 border-gray-200 text-gray-900 h-8 text-sm" />
              </div>
              <div>
                <label className="text-gray-700 text-sm">Secret Key</label>
                <Input type="password" placeholder="Enter secret key" className="bg-gray-50 border-gray-200 text-gray-900 h-8 text-sm" />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700 text-sm">Auto-sync inventory</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700 text-sm">Import orders automatically</span>
                <Switch defaultChecked />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowConfigModal(null)} className="flex-1 border-gray-200 h-8 text-sm">
                Cancel
              </Button>
              <Button onClick={() => setShowConfigModal(null)} className="flex-1 bg-blue-600 hover:bg-blue-700 h-8 text-sm">
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantAddons;
