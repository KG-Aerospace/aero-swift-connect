import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle, Mail, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function RecentActivity() {
  const { data: activities } = useQuery({
    queryKey: ["/api/activities"],
    refetchInterval: 30000,
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "quote_received":
        return <CheckCircle className="text-white text-xs" />;
      case "email_processed":
        return <Mail className="text-white text-xs" />;
      case "order_created":
        return <AlertTriangle className="text-white text-xs" />;
      default:
        return <CheckCircle className="text-white text-xs" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "quote_received":
        return "bg-success";
      case "email_processed":
        return "bg-primary";
      case "order_created":
        return "bg-warning";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <Card className="border border-gray-200" data-testid="recent-activity">
      <CardHeader className="p-6">
        <h3 className="text-lg font-semibold text-gray-900" data-testid="recent-activity-title">
          Recent Activity
        </h3>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-4">
        {(activities as any[])?.map((activity: any, index: number) => (
          <div 
            key={activity.id} 
            className="flex items-start space-x-3"
            data-testid={`activity-${index}`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${getActivityColor(activity.type)}`}>
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900" data-testid={`activity-description-${index}`}>
                {activity.description}
              </p>
              <p className="text-xs text-gray-500" data-testid={`activity-time-${index}`}>
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
        
        {(!(activities as any[]) || (activities as any[]).length === 0) && (
          <div className="text-center py-4 text-gray-500" data-testid="no-activities">
            No recent activities
          </div>
        )}
      </CardContent>
    </Card>
  );
}
