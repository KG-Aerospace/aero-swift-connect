import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Wifi, WifiOff, Play, Square, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface MailStatus {
  connected: boolean;
  config: {
    host: string;
    port: number;
    user: string;
    secure: boolean;
  };
}

export function MailStatusCard() {
  const { toast } = useToast();
  
  const { data: mailStatus, refetch, isLoading } = useQuery<MailStatus>({
    queryKey: ['/api/mail/status'],
    refetchInterval: 10000, // Check every 10 seconds
  });

  const handleStart = async () => {
    try {
      await apiRequest('/api/mail/start', 'POST');
      toast({
        title: "Email monitoring started",
        description: "System is now monitoring incoming emails",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Failed to start monitoring",
        description: "Check your email configuration",
        variant: "destructive",
      });
    }
  };

  const handleStop = async () => {
    try {
      await apiRequest('/api/mail/stop', 'POST');
      toast({
        title: "Email monitoring stopped",
        description: "System stopped monitoring emails",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Failed to stop monitoring",  
        description: "An error occurred while stopping the service",
        variant: "destructive",
      });
    }
  };

  const handleTest = async () => {
    try {
      const result: any = await apiRequest('/api/mail/test', 'POST');
      toast({
        title: "Configuration Test",
        description: result.isConfigured ? "Configuration is valid" : "Configuration incomplete",
        variant: result.isConfigured ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Test failed",
        description: "Unable to test email configuration",
        variant: "destructive",
      });
    }
  };

  const handleEnableTestMode = async () => {
    try {
      await apiRequest('/api/mail/enable-test-mode', 'POST');
      toast({
        title: "Test mode enabled",
        description: "System will simulate email processing",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Failed to enable test mode",
        description: "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleDisableTestMode = async () => {
    try {
      await apiRequest('/api/mail/disable-test-mode', 'POST');
      toast({
        title: "Test mode disabled",
        description: "Returned to normal operation",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Failed to disable test mode",
        description: "An error occurred",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !mailStatus) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Email Service</CardTitle>
          <Mail className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Email Service</CardTitle>
        <Mail className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {mailStatus.connected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <Badge variant={mailStatus.connected ? "default" : "secondary"}>
              {mailStatus.connected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTest}
              className="h-7 px-2"
              data-testid="button-test-email-config"
            >
              <TestTube className="h-3 w-3" />
            </Button>
            {mailStatus.connected ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleStop}
                className="h-7 px-2"
                data-testid="button-stop-email-monitoring"
              >
                <Square className="h-3 w-3" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleStart}
                className="h-7 px-2"
                data-testid="button-start-email-monitoring"
              >
                <Play className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>Host: {mailStatus.config.host || "Not configured"}</div>
          <div>Port: {mailStatus.config.port || "N/A"}</div>
          <div>User: {mailStatus.config.user || "Not configured"}</div>
          <div>Secure: {mailStatus.config.secure ? "Yes" : "No"}</div>
          {mailStatus.testMode && (
            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
              <div className="text-yellow-600 dark:text-yellow-400 font-medium">Test Mode Active</div>
              <div className="text-yellow-600 dark:text-yellow-400">Simulating email processing</div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDisableTestMode}
                className="mt-1 h-6 text-xs"
                data-testid="button-disable-test-mode"
              >
                Disable Test Mode
              </Button>
            </div>
          )}
          {!mailStatus.testMode && !mailStatus.connected && (
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleEnableTestMode}
                className="h-6 text-xs"
                data-testid="button-enable-test-mode"
              >
                Enable Test Mode
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}