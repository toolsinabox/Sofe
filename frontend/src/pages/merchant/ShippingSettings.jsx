import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Truck,
  MapPin,
  Package,
  Tag,
  Settings,
  DollarSign,
  Globe,
  Box,
  ChevronRight,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const API = process.env.REACT_APP_BACKEND_URL;

const ShippingSettings = () => {
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    fetchMatrix();
  }, []);

  const fetchMatrix = async () => {
    try {
      const response = await axios.get(`${API}/api/shipping/matrix`);
      setMatrix(response.data);
    } catch (error) {
      console.error('Error fetching shipping matrix:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeShipping = async () => {
    setInitializing(true);
    try {
      await axios.post(`${API}/api/shipping/initialize`);
      await fetchMatrix();
    } catch (error) {
      console.error('Error initializing shipping:', error);
    } finally {
      setInitializing(false);
    }
  };

  const settingsMenu = [
    {
      title: 'Shipping Zones',
      description: 'Define geographic regions with postcode ranges',
      icon: MapPin,
      link: '/merchant/shipping/zones',
      count: matrix?.summary?.total_zones || 0,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Shipping Categories',
      description: 'Group products by shipping requirements',
      icon: Tag,
      link: '/merchant/shipping/categories',
      count: matrix?.summary?.total_categories || 0,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Shipping Services & Rates',
      description: 'Configure carriers and pricing per zone',
      icon: DollarSign,
      link: '/merchant/shipping/services',
      count: matrix?.summary?.total_services || 0,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Shipping Options',
      description: 'Customer-facing shipping choices at checkout',
      icon: Truck,
      link: '/merchant/shipping/options',
      count: matrix?.summary?.total_options || 0,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Predefined Packages',
      description: 'Standard package sizes and dimensions',
      icon: Box,
      link: '/merchant/shipping/packages',
      count: matrix?.summary?.total_packages || 0,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-50'
    },
    {
      title: 'Shipping Matrix Overview',
      description: 'View complete rate matrix across all zones',
      icon: BarChart3,
      link: '/merchant/shipping/matrix',
      count: null,
      color: 'text-slate-500',
      bgColor: 'bg-slate-50'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  const hasData = matrix?.summary?.total_zones > 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <Truck className="w-7 h-7 text-cyan-500" />
          Shipping Settings
        </h1>
        <p className="text-slate-500 mt-1">
          Configure shipping zones, rates, and delivery options
        </p>
      </div>

      {/* Quick Stats */}
      {hasData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{matrix.summary.total_zones}</p>
              <p className="text-sm text-blue-700">Zones</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">{matrix.summary.total_categories}</p>
              <p className="text-sm text-purple-700">Categories</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-emerald-600">{matrix.summary.total_services}</p>
              <p className="text-sm text-emerald-700">Services</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-600">{matrix.summary.total_options}</p>
              <p className="text-sm text-orange-700">Options</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-cyan-600">{matrix.summary.total_packages}</p>
              <p className="text-sm text-cyan-700">Packages</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Initialize Prompt */}
      {!hasData && (
        <Card className="mb-8 border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800">Shipping Not Configured</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Initialize your shipping system with pre-configured Australian zones, rates, and services.
                </p>
                <Button
                  onClick={initializeShipping}
                  disabled={initializing}
                  className="mt-4 bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {initializing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4 mr-2" />
                      Initialize Shipping Data
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Menu */}
      <div className="grid md:grid-cols-2 gap-4">
        {settingsMenu.map((item) => (
          <Link key={item.link} to={item.link}>
            <Card className="hover:shadow-lg transition-all hover:border-cyan-300 cursor-pointer h-full">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${item.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-800">{item.title}</h3>
                      {item.count !== null && (
                        <span className={`text-sm font-medium ${item.color}`}>
                          {item.count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Active Services Preview */}
      {hasData && matrix.services?.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Active Shipping Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {matrix.services.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800">{service.name}</p>
                    <p className="text-sm text-slate-500">
                      {service.charge_type === 'weight' ? 'Weight-based' : 
                       service.charge_type === 'cubic' ? 'Cubic-based' :
                       service.charge_type === 'fixed' ? 'Fixed rate' : service.charge_type}
                      {' • '}{service.rates?.length || 0} zone rates
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Min charge</p>
                    <p className="font-semibold text-emerald-600">${service.min_charge?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ShippingSettings;
