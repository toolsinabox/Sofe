import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Grid, List, Star, ChevronDown, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { products, categories } from '../../data/mock';
import { useCart } from './StoreLayout';

const ProductListing = () => {
  const { addToCart } = useCart();
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      let matchesPrice = true;
      if (priceRange === 'under50') matchesPrice = product.price < 50;
      if (priceRange === '50-100') matchesPrice = product.price >= 50 && product.price <= 100;
      if (priceRange === '100-200') matchesPrice = product.price >= 100 && product.price <= 200;
      if (priceRange === 'over200') matchesPrice = product.price > 200;
      return matchesSearch && matchesCategory && matchesPrice;
    })
    .sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'newest') return b.sales - a.sales;
      return 0;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">All Products</h1>
        <p className="text-gray-500">Showing {filteredProducts.length} products</p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden p-2.5 border border-gray-200 rounded-lg"
          >
            <Filter size={20} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44 border-gray-200">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
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
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
            <div className="space-y-3">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedCategory === 'all' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedCategory === cat.name ? 'bg-emerald-50 text-emerald-600' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cat.name} ({cat.count})
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Price Range</h3>
            <div className="space-y-3">
              {[
                { value: 'all', label: 'All Prices' },
                { value: 'under50', label: 'Under $50' },
                { value: '50-100', label: '$50 - $100' },
                { value: '100-200', label: '$100 - $200' },
                { value: 'over200', label: 'Over $200' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPriceRange(option.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    priceRange === option.value ? 'bg-emerald-50 text-emerald-600' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {showFilters && (
            <Button
              onClick={() => setShowFilters(false)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white md:hidden"
            >
              Apply Filters
            </Button>
          )}
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <div key={product.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {product.comparePrice && (
                      <span className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
                        Sale
                      </span>
                    )}
                    <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button
                        className="w-full bg-white text-gray-900 hover:bg-emerald-500 hover:text-white"
                        onClick={() => addToCart(product)}
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < Math.floor(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                        />
                      ))}
                      <span className="text-gray-500 text-sm ml-1">({product.reviews})</span>
                    </div>
                    <Link to={`/store/product/${product.id}`}>
                      <h3 className="font-semibold text-gray-900 hover:text-emerald-600 transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-lg font-bold text-emerald-600">{formatCurrency(product.price)}</span>
                      {product.comparePrice && (
                        <span className="text-gray-400 text-sm line-through">{formatCurrency(product.comparePrice)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <div key={product.id} className="flex gap-6 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
                  <Link to={`/store/product/${product.id}`} className="flex-shrink-0">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < Math.floor(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                        />
                      ))}
                      <span className="text-gray-500 text-sm ml-1">({product.reviews})</span>
                    </div>
                    <Link to={`/store/product/${product.id}`}>
                      <h3 className="font-semibold text-gray-900 hover:text-emerald-600 transition-colors text-lg">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-emerald-600">{formatCurrency(product.price)}</span>
                        {product.comparePrice && (
                          <span className="text-gray-400 line-through">{formatCurrency(product.comparePrice)}</span>
                        )}
                      </div>
                      <Button
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                        onClick={() => addToCart(product)}
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">No products found matching your criteria.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setPriceRange('all');
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
