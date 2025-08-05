import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import CustomerRequests from "@/pages/customer-requests";
import Orders from "@/pages/orders";
import Quotes from "@/pages/quotes";
import Suppliers from "@/pages/suppliers";
import Analytics from "@/pages/analytics";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import Procurement from "@/pages/procurement";
import EmailDetails from "@/pages/email-details";
import Rejected from "@/pages/rejected";
import Login from "@/pages/login";
import { useState } from "react";

function AuthenticatedApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/customer-requests" component={CustomerRequests} />
            <Route path="/orders" component={Orders} />
            <Route path="/quotes" component={Quotes} />
            <Route path="/suppliers" component={Suppliers} />
            <Route path="/procurement" component={Procurement} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/rejected" component={Rejected} />
            <Route path="/email/:id" component={EmailDetails} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function Router() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
