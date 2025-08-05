import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { PartAutocomplete } from "./part-autocomplete";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Edit2, Save, Package, User, Calendar, Mail, Clock, Eye, ChevronDown, ChevronUp, Hash, Plus, Sparkles, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { DraftOrder, AcType, EngineType } from "@/../../shared/schema";
import { formatDistanceToNow, format } from "date-fns";

interface DraftOrderGroupCardProps {
  email: {
    id: string;
    subject: string;
    fromEmail: string;
    receivedAt?: string;
    assignedToUserId?: string | null;
  };
  drafts: (DraftOrder & {
    customer?: { name: string; company: string | null } | null;
  })[];
}

export function DraftOrderGroupCard({ email, drafts }: DraftOrderGroupCardProps) {
  const [showEmailContent, setShowEmailContent] = useState(false);
  const [editingDrafts, setEditingDrafts] = useState<Record<string, any>>({});
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState<Record<string, boolean>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [newItemData, setNewItemData] = useState({
    partNumber: "",
    partDescription: "",
    quantity: 1,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch AC types and engine types for autocomplete
  const { data: acTypes = [] } = useQuery<AcType[]>({
    queryKey: ["/api/ac-types"],
  });

  const { data: engineTypes = [] } = useQuery<EngineType[]>({
    queryKey: ["/api/engine-types"],
  });

  // Fetch email details when needed
  const { data: emailData, isLoading: isEmailLoading, error: emailError } = useQuery<{
    id: string;
    fromEmail: string;
    subject: string;
    body?: string;
    bodyHtml?: string;
    content?: string;
    htmlContent?: string;
    receivedAt: string;
    status?: string;
    processed?: boolean;
  }>({
    queryKey: ["/api/emails", email.id],
    enabled: !!email.id && showEmailContent,
    retry: 1,
  });

  // Debug logging
  React.useEffect(() => {
    console.log('Email prop data:', email);
    if (showEmailContent) {
      console.log('Email viewing requested:', { emailId: email.id, enabled: !!email.id && showEmailContent });
    }
    if (emailError) {
      console.error('Email fetch error:', emailError);
    }
    if (emailData) {
      console.log('Email data received:', { hasBody: !!emailData.body, hasHtml: !!emailData.bodyHtml });
    }
  }, [showEmailContent, emailError, emailData, email]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/draft-orders/${id}`, { method: "PATCH", body: data }),
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
      apiRequest(`/api/draft-orders/${id}/approve`, { method: "POST" }),
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
      apiRequest(`/api/draft-orders/${id}/reject`, { method: "POST", body: { notes } }),
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
    setRejectionDialogOpen({ ...rejectionDialogOpen, [draftId]: true });
  };

  const confirmReject = (draftId: string) => {
    const reason = rejectionReasons[draftId];
    if (reason && reason.trim()) {
      rejectMutation.mutate({ id: draftId, notes: reason });
      setRejectionDialogOpen({ ...rejectionDialogOpen, [draftId]: false });
      setRejectionReasons({ ...rejectionReasons, [draftId]: "" });
    }
  };

  const addItemMutation = useMutation({
    mutationFn: async (data: { 
      emailId: string; 
      crNumber: string; 
      partNumber: string; 
      partDescription: string; 
      quantity: number;
    }) => {
      return await apiRequest("/api/draft-orders/add-item", { method: "POST", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft-orders"] });
      toast({
        title: "Item added",
        description: "New item has been added to the draft order",
      });
      setShowAddItemDialog(false);
      setNewItemData({ partNumber: "", partDescription: "", quantity: 1 });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item to draft order",
        variant: "destructive",
      });
    },
  });

  const handleAddItem = () => {
    if (!newItemData.partNumber || newItemData.quantity < 1) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid part number and quantity",
        variant: "destructive",
      });
      return;
    }

    // Get the CR Number from the first draft
    const crNumber = drafts[0]?.crNumber || "";
    
    addItemMutation.mutate({
      emailId: email.id,
      crNumber,
      partNumber: newItemData.partNumber,
      partDescription: newItemData.partDescription,
      quantity: newItemData.quantity,
    });
  };

  // AI Analysis mutation
  const aiAnalysisMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/draft-orders/analyze-ai", { 
        method: "POST", 
        body: {
          emailId: email.id,
          crNumber: drafts[0]?.crNumber || ""
        }
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft-orders"] });
      
      if (data.error && data.error.includes("DEEPSEEK_API_KEY")) {
        toast({
          title: "AI Configuration Required",
          description: "Please contact support to enable AI analysis functionality.",
          variant: "destructive",
        });
      } else if (data.extractedParts && data.extractedParts.length === 0) {
        toast({
          title: "No Parts Found",
          description: "AI analysis did not find any parts in this email.",
        });
      } else {
        toast({
          title: "AI Analysis Complete",
          description: data.message || `Found ${data.extractedParts?.length || 0} parts`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze email with AI",
        variant: "destructive",
      });
    },
  });

  const handleAIAnalysis = () => {
    aiAnalysisMutation.mutate();
  };

  // Email assignment mutation
  const assignEmailMutation = useMutation({
    mutationFn: async (emailId: string) => {
      return apiRequest(`/api/emails/${emailId}/assign`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/my-assigned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/draft-orders"] });
      toast({
        title: "Email assigned",
        description: "The email has been assigned to you",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign email",
        variant: "destructive",
      });
    },
  });

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
          
          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3">
            {/* Take to Work button */}
            {!email.assignedToUserId && (
              <Button
                onClick={() => assignEmailMutation.mutate(email.id)}
                disabled={assignEmailMutation.isPending}
                className="flex-1"
                data-testid={`button-assign-${email.id}`}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Take to Work
              </Button>
            )}
            
            {/* Email view button */}
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex-1">
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
                    <div><strong>Status:</strong> {emailData.processed ? 'Processed' : 'Pending'}</div>
                  </div>
                  {(emailData.body || emailData.bodyHtml || emailData.content || emailData.htmlContent) && (
                    <div className="mt-3">
                      <strong>Content:</strong>
                      <div className="mt-1 p-3 bg-white dark:bg-gray-900 rounded border max-h-64 overflow-y-auto">
                        {(emailData.bodyHtml || emailData.htmlContent) && !(emailData.body || emailData.content) ? (
                          <div 
                            className="prose prose-sm max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: emailData.bodyHtml || emailData.htmlContent || '' }}
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap text-xs font-mono text-gray-800 dark:text-gray-200">
                            {emailData.body || emailData.content || 'No content available'}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <div>Failed to load email content</div>
                {emailError && (
                  <div className="text-xs mt-2 text-red-500">
                    Error: {emailError.message}
                  </div>
                )}
                <div className="text-xs mt-1">
                  Email ID: {email.id}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Item and AI Analysis Buttons */}
        <div className="flex justify-between mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAIAnalysis}
            disabled={aiAnalysisMutation.isPending}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {aiAnalysisMutation.isPending ? "Analyzing..." : "Analyze with AI"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddItemDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>

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
                      {draft.crNumber}
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
                        
                        <Dialog open={rejectionDialogOpen[draft.id] || false} onOpenChange={(open) => {
                          setRejectionDialogOpen({ ...rejectionDialogOpen, [draft.id]: open });
                          if (!open) {
                            setRejectionReasons({ ...rejectionReasons, [draft.id]: "" });
                          }
                        }}>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Draft Order</DialogTitle>
                              <DialogDescription>
                                Please provide a reason for rejecting this draft order.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Textarea
                                placeholder="Enter rejection reason..."
                                value={rejectionReasons[draft.id] || ""}
                                onChange={(e) => setRejectionReasons({ ...rejectionReasons, [draft.id]: e.target.value })}
                                className="min-h-[100px]"
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setRejectionDialogOpen({ ...rejectionDialogOpen, [draft.id]: false })}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  onClick={() => confirmReject(draft.id)}
                                  disabled={!rejectionReasons[draft.id]?.trim()}
                                >
                                  Confirm Rejection
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <PartAutocomplete
                      partNumber={editData.partNumber}
                      description={editData.partDescription || ""}
                      onPartNumberChange={(value) => setEditingDrafts({
                        ...editingDrafts,
                        [draft.id]: { ...editData, partNumber: value }
                      })}
                      onDescriptionChange={(value) => setEditingDrafts({
                        ...editingDrafts,
                        [draft.id]: { ...editData, partDescription: value }
                      })}
                      className="md:col-span-2"
                    />
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
                    <div className="space-y-1">
                      <Label className="text-xs">AC Type</Label>
                      <AutocompleteInput
                        key={`ac-type-${draft.id}`}
                        value={editData.acType || ""}
                        suggestions={acTypes.map(t => t.type)}
                        onValueChange={(value) => setEditingDrafts({
                          ...editingDrafts,
                          [draft.id]: { ...editData, acType: value }
                        })}
                        placeholder="e.g., B737, A320"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Engine Type</Label>
                      <AutocompleteInput
                        key={`engine-type-${draft.id}`}
                        value={editData.engineType || ""}
                        suggestions={engineTypes.map(t => t.type)}
                        onValueChange={(value) => setEditingDrafts({
                          ...editingDrafts,
                          [draft.id]: { ...editData, engineType: value }
                        })}
                        placeholder="e.g., CFM56, V2500"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Comment</Label>
                      <Textarea
                        value={editData.comment || ""}
                        onChange={(e) => setEditingDrafts({
                          ...editingDrafts,
                          [draft.id]: { ...editData, comment: e.target.value }
                        })}
                        placeholder="Additional comments..."
                        className="min-h-[60px]"
                      />
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
                    <div><strong>AC Type:</strong> {draft.acType || "—"}</div>
                    <div><strong>Engine Type:</strong> {draft.engineType || "—"}</div>
                    {draft.comment && (
                      <div className="md:col-span-2"><strong>Comment:</strong> {draft.comment}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Item Dialog */}
        <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Item</DialogTitle>
              <DialogDescription>
                Add a new item to this draft order (CR Number: {drafts[0]?.crNumber})
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <PartAutocomplete
                partNumber={newItemData.partNumber}
                description={newItemData.partDescription}
                onPartNumberChange={(value) => setNewItemData({ 
                  ...newItemData, 
                  partNumber: value 
                })}
                onDescriptionChange={(value) => setNewItemData({ 
                  ...newItemData, 
                  partDescription: value 
                })}
              />
              
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={newItemData.quantity}
                  onChange={(e) => setNewItemData({ 
                    ...newItemData, 
                    quantity: parseInt(e.target.value) || 1 
                  })}
                />
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddItemDialog(false);
                  setNewItemData({ partNumber: "", partDescription: "", quantity: 1 });
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddItem}
                disabled={!newItemData.partNumber || newItemData.quantity < 1}
              >
                Add Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}