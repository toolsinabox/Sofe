import React from 'react';
import { Bell, Search, User, ChevronDown, Calendar } from 'lucide-react';
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

const MerchantHeader = ({ title }) => {
  return (
    <header className="h-16 bg-[#0d1117] border-b border-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-white">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Date Range Selector */}
        <Select defaultValue="7d">
          <SelectTrigger className="w-40 bg-gray-800/50 border-gray-700 text-gray-300 text-sm">
            <Calendar size={16} className="mr-2 text-gray-500" />
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1f2e] border-gray-700">
            <SelectItem value="today" className="text-gray-300 hover:text-white">Today</SelectItem>
            <SelectItem value="7d" className="text-gray-300 hover:text-white">Last 7 days</SelectItem>
            <SelectItem value="30d" className="text-gray-300 hover:text-white">Last 30 days</SelectItem>
            <SelectItem value="90d" className="text-gray-300 hover:text-white">Last 90 days</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search orders, products..."
            className="w-64 bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
        </button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <span className="text-sm text-white font-medium">Merchant</span>
              <ChevronDown size={16} className="text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-[#1a1f2e] border-gray-700">
            <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer">
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer">
              Store Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer">
              Billing
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default MerchantHeader;
