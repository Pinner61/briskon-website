"use client";

import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import Chart from "chart.js/auto";

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
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoadingAnalytics(true);
      try {
        if (!user?.email) throw new Error("User email is missing");
        const response = await fetch(`/api/seller/performance-analytics?email=${encodeURIComponent(user.email)}`);
        if (!response.ok) throw new Error(`Failed to fetch analytics: ${response.statusText}`);
        const data = await response.json();
        console.log("Fetch response data:", data); // Debug API response
        if (!data.success) throw new Error(data.error || "Failed to load analytics");
        setAnalytics(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Fetch error:", err);
      } finally {
        setIsLoadingAnalytics(false);
      }
    };

    if (user) fetchAnalytics();
  }, [user]);

  useEffect(() => {
    if (chartRef.current && analytics?.salesByDate.length) {
      console.log("Chart setup - Ref:", chartRef.current); // Debug ref
      console.log("Chart data:", analytics.salesByDate); // Debug data
      const ctx = chartRef.current.getContext("2d");
      if (ctx) {
        if (chartInstance.current) {
          chartInstance.current.destroy(); // Destroy existing instance
        }
        chartInstance.current = new Chart(ctx, {
          type: "line",
          data: {
            labels: analytics.salesByDate.map((item) => item.date),
            datasets: [
              {
                label: "Sales ($)",
                data: analytics.salesByDate.map((item) => item.total),
                borderColor: "rgba(75, 192, 192, 1)",
                backgroundColor: "rgba(75, 192, 192, 0.2)",
                fill: true,
                tension: 0.1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                title: { display: true, text: "Sales ($)" },
              },
              x: {
                title: { display: true, text: "Date" },
              },
            },
            plugins: {
              legend: { position: "top" },
            },
          },
        });
      } else {
        console.error("Failed to get 2d context");
      }
    }
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy(); // Cleanup on unmount
      }
    };
  }, [analytics]);

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
              <div className="mt-6" style={{ position: "relative", height: "400px" }}>
                <h3 className="text-lg font-semibold mb-2">Sales Over Time</h3>
                <canvas ref={chartRef} className="w-full" style={{ height: "100%" }}></canvas>
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
