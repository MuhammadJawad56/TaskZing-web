import React from "react";
import { notFound } from "next/navigation";
import { getTaskById } from "@/lib/mock-data/tasks";
import { getUserById } from "@/lib/mock-data/users";
import { TaskDetailView } from "@/components/task/TaskDetailView";
import type { Metadata } from "next";

interface JobDetailsPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: JobDetailsPageProps): Promise<Metadata> {
  const task = getTaskById(params.id);
  
  if (!task) {
    return {
      title: "Job Not Found",
    };
  }

  return {
    title: task.title,
    description: task.description.substring(0, 160),
  };
}

export default function JobDetailsPage({ params }: JobDetailsPageProps) {
  const task = getTaskById(params.id);

  if (!task) {
    notFound();
  }

  const client = getUserById(task.clientId);
  const contractor = task.contractorId ? getUserById(task.contractorId) : undefined;

  const taskWithDetails = {
    ...task,
    client: client ? {
      id: client.id,
      fullName: client.fullName || "Unknown",
      photoUrl: client.photoUrl,
      isVerified: client.isVerified,
      totalRating: client.totalRating,
    } : undefined,
    contractor: contractor ? {
      id: contractor.id,
      fullName: contractor.fullName || "Unknown",
      photoUrl: contractor.photoUrl,
    } : undefined,
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl mx-auto">
        <TaskDetailView task={taskWithDetails} showApplyButton={true} />
      </div>
    </div>
  );
}

