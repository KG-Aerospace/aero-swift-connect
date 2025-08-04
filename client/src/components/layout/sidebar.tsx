import { Link, useLocation } from "wouter";
import { 
  Plane, 
  BarChart3, 
  Mail, 
  ShoppingCart, 
  FileText, 
  Truck, 
  BarChart2,
  Settings,
  User
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

export default function Sidebar() {
  const [location] = useLocation();

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const menuItems = [
    {
      path: "/",
      label: "Dashboard",
      icon: BarChart3,
      active: location === "/",
    },
    {
      path: "/customer-requests",
      label: "Customer Requests",
      icon: Mail,
      badge: "47",
      badgeVariant: "secondary" as const,
      active: location === "/customer-requests",
    },
    {
      path: "/orders",
      label: "Orders",
      icon: ShoppingCart,
      badge: (stats as any)?.activeOrders?.toString() || "124",
      badgeVariant: "default" as const,
      active: location === "/orders",
    },
    {
      path: "/quotes",
      label: "Quotes",
      icon: FileText,
      badge: (stats as any)?.pendingQuotes?.toString() || "89",
      badgeVariant: "secondary" as const,
      active: location === "/quotes",
    },
    {
      path: "/suppliers",
      label: "Suppliers",
      icon: Truck,
      active: location === "/suppliers",
    },
    {
      path: "/analytics",
      label: "Analytics",
      icon: BarChart2,
      active: location === "/analytics",
    },
  ];

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col" data-testid="sidebar">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Plane className="text-white text-lg" data-testid="logo-icon" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900" data-testid="logo-title">
              AviationParts
            </h1>
            <p className="text-sm text-gray-500" data-testid="logo-subtitle">
              Management System
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2" data-testid="navigation">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Link key={item.path} href={item.path}>
              <a
                className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                  item.active
                    ? "bg-primary text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                data-testid={`nav-${item.path.slice(1) || "dashboard"}`}
              >
                <IconComponent className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {item.badge && (
                  <Badge 
                    variant={item.badgeVariant} 
                    className="ml-auto"
                    data-testid={`badge-${item.path.slice(1) || "dashboard"}`}
                  >
                    {item.badge}
                  </Badge>
                )}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200" data-testid="user-profile">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <User className="text-gray-600 text-sm" data-testid="user-avatar" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900" data-testid="user-name">
              John Smith
            </p>
            <p className="text-xs text-gray-500" data-testid="user-role">
              System Administrator
            </p>
          </div>
          <button 
            className="text-gray-400 hover:text-gray-600"
            data-testid="user-settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
