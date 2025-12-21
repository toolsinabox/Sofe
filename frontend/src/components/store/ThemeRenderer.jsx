import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * ThemeRenderer - Renders server-side rendered content from theme templates
 * Used for hybrid approach where templates are server-rendered but React handles interactivity
 */
export const ThemeRenderer = ({ 
  endpoint, 
  params = {}, 
  className = '',
  fallback = null,
  onLoad = null,
  refreshInterval = 0, // 0 = no auto-refresh
  wrapperTag = 'div'
}) => {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContent = useCallback(async () => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${API_URL}/api/render/partial/${endpoint}${queryString ? `?${queryString}` : ''}`;
      const response = await axios.get(url);
      
      if (response.data.html) {
        setHtml(response.data.html);
        if (onLoad) onLoad(response.data);
      }
      setError(null);
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, params, onLoad]);

  useEffect(() => {
    fetchContent();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchContent, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchContent, refreshInterval]);

  if (loading) {
    return fallback || (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !html) {
    return fallback || null;
  }

  const Wrapper = wrapperTag;
  return (
    <Wrapper 
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

/**
 * ThemeHero - Renders hero/banner carousel from theme
 */
export const ThemeHero = ({ className = '', onBannersLoad = null }) => {
  const [banners, setBanners] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHero = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/render/partial/hero`);
        if (response.data.html) {
          setHtml(response.data.html);
        }
        if (response.data.banners) {
          setBanners(response.data.banners);
          if (onBannersLoad) onBannersLoad(response.data.banners);
        }
      } catch (err) {
        console.error('Error fetching hero:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHero();
  }, [onBannersLoad]);

  // Filter visible banners
  const visibleBanners = banners.filter(b => b.show_on_desktop !== false && b.is_active !== false);
  
  // Auto-advance slides
  useEffect(() => {
    if (visibleBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % visibleBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [visibleBanners.length]);

  if (loading) {
    return (
      <div className={`h-[400px] bg-gray-800 animate-pulse ${className}`} />
    );
  }

  // If we have banner data, render our own carousel with proper interactivity
  // Filter banners that should show on desktop
  const visibleBanners = banners.filter(b => b.show_on_desktop !== false && b.is_active !== false);
  
  if (visibleBanners.length > 0) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <div 
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {visibleBanners.map((banner, idx) => {
            // Support both naming conventions
            const imgUrl = banner.image_desktop || banner.image_url_desktop || banner.image || banner.image_url || '';
            
            return (
              <div 
                key={banner.id || idx}
                className="w-full flex-shrink-0 relative"
              >
                <img 
                  src={imgUrl.startsWith('/api') ? `${API_URL}${imgUrl}` : imgUrl}
                  alt={banner.title || banner.name || `Slide ${idx + 1}`}
                  className="w-full h-[400px] md:h-[500px] object-cover"
                />
                {(banner.show_title !== false && (banner.title || banner.name)) || banner.subtitle || (banner.show_button !== false && banner.button_text) ? (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="text-center text-white p-8">
                      {banner.show_title !== false && (banner.title || banner.name) && (
                        <h1 className="text-3xl md:text-5xl font-bold mb-4">{banner.title || banner.name}</h1>
                      )}
                      {banner.show_subtitle !== false && banner.subtitle && (
                        <p className="text-lg md:text-xl mb-6">{banner.subtitle}</p>
                      )}
                      {banner.show_button !== false && banner.button_text && (
                        <a 
                          href={banner.link || banner.link_url || '#'}
                          className="inline-block bg-white text-black px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
                        >
                          {banner.button_text}
                        </a>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        
        {/* Dots */}
        {visibleBanners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {visibleBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-3 h-3 rounded-full transition ${
                  idx === currentSlide ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
        
        {/* Arrows */}
        {visibleBanners.length > 1 && (
          <>
            <button
              onClick={() => setCurrentSlide(prev => (prev - 1 + visibleBanners.length) % visibleBanners.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
            >
              ‹
            </button>
            <button
              onClick={() => setCurrentSlide(prev => (prev + 1) % visibleBanners.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
            >
              ›
            </button>
          </>
        )}
      </div>
    );
  }

  // Fall back to server-rendered HTML
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};

/**
 * ThemeProducts - Renders product grid from theme with cart interactivity
 */
export const ThemeProducts = ({ 
  category = '', 
  limit = 12, 
  featured = false,
  className = '',
  onAddToCart = null,
  title = ''
}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (limit) params.append('limit', limit.toString());
        if (featured) params.append('featured', 'true');
        
        const response = await axios.get(`${API_URL}/api/render/partial/products?${params}`);
        if (response.data.products) {
          setProducts(response.data.products);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [category, limit, featured]);

  const handleAddToCart = (product) => {
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  if (loading) {
    return (
      <div className={className}>
        {title && <h2 className="text-2xl font-bold mb-6">{title}</h2>}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(limit > 8 ? 8 : limit)].map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {title && <h2 className="text-2xl font-bold mb-6">{title}</h2>}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <div 
            key={product.id}
            className="bg-white rounded-lg shadow-sm overflow-hidden group hover:shadow-md transition"
          >
            <a href={`/store/product/${product.id}`} className="block">
              <div className="aspect-square overflow-hidden bg-gray-100">
                <img 
                  src={product.images?.[0] || '/placeholder.png'}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                <p className="text-sm text-gray-500">{product.sku}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">
                    ${product.price?.toFixed(2)}
                  </span>
                  {product.compare_price && product.compare_price > product.price && (
                    <span className="text-sm text-gray-400 line-through">
                      ${product.compare_price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </a>
            <div className="px-4 pb-4">
              <button
                onClick={() => handleAddToCart(product)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * ThemeCategories - Renders category navigation from theme
 */
export const ThemeCategories = ({ className = '' }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/render/partial/categories`);
        if (response.data.categories) {
          setCategories(response.data.categories);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className={`flex gap-4 ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <nav className={`flex flex-wrap gap-4 ${className}`}>
      {categories.map((cat) => (
        <a
          key={cat.id}
          href={`/store/category/${cat.id}`}
          className="text-gray-700 hover:text-blue-600 transition font-medium"
        >
          {cat.name}
        </a>
      ))}
    </nav>
  );
};

export default ThemeRenderer;
