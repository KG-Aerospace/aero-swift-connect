import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Package, Clock, DollarSign } from "lucide-react";
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
      <div className="space-y-6" data-testid="orders-loading">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="orders-main">
      {/* Mobile-first Controls */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search orders..."
              className="w-full sm:w-64 pl-10"
              data-testid="search-orders"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
          <Button variant="outline" className="w-full sm:w-auto" data-testid="filter-orders">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
        <Button className="w-full sm:w-auto" data-testid="new-order-button">
          <Plus className="w-4 h-4 mr-2" />
          New Order
        </Button>
      </div>

      {/* Desktop Table - Hidden on mobile */}
      <Card className="hidden lg:block border border-gray-200 dark:border-gray-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No orders found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Orders will appear here when created.</p>
                <Button data-testid="create-first-order">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Order
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mobile Card Layout - Hidden on desktop */}
        <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
          {(orders as any[])?.map((order: any) => (
            <Card key={order.id} className="border border-gray-200 dark:border-gray-700" data-testid={`order-card-${order.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-primary">
                    {order.orderNumber}
                  </CardTitle>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{order.partNumber}</span>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {order.partDescription}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Customer:</span>
                    <span className="text-sm font-medium">{order.customer?.name || "Unknown"}</span>
                  </div>
                  <Badge className={getUrgencyColor(order.urgencyLevel)}>
                    {order.urgencyLevel}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Quantity:</span>
                    <div className="font-medium">{order.quantity}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Value:</span>
                    <div className="font-medium">${order.totalValue || "0.00"}</div>
                  </div>
                </div>

                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  {new Date(order.createdAt).toLocaleDateString()}
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                    data-testid={`view-order-mobile-${order.id}`}
                  >
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                    data-testid={`edit-order-mobile-${order.id}`}
                  >
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {(!(orders as any[]) || (orders as any[]).length === 0) && (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No orders found</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Orders will appear here when created.</p>
                  <Button data-testid="create-first-order-mobile">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Order
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  }
