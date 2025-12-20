import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { getUserById } from "@/lib/mock-data/users";
import type { Metadata } from "next";

interface ProfilePageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const user = getUserById(params.id);
  
  if (!user) {
    return {
      title: "Profile Not Found",
    };
  }

  return {
    title: `${user.fullName} | TaskZing`,
    description: `View ${user.fullName}'s profile on TaskZing`,
  };
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const user = getUserById(params.id);

  if (!user) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar size="lg" src={user.photoUrl} alt={user.fullName || "User"} />
              <div className="flex-1">
                <CardTitle className="text-2xl">{user.fullName || "User"}</CardTitle>
                <p className="text-theme-accent4 mt-1">{user.location || "Location not specified"}</p>
                {user.isVerified && (
                  <Badge variant="success" className="mt-2">Verified</Badge>
                )}
              </div>
              <Link href={`/task/new?provider=${user.id}`}>
                <Button variant="primary">Hire Now</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {user.description && (
              <div>
                <h3 className="font-semibold text-theme-primaryText mb-2">About</h3>
                <p className="text-theme-accent4">{user.description}</p>
              </div>
            )}
            {user.skills && user.skills.length > 0 && (
              <div>
                <h3 className="font-semibold text-theme-primaryText mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {user.skills.map((skill, i) => (
                    <Badge key={i} variant="default">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}
            {user.totalRating && (
              <div>
                <h3 className="font-semibold text-theme-primaryText mb-2">Rating</h3>
                <p className="text-2xl font-bold text-theme-primaryText">{user.totalRating.toFixed(1)}</p>
                <p className="text-sm text-theme-accent4">{user.totalReviews || 0} reviews</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

