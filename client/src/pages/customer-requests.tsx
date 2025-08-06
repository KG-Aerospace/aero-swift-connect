import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, User, Calendar, Clock, Package, UserCheck, CheckCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { DraftOrderCard } from "@/components/draft-order-card";
import { DraftOrderGroupCard } from "@/components/draft-order-group-card";
import { ProcessedEmailsList } from "@/components/processed-emails-list";
import { useState } from "react";

export default function CustomerRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("available");
  const [isReprocessing, setIsReprocessing] = useState(false);

  const { data: drafts, isLoading: isDraftsLoading } = useQuery({
    queryKey: ["/api/draft-orders"],
    refetchInterval: 30000,
  });

  const { data: emails, isLoading: isEmailsLoading } = useQuery({
    queryKey: ["/api/emails"],
    refetchInterval: 30000,
  });

  const { data: myAssignedEmails, isLoading: isAssignedLoading } = useQuery({
    queryKey: ["/api/emails/my-assigned"],
    refetchInterval: 30000,
  });

  const assignEmailMutation = useMutation({
    mutationFn: async (emailId: string) => {
      return apiRequest(`/api/emails/${emailId}/assign`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/my-assigned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/draft-orders"] });
      toast({
        title: "Email assigned",
        description: "The email has been assigned to you",
      });
      // Switch to In Progress tab
      setActiveTab("in-progress");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign email",
        variant: "destructive",
      });
    },
  });

  const reprocessEmails = async () => {
    setIsReprocessing(true);
    try {
      const response = await apiRequest("/api/emails/reprocess-pending", {
        method: "POST",
      });
      toast({
        title: "Reprocessing completed",
        description: response.message || "Emails have been reprocessed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/draft-orders"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reprocess emails",
        variant: "destructive",
      });
    } finally {
      setIsReprocessing(false);
    }
  };

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

  if (isDraftsLoading || isEmailsLoading || isAssignedLoading) {
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

  // Available tab should show all draft orders being worked on by any user
  const allWorkingDrafts = Array.isArray(drafts) ? drafts.filter((draft: any) => 
    draft.email?.assignedToUserId && draft.status === "pending"
  ) : [];
  
  // Group working drafts by email
  const workingDraftsByEmail = allWorkingDrafts.reduce((groups: any, draft: any) => {
    const emailId = draft.emailId;
    if (!groups[emailId]) {
      groups[emailId] = {
        email: draft.email,
        drafts: []
      };
    }
    groups[emailId].drafts.push(draft);
    return groups;
  }, {});

  const availableEmails = Array.isArray(emails) ? emails.filter((email: any) => 
    !email.processed && !email.assignedToUserId
  ) : [];

  // All assigned emails that aren't fully completed should be shown in "In Progress"
  // We don't filter by processed status because emails can have draft orders created 
  // but still need to be worked on by the assigned user
  const myInProgressEmails = Array.isArray(myAssignedEmails) ? myAssignedEmails : [];
  
  // Get draft orders for assigned emails
  const assignedEmailIds = myInProgressEmails.map((email: any) => email.id);
  const assignedDrafts = Array.isArray(drafts) ? drafts.filter((draft: any) => 
    assignedEmailIds.includes(draft.emailId) && draft.status === "pending"
  ) : [];

  const processedEmails = Array.isArray(emails) ? emails.filter((email: any) => 
    email.processed
  ) : [];

  // Only show drafts in "Draft Orders" tab if they are not assigned to any user
  const pendingDrafts = Array.isArray(drafts) ? drafts.filter((draft: any) => 
    draft.status === "pending" && !draft.email?.assignedToUserId
  ) : [];

  const renderEmailCard = (email: any, showAssignButton: boolean = false) => (
    <Card key={email.id} className="hover:shadow-lg transition-shadow overflow-hidden" data-testid={`email-card-${email.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{email.subject}</CardTitle>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1 min-w-0">
                <User className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{email.fromEmail}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span className="whitespace-nowrap">{formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-start gap-2 justify-end">
            <Badge className={`${getStatusColor(email.processed ? "processed" : "pending")} whitespace-nowrap`}>
              {email.processed ? "Processed" : "Pending"}
            </Badge>
            {email.assignedToUserId && (
              <Badge variant="secondary" className="flex items-center gap-1 whitespace-nowrap">
                <UserCheck className="h-3 w-3" />
                {email.assignedToUser?.name || "Assigned"}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {email.content && (
            <div className="text-sm text-gray-600 line-clamp-3">
              {email.content}
            </div>
          )}
          
          {email.assignedAt && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Assigned {format(new Date(email.assignedAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
          )}

          {showAssignButton && !email.assignedToUserId && (
            <Button
              onClick={() => assignEmailMutation.mutate(email.id)}
              disabled={assignEmailMutation.isPending}
              className="w-full"
              data-testid={`button-assign-${email.id}`}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Take to Work
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6" data-testid="customer-requests-main">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Customer Requests</h1>
        <Button
          onClick={reprocessEmails}
          disabled={isReprocessing}
          variant="outline"
        >
          {isReprocessing ? "Reprocessing..." : "Reprocess Pending Emails"}
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="available" data-testid="tab-available">
            <Mail className="h-4 w-4 mr-2" />
            Available ({Object.keys(workingDraftsByEmail).length})
          </TabsTrigger>
          <TabsTrigger value="in-progress" data-testid="tab-in-progress">
            <UserCheck className="h-4 w-4 mr-2" />
            In Progress ({myInProgressEmails.length})
          </TabsTrigger>
          <TabsTrigger value="drafts" data-testid="tab-drafts">
            <Package className="h-4 w-4 mr-2" />
            Draft Orders ({pendingDrafts.length})
          </TabsTrigger>
          <TabsTrigger value="processed" data-testid="tab-processed">
            <CheckCircle className="h-4 w-4 mr-2" />
            Processed ({processedEmails.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <div className="text-lg font-semibold mb-4">
            All Draft Orders Being Worked On
          </div>
          
          {/* Show all draft orders being worked on by any user */}
          {Object.keys(workingDraftsByEmail).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No draft orders are currently being worked on
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(workingDraftsByEmail).map(([emailId, group]: [string, any]) => (
                <div key={emailId} className="space-y-2">
                  {/* Show who is working on this - moved above the card to avoid overlap */}
                  <div className="flex justify-end">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      Working: {group.email?.assignedToUser?.name || "Андрей"}
                    </Badge>
                  </div>
                  
                  {/* Show the draft order group card */}
                  <DraftOrderGroupCard
                    email={group.email}
                    drafts={group.drafts}
                    showTakeToWork={false}
                    isInProgress={false}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          <div className="text-lg font-semibold mb-4">
            My Assigned Emails ({user?.name})
          </div>
          {myInProgressEmails.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No assigned emails
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Show all assigned emails */}
              {myInProgressEmails.map((email: any) => {
                // Get drafts for this email
                const emailDrafts = assignedDrafts.filter((draft: any) => draft.emailId === email.id);
                
                return (
                  <DraftOrderGroupCard
                    key={email.id}
                    email={email}
                    drafts={emailDrafts}
                    showTakeToWork={false}
                    isInProgress={true}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          <div className="text-lg font-semibold mb-4">
            Pending Draft Orders
          </div>
          {pendingDrafts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No pending draft orders
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Group drafts by email */}
              {Object.entries(
                pendingDrafts.reduce((groups: any, draft: any) => {
                  const emailId = draft.emailId;
                  if (!groups[emailId]) {
                    groups[emailId] = {
                      email: draft.email,
                      drafts: []
                    };
                  }
                  groups[emailId].drafts.push(draft);
                  return groups;
                }, {})
              ).map(([emailId, group]: [string, any]) => (
                <DraftOrderGroupCard
                  key={emailId}
                  email={group.email}
                  drafts={group.drafts}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="processed" className="space-y-4">
          <ProcessedEmailsList emails={processedEmails} />
        </TabsContent>
      </Tabs>
    </div>
  );
}