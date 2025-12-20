"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ChatMessage } from "@/components/dashboard/ChatMessage";
import { ChatInput } from "@/components/dashboard/ChatInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getMessagesByChatRoomId, getChatRoomById } from "@/lib/mock-data/messages";
import { getUserById } from "@/lib/mock-data/users";
import { MessageWithSender } from "@/lib/types/message";
import { getMockSession } from "@/lib/auth/mock";

export default function ChatDetailsPage() {
  const params = useParams();
  const chatRoomId = params.id as string;
  const session = getMockSession();
  const currentUserId = session?.id || "";
  
  const chatRoom = getChatRoomById(chatRoomId);
  const roomMessages = getMessagesByChatRoomId(chatRoomId);
  
  // Find the other participant
  const otherParticipantId = chatRoom?.participantIds.find(id => id !== currentUserId);
  const otherUser = otherParticipantId ? getUserById(otherParticipantId) : undefined;

  const [newMessages, setNewMessages] = useState<MessageWithSender[]>([]);

  // Format messages with sender info
  const allMessages: MessageWithSender[] = [
    ...roomMessages.map(msg => ({
      ...msg,
      sender: msg.senderId !== currentUserId && otherUser ? {
        id: otherUser.id,
        fullName: otherUser.fullName || "Unknown",
        photoUrl: otherUser.photoUrl,
      } : undefined,
    })),
    ...newMessages,
  ];

  const handleSendMessage = (content: string) => {
    const newMessage: MessageWithSender = {
      messageId: `new-${Date.now()}`,
      chatRoomId,
      senderId: currentUserId,
      type: "text",
      text: content,
      status: "sent",
      timestamp: new Date().toISOString(),
      deletedForEveryone: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: undefined, // Own messages don't need sender
    };
    setNewMessages([...newMessages, newMessage]);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col">
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar 
                src={otherUser?.photoUrl} 
                name={otherUser?.fullName || "User"}
              />
              <div>
                <CardTitle>{otherUser?.fullName || "Unknown User"}</CardTitle>
              </div>
            </div>
          </CardHeader>
        </Card>
        
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {allMessages.map((message) => (
              <ChatMessage
                key={message.messageId}
                message={message}
                isOwn={message.senderId === currentUserId}
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

