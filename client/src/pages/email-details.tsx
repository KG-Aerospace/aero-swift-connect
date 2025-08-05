import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, User, Calendar, Package } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function EmailDetails() {
  const { id } = useParams();
  
  const { data: email, isLoading } = useQuery<any>({
    queryKey: [`/api/emails/${id}`],
    enabled: !!id,
  });

  const { data: orders } = useQuery<any[]>({
    queryKey: [`/api/emails/${id}/orders`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <Card>
          <CardContent className="p-12">
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="space-y-4">
        <Link href="/customer-requests">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customer Requests
          </Button>
        </Link>
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email not found</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/customer-requests">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customer Requests
          </Button>
        </Link>
        {email.status === "processed" ? (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            Processed
          </Badge>
        ) : (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            Processing
          </Badge>
        )}
      </div>

      <Card className="border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl">{email.subject}</CardTitle>
          <div className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>From: {email.fromEmail}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Received: {formatDistanceToNow(new Date(email.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Email Content</h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                {email.bodyHtml ? (
                  <div 
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm font-mono">{email.body}</pre>
                )}
              </div>
            </div>

            {email.attachments && email.attachments.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Attachments</h3>
                <div className="space-y-2">
                  {email.attachments.map((attachment: any, index: number) => (
                    <a 
                      key={index}
                      href={attachment.objectPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Package className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">{attachment.filename}</span>
                      <span className="text-xs text-gray-500">
                        ({(attachment.size / 1024).toFixed(1)} KB)
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {orders && orders.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Created Orders ({orders.length})
                </h3>
                <div className="space-y-2">
                  {orders.map((order: any) => (
                    <Link key={order.id} href="/orders">
                      <Card className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{order.orderNumber}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Part: {order.partNumber} • Qty: {order.quantity}
                              </p>
                            </div>
                            <Badge className={
                              order.urgencyLevel === "critical" ? "bg-red-100 text-red-800" :
                              order.urgencyLevel === "urgent" ? "bg-orange-100 text-orange-800" :
                              "bg-blue-100 text-blue-800"
                            }>
                              {order.urgencyLevel}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}