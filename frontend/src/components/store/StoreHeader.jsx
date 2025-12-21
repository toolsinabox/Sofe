import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  X,
  Heart,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { categories, storeSettings } from '../../data/mock';

const StoreHeader = ({ cartCount = 0 }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-center py-2 text-sm">
        <span className="font-medium">Free shipping on orders over $50!</span>
        <span className="mx-2">|</span>
        <span>Use code SAVE10 for 10% off</span>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 -ml-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Logo */}
          <Link to="/store" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">FH</span>
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:block">Fashion Hub</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link to="/store" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors">
              Home
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-gray-700 hover:text-emerald-600 font-medium transition-colors">
                Shop <ChevronDown size={16} />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border-gray-200 shadow-lg w-48">
                {categories.slice(0, 6).map((cat) => (
                  <DropdownMenuItem key={cat.id} className="hover:bg-gray-50 cursor-pointer">
                    <Link to={`/store/category/${cat.id}`} className="w-full">{cat.name}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/store/new-arrivals" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors">
              New Arrivals
            </Link>
            <Link to="/store/sale" className="text-red-500 hover:text-red-600 font-medium transition-colors">
              Sale
            </Link>
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full bg-gray-100 border-0 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              className="md:hidden p-2"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search size={22} className="text-gray-700" />
            </button>
            <Link to="/store/wishlist" className="p-2 text-gray-700 hover:text-emerald-600 transition-colors relative">
              <Heart size={22} />
            </Link>
            <Link to="/store/account" className="p-2 text-gray-700 hover:text-emerald-600 transition-colors">
              <User size={22} />
            </Link>
            <Link to="/store/cart" className="p-2 text-gray-700 hover:text-emerald-600 transition-colors relative">
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Search */}
        {searchOpen && (
          <div className="md:hidden py-3 border-t border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full bg-gray-100 border-0 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white">
          <nav className="px-4 py-4 space-y-3">
            <Link to="/store" className="block py-2 text-gray-700 hover:text-emerald-600 font-medium">
              Home
            </Link>
            <Link to="/store/products" className="block py-2 text-gray-700 hover:text-emerald-600 font-medium">
              Shop All
            </Link>
            {categories.slice(0, 6).map((cat) => (
              <Link
                key={cat.id}
                to={`/store/category/${cat.id}`}
                className="block py-2 text-gray-600 hover:text-emerald-600 pl-4"
              >
                {cat.name}
              </Link>
            ))}
            <Link to="/store/new-arrivals" className="block py-2 text-gray-700 hover:text-emerald-600 font-medium">
              New Arrivals
            </Link>
            <Link to="/store/sale" className="block py-2 text-red-500 hover:text-red-600 font-medium">
              Sale
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default StoreHeader;
