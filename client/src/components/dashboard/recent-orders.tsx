import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function RecentOrders() {
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
      case "urgent":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <Card className="lg:col-span-2" data-testid="recent-orders-loading">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2 border border-gray-200" data-testid="recent-orders">
      <CardHeader className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900" data-testid="recent-orders-title">
            Recent Orders
          </h3>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              data-testid="filter-button"
            >
              <Filter className="w-4 h-4 mr-1" />
              Filter
            </Button>
            <Button 
              size="sm"
              data-testid="new-order-button"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Order
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Part Number
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(orders as any[])?.slice(0, 10).map((order: any) => (
                <TableRow 
                  key={order.id} 
                  className="hover:bg-gray-50"
                  data-testid={`order-row-${order.id}`}
                >
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.partNumber}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.customer?.name || "Unknown"}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${order.totalValue || "0.00"}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button 
                      variant="link" 
                      className="text-primary hover:text-blue-900 mr-3"
                      data-testid={`view-order-${order.id}`}
                    >
                      View
                    </Button>
                    <Button 
                      variant="link" 
                      className="text-gray-400 hover:text-gray-600"
                      data-testid={`edit-order-${order.id}`}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700" data-testid="pagination-info">
              Showing 1 to {Math.min(10, (orders as any[])?.length || 0)} of {(orders as any[])?.length || 0} results
            </p>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                data-testid="previous-button"
              >
                Previous
              </Button>
              <Button 
                size="sm"
                data-testid="next-button"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
