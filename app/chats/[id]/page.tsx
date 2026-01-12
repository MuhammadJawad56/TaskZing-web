"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/firebase/AuthContext";
import { ChatRoomWithParticipants, MessageWithSender } from "@/lib/types/message";
import {
  getChatRoomsByUserId,
  getMessagesByChatRoomId,
  sendMessage,
  subscribeToMessages,
} from "@/lib/firebase/messages";
import { Send, ArrowLeft, AlertCircle, MessageSquare } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export default function ChatDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const chatRoomId = params.id as string;

  const { user, loading: authLoading } = useAuth();
  const [chatRoom, setChatRoom] = useState<ChatRoomWithParticipants | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesUnsubRef = useRef<(() => void) | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load chat room data
  const loadChatRoom = useCallback(async () => {
    if (!user || !chatRoomId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get chat rooms and find the current one
      const rooms = await getChatRoomsByUserId(user.uid);
      const room = rooms.find((r) => r.chatRoomId === chatRoomId);

      if (room) {
        setChatRoom(room);
      } else {
        setError("Chat room not found");
      }

      // Load initial messages
      const msgs = await getMessagesByChatRoomId(chatRoomId);
      setMessages(msgs);
    } catch (err: any) {
      console.error("Error loading chat:", err);
      setError(`Failed to load chat: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [user, chatRoomId]);

  // Initial load
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsLoading(false);
      return;
    }

    loadChatRoom();
  }, [user, authLoading, loadChatRoom]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!chatRoomId || !user) return;

    // Clean up existing subscription
    if (messagesUnsubRef.current) {
      messagesUnsubRef.current();
      messagesUnsubRef.current = null;
    }

    console.log("Setting up messages subscription for room:", chatRoomId);

    messagesUnsubRef.current = subscribeToMessages(chatRoomId, (msgs) => {
      console.log("Received messages update:", msgs.length, "messages");
      setMessages(msgs);
    });

    return () => {
      if (messagesUnsubRef.current) {
        messagesUnsubRef.current();
        messagesUnsubRef.current = null;
      }
    };
  }, [chatRoomId, user?.uid]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatRoomId || !user || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(chatRoomId, user.uid, newMessage.trim());
      setNewMessage("");
    } catch (err: any) {
      console.error("Error sending message:", err);
      alert(`Failed to send message: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  const formatMessageDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "";

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
      } else {
        return date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });
      }
    } catch {
      return "";
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatMessageDate(message.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, MessageWithSender[]>);

  // Show loading state during auth check
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Please Log In
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              You need to be logged in to view messages
            </p>
            <Link
              href="/login"
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col">
        {/* Header */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <Avatar
                src={chatRoom?.otherParticipant?.photoUrl}
                name={chatRoom?.otherParticipant?.fullName || "User"}
              />
              <div className="flex-1">
                <CardTitle>
                  {chatRoom?.otherParticipant?.fullName || "Loading..."}
                </CardTitle>
                {chatRoom?.jobId && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Task: {chatRoom.jobId}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Messages */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Start the conversation!
                </p>
              </div>
            ) : (
              <>
                {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                  <div key={date}>
                    {/* Date separator */}
                    <div className="flex items-center justify-center my-4">
                      <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded-full">
                        {date}
                      </span>
                    </div>

                    {/* Messages for this date */}
                    {dateMessages.map((message) => {
                      const isOwn = message.senderId === user?.uid;
                      return (
                        <div
                          key={message.messageId}
                          className={cn(
                            "flex mb-3",
                            isOwn ? "justify-end" : "justify-start"
                          )}
                        >
                          {!isOwn && (
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-2 flex-shrink-0">
                              {message.sender?.photoUrl ? (
                                <img
                                  src={message.sender.photoUrl}
                                  alt={message.sender.fullName}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-xs text-gray-500 font-semibold">
                                  {(message.sender?.fullName || "U").charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                          )}
                          <div
                            className={cn(
                              "max-w-[70%] rounded-2xl px-4 py-2 shadow-sm",
                              isOwn
                                ? "bg-red-500 text-white rounded-br-md"
                                : "bg-white dark:bg-darkBlue-003 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-md"
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.text}
                            </p>
                            {message.mediaUrl && (
                              <div className="mt-2">
                                <img
                                  src={message.mediaUrl}
                                  alt="Media"
                                  className="max-w-full rounded-lg"
                                />
                              </div>
                            )}
                            <p
                              className={cn(
                                "text-xs mt-1",
                                isOwn
                                  ? "text-red-100"
                                  : "text-gray-400 dark:text-gray-500"
                              )}
                            >
                              {formatMessageTime(message.timestamp)}
                              {isOwn && message.status && (
                                <span className="ml-1">
                                  {message.status === "sent" && "✓"}
                                  {message.status === "delivered" && "✓✓"}
                                  {message.status === "read" && "✓✓"}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          {/* Message Input */}
          <div className="p-4 border-t border-theme-accent2 bg-white dark:bg-darkBlue-003">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-800 dark:text-white placeholder-gray-400"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className={cn(
                  "p-3 rounded-full transition-all duration-200",
                  newMessage.trim() && !isSending
                    ? "bg-red-500 text-white hover:bg-red-600 shadow-lg hover:shadow-xl"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                )}
              >
                {isSending ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </form>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
