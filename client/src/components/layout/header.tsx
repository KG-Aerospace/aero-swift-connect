import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "@/hooks/useWebSocket";

interface HeaderProps {
  title: string;
  subtitle: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { isConnected } = useWebSocket();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900" data-testid="page-title">
            {title}
          </h2>
          <p className="text-gray-600" data-testid="page-subtitle">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Real-time indicator */}
          <div className="flex items-center space-x-2" data-testid="connection-status">
            <div 
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-success animate-pulse' : 'bg-gray-400'
              }`}
              data-testid="connection-indicator"
            />
            <span className={`text-sm font-medium ${
              isConnected ? 'text-success' : 'text-gray-400'
            }`}>
              {isConnected ? 'Live Updates' : 'Disconnected'}
            </span>
          </div>
          
          {/* Search */}
          <div className="relative" data-testid="search-container">
            <Input
              type="text"
              placeholder="Search orders, parts..."
              className="w-64 pl-10 pr-4 py-2"
              data-testid="search-input"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
          
          {/* Notifications */}
          <button 
            className="relative p-2 text-gray-400 hover:text-gray-600"
            data-testid="notifications-button"
          >
            <Bell className="w-5 h-5" />
            <Badge 
              className="absolute -top-1 -right-1 bg-error text-white text-xs w-5 h-5 flex items-center justify-center p-0"
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
