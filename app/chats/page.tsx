"use client";

import React from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { messages } from "@/lib/mock-data/messages";
import { users } from "@/lib/mock-data/users";

export default function ChatsPage() {
  const chatRooms = Array.from(new Set(messages.map(m => m.roomId))).map(roomId => {
    const roomMessages = messages.filter(m => m.roomId === roomId);
    const lastMessage = roomMessages[roomMessages.length - 1];
    const otherUserId = lastMessage.senderId !== "current-user" ? lastMessage.senderId : lastMessage.receiverId;
    const otherUser = users.find(u => u.id === otherUserId);
    return {
      roomId,
      otherUser,
      lastMessage,
      unreadCount: roomMessages.filter(m => m.senderId !== "current-user" && !m.read).length,
    };
  });

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-theme-primaryText mb-8">Messages</h1>
        
        <div className="space-y-2">
          {chatRooms.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-12 w-12 text-theme-accent4 mx-auto mb-4" />
                <p className="text-theme-accent4">No messages yet</p>
              </CardContent>
            </Card>
          ) : (
            chatRooms.map((room) => (
              <Link key={room.roomId} href={`/chats/${room.roomId}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar src={room.otherUser?.photoUrl} alt={room.otherUser?.fullName || "User"} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-theme-primaryText">
                            {room.otherUser?.fullName || "Unknown User"}
                          </h3>
                          {room.unreadCount > 0 && (
                            <span className="bg-primary-500 text-white text-xs rounded-full px-2 py-1">
                              {room.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-theme-accent4 truncate">{room.lastMessage.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

