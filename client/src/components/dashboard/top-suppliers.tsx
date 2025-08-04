import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Building } from "lucide-react";

export default function TopSuppliers() {
  const { data: suppliers } = useQuery({
    queryKey: ["/api/suppliers"],
    refetchInterval: 60000,
  });

  const topSuppliers = (suppliers as any[])?.slice(0, 3) || [];

  return (
    <Card className="border border-gray-200" data-testid="top-suppliers">
      <CardHeader className="p-6">
        <h3 className="text-lg font-semibold text-gray-900" data-testid="top-suppliers-title">
          Top Suppliers
        </h3>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-4">
        {topSuppliers.map((supplier: any, index: number) => (
          <div 
            key={supplier.id} 
            className="flex items-center justify-between"
            data-testid={`supplier-${index}`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                index === 0 ? "bg-blue-100" :
                index === 1 ? "bg-green-100" :
                "bg-yellow-100"
              }`}>
                <Building className={`text-sm ${
                  index === 0 ? "text-primary" :
                  index === 1 ? "text-success" :
                  "text-warning"
                }`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900" data-testid={`supplier-name-${index}`}>
                  {supplier.name}
                </p>
                <p className="text-xs text-gray-500" data-testid={`supplier-response-time-${index}`}>
                  Response time: {supplier.responseTimeHours || "N/A"}h
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900" data-testid={`supplier-success-rate-${index}`}>
                {supplier.successRate || "0"}%
              </p>
              <p className={`text-xs flex items-center ${
                parseFloat(supplier.successRate || "0") >= 90 ? "text-success" : "text-error"
              }`} data-testid={`supplier-trend-${index}`}>
                {parseFloat(supplier.successRate || "0") >= 90 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {parseFloat(supplier.successRate || "0") >= 90 ? "↑ 5%" : "↓ 1%"}
              </p>
            </div>
          </div>
        ))}
        
        {topSuppliers.length === 0 && (
          <div className="text-center py-4 text-gray-500" data-testid="no-suppliers">
            No suppliers available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
