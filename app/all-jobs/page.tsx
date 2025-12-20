import React from "react";
import { TaskList } from "@/components/task/TaskList";
import { TaskFilters } from "@/components/task/TaskFilters";
import { getOpenTasks } from "@/lib/mock-data/tasks";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Jobs",
  description: "Browse all available jobs on TaskZing",
};

export default function AllJobsPage() {
  const tasks = getOpenTasks();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-theme-primaryText mb-4">All Jobs</h1>
        <p className="text-lg text-theme-accent4">Browse all available job opportunities</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <TaskFilters />
        </div>
        <div className="lg:col-span-3">
          <TaskList tasks={tasks} />
        </div>
      </div>
    </div>
  );
}

