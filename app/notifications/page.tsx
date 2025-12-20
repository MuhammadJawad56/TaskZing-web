"use client";

import React from "react";
import { Bell, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function NotificationsPage() {
  const notifications = [
    {
      id: "1",
      type: "success",
      title: "Proposal Accepted",
      message: "Your proposal for 'Website Redesign' has been accepted",
      timestamp: new Date(),
      read: false,
    },
    {
      id: "2",
      type: "info",
      title: "New Message",
      message: "You have a new message from John Doe",
      timestamp: new Date(Date.now() - 3600000),
      read: false,
    },
    {
      id: "3",
      type: "warning",
      title: "Task Reminder",
      message: "Task 'Mobile App Development' is due in 2 days",
      timestamp: new Date(Date.now() - 7200000),
      read: true,
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-accent-success" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-accent-yellow" />;
      default:
        return <Info className="h-5 w-5 text-primary-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-theme-primaryText mb-8">Notifications</h1>
        
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Bell className="h-12 w-12 text-theme-accent4 mx-auto mb-4" />
                <p className="text-theme-accent4">No notifications</p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <Card key={notification.id} className={!notification.read ? "border-l-4 border-l-primary-500" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {getIcon(notification.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-theme-primaryText">{notification.title}</h3>
                        {!notification.read && (
                          <Badge variant="default">New</Badge>
                        )}
                      </div>
                      <p className="text-sm text-theme-accent4 mt-1">{notification.message}</p>
                      <p className="text-xs text-theme-accent4 mt-2">
                        {notification.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

