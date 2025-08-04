import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, User, Calendar, FileText, Clock, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function CustomerRequests() {
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [quoteData, setQuoteData] = useState("");
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const { toast } = useToast();

  const { data: emails, isLoading } = useQuery({
    queryKey: ["/api/emails"],
    refetchInterval: 30000,
  });

  const { data: templateData } = useQuery({
    queryKey: ["/api/procurement/template"],
  });

  const createProcurementMutation = useMutation({
    mutationFn: async (data: { requestData: string; emailId: string }) => {
      const response = await apiRequest("POST", "/api/procurement/create", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Procurement request created successfully",
        description: `Created ${data.created} procurement request(s)`,
      });
      setShowQuoteDialog(false);
      setQuoteData("");
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating procurement request",
        description: error.message || "Failed to create procurement request",
        variant: "destructive",
      });
    },
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
      <div className="space-y-4" data-testid="customer-requests-loading">
        <div className="animate-pulse">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="customer-requests-main">
      {(emails as any[])?.map((email: any) => (
        <Card key={email.id} className="border border-gray-200 dark:border-gray-700" data-testid={`email-${email.id}`}>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3 min-w-0 flex-1">
                <Mail className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate" data-testid={`email-subject-${email.id}`}>
                    {email.subject}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate" data-testid={`email-from-${email.id}`}>
                    From: {email.fromEmail}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end space-x-2 flex-shrink-0">
                <Badge className={getStatusColor(email.status)} data-testid={`email-status-${email.id}`}>
                  {email.status}
                </Badge>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="w-3 h-3 mr-1" />
                  <span data-testid={`email-time-${email.id}`}>
                    {formatDistanceToNow(new Date(email.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3" data-testid={`email-body-${email.id}`}>
                {email.body}
              </p>
              
              {email.customerId && (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Customer ID: {email.customerId}</span>
                  </div>
                  {email.processedAt && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>Processed: {new Date(email.processedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full sm:w-auto"
                  data-testid={`view-details-${email.id}`}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  View Details
                </Button>
                {email.status === "pending" && (
                  <Button 
                    size="sm"
                    className="w-full sm:w-auto"
                    data-testid={`process-email-${email.id}`}
                  >
                    Process Email
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedEmail(email);
                    setShowQuoteDialog(true);
                    setQuoteData((templateData as any)?.template || "");
                  }}
                  className="w-full sm:w-auto"
                  data-testid={`button-process-quote-${email.id}`}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Create Procurement
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {(!(emails as any[]) || (emails as any[]).length === 0) && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="p-12 text-center">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No customer requests</h3>
            <p className="text-gray-500 dark:text-gray-400">Customer email requests will appear here when received.</p>
          </CardContent>
        </Card>
      )}
      
      {/* Quote Processing Dialog */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Procurement Request</DialogTitle>
            <DialogDescription>
              {selectedEmail && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm">
                    <strong>Email Subject:</strong> {selectedEmail.subject}
                  </p>
                  <p className="text-sm">
                    <strong>From:</strong> {selectedEmail.fromEmail}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Procurement Request Data (JSON Format)</label>
              <Textarea
                value={quoteData}
                onChange={(e) => setQuoteData(e.target.value)}
                placeholder="Paste supplier quote data to create procurement request..."
                className="mt-2 h-64 font-mono text-sm"
                data-testid="textarea-quote-data"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuoteData((templateData as any)?.template || "")}
                data-testid="button-load-template"
              >
                <FileText className="w-4 h-4 mr-1" />
                Load Template
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowQuoteDialog(false);
                    setQuoteData("");
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedEmail && quoteData) {
                      createProcurementMutation.mutate({
                        requestData: quoteData,
                        emailId: selectedEmail.id,
                      });
                    }
                  }}
                  disabled={!quoteData || createProcurementMutation.isPending}
                  data-testid="button-process"
                >
                  {createProcurementMutation.isPending ? (
                    <>Creating Request...</>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Create Procurement Request
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {createProcurementMutation.isError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-2" />
                  <div className="text-sm text-red-600 dark:text-red-400">
                    <p className="font-medium">Error creating procurement request:</p>
                    <p className="mt-1">{createProcurementMutation.error?.message || "Unknown error"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
