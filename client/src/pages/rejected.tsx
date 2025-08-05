import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { X, User, Mail, Calendar, Clock, FileText } from "lucide-react";

export default function RejectedPage() {
  const { data: rejectedDrafts = [], isLoading } = useQuery({
    queryKey: ["/api/draft-orders/rejected"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading rejected orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Rejected Orders</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View all rejected draft orders with rejection reasons
        </p>
      </div>

      {rejectedDrafts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <X className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No rejected orders found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rejectedDrafts.map((draft: any) => (
            <Card key={draft.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive">
                      <X className="h-3 w-3 mr-1" />
                      Rejected
                    </Badge>
                    <CardTitle className="text-lg">{draft.partNumber}</CardTitle>
                  </div>
                  <div className="text-sm text-gray-500">
                    {draft.positionId || draft.crNumber || draft.id}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Part Description</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {draft.partDescription || "No description"}
                        </p>
                      </div>
                    </div>
                    
                    {draft.customer && (
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Customer</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {draft.customer.name}
                            {draft.customer.company && ` (${draft.customer.company})`}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {draft.email && (
                      <div className="flex items-start gap-2">
                        <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Email Subject</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {draft.email.subject}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Rejected At</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {draft.reviewedAt ? new Date(draft.reviewedAt).toLocaleString() : "Unknown"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Time Ago</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {draft.reviewedAt ? formatDistanceToNow(new Date(draft.reviewedAt), { addSuffix: true }) : "Unknown"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex items-start gap-2">
                    <X className="h-4 w-4 text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">Rejection Reason</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {draft.notes || draft.rejectionReason || "No reason provided"}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t pt-4">
                  <div>
                    <p className="text-gray-500">Quantity</p>
                    <p className="font-medium">{draft.quantity} {draft.uom || "EA"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Condition</p>
                    <p className="font-medium">{draft.condition || "NE"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Urgency</p>
                    <p className="font-medium capitalize">{draft.urgencyLevel || "normal"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <Badge variant="destructive" className="mt-1">Rejected</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}