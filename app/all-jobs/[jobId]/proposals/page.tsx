"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Search, Filter, Users, X, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/firebase/AuthContext";
import { getJobById } from "@/lib/firebase/jobs";
import { getProposalsByJobId } from "@/lib/firebase/proposals";
import { Task } from "@/lib/types/task";
import { ProposalWithDetails } from "@/lib/types/proposal";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

type ProposalTabType = "all" | "shortlisted" | "messaged" | "archived";

export default function JobProposalsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId as string;
  const { user } = useAuth();
  
  const [job, setJob] = useState<Task | null>(null);
  const [proposals, setProposals] = useState<ProposalWithDetails[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<ProposalWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [proposalTab, setProposalTab] = useState<ProposalTabType>("all");
  const [proposalSearchQuery, setProposalSearchQuery] = useState("");

  useEffect(() => {
    if (jobId) {
      loadData();
    }
  }, [jobId]);

  useEffect(() => {
    filterProposals();
  }, [proposals, proposalTab, proposalSearchQuery]);

  const loadData = async () => {
    if (!jobId) return;

    try {
      setIsLoading(true);
      const [jobData, proposalsData] = await Promise.all([
        getJobById(jobId),
        getProposalsByJobId(jobId),
      ]);

      if (jobData) {
        setJob(jobData);
      } else {
        // Job not found, redirect back
        router.push("/all-jobs");
        return;
      }

      setProposals(proposalsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterProposals = () => {
    let filtered = [...proposals];

    // Filter by tab
    if (proposalTab === "shortlisted") {
      filtered = filtered.filter(p => p.status === "shortlisted");
    } else if (proposalTab === "messaged") {
      filtered = filtered.filter(p => p.isMessaged);
    } else if (proposalTab === "archived") {
      filtered = filtered.filter(p => p.status === "archived");
    }

    // Filter by search query
    if (proposalSearchQuery.trim()) {
      const query = proposalSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.provider?.fullName?.toLowerCase().includes(query) ||
          p.proposalText?.toLowerCase().includes(query)
      );
    }

    setFilteredProposals(filtered);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push("/all-jobs")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {isLoading ? "Loading..." : job?.title || "Job Proposals"}
            </h1>
          </div>

          {!isLoading && job && (
            <>
              {/* Workflow Steps */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <div className="flex items-center justify-center gap-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                      ✓
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Post</span>
                  </div>
                  <div className="h-0.5 w-16 bg-green-500"></div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                      ✓
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Find</span>
                  </div>
                  <div className="h-0.5 w-16 bg-red-500"></div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center text-white font-semibold">
                      3
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white font-semibold">Review</span>
                  </div>
                  <div className="h-0.5 w-16 bg-gray-300 dark:bg-gray-600"></div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 font-semibold">
                      4
                    </div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Hire</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
                <div className="flex gap-4 px-6 pt-4 border-b border-gray-200 dark:border-gray-700">
                  {[
                    { id: "all" as ProposalTabType, label: "All" },
                    { id: "shortlisted" as ProposalTabType, label: "Shortlisted" },
                    { id: "messaged" as ProposalTabType, label: "Messaged" },
                    { id: "archived" as ProposalTabType, label: "Archived" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setProposalTab(tab.id)}
                      className={`pb-3 px-1 font-medium transition-colors ${
                        proposalTab === tab.id
                          ? "text-red-500 border-b-2 border-red-500"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search and Filter */}
                <div className="flex gap-4 px-6 py-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search proposals"
                      value={proposalSearchQuery}
                      onChange={(e) => setProposalSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <button className="p-2 border border-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors bg-red-500">
                    <Filter className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Proposals List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                {filteredProposals.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No proposals yet
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Proposals will appear here when providers apply for this job.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredProposals.map((proposal) => (
                      <div
                        key={proposal.applicationId}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-4">
                          {/* Provider Avatar */}
                          <div className="flex-shrink-0">
                            {proposal.provider?.photoUrl ? (
                              <img
                                src={proposal.provider.photoUrl}
                                alt={proposal.provider.fullName}
                                className="h-12 w-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold">
                                {proposal.provider?.fullName?.charAt(0).toUpperCase() || "P"}
                              </div>
                            )}
                          </div>

                          {/* Proposal Content */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {proposal.provider?.fullName || "Unknown Provider"}
                                </h3>
                                {proposal.provider?.isVerified && (
                                  <span className="inline-block ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                                    Verified
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-red-500">
                                  ${proposal.bidAmount}
                                </p>
                                {proposal.estimatedDuration && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {proposal.estimatedDuration}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Rating */}
                            {proposal.provider && (proposal.provider.totalRating > 0 || proposal.provider.totalReviews > 0) && (
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  ⭐ {proposal.provider.totalRating.toFixed(1)}
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  ({proposal.provider.totalReviews} reviews)
                                </span>
                              </div>
                            )}

                            {/* Proposal Text */}
                            <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">
                              {proposal.proposalText}
                            </p>

                            {/* Status and Actions */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  proposal.status === "submitted"
                                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                    : proposal.status === "shortlisted"
                                    ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                    : proposal.isHired
                                    ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                }`}>
                                  {proposal.isHired ? "HIRED" : proposal.status.toUpperCase()}
                                </span>
                                {proposal.isMessaged && (
                                  <span className="text-xs text-gray-600 dark:text-gray-400">
                                    Messaged
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium">
                                  Message
                                </button>
                                {!proposal.isHired && (
                                  <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium">
                                    Hire
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
