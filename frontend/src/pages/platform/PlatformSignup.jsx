import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Store, ArrowRight, Check, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function PlatformSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    owner_name: '',
    owner_email: searchParams.get('email') || '',
    owner_password: '',
    store_name: '',
    subdomain: '',
    plan_id: 'free'
  });
  
  const [subdomainStatus, setSubdomainStatus] = useState({ checking: false, available: null, message: '' });

  // Check subdomain availability when it changes
  useEffect(() => {
    const checkSubdomain = async () => {
      if (formData.subdomain.length < 3) {
        setSubdomainStatus({ checking: false, available: null, message: '' });
        return;
      }
      
      setSubdomainStatus({ checking: true, available: null, message: 'Checking...' });
      
      try {
        const res = await axios.post(`${BACKEND_URL}/api/platform/stores/check-subdomain?subdomain=${formData.subdomain}`);
        setSubdomainStatus({
          checking: false,
          available: res.data.available,
          message: res.data.available ? 'Available!' : res.data.reason
        });
      } catch (error) {
        setSubdomainStatus({ checking: false, available: false, message: 'Error checking availability' });
      }
    };
    
    const timeout = setTimeout(checkSubdomain, 500);
    return () => clearTimeout(timeout);
  }, [formData.subdomain]);

  // Auto-generate subdomain from store name
  useEffect(() => {
    if (formData.store_name && !formData.subdomain) {
      const subdomain = formData.store_name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);
      setFormData(prev => ({ ...prev, subdomain }));
    }
  }, [formData.store_name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await axios.post(`${BACKEND_URL}/api/platform/stores/register`, formData);
      
      // Store token
      localStorage.setItem('platform_token', res.data.token);
      localStorage.setItem('platform_store', JSON.stringify(res.data.store));
      localStorage.setItem('platform_owner', JSON.stringify(res.data.owner));
      
      // Navigate to success/dashboard
      navigate('/dashboard', { 
        state: { 
          newStore: true, 
          store: res.data.store 
        } 
      });
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to create store. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    { id: 'free', name: 'Free', price: '$0', features: ['10 products', '100MB storage'] },
    { id: 'starter', name: 'Starter', price: '$29/mo', features: ['100 products', 'Custom domain'] },
    { id: 'professional', name: 'Professional', price: '$79/mo', features: ['1,000 products', 'Advanced analytics'], popular: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link to="/" className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
            </Link>
            <CardTitle className="text-2xl">Create Your Store</CardTitle>
            <CardDescription>Start selling online in minutes</CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 && (
                <>
                  <div>
                    <Label htmlFor="owner_name">Your Name</Label>
                    <Input
                      id="owner_name"
                      value={formData.owner_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                      placeholder="John Smith"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="owner_email">Email Address</Label>
                    <Input
                      id="owner_email"
                      type="email"
                      value={formData.owner_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, owner_email: e.target.value }))}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="owner_password">Password</Label>
                    <div className="relative">
                      <Input
                        id="owner_password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.owner_password}
                        onChange={(e) => setFormData(prev => ({ ...prev, owner_password: e.target.value }))}
                        placeholder="Min 8 characters"
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <Button 
                    type="button" 
                    className="w-full" 
                    onClick={() => setStep(2)}
                    disabled={!formData.owner_name || !formData.owner_email || formData.owner_password.length < 8}
                  >
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}
              
              {step === 2 && (
                <>
                  <div>
                    <Label htmlFor="store_name">Store Name</Label>
                    <Input
                      id="store_name"
                      value={formData.store_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, store_name: e.target.value }))}
                      placeholder="My Awesome Store"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="subdomain">Store URL</Label>
                    <div className="flex">
                      <Input
                        id="subdomain"
                        value={formData.subdomain}
                        onChange={(e) => setFormData(prev => ({ ...prev, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') }))}
                        placeholder="mystore"
                        className="rounded-r-none"
                        required
                      />
                      <div className="px-3 bg-gray-100 border border-l-0 rounded-r-md flex items-center text-sm text-gray-500">
                        .storebuilder.com
                      </div>
                    </div>
                    {formData.subdomain && (
                      <p className={`text-xs mt-1 ${
                        subdomainStatus.checking ? 'text-gray-500' :
                        subdomainStatus.available ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {subdomainStatus.checking && <Loader2 className="w-3 h-3 inline animate-spin mr-1" />}
                        {subdomainStatus.available && <Check className="w-3 h-3 inline mr-1" />}
                        {subdomainStatus.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label>Choose a Plan</Label>
                    <div className="grid gap-2 mt-2">
                      {plans.map(plan => (
                        <div
                          key={plan.id}
                          onClick={() => setFormData(prev => ({ ...prev, plan_id: plan.id }))}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                            formData.plan_id === plan.id 
                              ? 'border-blue-600 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{plan.name}</span>
                              {plan.popular && (
                                <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                                  Popular
                                </span>
                              )}
                            </div>
                            <span className="font-semibold">{plan.price}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {plan.features.join(' • ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1" 
                      disabled={loading || !subdomainStatus.available}
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Store...</>
                      ) : (
                        <>Create My Store <ArrowRight className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </form>
            
            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:underline">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Right Side - Benefits */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 to-purple-600 text-white p-12 items-center">
        <div className="max-w-md">
          <h2 className="text-3xl font-bold mb-6">Start selling in minutes</h2>
          <ul className="space-y-4">
            {[
              'Beautiful, mobile-optimized store',
              'Secure payment processing',
              'Inventory management',
              'Customer analytics',
              'Marketing tools',
              '24/7 support'
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
                {item}
              </li>
            ))}
          </ul>
          
          <div className="mt-12 p-6 bg-white/10 rounded-xl">
            <p className="italic mb-4">
              &ldquo;I launched my store in under an hour and made my first sale the same day!&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <img 
                src="https://randomuser.me/api/portraits/women/32.jpg" 
                alt="Customer"
                className="w-10 h-10 rounded-full"
              />
              <div>
                <div className="font-semibold">Sarah Chen</div>
                <div className="text-sm opacity-80">Artisan Crafts</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
