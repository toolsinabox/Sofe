import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube, CreditCard, Truck, Shield, RotateCcw } from 'lucide-react';

const StoreFooter = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Features Bar */}
      <div className="bg-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <Truck className="text-orange-500" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Free Shipping</h4>
                <p className="text-xs text-gray-400">On orders over $50</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <RotateCcw className="text-orange-500" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">30-Day Returns</h4>
                <p className="text-xs text-gray-400">Money back guarantee</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <Shield className="text-orange-500" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Secure Payment</h4>
                <p className="text-xs text-gray-400">100% secure checkout</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <CreditCard className="text-orange-500" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Flexible Payment</h4>
                <p className="text-xs text-gray-400">Afterpay & ZipPay</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">FH</span>
              </div>
              <span className="text-xl font-bold text-white">Fashion Hub</span>
            </div>
            <p className="text-gray-400 mb-4 text-sm">
              Your one-stop shop for premium fashion and lifestyle products. Quality guaranteed with 100% satisfaction.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-orange-500 transition-colors">
                <Facebook size={18} />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-orange-500 transition-colors">
                <Twitter size={18} />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-orange-500 transition-colors">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-orange-500 transition-colors">
                <Youtube size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/store" className="text-gray-400 hover:text-orange-400 transition-colors">Home</Link></li>
              <li><Link to="/store/products" className="text-gray-400 hover:text-orange-400 transition-colors">All Products</Link></li>
              <li><Link to="/store/sale" className="text-gray-400 hover:text-orange-400 transition-colors">On Sale</Link></li>
              <li><Link to="/store/about" className="text-gray-400 hover:text-orange-400 transition-colors">About Us</Link></li>
              <li><Link to="/store/contact" className="text-gray-400 hover:text-orange-400 transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-white font-semibold mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/store/faq" className="text-gray-400 hover:text-orange-400 transition-colors">FAQs</Link></li>
              <li><Link to="/store/shipping" className="text-gray-400 hover:text-orange-400 transition-colors">Shipping Info</Link></li>
              <li><Link to="/store/returns" className="text-gray-400 hover:text-orange-400 transition-colors">Returns Policy</Link></li>
              <li><Link to="/store/track-order" className="text-gray-400 hover:text-orange-400 transition-colors">Track Order</Link></li>
              <li><Link to="/store/warranty" className="text-gray-400 hover:text-orange-400 transition-colors">Warranty</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400">123 Commerce Street<br />New York, NY 10001</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-orange-500" />
                <span className="text-gray-400">1800 123 456</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-orange-500" />
                <span className="text-gray-400">support@fashionhub.com</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © 2025 Fashion Hub. All rights reserved. | Powered by Maropost
            </p>
            <div className="flex items-center gap-3">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png" alt="Visa" className="h-6 object-contain opacity-60 hover:opacity-100 transition-opacity" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png" alt="Mastercard" className="h-6 object-contain opacity-60 hover:opacity-100 transition-opacity" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/200px-PayPal.svg.png" alt="PayPal" className="h-6 object-contain opacity-60 hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default StoreFooter;
