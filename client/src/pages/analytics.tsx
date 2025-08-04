import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, BarChart, PieChart } from "lucide-react";

export default function Analytics() {
  return (
    <div className="space-y-6" data-testid="analytics-main">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Growth</p>
                  <p className="text-2xl font-bold text-gray-900">+24.5%</p>
                  <p className="text-sm text-success flex items-center mt-1">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +4.2% from last month
                  </p>
                </div>
                <BarChart className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                  <p className="text-2xl font-bold text-gray-900">2.4h</p>
                  <p className="text-sm text-success flex items-center mt-1">
                    <TrendingDown className="w-4 h-4 mr-1" />
                    -0.3h improvement
                  </p>
                </div>
                <PieChart className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Order Completion</p>
                  <p className="text-2xl font-bold text-gray-900">94.2%</p>
                  <p className="text-sm text-success flex items-center mt-1">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +1.8% this week
                  </p>
                </div>
                <BarChart className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cost Savings</p>
                  <p className="text-2xl font-bold text-gray-900">$127K</p>
                  <p className="text-sm text-success flex items-center mt-1">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +12% this quarter
                  </p>
                </div>
                <PieChart className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Order Volume Chart */}
          <Card className="border border-gray-200">
            <CardHeader className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Order Volume Trends</h3>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <BarChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Chart visualization would be implemented here</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Performance */}
          <Card className="border border-gray-200">
            <CardHeader className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Supplier Performance</h3>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Performance metrics chart would be here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email Processing Analytics */}
          <Card className="border border-gray-200">
            <CardHeader className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Email Processing</h3>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Success Rate</span>
                <span className="text-sm font-medium text-gray-900">98.2%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-success h-2 rounded-full" style={{ width: "98.2%" }}></div>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Failed: 1.8%</span>
                <span>Processed: 98.2%</span>
              </div>
            </CardContent>
          </Card>

          {/* Quote Response Times */}
          <Card className="border border-gray-200">
            <CardHeader className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Response Times</h3>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">&lt; 2 hours</span>
                  <span className="text-sm font-medium text-gray-900">45%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">2-6 hours</span>
                  <span className="text-sm font-medium text-gray-900">35%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">6+ hours</span>
                  <span className="text-sm font-medium text-gray-900">20%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Part Categories */}
          <Card className="border border-gray-200">
            <CardHeader className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Top Part Categories</h3>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Engine Components</span>
                  <span className="text-sm font-medium text-gray-900">35%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Landing Gear</span>
                  <span className="text-sm font-medium text-gray-900">28%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avionics</span>
                  <span className="text-sm font-medium text-gray-900">22%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Other</span>
                  <span className="text-sm font-medium text-gray-900">15%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
