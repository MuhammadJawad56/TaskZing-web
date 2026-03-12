"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, RefreshCw, Briefcase, Plus, Circle } from "lucide-react";
import { useAuth } from "@/lib/api/AuthContext";
import { getProposalsByProviderId } from "@/lib/api/proposals";
import { getUserShowcases, type ShowcaseItem } from "@/lib/api/showcase";
import { getJobById } from "@/lib/api/jobs";
import { getUserData, updateUserProfile } from "@/lib/api/auth";
import { ProposalWithDetails } from "@/lib/types/proposal";
import { Task } from "@/lib/types/task";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function ProviderDashboardPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    myJobs: 0,
    completed: 0,
    inProgress: 0,
    totalEarning: 0,
  });
  const [showcases, setShowcases] = useState<ShowcaseItem[]>([]);
  const [currentTasks, setCurrentTasks] = useState<Array<{ job: Task; proposal: ProposalWithDetails }>>([]);
  const [isRefreshingWork, setIsRefreshingWork] = useState(false);
  const [isRefreshingTasks, setIsRefreshingTasks] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!user) {
      console.log("[Dashboard] No user, skipping load");
      return;
    }

    try {
      console.log("[Dashboard] Starting to load dashboard data for user:", user.uid);
      setIsLoading(true);
      
      // Load availability status - fetch fresh userData if needed
      let currentUserData = userData;
      if (!currentUserData || (currentUserData as any).isAvailableForWork === undefined) {
        console.log("[Dashboard] Fetching fresh userData");
        try {
          currentUserData = await getUserData(user.uid);
          console.log("[Dashboard] Fetched userData:", currentUserData);
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      const availability = currentUserData ? ((currentUserData as any).isAvailableForWork || false) : false;
      console.log("[Dashboard] Availability status:", availability);
      setIsAvailable(availability);

      // Load proposals to get hired jobs
      console.log("[Dashboard] Fetching proposals for provider:", user.uid);
      const proposals = await getProposalsByProviderId(user.uid);
      console.log("[Dashboard] Total proposals fetched:", proposals.length);
      
      // Filter only hired proposals
      const hiredProposals = proposals.filter(p => p.isHired === true);
      console.log("[Dashboard] Hired proposals:", hiredProposals.length);
      console.log("[Dashboard] Sample hired proposals:", hiredProposals.slice(0, 3).map(p => ({
        applicationId: p.applicationId,
        jobId: p.jobId,
        isHired: p.isHired,
        status: p.status
      })));
      
      // Fetch job details for hired proposals
      const tasksWithProposals = await Promise.all(
        hiredProposals.map(async (proposal) => {
          try {
            const job = await getJobById(proposal.jobId);
            if (job) {
              console.log("[Dashboard] Found job for proposal:", proposal.jobId, "Job title:", job.title);
            } else {
              console.log("[Dashboard] Job not found for proposal:", proposal.jobId);
            }
            return job ? { job, proposal } : null;
          } catch (error) {
            console.error("[Dashboard] Error fetching job for proposal:", proposal.jobId, error);
            return null;
          }
        })
      );

      const validTasks = tasksWithProposals.filter(t => t !== null) as Array<{ job: Task; proposal: ProposalWithDetails }>;
      console.log("[Dashboard] Valid tasks with jobs:", validTasks.length);
      setCurrentTasks(validTasks);

      // Calculate metrics
      const totalJobs = hiredProposals.length;
      const completed = validTasks.filter(t => {
        const status = (t.job as any).completionStatus;
        return status === "completed";
      }).length;
      const inProgress = validTasks.filter(t => {
        const status = (t.job as any).completionStatus;
        return status === "in_progress" || status === "open" || status === undefined || status === null;
      }).length;
      
      // Calculate total earnings from completed jobs
      const totalEarning = validTasks
        .filter(t => {
          const status = (t.job as any).completionStatus;
          return status === "completed";
        })
        .reduce((sum, t) => sum + (t.proposal.bidAmount || 0), 0);

      const newMetrics = {
        myJobs: totalJobs,
        completed,
        inProgress,
        totalEarning,
      };
      console.log("[Dashboard] Setting metrics:", newMetrics);
      console.log("[Dashboard] Previous metrics:", metrics);
      
      // Update all state in a batch to ensure UI updates
      setMetrics(newMetrics);
      setCurrentTasks(validTasks);

      // Load showcase work
      console.log("[Dashboard] Fetching showcase work");
      const userShowcases = await getUserShowcases(user.uid);
      console.log("[Dashboard] Showcase work fetched:", userShowcases.length);
      setShowcases(userShowcases);
      
      console.log("[Dashboard] Dashboard data loaded successfully");
    } catch (error) {
      console.error("[Dashboard] Error loading dashboard data:", error);
      console.error("[Dashboard] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setIsLoading(false);
      console.log("[Dashboard] Loading complete");
    }
  }, [user, userData]);

  useEffect(() => {
    console.log("[Dashboard] useEffect triggered - user:", !!user, "userData:", !!userData, "authLoading:", authLoading);
    
    // If auth is still loading, wait
    if (authLoading) {
      console.log("[Dashboard] Auth still loading, waiting...");
      return;
    }
    
    // If no user, stop loading
    if (!user) {
      console.log("[Dashboard] No user, setting loading to false");
      setIsLoading(false);
      return;
    }
    
    // Load dashboard data even if userData is not yet available
    // userData will be fetched inside loadDashboardData if needed
    console.log("[Dashboard] Calling loadDashboardData");
    loadDashboardData();
  }, [user, userData, authLoading, loadDashboardData]);

  // Refresh data when page becomes visible (e.g., returning from another tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && !authLoading) {
        loadDashboardData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, authLoading, loadDashboardData]);

  const handleToggleAvailability = async () => {
    if (!user) return;

    const previousStatus = isAvailable;
    const newStatus = !isAvailable;
    
    // Optimistically update UI
    setIsAvailable(newStatus);

    try {
      await updateUserProfile(user.uid, {
        isAvailableForWork: newStatus,
      });
      
      // Refresh userData to keep it in sync
      try {
        const updatedUserData = await getUserData(user.uid);
        if (updatedUserData) {
          // The AuthContext will pick this up on next render
        }
      } catch (error) {
        console.error("Error refreshing user data:", error);
      }
    } catch (error) {
      console.error("Error updating availability:", error);
      // Revert on error
      setIsAvailable(previousStatus);
    }
  };

  const handleRefreshWork = async () => {
    if (!user) return;

    try {
      setIsRefreshingWork(true);
      const userShowcases = await getUserShowcases(user.uid);
      setShowcases(userShowcases);
    } catch (error) {
      console.error("Error refreshing work:", error);
    } finally {
      setIsRefreshingWork(false);
    }
  };

  const handleRefreshTasks = async () => {
    if (!user) return;

    try {
      setIsRefreshingTasks(true);
      const proposals = await getProposalsByProviderId(user.uid);
      const hiredProposals = proposals.filter(p => p.isHired === true);
      
      const tasksWithProposals = await Promise.all(
        hiredProposals.map(async (proposal) => {
          const job = await getJobById(proposal.jobId);
          return job ? { job, proposal } : null;
        })
      );

      const validTasks = tasksWithProposals.filter(t => t !== null) as Array<{ job: Task; proposal: ProposalWithDetails }>;
      setCurrentTasks(validTasks);

      // Update metrics
      const completed = validTasks.filter(t => {
        const status = (t.job as any).completionStatus;
        return status === "completed";
      }).length;
      const inProgress = validTasks.filter(t => {
        const status = (t.job as any).completionStatus;
        return status === "in_progress" || status === "open" || status === undefined || status === null;
      }).length;
      const totalEarning = validTasks
        .filter(t => {
          const status = (t.job as any).completionStatus;
          return status === "completed";
        })
        .reduce((sum, t) => sum + (t.proposal.bidAmount || 0), 0);

      setMetrics(prev => ({
        myJobs: validTasks.length,
        completed,
        inProgress,
        totalEarning,
      }));
    } catch (error) {
      console.error("Error refreshing tasks:", error);
    } finally {
      setIsRefreshingTasks(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Top Section: Availability Toggle */}
          <div className="mb-8 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                Available For Work:
              </span>
              <div className="flex items-center gap-2">
                <Circle 
                  className={`h-3 w-3 ${isAvailable ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'}`} 
                />
                <span className={`text-sm font-medium ${isAvailable ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {isAvailable ? 'Online' : 'Offline'}
                </span>
                <button
                  onClick={handleToggleAvailability}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isAvailable ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isAvailable ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            <button
              onClick={() => loadDashboardData()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Refresh</span>
            </button>
          </div>

          {/* Provider Performance Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Provider Performance
              </h2>
              <button
                onClick={() => router.push("/all-showcases")}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Bookmark className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Saved</span>
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Provider Performance Description
            </p>
            
            {/* Performance Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {metrics.myJobs}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">My Jobs</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {metrics.completed}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {metrics.inProgress}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  ${metrics.totalEarning.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Earning</p>
              </div>
            </div>
          </div>

          {/* My Work Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Work</h2>
              <button
                onClick={handleRefreshWork}
                disabled={isRefreshingWork}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <RefreshCw 
                  className={`h-5 w-5 text-blue-500 ${isRefreshingWork ? 'animate-spin' : ''}`} 
                />
              </button>
            </div>

            {showcases.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  No Showcase Work
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Create First Showcase
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {showcases.slice(0, 6).map((showcase) => (
                  <div
                    key={showcase.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/showcase-work`)}
                  >
                    {showcase.imageUrls && showcase.imageUrls.length > 0 && (
                      <img
                        src={showcase.imageUrls[0]}
                        alt={showcase.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {showcase.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {showcase.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Current Tasks Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Current Tasks</h2>
              <button
                onClick={handleRefreshTasks}
                disabled={isRefreshingTasks}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <RefreshCw 
                  className={`h-5 w-5 text-gray-900 dark:text-gray-100 ${isRefreshingTasks ? 'animate-spin' : ''}`} 
                />
              </button>
            </div>

            {currentTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">No current tasks</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentTasks.map(({ job, proposal }) => {
                  const status = (job as any).completionStatus;
                  const isCompleted = status === "completed";
                  const isInProgress = status === "in_progress" || status === "open" || status === undefined || status === null;
                  
                  return (
                    <div
                      key={job.jobId}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/job-details/${job.jobId}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {job.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                            {job.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-red-500 font-medium">
                              ${proposal.bidAmount}
                            </span>
                            {isCompleted && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                                Completed
                              </span>
                            )}
                            {isInProgress && (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">
                                In Progress
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
