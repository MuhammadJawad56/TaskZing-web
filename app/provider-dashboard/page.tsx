"use client";

import React from "react";
import Link from "next/link";
import { Search, FileText, MessageSquare, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function ProviderDashboardPage() {
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-theme-primaryText mb-4">Provider Dashboard</h1>
          <p className="text-theme-accent4">Manage your services and earnings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Earnings"
            value="$5,250"
            icon={<DollarSign className="h-6 w-6" />}
            trend="+12%"
          />
          <StatsCard
            title="Active Jobs"
            value="8"
            icon={<FileText className="h-6 w-6" />}
            trend="+2"
          />
          <StatsCard
            title="Proposals"
            value="24"
            icon={<FileText className="h-6 w-6" />}
            trend="+5"
          />
          <StatsCard
            title="Messages"
            value="12"
            icon={<MessageSquare className="h-6 w-6" />}
            trend="+3"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/provider-explore">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <Search className="h-12 w-12 text-primary-500 mx-auto mb-4" />
                <h3 className="font-semibold text-theme-primaryText mb-2">Explore Jobs</h3>
                <p className="text-sm text-theme-accent4">Find new opportunities</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/showcase-work">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-primary-500 mx-auto mb-4" />
                <h3 className="font-semibold text-theme-primaryText mb-2">Showcase Work</h3>
                <p className="text-sm text-theme-accent4">Add your portfolio</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}

