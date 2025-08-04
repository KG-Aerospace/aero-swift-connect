import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function EmailStatus() {
  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 30000,
  });

  const dailyEmails = (stats as any)?.dailyEmails || 0;
  const maxEmails = 500;
  const processingRate = (stats as any)?.emailProcessingRate || 0;
  const progressPercentage = (dailyEmails / maxEmails) * 100;

  return (
    <Card className="border border-gray-200" data-testid="email-status">
      <CardHeader className="p-6">
        <h3 className="text-lg font-semibold text-gray-900" data-testid="email-status-title">
          Email Processing Status
        </h3>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Emails Today</span>
          <span className="text-sm font-medium text-gray-900" data-testid="email-count">
            {dailyEmails} / {maxEmails}
          </span>
        </div>
        
        <Progress value={progressPercentage} className="w-full" data-testid="email-progress" />
        
        <div className="text-xs text-gray-500" data-testid="processing-rate">
          Processing rate: {processingRate}% success
        </div>
        
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Queue Status</span>
            <div className="flex items-center text-success text-sm">
              <div className="w-2 h-2 bg-success rounded-full mr-2 animate-pulse"></div>
              Processing
            </div>
          </div>
          <div className="text-xs text-gray-500" data-testid="queue-status">
            Next batch: 23 emails in 00:04:32
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
