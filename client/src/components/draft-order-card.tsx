import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Edit2, Save, Package, User, Calendar, Mail, Clock, Eye, ChevronDown, ChevronUp } from "lucide-react";
import type { DraftOrder } from "@/../../shared/schema";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";

interface DraftOrderCardProps {
  draft: DraftOrder & {
    customer?: { name: string; company: string | null } | null;
    email?: { subject: string; fromEmail: string; receivedAt?: string } | null;
  };
}

export function DraftOrderCard({ draft }: DraftOrderCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showEmailContent, setShowEmailContent] = useState(false);
  const [editData, setEditData] = useState({
    customerReference: draft.customerReference || "",
    crNumber: draft.crNumber || "",
    requisitionNumber: draft.requisitionNumber || "",
    customerRequestDate: draft.customerRequestDate ? new Date(draft.customerRequestDate).toISOString().split('T')[0] : "",
    inputDate: draft.inputDate ? new Date(draft.inputDate).toISOString().split('T')[0] : "",
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
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch email details when needed
  const { data: emailData } = useQuery({
    queryKey: ["/api/emails", draft.emailId],
    enabled: !!draft.emailId && showEmailContent,
  }) as { data: any };

  const updateMutation = useMutation({
    mutationFn: (data: typeof editData) => 
      apiRequest(`/api/draft-orders/${draft.id}`, { method: "PATCH", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft-orders"] });
      setIsEditing(false);
      toast({
        title: "Draft updated",
        description: "The draft order has been updated successfully.",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => 
      apiRequest(`/api/draft-orders/${draft.id}/approve`, { method: "POST" }),
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
    mutationFn: (notes: string) => 
      apiRequest(`/api/draft-orders/${draft.id}/reject`, { method: "POST", body: { notes } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft-orders"] });
      toast({
        title: "Draft rejected",
        description: "The draft order has been rejected.",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(editData);
  };

  const handleApprove = () => {
    approveMutation.mutate();
  };

  const handleReject = () => {
    const reason = prompt("Please provide a reason for rejection:");
    if (reason) {
      rejectMutation.mutate(reason);
    }
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">
              {isEditing ? (
                <Input
                  value={editData.partNumber}
                  onChange={(e) => setEditData({ ...editData, partNumber: e.target.value })}
                  className="text-lg font-semibold"
                />
              ) : (
                draft.partNumber
              )}
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            {draft.status}
          </Badge>
        </div>
        
        <div className="space-y-2">
          {draft.customer && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <User className="h-4 w-4" />
              <span>{draft.customer.name}</span>
              {draft.customer.company && <span>({draft.customer.company})</span>}
            </div>
          )}
          
          {/* Timestamps */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            {draft.email && (
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                <span>Email: {draft.email.receivedAt ? formatDistanceToNow(new Date(draft.email.receivedAt)) : 'Unknown'} ago</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Draft: {formatDistanceToNow(new Date(draft.createdAt))} ago</span>
            </div>
          </div>
          
          {/* Email subject and view button */}
          {draft.email && (
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {draft.email.subject}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  From: {draft.email.fromEmail}
                </div>
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
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerReference">Customer Reference</Label>
              <Input
                id="customerReference"
                value={editData.customerReference}
                onChange={(e) => setEditData({ ...editData, customerReference: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="crNumber">CR Number</Label>
              <Input
                id="crNumber"
                value={editData.crNumber}
                onChange={(e) => setEditData({ ...editData, crNumber: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="requisitionNumber">Requisition Number</Label>
              <Input
                id="requisitionNumber"
                value={editData.requisitionNumber}
                onChange={(e) => setEditData({ ...editData, requisitionNumber: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customerRequestDate">Customer Request Date</Label>
              <Input
                id="customerRequestDate"
                type="date"
                value={editData.customerRequestDate}
                onChange={(e) => setEditData({ ...editData, customerRequestDate: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="inputDate">Input Date</Label>
              <Input
                id="inputDate"
                type="date"
                value={editData.inputDate}
                onChange={(e) => setEditData({ ...editData, inputDate: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={editData.partDescription}
                onChange={(e) => setEditData({ ...editData, partDescription: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={editData.quantity}
                onChange={(e) => setEditData({ ...editData, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="uom">UOM</Label>
              <Select value={editData.uom} onValueChange={(value) => setEditData({ ...editData, uom: value })}>
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
            
            <div className="space-y-2">
              <Label htmlFor="cheapExp">CHEAP/EXP</Label>
              <Select value={editData.cheapExp} onValueChange={(value) => setEditData({ ...editData, cheapExp: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHEAP">CHEAP</SelectItem>
                  <SelectItem value="EXP">EXP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="acType">AC Type</Label>
              <Input
                id="acType"
                value={editData.acType}
                onChange={(e) => setEditData({ ...editData, acType: e.target.value })}
                placeholder="e.g., B737-800"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="engineType">Engine Type</Label>
              <Input
                id="engineType"
                value={editData.engineType}
                onChange={(e) => setEditData({ ...editData, engineType: e.target.value })}
                placeholder="e.g., CFM56"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select value={editData.condition} onValueChange={(value) => setEditData({ ...editData, condition: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NE">NE (New)</SelectItem>
                  <SelectItem value="NS">NS (New Surplus)</SelectItem>
                  <SelectItem value="OH">OH (Overhauled)</SelectItem>
                  <SelectItem value="SV">SV (Serviceable)</SelectItem>
                  <SelectItem value="AR">AR (As Removed)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                value={editData.comment}
                onChange={(e) => setEditData({ ...editData, comment: e.target.value })}
                rows={2}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><strong>Customer Reference:</strong> {draft.customerReference || "—"}</div>
            <div><strong>CR Number:</strong> {draft.crNumber || "—"}</div>
            <div><strong>Requisition Number:</strong> {draft.requisitionNumber || "—"}</div>
            <div><strong>Customer Request Date:</strong> {draft.customerRequestDate ? new Date(draft.customerRequestDate).toLocaleDateString() : "—"}</div>
            <div><strong>Input Date:</strong> {draft.inputDate ? new Date(draft.inputDate).toLocaleDateString() : "—"}</div>
            <div><strong>Description:</strong> {draft.partDescription || "—"}</div>
            <div><strong>Quantity:</strong> {draft.quantity}</div>
            <div><strong>UOM:</strong> {draft.uom || "EA"}</div>
            <div><strong>CHEAP/EXP:</strong> {draft.cheapExp || "CHEAP"}</div>
            <div><strong>AC Type:</strong> {draft.acType || "—"}</div>
            <div><strong>Engine Type:</strong> {draft.engineType || "—"}</div>
            <div><strong>Condition:</strong> {draft.condition || "NE"}</div>
            {draft.comment && (
              <div className="md:col-span-2"><strong>Comment:</strong> {draft.comment}</div>
            )}
          </div>
        )}

        {/* Email content display */}
        {showEmailContent && emailData && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="h-4 w-4 text-blue-500" />
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Original Email</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div><strong>From:</strong> {emailData?.fromEmail || 'Unknown'}</div>
                <div><strong>Subject:</strong> {emailData?.subject || 'Unknown'}</div>
                <div><strong>Received:</strong> {emailData?.receivedAt ? format(new Date(emailData.receivedAt), 'PPpp') : 'Unknown'}</div>
                <div><strong>Status:</strong> {emailData?.status || 'Unknown'}</div>
              </div>
              {emailData?.body && (
                <div className="mt-3">
                  <strong>Content:</strong>
                  <div className="mt-1 p-3 bg-white dark:bg-gray-900 rounded border max-h-64 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-xs font-mono text-gray-800 dark:text-gray-200">
                      {emailData.body}
                    </pre>
                  </div>
                </div>
              )}
              {emailData?.attachments && Array.isArray(emailData.attachments) && emailData.attachments.length > 0 && (
                <div className="mt-3">
                  <strong>Attachments:</strong>
                  <div className="mt-1 space-y-1">
                    {emailData.attachments.map((attachment: any, index: number) => (
                      <div key={index} className="text-xs text-blue-600 dark:text-blue-400">
                        📎 {attachment.filename || `Attachment ${index + 1}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          {isEditing ? (
            <>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button onClick={handleApprove} disabled={approveMutation.isPending}>
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}