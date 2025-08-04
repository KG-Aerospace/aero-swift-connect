import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface KPICardsProps {
  stats: {
    dailyEmails: number;
    activeOrders: number;
    pendingQuotes: number;
    totalRevenue: string;
    emailProcessingRate: number;
  };
}

export default function KPICards({ stats }: KPICardsProps) {
  const cards = [
    {
      title: "Daily Emails Processed",
      value: stats?.dailyEmails || 0,
      change: "+12% from yesterday",
      trend: "up",
      icon: "📧",
      color: "blue",
    },
    {
      title: "Active Orders",
      value: stats?.activeOrders || 0,
      change: "89 pending approval",
      trend: "neutral",
      icon: "🛒",
      color: "green",
    },
    {
      title: "Quote Response Rate",
      value: `${stats?.emailProcessingRate || 0}%`,
      change: "+2.1% this week",
      trend: "up",
      icon: "📈",
      color: "yellow",
    },
    {
      title: "Total Revenue",
      value: `$${Math.round(parseFloat(stats?.totalRevenue || "0") / 1000)}K`,
      change: "+18% this month",
      trend: "up",
      icon: "💰",
      color: "purple",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6" data-testid="kpi-cards">
      {cards.map((card, index) => (
        <Card key={index} className="border border-gray-200" data-testid={`kpi-card-${index}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600" data-testid={`kpi-title-${index}`}>
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-gray-900" data-testid={`kpi-value-${index}`}>
                  {card.value}
                </p>
                <p className={`text-sm mt-1 flex items-center ${
                  card.trend === "up" ? "text-success" : 
                  card.trend === "down" ? "text-error" : "text-warning"
                }`} data-testid={`kpi-change-${index}`}>
                  {card.trend === "up" && <TrendingUp className="w-4 h-4 mr-1" />}
                  {card.trend === "down" && <TrendingDown className="w-4 h-4 mr-1" />}
                  {card.trend === "neutral" && <Clock className="w-4 h-4 mr-1" />}
                  {card.change}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${
                card.color === "blue" ? "bg-blue-100" :
                card.color === "green" ? "bg-green-100" :
                card.color === "yellow" ? "bg-yellow-100" :
                "bg-purple-100"
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
