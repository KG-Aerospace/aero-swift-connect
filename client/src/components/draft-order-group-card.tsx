import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Edit2, Save, Package, User, Calendar, Mail, Clock, Eye, ChevronDown, ChevronUp, Hash } from "lucide-react";
import type { DraftOrder } from "@/../../shared/schema";
import { formatDistanceToNow, format } from "date-fns";

interface DraftOrderGroupCardProps {
  email: {
    id: string;
    subject: string;
    fromEmail: string;
    receivedAt?: string;
  };
  drafts: (DraftOrder & {
    customer?: { name: string; company: string | null } | null;
  })[];
}

export function DraftOrderGroupCard({ email, drafts }: DraftOrderGroupCardProps) {
  const [showEmailContent, setShowEmailContent] = useState(false);
  const [editingDrafts, setEditingDrafts] = useState<Record<string, any>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch email details when needed
  const { data: emailData, isLoading: isEmailLoading } = useQuery<{
    id: string;
    fromEmail: string;
    subject: string;
    body: string;
    bodyHtml?: string;
    receivedAt: string;
    status: string;
  }>({
    queryKey: ["/api/emails", email.id],
    enabled: !!email.id && showEmailContent,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/draft-orders/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft-orders"] });
      toast({
        title: "Draft updated",
        description: "The draft order has been updated successfully.",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest("POST", `/api/draft-orders/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order approved",
        description: "The order has been approved and moved to orders.",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => 
      apiRequest("POST", `/api/draft-orders/${id}/reject`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft-orders"] });
      toast({
        title: "Draft rejected",
        description: "The draft order has been rejected.",
      });
    },
  });

  const toggleEdit = (draftId: string, draft: DraftOrder) => {
    if (editingDrafts[draftId]) {
      delete editingDrafts[draftId];
      setEditingDrafts({ ...editingDrafts });
    } else {
      setEditingDrafts({
        ...editingDrafts,
        [draftId]: {
          partNumber: draft.partNumber,
          partDescription: draft.partDescription || "",
          quantity: draft.quantity,
          uom: draft.uom || "EA",
          cheapExp: draft.cheapExp || "CHEAP",
          acType: draft.acType || "",
          engineType: draft.engineType || "",
          urgencyLevel: draft.urgencyLevel,
          condition: draft.condition || "NE",
          notes: draft.notes || "",
          comment: draft.comment || "",
        }
      });
    }
  };

  const handleSave = (draftId: string) => {
    const data = editingDrafts[draftId];
    updateMutation.mutate({ id: draftId, data });
    delete editingDrafts[draftId];
    setEditingDrafts({ ...editingDrafts });
  };

  const handleApprove = (draftId: string) => {
    approveMutation.mutate(draftId);
  };

  const handleReject = (draftId: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (reason) {
      rejectMutation.mutate({ id: draftId, notes: reason });
    }
  };

  const customer = drafts[0]?.customer;

  return (
    <Card className="border border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">{email.subject}</CardTitle>
          </div>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            {drafts.length} part{drafts.length > 1 ? 's' : ''}
          </Badge>
        </div>
        
        <div className="space-y-2">
          {customer && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <User className="h-4 w-4" />
              <span>{customer.name}</span>
              {customer.company && <span>({customer.company})</span>}
            </div>
          )}
          
          {/* Timestamps */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              <span>From: {email.fromEmail}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Received: {email.receivedAt ? formatDistanceToNow(new Date(email.receivedAt)) : 'Unknown'} ago</span>
            </div>
          </div>
          
          {/* Email view button */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              View original email content to verify part information
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEmailContent(!showEmailContent)}
              className="ml-3 flex-shrink-0"
            >
              <Eye className="h-4 w-4 mr-1" />
              {showEmailContent ? (
                <>
                  Hide <ChevronUp className="h-3 w-3 ml-1" />
                </>
              ) : (
                <>
                  View <ChevronDown className="h-3 w-3 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Email content display */}
        {showEmailContent && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
            {isEmailLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : emailData ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Original Email</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div><strong>From:</strong> {emailData.fromEmail || 'Unknown'}</div>
                    <div><strong>Subject:</strong> {emailData.subject || 'Unknown'}</div>
                    <div><strong>Received:</strong> {emailData.receivedAt ? format(new Date(emailData.receivedAt), 'PPpp') : 'Unknown'}</div>
                    <div><strong>Status:</strong> {emailData.status || 'Unknown'}</div>
                  </div>
                  {(emailData.body || emailData.bodyHtml) && (
                    <div className="mt-3">
                      <strong>Content:</strong>
                      <div className="mt-1 p-3 bg-white dark:bg-gray-900 rounded border max-h-64 overflow-y-auto">
                        {emailData.bodyHtml && !emailData.body ? (
                          <div 
                            className="prose prose-sm max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: emailData.bodyHtml }}
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap text-xs font-mono text-gray-800 dark:text-gray-200">
                            {emailData.body}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">
                Failed to load email content
              </div>
            )}
          </div>
        )}

        {/* Parts list */}
        <div className="space-y-4">
          {drafts.map((draft) => {
            const isEditing = !!editingDrafts[draft.id];
            const editData = editingDrafts[draft.id];

            return (
              <div key={draft.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Position {draft.requisitionNumber}</span>
                    <Badge variant="outline" className="text-xs">
                      {draft.crNumber || draft.id}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button size="sm" onClick={() => handleSave(draft.id)} disabled={updateMutation.isPending}>
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => toggleEdit(draft.id, draft)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => toggleEdit(draft.id, draft)}>
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" onClick={() => handleApprove(draft.id)} disabled={approveMutation.isPending}>
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(draft.id)} disabled={rejectMutation.isPending}>
                          <X className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <Label className="text-xs">Part Number</Label>
                      <Input
                        value={editData.partNumber}
                        onChange={(e) => setEditingDrafts({
                          ...editingDrafts,
                          [draft.id]: { ...editData, partNumber: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={editData.partDescription}
                        onChange={(e) => setEditingDrafts({
                          ...editingDrafts,
                          [draft.id]: { ...editData, partDescription: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        value={editData.quantity}
                        onChange={(e) => setEditingDrafts({
                          ...editingDrafts,
                          [draft.id]: { ...editData, quantity: parseInt(e.target.value) || 1 }
                        })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">UOM</Label>
                      <Select value={editData.uom} onValueChange={(value) => setEditingDrafts({
                        ...editingDrafts,
                        [draft.id]: { ...editData, uom: value }
                      })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EA">EA</SelectItem>
                          <SelectItem value="SET">SET</SelectItem>
                          <SelectItem value="KIT">KIT</SelectItem>
                          <SelectItem value="PC">PC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><strong>Part Number:</strong> {draft.partNumber}</div>
                    <div><strong>Description:</strong> {draft.partDescription || "—"}</div>
                    <div><strong>Quantity:</strong> {draft.quantity} {draft.uom || "EA"}</div>
                    <div><strong>Condition:</strong> {draft.condition || "NE"}</div>
                    <div><strong>Customer Reference:</strong> {draft.customerReference || "—"}</div>
                    <div><strong>Customer Request Date:</strong> {draft.customerRequestDate ? new Date(draft.customerRequestDate).toLocaleDateString() : "—"}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}