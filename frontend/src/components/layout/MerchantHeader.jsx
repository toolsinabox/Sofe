import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, User, ChevronDown, Calendar, LogOut, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useAuth } from '../../context/AuthContext';

const MerchantHeader = ({ title, onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/merchant/login');
  };

  return (
    <header className="h-14 sm:h-16 bg-[#0d1117] border-b border-gray-800 flex items-center justify-between px-3 sm:px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile menu button */}
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-base sm:text-lg md:text-xl font-semibold text-white truncate max-w-[120px] sm:max-w-none">{title}</h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
        {/* Date Range Selector - Hidden on mobile */}
        <div className="hidden md:block">
          <Select defaultValue="7d">
            <SelectTrigger className="w-32 lg:w-40 bg-gray-800/50 border-gray-700 text-gray-300 text-sm">
              <Calendar size={14} className="mr-1 lg:mr-2 text-gray-500" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1f2e] border-gray-700">
              <SelectItem value="today" className="text-gray-300 hover:text-white">Today</SelectItem>
              <SelectItem value="7d" className="text-gray-300 hover:text-white">Last 7 days</SelectItem>
              <SelectItem value="30d" className="text-gray-300 hover:text-white">Last 30 days</SelectItem>
              <SelectItem value="90d" className="text-gray-300 hover:text-white">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search - Hidden on small mobile, icon only on tablet */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Search..."
            className="w-32 md:w-48 lg:w-64 bg-gray-800/50 border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 sm:py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
          />
        </div>
        
        {/* Search icon for mobile */}
        <button className="sm:hidden p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
          <Search size={18} />
        </button>

        {/* Notifications */}
        <button className="relative p-1.5 sm:p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
          <Bell size={18} className="sm:w-5 sm:h-5" />
          <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
        </button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                <User size={14} className="sm:w-4 sm:h-4 text-white" />
              </div>
              <span className="hidden md:inline text-sm text-white font-medium">{user?.name || 'Merchant'}</span>
              <ChevronDown size={14} className="hidden sm:inline text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-[#1a1f2e] border-gray-700">
            <div className="px-2 py-1.5 text-xs text-gray-500 border-b border-gray-700">
              {user?.email}
            </div>
            <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer">
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer"
              onClick={() => navigate('/merchant/store-settings')}
            >
              Store Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer">
              Billing
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem 
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut size={16} className="mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default MerchantHeader;
