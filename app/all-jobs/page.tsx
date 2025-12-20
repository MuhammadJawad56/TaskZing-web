"use client";

import React, { useState } from "react";
import { TaskList } from "@/components/task/TaskList";
import { TaskFilters, FilterState } from "@/components/task/TaskFilters";
import { getOpenTasks } from "@/lib/mock-data/tasks";
import { Task } from "@/lib/types/task";

export default function AllJobsPage() {
  const [allTasks] = useState(getOpenTasks());
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(allTasks);

  const handleFilterChange = (filters: FilterState) => {
    let filtered = [...allTasks];

    if (filters.category && filters.category !== "all") {
      // Filter by category - you may need to match against category ID or name
      // For now, this is a placeholder as category matching would need category data structure
    }

    if (filters.jobType && filters.jobType !== "all") {
      filtered = filtered.filter((task) => task.jobType === filters.jobType);
    }

    if (filters.urgency && filters.urgency !== "all") {
      filtered = filtered.filter((task) => task.urgency === filters.urgency);
    }

    if (filters.minPrice !== undefined) {
      filtered = filtered.filter((task) => task.price >= filters.minPrice!);
    }

    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter((task) => task.price <= filters.maxPrice!);
    }

    setFilteredTasks(filtered);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-theme-primaryText mb-4">All Jobs</h1>
        <p className="text-lg text-theme-accent4">Browse all available job opportunities</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <TaskFilters onFilterChange={handleFilterChange} />
        </div>
        <div className="lg:col-span-3">
          <TaskList tasks={filteredTasks} />
        </div>
      </div>
    </div>
  );
}

