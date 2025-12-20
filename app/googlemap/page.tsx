"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function GoogleMapPage() {
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-theme-primaryText mb-8">Location Map</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Map View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 bg-theme-accent2 rounded-lg flex items-center justify-center">
              <p className="text-theme-accent4">Google Maps integration will be implemented here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

