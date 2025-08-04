import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, User, Calendar, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function CustomerRequests() {
  const { data: emails, isLoading } = useQuery({
    queryKey: ["/api/emails"],
    refetchInterval: 30000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <>
        <Header 
          title="Customer Requests" 
          subtitle="Email requests from customers for aviation parts"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Customer Requests" 
        subtitle="Email requests from customers for aviation parts"
      />
      
      <main className="flex-1 overflow-y-auto p-6" data-testid="customer-requests-main">
        <div className="space-y-4">
          {(emails as any[])?.map((email: any) => (
            <Card key={email.id} className="border border-gray-200" data-testid={`email-${email.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <h3 className="font-semibold text-gray-900" data-testid={`email-subject-${email.id}`}>
                        {email.subject}
                      </h3>
                      <p className="text-sm text-gray-500" data-testid={`email-from-${email.id}`}>
                        From: {email.fromEmail}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(email.status)} data-testid={`email-status-${email.id}`}>
                      {email.status}
                    </Badge>
                    <span className="text-sm text-gray-500" data-testid={`email-time-${email.id}`}>
                      {formatDistanceToNow(new Date(email.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 line-clamp-3" data-testid={`email-body-${email.id}`}>
                    {email.body}
                  </p>
                  
                  {email.customerId && (
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>Customer ID: {email.customerId}</span>
                      </div>
                      {email.processedAt && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Processed: {new Date(email.processedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      data-testid={`view-details-${email.id}`}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                    {email.status === "pending" && (
                      <Button 
                        size="sm"
                        data-testid={`process-email-${email.id}`}
                      >
                        Process Email
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {(!(emails as any[]) || (emails as any[]).length === 0) && (
            <Card className="border border-gray-200">
              <CardContent className="p-12 text-center">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No customer requests</h3>
                <p className="text-gray-500">Customer email requests will appear here when received.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
