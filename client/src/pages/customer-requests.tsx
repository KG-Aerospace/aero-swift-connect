import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mail, User, Calendar, Clock, Package, UserCheck, CheckCircle, 
  Search, Filter, ChevronDown, ChevronUp, FileText, ArrowUpDown,
  Eye, Edit, Trash2, Plus, RefreshCw, UserPlus, Send, X, Check,
  ChevronRight, ArrowUp, ArrowDown, Users, Inbox, FileCheck
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DraftOrderCard } from "@/components/draft-order-card";
import { DraftOrderGroupCard } from "@/components/draft-order-group-card";

interface EmailWithDrafts {
  email: any;
  drafts: any[];
  totalItems: number;
  completedItems: number;
}

export default function CustomerRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("available");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "cr" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "processed">("all");
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

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "processed":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  if (isDraftsLoading || isEmailsLoading || isAssignedLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Process data
  const allWorkingDrafts = Array.isArray(drafts) ? drafts.filter((draft: any) => 
    draft.email?.assignedToUserId && draft.status === "pending"
  ) : [];

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

  const myInProgressEmails = Array.isArray(myAssignedEmails) ? myAssignedEmails : [];
  const assignedEmailIds = myInProgressEmails.map((email: any) => email.id);
  const assignedDrafts = Array.isArray(drafts) ? drafts.filter((draft: any) => 
    assignedEmailIds.includes(draft.emailId) && draft.status === "pending"
  ) : [];

  const processedEmails = Array.isArray(emails) ? emails.filter((email: any) => 
    email.processed
  ) : [];

  const pendingDrafts = Array.isArray(drafts) ? drafts.filter((draft: any) => 
    draft.status === "pending" && !draft.email?.assignedToUserId
  ) : [];

  // Group and filter data for current tab
  const getTabData = () => {
    let data: EmailWithDrafts[] = [];
    
    switch (activeTab) {
      case "available":
        data = Object.entries(workingDraftsByEmail).map(([emailId, group]: [string, any]) => ({
          email: group.email,
          drafts: group.drafts,
          totalItems: group.drafts.length,
          completedItems: group.drafts.filter((d: any) => d.orders?.length > 0).length
        }));
        break;
      
      case "in-progress":
        data = myInProgressEmails.map((email: any) => {
          const emailDrafts = assignedDrafts.filter((draft: any) => draft.emailId === email.id);
          return {
            email,
            drafts: emailDrafts,
            totalItems: emailDrafts.length,
            completedItems: emailDrafts.filter((d: any) => d.orders?.length > 0).length
          };
        });
        break;
      
      case "drafts":
        const draftGroups = pendingDrafts.reduce((groups: any, draft: any) => {
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
        
        data = Object.entries(draftGroups).map(([emailId, group]: [string, any]) => ({
          email: group.email,
          drafts: group.drafts,
          totalItems: group.drafts.length,
          completedItems: group.drafts.filter((d: any) => d.orders?.length > 0).length
        }));
        break;
      
      case "processed":
        data = processedEmails.map((email: any) => ({
          email,
          drafts: [],
          totalItems: 0,
          completedItems: 0
        }));
        break;
    }

    // Apply search filter
    if (searchQuery) {
      data = data.filter(item => {
        const searchLower = searchQuery.toLowerCase();
        return (
          item.email?.subject?.toLowerCase().includes(searchLower) ||
          item.email?.fromEmail?.toLowerCase().includes(searchLower) ||
          item.email?.content?.toLowerCase().includes(searchLower) ||
          item.drafts?.some(d => d.crNumber?.toLowerCase().includes(searchLower)) ||
          item.drafts?.some((draft: any) => 
            draft.partNumber?.toLowerCase().includes(searchLower) ||
            draft.description?.toLowerCase().includes(searchLower) ||
            draft.quantity?.toString().includes(searchLower)
          )
        );
      });
    }

    // Apply status filter
    if (filterStatus !== "all") {
      data = data.filter(item => {
        const isProcessed = item.email?.processed;
        return filterStatus === "processed" ? isProcessed : !isProcessed;
      });
    }

    // Apply sorting
    data.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "date":
          comparison = new Date(a.email?.receivedAt || 0).getTime() - 
                      new Date(b.email?.receivedAt || 0).getTime();
          break;
        case "cr":
          comparison = (a.drafts?.[0]?.crNumber || "").localeCompare(b.drafts?.[0]?.crNumber || "");
          break;
        case "status":
          comparison = (a.email?.processed ? 1 : 0) - (b.email?.processed ? 1 : 0);
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return data;
  };

  const filteredData = getTabData();

  const renderTableRow = (item: EmailWithDrafts, index: number) => {
    const isExpanded = expandedRows.has(item.email?.id || index.toString());
    const hasDetails = item.drafts && item.drafts.length > 0;
    
    return (
      <div key={item.email?.id || index} className="border-b border-gray-200 dark:border-gray-700">
        <div className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <div className="flex items-center p-3 gap-2">
            {/* Expand button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => toggleRow(item.email?.id || index.toString())}
              disabled={!hasDetails}
            >
              {hasDetails && (
                isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            {/* CR Number */}
            <div className="w-24 flex-shrink-0">
              <span className="text-xs font-mono font-semibold">
                {item.drafts?.[0]?.crNumber || "-"}
              </span>
            </div>

            {/* Subject */}
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium">
                {item.email?.subject || "No subject"}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {item.email?.fromEmail}
              </div>
            </div>

            {/* Date */}
            <div className="w-32 text-xs text-gray-500 dark:text-gray-400">
              {item.email?.receivedAt && format(new Date(item.email.receivedAt), "MMM d, HH:mm")}
            </div>

            {/* Status */}
            <div className="w-20">
              <Badge className={cn("text-xs", getStatusColor(item.email?.processed ? "processed" : "pending"))}>
                {item.email?.processed ? "✓" : "○"}
              </Badge>
            </div>

            {/* Assigned to */}
            {item.email?.assignedToUserId && (
              <div className="w-24">
                <Badge variant="secondary" className="text-xs">
                  <UserCheck className="h-3 w-3" />
                </Badge>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1">
              <TooltipProvider>
                {activeTab === "available" && !item.email?.assignedToUserId && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => assignEmailMutation.mutate(item.email.id)}
                        disabled={assignEmailMutation.isPending}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Take to Work</TooltipContent>
                  </Tooltip>
                )}
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {/* View details */}}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View Details</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Line items preview - always visible */}
          {hasDetails && (
            <div className="px-3 pb-2">
              <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-2 space-y-1">
                {item.drafts.slice(0, isExpanded ? undefined : 3).map((draft: any, idx: number) => (
                  <div key={draft.id} className="flex items-center gap-3 text-xs">
                    <div className="w-6 text-gray-400 text-right">{idx + 1}.</div>
                    <div className="w-32 font-mono font-medium">{draft.partNumber || "-"}</div>
                    <div className="flex-1 truncate text-gray-600 dark:text-gray-400">
                      {draft.partDescription || "-"}
                    </div>
                    <div className="w-16 text-center">
                      <Badge variant="outline" className="text-xs px-1">
                        {draft.quantity || 0}
                      </Badge>
                    </div>
                    <div className="w-20 text-gray-500">
                      {typeof draft.acType === 'object' ? 
                        (draft.acType?.type || draft.acType?.name || "-") : 
                        (draft.acType || "-")
                      }
                    </div>
                    <div className="w-24 text-right font-medium">
                      {draft.unitPrice ? 
                        <span className="text-green-600 dark:text-green-400">~${draft.unitPrice} USD</span> : 
                        (draft.estimatedPrice ? `~$${draft.estimatedPrice.toFixed(2)}` : "-")
                      }
                    </div>
                  </div>
                ))}
                {!isExpanded && item.drafts.length > 3 && (
                  <div className="text-xs text-gray-500 pl-9">
                    ... and {item.drafts.length - 3} more items
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Expanded content */}
        {isExpanded && hasDetails && (
          <div className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
            <div className="p-4">
              <DraftOrderGroupCard
                email={item.email}
                drafts={item.drafts}
                showTakeToWork={false}
                isInProgress={activeTab === "in-progress"}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4" data-testid="customer-requests-main">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Customer Requests</h1>
        
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search all fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-64"
            />
          </div>

          {/* Status filter */}
          <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort controls */}
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="cr">Sort by CR#</SelectItem>
              <SelectItem value="status">Sort by Status</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="h-9 w-9 p-0"
          >
            {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </Button>

          {/* Reprocess button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={reprocessEmails}
                  disabled={isReprocessing}
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                >
                  <RefreshCw className={cn("h-4 w-4", isReprocessing && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reprocess Pending Emails</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="available" className="flex items-center gap-1">
            <Inbox className="h-4 w-4" />
            <span className="hidden sm:inline">Available</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1">
              {Object.keys(workingDraftsByEmail).length}
            </Badge>
          </TabsTrigger>
          
          <TabsTrigger value="in-progress" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">In Progress</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1">
              {myInProgressEmails.length}
            </Badge>
          </TabsTrigger>
          
          <TabsTrigger value="drafts" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Drafts</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1">
              {pendingDrafts.length}
            </Badge>
          </TabsTrigger>
          
          <TabsTrigger value="processed" className="flex items-center gap-1">
            <FileCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Processed</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1">
              {processedEmails.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab content */}
        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {filteredData.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchQuery ? "No results found" : "No items to display"}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {/* Table header */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <div className="w-6"></div>
                    <div className="w-24">CR#</div>
                    <div className="flex-1">Subject / From</div>
                    <div className="w-32">Date</div>
                    <div className="w-20 text-center">Status</div>
                    {(activeTab === "available" || activeTab === "in-progress") && (
                      <div className="w-24 text-center">Assigned</div>
                    )}
                    <div className="w-20">Actions</div>
                  </div>

                  {/* Table rows */}
                  {filteredData.map((item, index) => renderTableRow(item, index))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}