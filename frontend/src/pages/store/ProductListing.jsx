import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Search, Filter, Grid, List, Star, X, ShoppingCart } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useCart } from './StoreLayout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProductListing = () => {
  const { id: categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const { addToCart, categories } = useCart();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(categoryId || 'all');
  const [sortBy, setSortBy] = useState('created_at');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, sortBy, searchQuery]);

  useEffect(() => {
    if (categoryId) {
      setSelectedCategory(categoryId);
    }
  }, [categoryId]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = `${API}/products?is_active=true&sort_by=${sortBy}`;
      if (selectedCategory && selectedCategory !== 'all') {
        url += `&category_id=${selectedCategory}`;
      }
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      const response = await axios.get(url);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const currentCategory = categories.find(c => c.id === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/store" className="hover:text-orange-500">Home</Link>
        <span>/</span>
        <span className="text-gray-900">
          {currentCategory ? currentCategory.name : 'All Products'}
        </span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {currentCategory ? currentCategory.name : 'All Products'}
        </h1>
        <p className="text-gray-500">Showing {products.length} products</p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden p-2.5 border border-gray-300 rounded-lg"
          >
            <Filter size={20} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 border-gray-300">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Newest</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="sales">Best Selling</SelectItem>
            </SelectContent>
          </Select>
          <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Filters */}
        <aside className={`${
          showFilters ? 'fixed inset-0 z-50 bg-white p-6 overflow-y-auto' : 'hidden'
        } md:block md:relative md:w-64 flex-shrink-0`}>
          {showFilters && (
            <div className="flex items-center justify-between mb-6 md:hidden">
              <h2 className="text-xl font-bold">Filters</h2>
              <button onClick={() => setShowFilters(false)}>
                <X size={24} />
              </button>
            </div>
          )}
          
          {/* Categories */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                  selectedCategory === 'all' ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                All Products
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                    selectedCategory === cat.id ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cat.name} ({cat.product_count || 0})
                </button>
              ))}
            </div>
          </div>

          {showFilters && (
            <Button
              onClick={() => setShowFilters(false)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white md:hidden"
            >
              Apply Filters
            </Button>
          )}
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 animate-pulse">
                  <div className="aspect-square bg-gray-200" />
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-6 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    <Link to={`/store/product/${product.id}`}>
                      <img
                        src={product.images?.[0] || 'https://via.placeholder.com/400'}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>
                    {product.compare_price && product.compare_price > product.price && (
                      <span className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                        ON SALE
                      </span>
                    )}
                    {product.stock === 0 && (
                      <span className="absolute top-3 right-3 px-2 py-1 bg-gray-500 text-white text-xs font-bold rounded">
                        OUT OF STOCK
                      </span>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm"
                      >
                        <ShoppingCart size={16} className="mr-2" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-500 mb-1">{product.sku}</p>
                    <Link to={`/store/product/${product.id}`}>
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 hover:text-orange-500 transition-colors mb-2">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-gray-900">
                        {formatCurrency(product.price)}
                      </span>
                      {product.compare_price && product.compare_price > product.price && (
                        <span className="text-sm text-gray-400 line-through">
                          RRP {formatCurrency(product.compare_price)}
                        </span>
                      )}
                    </div>
                    {product.stock > 0 ? (
                      <div className="flex items-center gap-1 mt-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-xs text-green-600 font-medium">IN STOCK</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        <span className="text-xs text-red-600 font-medium">OUT OF STOCK</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <div key={product.id} className="flex gap-6 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
                  <Link to={`/store/product/${product.id}`} className="flex-shrink-0">
                    <img
                      src={product.images?.[0] || 'https://via.placeholder.com/400'}
                      alt={product.name}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </Link>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">{product.sku}</p>
                    <Link to={`/store/product/${product.id}`}>
                      <h3 className="font-semibold text-gray-900 hover:text-orange-500 transition-colors text-lg">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-gray-900">{formatCurrency(product.price)}</span>
                        {product.compare_price && product.compare_price > product.price && (
                          <span className="text-gray-400 line-through">RRP {formatCurrency(product.compare_price)}</span>
                        )}
                      </div>
                      <Button
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                      >
                        <ShoppingCart size={16} className="mr-2" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && products.length === 0 && (
            <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500 text-lg">No products found matching your criteria.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductListing;
