import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * LiveThemeStorefront - Renders the full live storefront using the Maropost template engine
 * This is the WYSIWYG storefront that changes when you edit theme templates
 * 
 * Supports:
 * - Layout wrapper selection (default, checkout, print, empty)
 * - Page template selection based on URL routing
 * - Include directive processing
 * - Data binding with [@tag@] and [%loop%] tags
 */
const LiveThemeStorefront = () => {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Determine page path from URL
  const getPagePath = () => {
    const path = location.pathname;
    
    // Remove /live prefix and return the rest
    if (path === '/live' || path === '/live/') return 'home';
    
    // Extract path after /live/
    const match = path.match(/\/live\/(.+)/);
    return match ? match[1] : 'home';
  };

  useEffect(() => {
    const pagePath = getPagePath();
    const searchParams = new URLSearchParams(location.search);
    
    // Build the URL for the Maropost engine render
    let url = `${BACKEND_URL}/api/maropost/${pagePath}`;
    
    // Pass through query params (print, embed, debug)
    if (searchParams.has('print')) url += '?print=true';
    else if (searchParams.has('embed')) url += '?embed=true';
    else if (searchParams.has('debug')) url += '?debug=true';
    
    // Redirect to the backend to render the full page
    // This loads the complete HTML from the theme templates using Maropost engine
    window.location.href = url;
  }, [location.pathname, location.search, params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading theme storefront...</p>
        <p className="text-sm text-gray-400 mt-2">Powered by Maropost Engine</p>
      </div>
    </div>
  );
};

export default LiveThemeStorefront;
