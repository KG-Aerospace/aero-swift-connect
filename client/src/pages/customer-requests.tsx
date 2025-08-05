import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, User, Calendar, Clock, Package, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { DraftOrderCard } from "@/components/draft-order-card";

export default function CustomerRequests() {
  const { data: drafts, isLoading: isDraftsLoading } = useQuery({
    queryKey: ["/api/draft-orders"],
    refetchInterval: 30000,
  });

  const { data: emails, isLoading: isEmailsLoading } = useQuery({
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

  if (isDraftsLoading || isEmailsLoading) {
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

  const pendingDrafts = drafts?.filter((draft: any) => draft.status === "pending") || [];
  const pendingEmails = emails?.filter((email: any) => 
    email.status === "pending" && !drafts?.some((draft: any) => draft.emailId === email.id)
  ) || [];

  return (
    <div className="space-y-6" data-testid="customer-requests-main">
      {pendingDrafts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-gray-500" />
            <h2 className="text-xl font-semibold">Draft Orders ({pendingDrafts.length})</h2>
          </div>
          <div className="space-y-4">
            {pendingDrafts.map((draft: any) => (
              <DraftOrderCard key={draft.id} draft={draft} />
            ))}
          </div>
        </div>
      )}

      {pendingEmails.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-gray-500" />
            <h2 className="text-xl font-semibold">Unparsed Emails ({pendingEmails.length})</h2>
          </div>
          <div className="space-y-4">
            {pendingEmails.map((email: any) => (
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
                    
                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-2">
                      <Link href={`/email/${email.id}`}>
                        <Button size="sm" variant="outline">
                          <Mail className="w-4 h-4 mr-2" />
                          View Full Email
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {pendingDrafts.length === 0 && pendingEmails.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No pending requests</p>
          </CardContent>
        </Card>
      )}
      
      {(!(emails as any[]) || (emails as any[]).length === 0) && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="p-12 text-center">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No customer requests</h3>
            <p className="text-gray-500 dark:text-gray-400">Customer email requests will appear here when received.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
