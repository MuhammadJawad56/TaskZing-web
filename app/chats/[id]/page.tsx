"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { ChatMessage } from "@/components/dashboard/ChatMessage";
import { ChatInput } from "@/components/dashboard/ChatInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { messages } from "@/lib/mock-data/messages";
import { users } from "@/lib/mock-data/users";

export default function ChatDetailsPage() {
  const params = useParams();
  const roomId = params.id as string;
  
  const roomMessages = messages.filter(m => m.roomId === roomId);
  const otherUserId = roomMessages[0]?.senderId !== "current-user" 
    ? roomMessages[0]?.senderId 
    : roomMessages[0]?.receiverId;
  const otherUser = users.find(u => u.id === otherUserId);

  const [newMessages, setNewMessages] = useState<any[]>([]);
  const allMessages = [...roomMessages, ...newMessages];

  const handleSendMessage = (content: string) => {
    setNewMessages([...newMessages, {
      id: `new-${Date.now()}`,
      roomId,
      senderId: "current-user",
      receiverId: otherUserId,
      text: content,
      content: content,
      timestamp: new Date().toISOString(),
      read: false,
      sender: undefined,
    }]);
  };

  const formatMessages = (msgs: any[]) => {
    return msgs.map(msg => ({
      ...msg,
      sender: msg.senderId === "current-user" ? undefined : otherUser,
    }));
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col">
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar src={otherUser?.photoUrl} alt={otherUser?.fullName || "User"} />
              <div>
                <CardTitle>{otherUser?.fullName || "Unknown User"}</CardTitle>
              </div>
            </div>
          </CardHeader>
        </Card>
        
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {formatMessages(allMessages).map((message) => (
              <ChatMessage
                key={message.id}
                message={message as any}
                isOwn={message.senderId === "current-user"}
              />
            ))}
          </CardContent>
          <div className="p-4 border-t border-theme-accent2">
            <ChatInput onSend={handleSendMessage} />
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

