import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Filter, DollarSign, Clock, Building } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

export default function Quotes() {
  const { data: quotes, isLoading } = useQuery({
    queryKey: ["/api/quotes"],
    refetchInterval: 30000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "expired":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <>
        <Header 
          title="Quotes" 
          subtitle="Review and manage supplier quotes for aviation parts"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[...Array(8)].map((_, i) => (
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
        title="Quotes" 
        subtitle="Review and manage supplier quotes for aviation parts"
      />
      
      <main className="flex-1 overflow-y-auto p-6" data-testid="quotes-main">
        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search quotes..."
                className="w-64 pl-10"
                data-testid="search-quotes"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
            <Button variant="outline" data-testid="filter-quotes">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {/* Quotes Table */}
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Order Number</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(quotes as any[])?.map((quote: any) => (
                    <TableRow 
                      key={quote.id} 
                      className="hover:bg-gray-50"
                      data-testid={`quote-row-${quote.id}`}
                    >
                      <TableCell className="font-medium text-primary">
                        {quote.order?.orderNumber || "N/A"}
                      </TableCell>
                      <TableCell>{quote.order?.partNumber || "N/A"}</TableCell>
                      <TableCell>{quote.supplier?.name || "Unknown"}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        ${parseFloat(quote.price).toLocaleString()}
                      </TableCell>
                      <TableCell>{quote.leadTimeDays} days</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(quote.status)}>
                          {quote.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{quote.responseTime}h</TableCell>
                      <TableCell>
                        {quote.validUntil 
                          ? formatDistanceToNow(new Date(quote.validUntil), { addSuffix: true })
                          : "N/A"
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {quote.status === "pending" && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                data-testid={`accept-quote-${quote.id}`}
                              >
                                Accept
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                data-testid={`reject-quote-${quote.id}`}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          <Button 
                            variant="link" 
                            size="sm"
                            data-testid={`view-quote-${quote.id}`}
                          >
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {(!(quotes as any[]) || (quotes as any[]).length === 0) && (
              <div className="p-12 text-center">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No quotes available</h3>
                <p className="text-gray-500">Supplier quotes will appear here when received.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
