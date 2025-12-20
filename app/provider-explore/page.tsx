"use client";

import React, { useState } from "react";
import { TaskCard } from "@/components/task/TaskCard";
import { TaskFilters } from "@/components/task/TaskFilters";
import { TaskSearch } from "@/components/task/TaskSearch";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getOpenTasks } from "@/lib/mock-data/tasks";

export default function ProviderExplorePage() {
  const [tasks] = useState(getOpenTasks());
  const [filteredTasks, setFilteredTasks] = useState(tasks);

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredTasks(tasks);
      return;
    }
    const filtered = tasks.filter(task =>
      task.title.toLowerCase().includes(query.toLowerCase()) ||
      task.description.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredTasks(filtered);
  };

  const handleFilterChange = () => {
    // Filter logic can be implemented here
    setFilteredTasks(tasks);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-theme-primaryText mb-8">Explore Jobs</h1>
        
        <div className="mb-6">
          <TaskSearch onSearch={handleSearch} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <TaskFilters onFilterChange={handleFilterChange} />
          </div>
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredTasks.map((task) => (
                <TaskCard key={task.jobId} task={task} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

