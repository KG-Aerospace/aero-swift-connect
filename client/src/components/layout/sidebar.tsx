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
  User,
  X,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Menu
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen, collapsed, setCollapsed }: SidebarProps) {
  const [location] = useLocation();

  const { data: stats } = useQuery<{
    dailyEmails: number;
    activeOrders: number;
    pendingQuotes: number;
    pendingDrafts: number;
    processedEmails: number;
  }>({
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
      badge: stats?.pendingDrafts ? stats.pendingDrafts.toString() : undefined,
      badgeVariant: "secondary" as const,
      active: location === "/customer-requests",
    },
    {
      path: "/orders",
      label: "Orders",
      icon: ShoppingCart,
      badge: stats?.activeOrders ? stats.activeOrders.toString() : undefined,
      badgeVariant: "default" as const,
      active: location === "/orders",
    },
    {
      path: "/quotes",
      label: "Quotes",
      icon: FileText,
      badge: stats?.pendingQuotes ? stats.pendingQuotes.toString() : undefined,
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
      path: "/procurement",
      label: "Procurement",
      icon: FileText,
      active: location === "/procurement",
    },
    {
      path: "/analytics",
      label: "Analytics",
      icon: BarChart2,
      active: location === "/analytics",
    },
    {
      path: "/rejected",
      label: "Rejected",
      icon: XCircle,
      active: location === "/rejected",
    },
  ];

  const SidebarContent = () => (
    <div className={`bg-white dark:bg-gray-800 shadow-lg flex flex-col h-full transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`} data-testid="sidebar">
      {/* Logo Section */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Plane className="text-white text-sm" data-testid="logo-icon" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white" data-testid="logo-title">
                  AviationParts
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="logo-subtitle">
                  Management System
                </p>
              </div>
            )}
          </div>
          {/* Collapse toggle button - desktop only */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex w-8 h-8 p-0"
            data-testid="sidebar-toggle"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-2 space-y-1" data-testid="navigation">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Link key={item.path} href={item.path}>
              <a
                className={`group relative flex items-center p-3 rounded-lg transition-colors ${
                  item.active
                    ? "bg-primary text-white"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                } ${collapsed ? 'justify-center' : ''}`}
                data-testid={`nav-${item.path.slice(1) || "dashboard"}`}
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? item.label : ''}
              >
                <IconComponent className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="font-medium ml-3">{item.label}</span>
                    {item.badge && (
                      <Badge 
                        variant={item.badgeVariant} 
                        className="ml-auto"
                        data-testid={`badge-${item.path.slice(1) || "dashboard"}`}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
                {collapsed && item.badge && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">{item.badge}</span>
                  </div>
                )}
                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    {item.label}
                    {item.badge && (
                      <Badge variant={item.badgeVariant} className="ml-2">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                )}
              </a>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-40"
            data-testid="mobile-sidebar-trigger"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className={`hidden md:flex fixed left-0 top-0 h-full z-30 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
        <SidebarContent />
      </div>
    </>
  );
}