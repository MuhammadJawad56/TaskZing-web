"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { users } from "@/lib/mock-data/users";

export default function ClientExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const providers = users.filter(u => u.role === "provider");

  const filteredProviders = providers.filter(p =>
    p.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-theme-primaryText mb-8">Explore Providers</h1>
        
        <div className="mb-6">
          <Input
            type="text"
            placeholder="Search providers by name or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map((provider) => (
            <Card key={provider.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar src={provider.photoUrl} alt={provider.fullName || "Provider"} />
                  <div className="flex-1">
                    <CardTitle className="text-lg">{provider.fullName || "Provider"}</CardTitle>
                    <p className="text-sm text-theme-accent4">{provider.location}</p>
                    {provider.isVerified && (
                      <Badge variant="success" className="mt-1">Verified</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {provider.skills && provider.skills.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {provider.skills.slice(0, 3).map((skill, i) => (
                        <Badge key={i} variant="default">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {provider.totalRating && (
                  <div className="mb-4">
                    <p className="text-sm text-theme-accent4">Rating</p>
                    <p className="text-xl font-bold text-theme-primaryText">{provider.totalRating.toFixed(1)}</p>
                  </div>
                )}
                <Link href={`/profile/${provider.id}`}>
                  <Button variant="primary" className="w-full">View Profile</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

