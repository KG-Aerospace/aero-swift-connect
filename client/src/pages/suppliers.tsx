import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Building, Globe, TrendingUp, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Suppliers() {
  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["/api/suppliers"],
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <>
        <Header 
          title="Suppliers" 
          subtitle="Manage aviation parts suppliers and their performance"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
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
        title="Suppliers" 
        subtitle="Manage aviation parts suppliers and their performance"
      />
      
      <main className="flex-1 overflow-y-auto p-6" data-testid="suppliers-main">
        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search suppliers..."
                className="w-64 pl-10"
                data-testid="search-suppliers"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
            <Button variant="outline" data-testid="filter-suppliers">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
          <Button data-testid="new-supplier-button">
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        </div>

        {/* Suppliers Table */}
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(suppliers as any[])?.map((supplier: any) => (
                    <TableRow 
                      key={supplier.id} 
                      className="hover:bg-gray-50"
                      data-testid={`supplier-row-${supplier.id}`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span>{supplier.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{supplier.email}</TableCell>
                      <TableCell>
                        {supplier.website ? (
                          <div className="flex items-center space-x-1">
                            <Globe className="w-4 h-4 text-gray-400" />
                            <a 
                              href={supplier.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {supplier.website}
                            </a>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.responseTimeHours 
                          ? `${supplier.responseTimeHours}h` 
                          : "N/A"
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className={`font-semibold ${
                            parseFloat(supplier.successRate || "0") >= 90 
                              ? "text-green-600" 
                              : parseFloat(supplier.successRate || "0") >= 70 
                              ? "text-yellow-600" 
                              : "text-red-600"
                          }`}>
                            {supplier.successRate || "0"}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={supplier.isActive ? "default" : "secondary"}>
                          {supplier.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="link" 
                            size="sm"
                            data-testid={`view-supplier-${supplier.id}`}
                          >
                            View
                          </Button>
                          <Button 
                            variant="link" 
                            size="sm"
                            data-testid={`edit-supplier-${supplier.id}`}
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
            
            {(!(suppliers as any[]) || (suppliers as any[]).length === 0) && (
              <div className="p-12 text-center">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No suppliers found</h3>
                <p className="text-gray-500 mb-4">Add suppliers to start receiving quotes for aviation parts.</p>
                <Button data-testid="add-first-supplier">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Supplier
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
