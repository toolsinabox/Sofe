import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Store, ArrowLeft, CreditCard, Check, Loader2, AlertTriangle,
  Zap, Shield, Clock, ExternalLink
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect for getting started',
    features: [
      '10 Products',
      '100MB Storage',
      '1 Staff Account',
      'Basic Analytics'
    ]
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    description: 'For growing businesses',
    features: [
      '100 Products',
      '500MB Storage',
      '2 Staff Accounts',
      'Advanced Analytics',
      'Remove Branding'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 79,
    description: 'For established stores',
    popular: true,
    features: [
      '1,000 Products',
      '5GB Storage',
      '5 Staff Accounts',
      'Custom Domain',
      'API Access',
      'Priority Support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    description: 'For large-scale operations',
    features: [
      'Unlimited Products',
      '50GB Storage',
      '20 Staff Accounts',
      'Dedicated Support',
      'Custom Integrations',
      'SLA Guarantee'
    ]
  }
];

export default function PlatformBilling() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [currentStore, setCurrentStore] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [upgrading, setUpgrading] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('platform_token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Check for success/cancel from Stripe redirect
    const upgradeStatus = searchParams.get('upgrade');
    const planId = searchParams.get('plan');
    if (upgradeStatus === 'success' && planId) {
      setSuccessMessage(`Successfully upgraded to ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan!`);
    }

    fetchData();
  }, [navigate, searchParams]);

  const fetchData = async () => {
    try {
      const store = localStorage.getItem('platform_store');
      if (store) {
        const storeData = JSON.parse(store);
        setCurrentStore(storeData);

        // Get subscription details
        const subRes = await axios.get(
          `${BACKEND_URL}/api/platform/billing/subscription/${storeData.id}`
        );
        setSubscription(subRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    if (!currentStore || planId === subscription?.plan_id) return;
    
    setUpgrading(planId);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/platform/billing/create-checkout?store_id=${currentStore.id}&plan_id=${planId}`
      );
      
      // Redirect to Stripe checkout
      window.location.href = res.data.checkout_url;
    } catch (error) {
      console.error('Failed to create checkout:', error);
      alert(error.response?.data?.detail || 'Failed to start upgrade process');
      setUpgrading(null);
    }
  };

  const handleManageBilling = async () => {
    if (!currentStore) return;
    
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/platform/billing/create-portal?store_id=${currentStore.id}`
      );
      
      // Redirect to Stripe portal
      window.location.href = res.data.portal_url;
    } catch (error) {
      console.error('Failed to open billing portal:', error);
      alert(error.response?.data?.detail || 'Failed to open billing portal');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Store className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="font-bold text-sm sm:text-base">Celora</span>
              </Link>
            </div>
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 sm:gap-3">
            <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
            <span className="text-green-800 text-sm sm:text-base">{successMessage}</span>
          </div>
        )}

        {/* Current Plan */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Billing & Plans</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage your subscription and billing</p>
        </div>

        {subscription && (
          <Card className="mb-6 sm:mb-8">
            <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xl sm:text-2xl font-bold">{subscription.plan_name}</span>
                    <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {subscription.status === 'trial' && <Clock className="w-3 h-3 mr-1" />}
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">
                    ${subscription.plan_price}/month
                    {subscription.current_period_end && (
                      <span className="block sm:inline sm:ml-2 text-xs sm:text-sm">
                        • Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
                {subscription.has_billing_account && (
                  <Button variant="outline" onClick={handleManageBilling} className="w-full sm:w-auto text-sm">
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Manage Billing
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan Comparison */}
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {plans.map((plan) => {
            const isCurrent = subscription?.plan_id === plan.id;
            const isDowngrade = subscription && 
              plans.findIndex(p => p.id === plan.id) < plans.findIndex(p => p.id === subscription.plan_id);
            
            return (
              <Card 
                key={plan.id} 
                className={`relative ${plan.popular ? 'ring-2 ring-blue-500' : ''} ${isCurrent ? 'bg-blue-50' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-xs">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                  <CardTitle className="text-base sm:text-lg">{plan.name}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{plan.description}</CardDescription>
                  <div className="mt-2">
                    <span className="text-2xl sm:text-3xl font-bold">${plan.price}</span>
                    <span className="text-gray-500 text-sm">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs sm:text-sm">
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  {isCurrent ? (
                    <Button variant="outline" disabled className="w-full">
                      Current Plan
                    </Button>
                  ) : plan.id === 'free' ? (
                    <Button variant="outline" disabled className="w-full">
                      {isDowngrade ? 'Contact Support' : 'Free Plan'}
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      variant={plan.popular ? 'default' : 'outline'}
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={upgrading === plan.id || isDowngrade}
                    >
                      {upgrading === plan.id ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                      ) : isDowngrade ? (
                        'Contact Support'
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Upgrade
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Yes! You can cancel your subscription at any time. Your plan will remain active until the end of your billing period.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What happens when I upgrade?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  You'll get immediate access to all features of your new plan. We'll prorate the cost based on your remaining billing period.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is my payment secure?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  All payments are processed securely through Stripe. We never store your credit card information.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Do you offer refunds?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We offer a 14-day money-back guarantee for all new subscriptions. Contact support for assistance.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
