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
import { Check, X, Edit2, Save, Package, User, Calendar } from "lucide-react";
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
        title: "Order approved",
        description: "The order has been approved and moved to orders.",
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
        
        {draft.customer && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>{draft.customer.name}</span>
            {draft.customer.company && <span>({draft.customer.company})</span>}
          </div>
        )}
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