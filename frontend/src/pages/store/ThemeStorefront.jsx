import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useCart } from './StoreLayout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * ThemeStorefront - Renders the live storefront using the active theme templates
 * This component fetches server-rendered HTML from the backend and injects it
 * Cart functionality is handled via JavaScript event listeners
 */
const ThemeStorefront = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const { addToCart, cart, getCartCount, getCartTotal } = useCart();
  
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [themeName, setThemeName] = useState('');
  const contentRef = useRef(null);

  // Determine page type from URL
  const getPageType = () => {
    const path = location.pathname;
    
    if (path === '/store' || path === '/store/') return 'home';
    if (path.startsWith('/store/category/')) return 'category';
    if (path.startsWith('/store/product/')) return 'product';
    if (path === '/store/cart') return 'cart';
    if (path === '/store/checkout') return 'checkout';
    if (path === '/store/search') return 'search';
    
    // Extract page name for CMS pages
    const match = path.match(/\/store\/(.+)/);
    return match ? match[1] : 'home';
  };

  // Fetch rendered page from backend
  const fetchPage = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const pageType = getPageType();
      let url = `${API}/render/${pageType}`;
      
      // Add query params for specific pages
      if (pageType === 'category' && params.categoryId) {
        url += `?category_id=${params.categoryId}`;
      } else if (pageType === 'product' && params.productId) {
        url += `?product_id=${params.productId}`;
      }
      
      const response = await axios.get(url);
      
      // Handle streaming response (HTML string)
      if (typeof response.data === 'string') {
        setHtml(response.data);
      } else if (response.data.html) {
        setHtml(response.data.html);
        setThemeName(response.data.theme);
      } else {
        setHtml(response.data);
      }
    } catch (err) {
      console.error('Error fetching page:', err);
      setError('Failed to load page');
      // Fall back to simple error message
      setHtml(`<div class="p-8 text-center"><h1 class="text-2xl">Page not found</h1><p>The requested page could not be loaded.</p></div>`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage();
  }, [location.pathname, params]);

  // Inject cart data into the page and handle events
  useEffect(() => {
    if (!contentRef.current) return;

    // Handle internal links - use React Router for navigation
    const handleClick = (e) => {
      const link = e.target.closest('a');
      if (!link) return;
      
      const href = link.getAttribute('href');
      if (!href) return;
      
      // Handle internal store links
      if (href.startsWith('/store') || href.startsWith('/')) {
        e.preventDefault();
        navigate(href);
      }
    };

    // Handle Add to Cart buttons
    const handleAddToCart = async (e) => {
      const btn = e.target.closest('.add-to-cart-btn, [data-add-to-cart]');
      if (!btn) return;
      
      e.preventDefault();
      const productId = btn.dataset.productId;
      
      if (!productId) return;
      
      try {
        // Fetch product data
        const response = await axios.get(`${API}/products/${productId}`);
        const product = response.data;
        addToCart(product);
        
        // Visual feedback
        btn.textContent = 'Added!';
        btn.classList.add('bg-green-600');
        setTimeout(() => {
          btn.textContent = 'Add to Cart';
          btn.classList.remove('bg-green-600');
        }, 1500);
      } catch (err) {
        console.error('Error adding to cart:', err);
      }
    };

    // Add event listeners
    contentRef.current.addEventListener('click', handleClick);
    contentRef.current.addEventListener('click', handleAddToCart);

    // Update cart count displays
    const cartCountElements = contentRef.current.querySelectorAll('.cart-count, [data-cart-count]');
    cartCountElements.forEach(el => {
      el.textContent = getCartCount();
    });

    // Update cart total displays
    const cartTotalElements = contentRef.current.querySelectorAll('.cart-total, [data-cart-total]');
    cartTotalElements.forEach(el => {
      el.textContent = `$${getCartTotal().toFixed(2)}`;
    });

    return () => {
      if (contentRef.current) {
        contentRef.current.removeEventListener('click', handleClick);
        contentRef.current.removeEventListener('click', handleAddToCart);
      }
    };
  }, [html, cart, addToCart, navigate, getCartCount, getCartTotal]);

  // Inject theme CSS
  useEffect(() => {
    if (!themeName) return;
    
    // Add theme CSS link if not already present
    const cssId = 'theme-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = `${API}/themes/${themeName}/assets/css/style.css`;
      document.head.appendChild(link);
    }
  }, [themeName]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={contentRef}
      className="theme-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default ThemeStorefront;
