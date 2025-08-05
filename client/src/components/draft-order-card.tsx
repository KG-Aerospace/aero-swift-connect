import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Edit2, Save, Package } from "lucide-react";
import type { DraftOrder } from "@/../../shared/schema";

interface DraftOrderCardProps {
  draft: DraftOrder & {
    customer?: { name: string; company: string | null } | null;
    email?: { subject: string; fromEmail: string } | null;
  };
}

export function DraftOrderCard({ draft }: DraftOrderCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    partNumber: draft.partNumber,
    partDescription: draft.partDescription || "",
    quantity: draft.quantity,
    urgencyLevel: draft.urgencyLevel,
    condition: draft.condition || "NE",
    notes: draft.notes || "",
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: (data: typeof editData) => 
      apiRequest("PATCH", `/api/draft-orders/${draft.id}`, data),
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
      apiRequest("POST", `/api/draft-orders/${draft.id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order created",
        description: "The order has been created and sent to processing.",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (notes: string) => 
      apiRequest("POST", `/api/draft-orders/${draft.id}/reject`, { notes }),
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
    const notes = prompt("Please provide a reason for rejection:");
    if (notes) {
      rejectMutation.mutate(notes);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical": return "bg-red-100 text-red-800";
      case "urgent": return "bg-orange-100 text-orange-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <Card className="mb-4" data-testid={`draft-order-${draft.id}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-gray-500" />
            <CardTitle className="text-lg">
              {draft.customer?.name || "Unknown Customer"}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getUrgencyColor(draft.urgencyLevel)}>
              {draft.urgencyLevel}
            </Badge>
            <Badge variant="outline">
              {draft.condition}
            </Badge>
          </div>
        </div>
        {draft.email && (
          <p className="text-sm text-gray-500 mt-1">
            From: {draft.email.fromEmail} - {draft.email.subject}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="partNumber">Part Number</Label>
                <Input
                  id="partNumber"
                  value={editData.partNumber}
                  onChange={(e) => setEditData({ ...editData, partNumber: e.target.value })}
                  data-testid="input-part-number"
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={editData.quantity}
                  onChange={(e) => setEditData({ ...editData, quantity: parseInt(e.target.value) || 1 })}
                  data-testid="input-quantity"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={editData.partDescription}
                onChange={(e) => setEditData({ ...editData, partDescription: e.target.value })}
                placeholder="Part description"
                data-testid="input-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="urgency">Urgency</Label>
                <select
                  id="urgency"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={editData.urgencyLevel}
                  onChange={(e) => setEditData({ ...editData, urgencyLevel: e.target.value })}
                  data-testid="select-urgency"
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <Label htmlFor="condition">Condition</Label>
                <select
                  id="condition"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={editData.condition}
                  onChange={(e) => setEditData({ ...editData, condition: e.target.value })}
                  data-testid="select-condition"
                >
                  <option value="NE">New (NE)</option>
                  <option value="NS">New Surplus (NS)</option>
                  <option value="OH">Overhauled (OH)</option>
                  <option value="SV">Serviceable (SV)</option>
                  <option value="AR">As Removed (AR)</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                placeholder="Additional notes"
                data-testid="textarea-notes"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-lg">{draft.partNumber}</p>
                {draft.partDescription && (
                  <p className="text-sm text-gray-600">{draft.partDescription}</p>
                )}
              </div>
              <p className="text-lg font-medium">Qty: {draft.quantity}</p>
            </div>
            {draft.notes && (
              <p className="text-sm text-gray-500">Notes: {draft.notes}</p>
            )}
          </div>
        )}
        
        <div className="flex gap-2 mt-4">
          {isEditing ? (
            <>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                data-testid="button-save"
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                data-testid="button-edit"
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                data-testid="button-approve"
              >
                <Check className="h-4 w-4 mr-1" />
                Approve & Send
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
                data-testid="button-reject"
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}