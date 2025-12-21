import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  X,
  Heart,
  Phone,
  ChevronDown,
  Trash2,
  Plus,
  Minus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useCart } from '../../pages/store/StoreLayout';

const StoreHeader = ({ categories = [] }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [miniCartOpen, setMiniCartOpen] = useState(false);
  const { cart, removeFromCart, updateQuantity, getCartTotal, getCartCount } = useCart();
  const miniCartRef = useRef(null);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Close mini cart when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (miniCartRef.current && !miniCartRef.current.contains(event.target)) {
        setMiniCartOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      {/* Top Bar */}
      <div className="bg-gray-900 text-white text-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <Phone size={14} />
              <span>1800 123 456</span>
            </span>
          </div>
          <div className="hidden md:block">
            <span className="text-orange-400 font-semibold">FREE SHIPPING</span>
            <span className="mx-2">on orders over $50</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin" className="hover:text-orange-400 transition-colors">Admin</Link>
            <Link to="/merchant" className="hover:text-orange-400 transition-colors">Merchant</Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/store" className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">FH</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-2xl font-bold text-gray-900">FASHION</span>
                <span className="block text-xs text-gray-500 -mt-1">HUB STORE</span>
              </div>
            </Link>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="I am looking for..."
                  className="w-full border-2 border-gray-300 rounded-lg pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                  <Search size={20} />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Link to="/store/account" className="hidden md:flex flex-col items-center text-gray-600 hover:text-orange-500 transition-colors">
                <User size={24} />
                <span className="text-xs mt-1">Account</span>
              </Link>
              <Link to="/store/wishlist" className="hidden md:flex flex-col items-center text-gray-600 hover:text-orange-500 transition-colors">
                <Heart size={24} />
                <span className="text-xs mt-1">Wishlist</span>
              </Link>
              
              {/* Mini Cart */}
              <div className="relative" ref={miniCartRef}>
                <button 
                  onClick={() => setMiniCartOpen(!miniCartOpen)}
                  className="flex flex-col items-center text-gray-600 hover:text-orange-500 transition-colors relative"
                >
                  <ShoppingCart size={24} />
                  <span className="text-xs mt-1">Cart</span>
                  {getCartCount() > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {getCartCount()}
                    </span>
                  )}
                </button>

                {/* Mini Cart Dropdown */}
                {miniCartOpen && (
                  <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">Shopping Cart ({getCartCount()} items)</h3>
                    </div>
                    {cart.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <ShoppingCart size={40} className="mx-auto mb-2 opacity-30" />
                        <p>Your cart is empty</p>
                      </div>
                    ) : (
                      <>
                        <div className="max-h-80 overflow-y-auto">
                          {cart.map((item) => (
                            <div key={item.id} className="flex gap-3 p-4 border-b border-gray-100 hover:bg-gray-50">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-16 h-16 object-cover rounded"
                              />
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</h4>
                                <p className="text-orange-500 font-semibold text-sm">{formatCurrency(item.price)}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <button 
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <span className="text-sm w-8 text-center">{item.quantity}</span>
                                  <button 
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100"
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                              </div>
                              <button 
                                onClick={() => removeFromCart(item.id)}
                                className="p-1 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="p-4 border-t border-gray-200">
                          <div className="flex justify-between mb-4">
                            <span className="font-semibold">Subtotal:</span>
                            <span className="font-bold text-orange-500">{formatCurrency(getCartTotal())}</span>
                          </div>
                          <div className="flex gap-2">
                            <Link 
                              to="/store/cart" 
                              onClick={() => setMiniCartOpen(false)}
                              className="flex-1 py-2 text-center border-2 border-orange-500 text-orange-500 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
                            >
                              View Cart
                            </Link>
                            <Link 
                              to="/store/checkout" 
                              onClick={() => setMiniCartOpen(false)}
                              className="flex-1 py-2 text-center bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                            >
                              Checkout
                            </Link>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                className="md:hidden p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="bg-gray-100 border-b border-gray-200 hidden md:block">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center gap-1">
            <Link 
              to="/store/products" 
              className="px-4 py-3 font-semibold text-sm text-gray-700 hover:text-orange-500 hover:bg-white transition-all"
            >
              ALL PRODUCTS
            </Link>
            {categories.slice(0, 6).map((cat) => (
              <DropdownMenu key={cat.id}>
                <DropdownMenuTrigger className="px-4 py-3 font-semibold text-sm text-gray-700 hover:text-orange-500 hover:bg-white transition-all flex items-center gap-1">
                  {cat.name.toUpperCase()} <ChevronDown size={14} />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border-gray-200 shadow-lg">
                  <DropdownMenuItem asChild>
                    <Link to={`/store/category/${cat.id}`} className="w-full cursor-pointer">
                      All {cat.name}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
            <Link 
              to="/store/sale" 
              className="px-4 py-3 font-semibold text-sm text-red-500 hover:text-red-600 hover:bg-white transition-all"
            >
              ON SALE
            </Link>
          </nav>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="p-4">
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search products..."
                className="w-full border border-gray-300 rounded-lg pl-4 pr-10 py-2 text-sm"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
            <nav className="space-y-2">
              <Link to="/store/products" className="block py-2 font-semibold text-gray-700">
                All Products
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/store/category/${cat.id}`}
                  className="block py-2 text-gray-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {cat.name}
                </Link>
              ))}
              <Link to="/store/sale" className="block py-2 font-semibold text-red-500">
                On Sale
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default StoreHeader;
