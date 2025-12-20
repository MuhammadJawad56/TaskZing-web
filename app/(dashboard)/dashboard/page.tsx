"use client";

import React, { useEffect, useState } from "react";
import { DollarSign, FileText, MessageSquare, ShoppingBag } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { getMockSession } from "@/lib/auth/mock";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalEarnings: 0,
    activeTasks: 0,
    proposals: 0,
    messages: 0,
  });

  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    // Fetch dashboard data
    // In a real app, this would be an API call
    setStats({
      totalEarnings: 2450,
      activeTasks: 3,
      proposals: 12,
      messages: 8,
    });

    setActivities([
      {
        id: "1",
        type: "proposal",
        title: "New proposal received",
        description: "John Doe submitted a proposal for 'Website Redesign'",
        timestamp: new Date().toISOString(),
      },
      {
        id: "2",
        type: "message",
        title: "New message",
        description: "You have a new message from Jane Smith",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "3",
        type: "order",
        title: "Order completed",
        description: "Order #1234 has been completed",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
      },
    ]);
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-theme-primaryText">Dashboard</h1>
        <p className="text-theme-accent4 mt-2">Welcome back! Here's what's happening.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Earnings"
          value={`$${stats.totalEarnings.toLocaleString()}`}
          icon={<DollarSign className="h-6 w-6" />}
          trend="+12% from last month"
        />
        <StatsCard
          title="Active Tasks"
          value={stats.activeTasks}
          icon={<FileText className="h-6 w-6" />}
          trend="+5 from last month"
        />
        <StatsCard
          title="Proposals"
          value={stats.proposals}
          icon={<FileText className="h-6 w-6" />}
        />
        <StatsCard
          title="Messages"
          value={stats.messages}
          icon={<MessageSquare className="h-6 w-6" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed activities={activities} />
        <div className="bg-theme-primaryBackground rounded-lg border border-theme-accent2 p-6">
          <h2 className="text-xl font-semibold text-theme-primaryText mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/dashboard/post-task"
              className="block p-4 border border-theme-accent2 rounded-lg hover:bg-theme-accent2 transition-colors"
            >
              <h3 className="font-medium text-theme-primaryText mb-1">Post a New Task</h3>
              <p className="text-sm text-theme-accent4">Create a new task listing</p>
            </a>
            <a
              href="/dashboard/browse-tasks"
              className="block p-4 border border-theme-accent2 rounded-lg hover:bg-theme-accent2 transition-colors"
            >
              <h3 className="font-medium text-theme-primaryText mb-1">Browse Tasks</h3>
              <p className="text-sm text-theme-accent4">Find new opportunities</p>
            </a>
            <a
              href="/dashboard/messages"
              className="block p-4 border border-theme-accent2 rounded-lg hover:bg-theme-accent2 transition-colors"
            >
              <h3 className="font-medium text-theme-primaryText mb-1">View Messages</h3>
              <p className="text-sm text-theme-accent4">Check your conversations</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

