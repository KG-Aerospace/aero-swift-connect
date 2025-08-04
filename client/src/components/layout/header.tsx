import { Search, Bell, Menu, Plane } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useLocation } from "wouter";

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
  const { isConnected } = useWebSocket();
  const [location] = useLocation();

  const getPageTitle = () => {
    switch (location) {
      case "/": return "Dashboard";
      case "/customer-requests": return "Customer Requests";
      case "/orders": return "Orders";
      case "/quotes": return "Quotes";
      case "/suppliers": return "Suppliers";
      case "/analytics": return "Analytics";
      default: return "Dashboard";
    }
  };

  const getPageSubtitle = () => {
    switch (location) {
      case "/": return "Real-time overview of aviation parts operations";
      case "/customer-requests": return "Manage incoming customer part requests";
      case "/orders": return "Track and manage part orders";
      case "/quotes": return "Review supplier quotes and pricing";
      case "/suppliers": return "Manage supplier relationships";
      case "/analytics": return "Performance metrics and insights";
      default: return "Real-time overview of aviation parts operations";
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 md:px-6 md:py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
            data-testid="mobile-menu-button"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Mobile Logo */}
          <div className="flex items-center space-x-2 md:hidden">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Plane className="text-white text-sm" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              AviationParts
            </span>
          </div>

          {/* Page Title - Hidden on mobile */}
          <div className="hidden md:block">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="page-title">
              {getPageTitle()}
            </h2>
            <p className="text-gray-600 dark:text-gray-400" data-testid="page-subtitle">
              {getPageSubtitle()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Real-time indicator - Hidden on mobile */}
          <div className="hidden sm:flex items-center space-x-2" data-testid="connection-status">
            <div 
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}
              data-testid="connection-indicator"
            />
            <span className={`text-sm font-medium ${
              isConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
            }`}>
              {isConnected ? 'Live' : 'Off'}
            </span>
          </div>
          
          {/* Search - Responsive */}
          <div className="relative hidden sm:block" data-testid="search-container">
            <Input
              type="text"
              placeholder="Search orders, parts..."
              className="w-48 md:w-64 pl-10 pr-4 py-2"
              data-testid="search-input"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>

          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="sm"
            className="sm:hidden p-2"
            data-testid="mobile-search-button"
          >
            <Search className="w-5 h-5" />
          </Button>
          
          {/* Notifications */}
          <button 
            className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            data-testid="notifications-button"
          >
            <Bell className="w-5 h-5" />
            <Badge 
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center p-0"
              data-testid="notification-count"
            >
              3
            </Badge>
          </button>
        </div>
      </div>
    </header>
  );
}
