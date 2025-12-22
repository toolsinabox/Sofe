import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * LiveThemeStorefront - Renders the full live storefront using the Maropost template engine
 * Uses an iframe approach for clean full-page HTML rendering without React interference
 */
const LiveThemeStorefront = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);

  // Determine page path from URL
  const getPagePath = () => {
    const path = location.pathname;
    if (path === '/live' || path === '/live/') return 'home';
    const match = path.match(/\/live\/(.+)/);
    return match ? match[1] : 'home';
  };

  // Build the full URL for the Maropost engine
  const getPageUrl = () => {
    const pagePath = getPagePath();
    const searchParams = new URLSearchParams(location.search);
    
    let url = `${BACKEND_URL}/api/maropost/${pagePath}`;
    
    const queryParams = [];
    if (searchParams.has('print')) queryParams.push('print=true');
    if (searchParams.has('embed')) queryParams.push('embed=true');
    if (searchParams.has('debug')) queryParams.push('debug=true');
    if (queryParams.length > 0) url += '?' + queryParams.join('&');
    
    return url;
  };

  const handleIframeLoad = () => {
    setLoading(false);
    
    // Intercept link clicks inside iframe to handle navigation
    try {
      const iframeDoc = iframeRef.current?.contentDocument;
      if (iframeDoc) {
        iframeDoc.body.addEventListener('click', (e) => {
          const link = e.target.closest('a');
          if (link) {
            const href = link.getAttribute('href');
            if (href && href.startsWith('/live')) {
              e.preventDefault();
              window.history.pushState({}, '', href);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          }
        });
      }
    } catch (err) {
      // Cross-origin restrictions may prevent this
      console.log('Could not attach link handlers to iframe');
    }
  };

  const handleIframeError = () => {
    setLoading(false);
    setError('Failed to load storefront');
  };

  const pageUrl = getPageUrl();

  return (
    <div className="w-full h-screen relative">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading storefront...</p>
          </div>
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Load Error</h1>
            <p className="text-gray-600">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      
      {/* Full-page iframe for storefront */}
      <iframe
        ref={iframeRef}
        src={pageUrl}
        className="w-full h-full border-0"
        title="Storefront"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
    </div>
  );
};

export default LiveThemeStorefront;
