"use client";

import React from "react";
import Link from "next/link";
import { PlusCircle, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TaskCard } from "@/components/task/TaskCard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getOpenTasks } from "@/lib/mock-data/tasks";

export default function ClientHomePage() {
  const recentTasks = getOpenTasks().slice(0, 6);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-theme-primaryText mb-4">Client Dashboard</h1>
          <p className="text-theme-accent4">Manage your tasks and find professionals</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/dashboard/post-task">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <PlusCircle className="h-12 w-12 text-primary-500 mx-auto mb-4" />
                <h3 className="font-semibold text-theme-primaryText mb-2">Post a Task</h3>
                <p className="text-sm text-theme-accent4">Create a new task listing</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/client-explore">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <Search className="h-12 w-12 text-primary-500 mx-auto mb-4" />
                <h3 className="font-semibold text-theme-primaryText mb-2">Explore Providers</h3>
                <p className="text-sm text-theme-accent4">Find skilled professionals</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/proposals">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-primary-500 mx-auto mb-4" />
                <h3 className="font-semibold text-theme-primaryText mb-2">View Proposals</h3>
                <p className="text-sm text-theme-accent4">Review submitted proposals</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-theme-primaryText">Recent Tasks</h2>
            <Link href="/my-tasks">
              <Button variant="outline">View All</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentTasks.map((task) => (
              <TaskCard key={task.jobId} task={task} />
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

