"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { categories } from "@/lib/mock-data/categories";

export default function PostTaskPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    subCategory: "",
    jobType: "fixed",
    price: "",
    estimatedDuration: "",
    address: "",
    urgency: "normal",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would submit to an API
    alert("Task posted successfully!");
    router.push("/dashboard");
  };

  const categoryOptions = [
    { value: "", label: "Select a category" },
    ...categories.map((cat) => ({
      value: cat.id,
      label: `${cat.mainCategory}${cat.subCategory ? ` - ${cat.subCategory}` : ""}`,
    })),
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">Post a Task</h1>
        <p className="text-secondary-600 mt-2">Create a new task listing</p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Task Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Need a website designer"
            />

            <Textarea
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={6}
              placeholder="Describe your task in detail..."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Category"
                options={categoryOptions}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              />

              <Select
                label="Job Type"
                options={[
                  { value: "fixed", label: "Fixed Price" },
                  { value: "hourly", label: "Hourly Rate" },
                ]}
                value={formData.jobType}
                onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={formData.jobType === "fixed" ? "Fixed Price ($)" : "Hourly Rate ($)"}
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                min="0"
                step="0.01"
              />

              {formData.jobType === "hourly" && (
                <Input
                  label="Estimated Duration (hours)"
                  type="number"
                  value={formData.estimatedDuration}
                  onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                  min="1"
                />
              )}
            </div>

            <Input
              label="Location"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
              placeholder="Enter full address"
            />

            <Select
              label="Urgency"
              options={[
                { value: "low", label: "Low" },
                { value: "normal", label: "Normal" },
                { value: "high", label: "High" },
                { value: "urgent", label: "Urgent" },
              ]}
              value={formData.urgency}
              onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
            />

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Post Task
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

