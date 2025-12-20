"use client";

import React from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { chatRooms, getMessagesByChatRoomId } from "@/lib/mock-data/messages";
import { getUserById } from "@/lib/mock-data/users";
import { getMockSession } from "@/lib/auth/mock";

export default function ChatsPage() {
  const session = getMockSession();
  const currentUserId = session?.id || "";

  const chatRoomsList = chatRooms.map(room => {
    const roomMessages = getMessagesByChatRoomId(room.chatRoomId);
    const lastMessage = roomMessages[roomMessages.length - 1];
    
    // Find the other participant
    const otherParticipantId = room.participantIds.find(id => id !== currentUserId);
    const otherUser = otherParticipantId ? getUserById(otherParticipantId) : undefined;
    
    // Count unread messages (messages not sent by current user and with status that indicates unread)
    // Note: The Message type doesn't have a 'read' field, so we'll use status === "sent" as unread indicator
    const unreadCount = roomMessages.filter(
      m => m.senderId !== currentUserId && m.status === "sent"
    ).length;

    return {
      chatRoomId: room.chatRoomId,
      otherUser,
      lastMessage,
      unreadCount,
    };
  });

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-theme-primaryText mb-8">Messages</h1>
        
        <div className="space-y-2">
          {chatRoomsList.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-12 w-12 text-theme-accent4 mx-auto mb-4" />
                <p className="text-theme-accent4">No messages yet</p>
              </CardContent>
            </Card>
          ) : (
            chatRoomsList.map((room) => (
              <Link key={room.chatRoomId} href={`/chats/${room.chatRoomId}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar 
                        src={room.otherUser?.photoUrl} 
                        name={room.otherUser?.fullName || "User"}
                      />
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
                        <p className="text-sm text-theme-accent4 truncate">
                          {room.lastMessage?.text || ""}
                        </p>
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

