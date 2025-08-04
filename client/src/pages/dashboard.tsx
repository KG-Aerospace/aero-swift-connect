import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
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
    <>
      <Header 
        title="Dashboard" 
        subtitle="Real-time overview of aviation parts management"
      />
      
      <main className="flex-1 overflow-y-auto p-6" data-testid="dashboard-main">
        {/* KPI Cards */}
        <KPICards stats={stats as any} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders Table */}
          <RecentOrders />

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Email Processing Status */}
            <EmailStatus />

            {/* Top Suppliers */}
            <TopSuppliers />

            {/* Recent Activity */}
            <RecentActivity />
          </div>
        </div>
      </main>
    </>
  );
}
