"use client";

import React from "react";
import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function ReviewsPage() {
  const reviews = [
    {
      id: "1",
      reviewer: "John Doe",
      rating: 5,
      comment: "Excellent work! Very professional and delivered on time.",
      date: new Date(),
    },
    {
      id: "2",
      reviewer: "Jane Smith",
      rating: 4,
      comment: "Good quality work, would recommend.",
      date: new Date(Date.now() - 86400000),
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-theme-primaryText mb-8">Reviews</h1>
        
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar src="/images/icons/profile.jpg" alt={review.reviewer} />
                    <div>
                      <CardTitle className="text-lg">{review.reviewer}</CardTitle>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? "fill-accent-yellow text-accent-yellow"
                                : "text-theme-accent2"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-theme-accent4">{review.date.toLocaleDateString()}</p>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-theme-primaryText">{review.comment}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

