"use client";

import React from "react";
import { TaskCard } from "@/components/task/TaskCard";
import { Card, CardContent } from "@/components/ui/Card";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { tasks } from "@/lib/mock-data/tasks";

export default function RecentlyViewedPage() {
  const viewedTasks = tasks.slice(0, 6);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-theme-primaryText mb-8">Recently Viewed</h1>
        
        {viewedTasks.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-theme-accent4">No recently viewed tasks</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {viewedTasks.map((task) => (
              <TaskCard key={task.jobId} task={task} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

