import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Package, ShoppingCart, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState("");

  // Get verified orders (from approved draft orders)
  const { data: verifiedOrders, isLoading: isOrdersLoading } = useQuery({
    queryKey: ["/api/orders"],
    refetchInterval: 30000,
  });

  // Get procurement data (quotes, suppliers, etc.)
  const { data: quotes, isLoading: isQuotesLoading } = useQuery({
    queryKey: ["/api/quotes"],
    refetchInterval: 30000,
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const response = await apiRequest("PATCH", `/api/orders/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Order updated successfully",
        description: "The order details have been saved.",
      });
      setEditingOrder(null);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating order",
        description: error.message || "Failed to update order",
        variant: "destructive",
      });
    },
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
                          {order.emailId && (
                            <Link href={`/email/${order.emailId}`}>
                              <Button 
                                variant="link" 
                                size="sm"
                                data-testid={`view-email-${order.id}`}
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
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
                            onClick={() => {
                              setEditingOrder(order);
                              setEditFormData({
                                partNumber: order.partNumber,
                                quantity: order.quantity,
                                urgencyLevel: order.urgencyLevel || "normal",
                                notes: order.notes || "",
                                partDescription: order.partDescription || "",
                              });
                            }}
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
                  {order.emailId && (
                    <Link href={`/email/${order.emailId}`}>
                      <Button 
                        variant="outline" 
                        size="sm"
                        data-testid={`view-email-mobile-${order.id}`}
                      >
                        <Mail className="w-4 h-4 mr-1" />
                        Email
                      </Button>
                    </Link>
                  )}
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
                    onClick={() => {
                      setEditingOrder(order);
                      setEditFormData({
                        partNumber: order.partNumber,
                        quantity: order.quantity,
                        urgencyLevel: order.urgencyLevel || "normal",
                        notes: order.notes || "",
                        partDescription: order.partDescription || "",
                      });
                    }}
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

        {/* Edit Order Dialog */}
        <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Order</DialogTitle>
              <DialogDescription>
                Update order details. The sales team can correct information as needed.
              </DialogDescription>
            </DialogHeader>
            
            {editingOrder && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateOrderMutation.mutate({
                    id: editingOrder.id,
                    ...editFormData,
                  });
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orderNumber">Order Number</Label>
                    <Input
                      id="orderNumber"
                      value={editingOrder.orderNumber}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customer">Customer</Label>
                    <Input
                      id="customer"
                      value={editingOrder.customer?.name || "Unknown"}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partNumber">Part Number *</Label>
                    <Input
                      id="partNumber"
                      value={editFormData.partNumber}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, partNumber: e.target.value })
                      }
                      required
                      placeholder="e.g., MS24665-156"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={editFormData.quantity}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, quantity: parseInt(e.target.value) })
                      }
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="partDescription">Part Description</Label>
                  <Input
                    id="partDescription"
                    value={editFormData.partDescription}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, partDescription: e.target.value })
                    }
                    placeholder="e.g., Screw, Machine"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="urgencyLevel">Urgency Level</Label>
                  <Select
                    value={editFormData.urgencyLevel}
                    onValueChange={(value) =>
                      setEditFormData({ ...editFormData, urgencyLevel: value })
                    }
                  >
                    <SelectTrigger id="urgencyLevel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="critical">Critical (AOG)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes / Delivery Requirements</Label>
                  <Textarea
                    id="notes"
                    value={editFormData.notes}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, notes: e.target.value })
                    }
                    placeholder="Any special requirements or notes..."
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingOrder(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateOrderMutation.isPending}
                  >
                    {updateOrderMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }
