import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Orders() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/orders"],
    refetchInterval: 30000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-green-100 text-green-800";
      case "shipped":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-purple-100 text-purple-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "urgent":
        return "bg-orange-100 text-orange-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <>
        <Header 
          title="Orders" 
          subtitle="Manage aviation parts orders and track their progress"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Orders" 
        subtitle="Manage aviation parts orders and track their progress"
      />
      
      <main className="flex-1 overflow-y-auto p-6" data-testid="orders-main">
        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search orders..."
                className="w-64 pl-10"
                data-testid="search-orders"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
            <Button variant="outline" data-testid="filter-orders">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
          <Button data-testid="new-order-button">
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>

        {/* Orders Table */}
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Order Number</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(orders as any[])?.map((order: any) => (
                    <TableRow 
                      key={order.id} 
                      className="hover:bg-gray-50"
                      data-testid={`order-row-${order.id}`}
                    >
                      <TableCell className="font-medium text-primary">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>{order.partNumber}</TableCell>
                      <TableCell>{order.customer?.name || "Unknown"}</TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>
                        <Badge className={getUrgencyColor(order.urgencyLevel)}>
                          {order.urgencyLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>${order.totalValue || "0.00"}</TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="link" 
                            size="sm"
                            data-testid={`view-order-${order.id}`}
                          >
                            View
                          </Button>
                          <Button 
                            variant="link" 
                            size="sm"
                            data-testid={`edit-order-${order.id}`}
                          >
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {(!(orders as any[]) || (orders as any[]).length === 0) && (
              <div className="p-12 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-500 mb-4">Orders will appear here when created.</p>
                <Button data-testid="create-first-order">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Order
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
