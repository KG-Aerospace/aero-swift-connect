import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package, Mail } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { format } from "date-fns";

// Helper function to extract airline name from email
const getAirlineName = (email: string): string => {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  
  const airlineMap: Record<string, string> = {
    'nordwindairlines.ru': 'Nordwind Airlines',
    's7.ru': 'S7 Airlines',
    'utair.ru': 'UTair',
    'aeroflot.ru': 'Aeroflot',
    'rossiya-airlines.com': 'Rossiya Airlines',
    'flysmartavia.com': 'Smartavia',
    'pobeda.aero': 'Pobeda',
    'azurair.ru': 'AZUR air',
    'atechnics.ru': 'Aeroflot Technics',
    'vd-technics.com': 'Volga-Dnepr Technics',
    'u6.ru': 'Ural Airlines',
    'alrosa.ru': 'ALROSA',
    'aerostartu.ru': 'Aerostar-TU',
    'uvtaero.ru': 'UVT AERO',
  };

  for (const [key, value] of Object.entries(airlineMap)) {
    if (domain.includes(key)) return value;
  }
  
  return 'Unknown Airline';
};

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProcurement, setEditingProcurement] = useState<string | null>(null);
  const [procurementData, setProcurementData] = useState<any>({});
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/orders"],
    refetchInterval: 30000,
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      return apiRequest(`/api/orders/${id}`, {
        method: "PATCH",
        body: updates,
      });
    },
    onSuccess: () => {
      toast({
        title: "Procurement data updated",
        description: "The procurement information has been saved.",
      });
      setEditingProcurement(null);
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

  const handleSaveProcurement = (orderId: string) => {
    updateOrderMutation.mutate({
      id: orderId,
      ...procurementData[orderId],
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "verified":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-purple-100 text-purple-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredOrders = Array.isArray(orders) 
    ? orders.filter((order: any) => 
        order.status === 'verified' && (
          order.partNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.positionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="orders-loading">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders Management</h1>
        <div className="relative w-64">
          <Input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-orders"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>
      </div>

      <div className="space-y-6">
        {filteredOrders?.map((order: any) => (
          <Card key={order.id} className="border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Package className="w-5 h-5 text-gray-500" />
                  <div>
                    <CardTitle className="text-lg">
                      {order.requisitionNumber || order.positionId || order.orderNumber}
                    </CardTitle>
                    <p className="text-sm text-gray-500">
                      Part Number: {order.partNumber} | CR: {order.crNumber}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                  {order.emailId && (
                    <Link href={`/email/${order.emailId}`}>
                      <Button variant="outline" size="sm">
                        <Mail className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Sales Section - Data from customer-requests */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                  Sales Information (from Customer Request)
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>CR Number</TableHead>
                        <TableHead>Requisition #</TableHead>
                        <TableHead>Request Date</TableHead>
                        <TableHead>Input Date</TableHead>
                        <TableHead>Part Number</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>UOM</TableHead>
                        <TableHead>CHEAP/EXP</TableHead>
                        <TableHead>AC Type</TableHead>
                        <TableHead>Engine Type</TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead>Operator</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="text-xs">
                        <TableCell>{order.crNumber || order.id}</TableCell>
                        <TableCell>{order.requisitionNumber || "1"}</TableCell>
                        <TableCell>
                          {order.customerRequestDate 
                            ? format(new Date(order.customerRequestDate), 'dd/MM/yyyy')
                            : format(new Date(order.createdAt), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.createdAt), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">{order.partNumber}</TableCell>
                        <TableCell>{order.partDescription || "-"}</TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>{order.uom || "EA"}</TableCell>
                        <TableCell>{order.cheapExp || "CHEAP"}</TableCell>
                        <TableCell>{order.acType || "-"}</TableCell>
                        <TableCell>{order.engineType || "-"}</TableCell>
                        <TableCell>{order.comment || "-"}</TableCell>
                        <TableCell>
                          {order.customer?.email 
                            ? getAirlineName(order.customer.email)
                            : "Unknown"}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Separator />

              {/* Procurement Section - To be filled by procurement team */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Procurement Information
                  </h3>
                  {editingProcurement === order.id ? (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleSaveProcurement(order.id)}
                      >
                        Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEditingProcurement(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setEditingProcurement(order.id);
                        setProcurementData({
                          ...procurementData,
                          [order.id]: {
                            nq: order.nq || '',
                            requested: order.requested || '',
                            rfqDate: order.rfqDate || '',
                            ils: order.ils || '',
                            rfqStatusIls: order.rfqStatusIls || '',
                            ilsRfqDate: order.ilsRfqDate || '',
                            others: order.others || '',
                            rfqStatus: order.rfqStatus || '',
                            supplierQuoteReceived: order.supplierQuoteReceived || '',
                            supplierQuoteNotes: order.supplierQuoteNotes || '',
                            price: order.price || '',
                            poNumber: order.poNumber || '',
                          }
                        });
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                
                {editingProcurement === order.id ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">NQ</Label>
                      <Input 
                        className="h-8 text-xs"
                        value={procurementData[order.id]?.nq || ''}
                        onChange={(e) => setProcurementData({
                          ...procurementData,
                          [order.id]: {
                            ...procurementData[order.id],
                            nq: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Requested</Label>
                      <Select 
                        value={procurementData[order.id]?.requested || ''}
                        onValueChange={(value) => setProcurementData({
                          ...procurementData,
                          [order.id]: {
                            ...procurementData[order.id],
                            requested: value
                          }
                        })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">RFQ Date</Label>
                      <Input 
                        type="date"
                        className="h-8 text-xs"
                        value={procurementData[order.id]?.rfqDate || ''}
                        onChange={(e) => setProcurementData({
                          ...procurementData,
                          [order.id]: {
                            ...procurementData[order.id],
                            rfqDate: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">ILS</Label>
                      <Input 
                        className="h-8 text-xs"
                        value={procurementData[order.id]?.ils || ''}
                        onChange={(e) => setProcurementData({
                          ...procurementData,
                          [order.id]: {
                            ...procurementData[order.id],
                            ils: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">RFQ Status ILS</Label>
                      <Input 
                        className="h-8 text-xs"
                        value={procurementData[order.id]?.rfqStatusIls || ''}
                        onChange={(e) => setProcurementData({
                          ...procurementData,
                          [order.id]: {
                            ...procurementData[order.id],
                            rfqStatusIls: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">ILS RFQ Date</Label>
                      <Input 
                        type="date"
                        className="h-8 text-xs"
                        value={procurementData[order.id]?.ilsRfqDate || ''}
                        onChange={(e) => setProcurementData({
                          ...procurementData,
                          [order.id]: {
                            ...procurementData[order.id],
                            ilsRfqDate: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Others</Label>
                      <Input 
                        className="h-8 text-xs"
                        value={procurementData[order.id]?.others || ''}
                        onChange={(e) => setProcurementData({
                          ...procurementData,
                          [order.id]: {
                            ...procurementData[order.id],
                            others: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">RFQ Status</Label>
                      <Input 
                        className="h-8 text-xs"
                        value={procurementData[order.id]?.rfqStatus || ''}
                        onChange={(e) => setProcurementData({
                          ...procurementData,
                          [order.id]: {
                            ...procurementData[order.id],
                            rfqStatus: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Supplier Quote Received</Label>
                      <Input 
                        type="date"
                        className="h-8 text-xs"
                        value={procurementData[order.id]?.supplierQuoteReceived || ''}
                        onChange={(e) => setProcurementData({
                          ...procurementData,
                          [order.id]: {
                            ...procurementData[order.id],
                            supplierQuoteReceived: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs">Supplier Quote Notes</Label>
                      <Textarea 
                        className="h-16 text-xs"
                        value={procurementData[order.id]?.supplierQuoteNotes || ''}
                        onChange={(e) => setProcurementData({
                          ...procurementData,
                          [order.id]: {
                            ...procurementData[order.id],
                            supplierQuoteNotes: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">~Price</Label>
                      <Input 
                        className="h-8 text-xs"
                        value={procurementData[order.id]?.price || ''}
                        onChange={(e) => setProcurementData({
                          ...procurementData,
                          [order.id]: {
                            ...procurementData[order.id],
                            price: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">PO #</Label>
                      <Input 
                        className="h-8 text-xs"
                        value={procurementData[order.id]?.poNumber || ''}
                        onChange={(e) => setProcurementData({
                          ...procurementData,
                          [order.id]: {
                            ...procurementData[order.id],
                            poNumber: e.target.value
                          }
                        })}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead>NQ</TableHead>
                          <TableHead>Requested</TableHead>
                          <TableHead>RFQ Date</TableHead>
                          <TableHead>ILS</TableHead>
                          <TableHead>RFQ Status ILS</TableHead>
                          <TableHead>ILS RFQ Date</TableHead>
                          <TableHead>Others</TableHead>
                          <TableHead>RFQ Status</TableHead>
                          <TableHead>Supplier Quote Received</TableHead>
                          <TableHead>Supplier Quote Notes</TableHead>
                          <TableHead>~Price</TableHead>
                          <TableHead>PO #</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="text-xs">
                          <TableCell>{order.nq || "-"}</TableCell>
                          <TableCell>{order.requested || "-"}</TableCell>
                          <TableCell>{order.rfqDate || "-"}</TableCell>
                          <TableCell>{order.ils || "-"}</TableCell>
                          <TableCell>{order.rfqStatusIls || "-"}</TableCell>
                          <TableCell>{order.ilsRfqDate || "-"}</TableCell>
                          <TableCell>{order.others || "-"}</TableCell>
                          <TableCell>{order.rfqStatus || "-"}</TableCell>
                          <TableCell>{order.supplierQuoteReceived || "-"}</TableCell>
                          <TableCell>{order.supplierQuoteNotes || "-"}</TableCell>
                          <TableCell>{order.price || "-"}</TableCell>
                          <TableCell>{order.poNumber || "-"}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!filteredOrders || filteredOrders.length === 0) && (
        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No verified orders found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Verified orders from approved customer requests will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}