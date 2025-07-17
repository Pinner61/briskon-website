"use client";

import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";

interface AnalyticsData {
  totalSales: number;
  averagePrice: number;
  salesByDate: { date: string; total: number }[];
}

export default function PerformanceAnalytics() {
  const { user, isLoading } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoadingAnalytics(true);
      try {
        if (!user?.email) throw new Error("User email is missing");
        const response = await fetch(`/api/seller/performance-analytics?email=${encodeURIComponent(user.email)}`);
        if (!response.ok) throw new Error(`Failed to fetch analytics: ${response.statusText}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error || "Failed to load analytics");
        setAnalytics(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoadingAnalytics(false);
      }
    };

    if (user) fetchAnalytics();
  }, [user]);

  if (isLoading || isLoadingAnalytics) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Not logged in.</div>;
  }

  if (user.role !== "seller" && user.role !== "both") {
    return <div className="min-h-screen flex items-center justify-center">Access Denied. This page is for sellers.</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center">{error}</div>;
  }

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle>Performance Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="p-4 bg-blue-100 rounded-lg">
                <h3 className="text-lg font-semibold">Total Sales</h3>
                <p className="text-2xl font-bold">${analytics?.totalSales.toLocaleString() || 0}</p>
              </div>
              <div className="p-4 bg-green-100 rounded-lg">
                <h3 className="text-lg font-semibold">Average Price</h3>
                <p className="text-2xl font-bold">${analytics?.averagePrice.toLocaleString() || 0}</p>
              </div>
            </div>
            {analytics?.salesByDate.length ? (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Sales Over Time</h3>
                <canvas id="salesChart" className="w-full h-64"></canvas>
                <script>
                  {`
                    (function() {
                      const ctx = document.getElementById('salesChart').getContext('2d');
                      new Chart(ctx, {
                        type: 'line',
                        data: {
                          labels: ${JSON.stringify(analytics.salesByDate.map((item) => item.date))},
                          datasets: [{
                            label: 'Sales ($)',
                            data: ${JSON.stringify(analytics.salesByDate.map((item) => item.total))},
                            borderColor: 'rgba(75, 192, 192, 1)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            fill: true,
                            tension: 0.1
                          }]
                        },
                        options: {
                          scales: {
                            y: { beginAtZero: true }
                          }
                        }
                      });
                    })();
                  `}
                </script>
              </div>
            ) : (
              <p className="text-center text-gray-500">No sales data available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
