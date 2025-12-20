"use client";

import React, { useState, useEffect } from "react";
import { ChatMessage, ChatInput } from "@/components/dashboard";
import { ChatRoomWithParticipants, MessageWithSender } from "@/lib/types/message";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { getMockSession } from "@/lib/auth/mock";

export default function MessagesPage() {
  const [chatRooms, setChatRooms] = useState<ChatRoomWithParticipants[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const session = getMockSession();

  useEffect(() => {
    // Fetch chat rooms
    if (session) {
      fetch(`/api/messages?userId=${session.id}`)
        .then((res) => res.json())
        .then((data) => {
          setChatRooms(data);
          if (data.length > 0) {
            setSelectedRoom(data[0].chatRoomId);
          }
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }
  }, [session]);

  useEffect(() => {
    if (selectedRoom) {
      // Fetch messages for selected room
      fetch(`/api/messages?chatRoomId=${selectedRoom}`)
        .then((res) => res.json())
        .then((data) => {
          setMessages(data);
        });
    }
  }, [selectedRoom]);

  const handleSendMessage = (text: string) => {
    // In a real app, this would send to API
    const newMessage: MessageWithSender = {
      messageId: `msg-${Date.now()}`,
      chatRoomId: selectedRoom!,
      senderId: session?.id || "",
      type: "text",
      text,
      status: "sent",
      timestamp: new Date().toISOString(),
      deletedForEveryone: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: {
        id: session?.id || "",
        fullName: session?.fullName || "You",
      },
    };
    setMessages([...messages, newMessage]);
  };

  const selectedRoomData = chatRooms.find((r) => r.chatRoomId === selectedRoom);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">Messages</h1>
        <p className="text-secondary-600 mt-2">Chat with clients and professionals</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Chat List */}
        <div className="lg:col-span-1 border border-secondary-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-secondary-200 bg-secondary-50">
            <h2 className="font-semibold text-secondary-900">Conversations</h2>
          </div>
          <div className="overflow-y-auto h-[calc(100%-60px)]">
            {isLoading ? (
              <div className="p-4 text-center text-secondary-500">Loading...</div>
            ) : chatRooms.length === 0 ? (
              <div className="p-4 text-center text-secondary-500">No conversations</div>
            ) : (
              chatRooms.map((room) => (
                <button
                  key={room.chatRoomId}
                  onClick={() => setSelectedRoom(room.chatRoomId)}
                  className={`w-full p-4 text-left border-b border-secondary-200 hover:bg-secondary-50 transition-colors ${
                    selectedRoom === room.chatRoomId ? "bg-primary-50" : ""
                  }`}
                >
                  {room.otherParticipant && (
                    <div className="flex items-center space-x-3">
                      <Avatar
                        src={room.otherParticipant.photoUrl}
                        name={room.otherParticipant.fullName}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-secondary-900 truncate">
                          {room.otherParticipant.fullName}
                        </p>
                        {room.lastMessage && (
                          <p className="text-sm text-secondary-600 truncate">
                            {room.lastMessage.text?.substring(0, 50)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2 flex flex-col border border-secondary-200 rounded-lg overflow-hidden">
          {selectedRoom ? (
            <>
              <div className="p-4 border-b border-secondary-200 bg-secondary-50">
                {selectedRoomData?.otherParticipant && (
                  <div className="flex items-center space-x-3">
                    <Avatar
                      src={selectedRoomData.otherParticipant.photoUrl}
                      name={selectedRoomData.otherParticipant.fullName}
                      size="md"
                    />
                    <div>
                      <p className="font-semibold text-secondary-900">
                        {selectedRoomData.otherParticipant.fullName}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-secondary-50">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.messageId}
                    message={message}
                    isOwn={message.senderId === session?.id}
                  />
                ))}
              </div>
              <ChatInput onSend={handleSendMessage} />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-secondary-500">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

