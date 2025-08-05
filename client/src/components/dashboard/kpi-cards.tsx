import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface KPICardsProps {
  stats: {
    dailyEmails: number;
    activeOrders: number;
    pendingQuotes: number;
    totalRevenue: string;
    emailProcessingRate: number;
    pendingDrafts: number;
    processedEmails: number;
  };
}

export default function KPICards({ stats }: KPICardsProps) {
  const cards = [
    {
      title: "Daily Emails Processed",
      value: stats?.dailyEmails || 0,
      change: `${stats?.processedEmails || 0} total processed`,
      trend: "up",
      icon: "📧",
      color: "blue",
    },
    {
      title: "Pending Draft Orders",
      value: stats?.pendingDrafts || 0,
      change: "awaiting manual review",
      trend: "neutral",
      icon: "📋",
      color: "orange",
    },
    {
      title: "Verified Orders",
      value: stats?.activeOrders || 0,
      change: "approved orders",
      trend: "up",
      icon: "✅",
      color: "green",
    },
    {
      title: "Email Processing Rate",
      value: `${stats?.emailProcessingRate || 0}%`,
      change: "daily automation rate",
      trend: "up",
      icon: "📈",
      color: "yellow",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6" data-testid="kpi-cards">
      {cards.map((card, index) => (
        <Card key={index} className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800" data-testid={`kpi-card-${index}`}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate" data-testid={`kpi-title-${index}`}>
                  {card.title}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white" data-testid={`kpi-value-${index}`}>
                  {card.value}
                </p>
                <p className={`text-xs sm:text-sm mt-1 flex items-center ${
                  card.trend === "up" ? "text-green-600 dark:text-green-400" : 
                  card.trend === "down" ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"
                }`} data-testid={`kpi-change-${index}`}>
                  {card.trend === "up" && <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />}
                  {card.trend === "down" && <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />}
                  {card.trend === "neutral" && <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />}
                  <span className="truncate">{card.change}</span>
                </p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-lg sm:text-xl flex-shrink-0 ml-3 ${
                card.color === "blue" ? "bg-blue-100 dark:bg-blue-900" :
                card.color === "green" ? "bg-green-100 dark:bg-green-900" :
                card.color === "yellow" ? "bg-yellow-100 dark:bg-yellow-900" :
                "bg-purple-100 dark:bg-purple-900"
              }`} data-testid={`kpi-icon-${index}`}>
                {card.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
