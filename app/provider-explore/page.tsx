"use client";

import React, { useState, useEffect } from "react";
import { TaskCard } from "@/components/task/TaskCard";
import { TaskFilters } from "@/components/task/TaskFilters";
import { TaskSearch } from "@/components/task/TaskSearch";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getOpenJobs } from "@/lib/firebase/jobs";
import { Task } from "@/lib/types/task";

export default function ProviderExplorePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const jobs = await getOpenJobs();
      setTasks(jobs);
      setFilteredTasks(jobs);
    } catch (error) {
      console.error("Error loading jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredTasks(tasks);
      return;
    }
    const filtered = tasks.filter(task =>
      task.title?.toLowerCase().includes(query.toLowerCase()) ||
      task.description?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredTasks(filtered);
  };

  useEffect(() => {
    setFilteredTasks(tasks);
  }, [tasks]);

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
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-6 h-64 animate-pulse" />
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p className="text-lg">No jobs found. Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredTasks.map((task) => (
                  <TaskCard key={task.jobId} task={task} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

