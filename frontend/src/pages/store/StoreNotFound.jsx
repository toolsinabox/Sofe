import React from 'react';
import { Store, ArrowRight, Home } from 'lucide-react';
import { Button } from '../../components/ui/button';

const StoreNotFound = () => {
  // Extract subdomain from current URL
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];
  const isSubdomain = hostname.includes('.getcelora.com') && 
                      !['www', 'api', 'admin', 'app'].includes(subdomain);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-lg">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 mb-8">
          <Store className="w-12 h-12 text-red-400" />
        </div>
        
        {/* Title */}
        <h1 className="text-4xl font-bold text-white mb-4">
          Store Not Found
        </h1>
        
        {/* Message */}
        <p className="text-gray-400 text-lg mb-2">
          {isSubdomain ? (
            <>
              The store <span className="text-cyan-400 font-mono font-semibold">{subdomain}</span> doesn&apos;t exist or has been deactivated.
            </>
          ) : (
            <>This store doesn&apos;t exist or has been deactivated.</>
          )}
        </p>
        
        <p className="text-gray-500 mb-8">
          Please check the URL and try again, or explore Celora to create your own online store.
        </p>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => window.location.href = 'https://www.getcelora.com'}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6 py-3"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Celora
          </Button>
          
          <Button
            onClick={() => window.location.href = 'https://www.getcelora.com/signup'}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 px-6 py-3"
          >
            Create Your Store
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        
        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <p className="text-gray-600 text-sm">
            Powered by <span className="text-cyan-500 font-semibold">Celora</span> — The modern e-commerce platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default StoreNotFound;
