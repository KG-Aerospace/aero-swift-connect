import { useQuery } from "@tanstack/react-query";
import KPICards from "@/components/dashboard/kpi-cards";
import RecentOrders from "@/components/dashboard/recent-orders";
import EmailStatus from "@/components/dashboard/email-status";
import TopSuppliers from "@/components/dashboard/top-suppliers";
import RecentActivity from "@/components/dashboard/recent-activity";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function Dashboard() {
  const { data: stats, refetch } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 30000,
  });

  // Listen for WebSocket updates to trigger refetch
  const { lastMessage } = useWebSocket();
  
  // Refetch data when relevant updates come through WebSocket
  if (lastMessage?.type && ['order_created', 'order_updated', 'quote_created'].includes(lastMessage.type)) {
    refetch();
  }

  return (
    <div className="space-y-6" data-testid="dashboard-main">
      {/* KPI Cards */}
      <KPICards stats={stats as any} />

      {/* Main Content Grid - Mobile responsive */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Orders Table - Full width on mobile, 2 cols on xl */}
        <div className="xl:col-span-2">
          <RecentOrders />
        </div>

        {/* Right Sidebar - Full width on mobile, 1 col on xl */}
        <div className="space-y-6">
          {/* Email Processing Status */}
          <EmailStatus />

          {/* Top Suppliers */}
          <TopSuppliers />

          {/* Recent Activity */}
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
