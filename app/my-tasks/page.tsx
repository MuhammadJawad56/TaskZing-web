"use client";

import React, { useState } from "react";
import { TaskCard } from "@/components/task/TaskCard";
import { Card, CardContent } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { tasks } from "@/lib/mock-data/tasks";
import { getMockSession } from "@/lib/auth/mock";

export default function MyTasksPage() {
  const session = getMockSession();
  const [activeTab, setActiveTab] = useState("active");

  const myTasks = tasks.filter(t => 
    t.clientId === session?.id || t.contractorId === session?.id
  );

  const activeTasks = myTasks.filter(t => t.completionStatus === "open" || t.completionStatus === "in_progress");
  const completedTasks = myTasks.filter(t => t.completionStatus === "completed");
  const cancelledTasks = myTasks.filter(t => t.completionStatus === "cancelled");

  const tabs = [
    { id: "active", label: "Active", count: activeTasks.length },
    { id: "completed", label: "Completed", count: completedTasks.length },
    { id: "cancelled", label: "Cancelled", count: cancelledTasks.length },
  ];

  const getTasksForTab = () => {
    switch (activeTab) {
      case "active":
        return activeTasks;
      case "completed":
        return completedTasks;
      case "cancelled":
        return cancelledTasks;
      default:
        return [];
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-theme-primaryText mb-8">My Tasks</h1>
        
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="mt-6">
          {getTasksForTab().length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-theme-accent4">No tasks found in this category.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getTasksForTab().map((task) => (
                <TaskCard key={task.jobId} task={task} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

