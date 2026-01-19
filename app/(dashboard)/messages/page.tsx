"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/firebase/AuthContext";
import { ChatRoomWithParticipants } from "@/lib/types/message";
import { cn } from "@/lib/utils/cn";
import {
  getChatRoomsByUserId,
  subscribeToChatRooms,
} from "@/lib/firebase/messages";
import { RefreshCw, AlertCircle, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [chatRooms, setChatRooms] = useState<ChatRoomWithParticipants[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs to track subscription state
  const chatRoomsUnsubRef = useRef<(() => void) | null>(null);
  const isSubscribedRef = useRef(false);

  // Load chat rooms using one-time fetch (avoid subscription conflicts)
  const loadChatRooms = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      console.log("Loading chat rooms for user:", user.uid);
      
      const rooms = await getChatRoomsByUserId(user.uid);
      console.log("Loaded chat rooms:", rooms);
      
      setChatRooms(rooms);
    } catch (err: any) {
      console.error("Error loading chat rooms:", err);
      setError(`Failed to load conversations: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial load of chat rooms
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setIsLoading(false);
      setError("Please log in to view messages");
      return;
    }

    loadChatRooms();
  }, [user, authLoading, loadChatRooms]);

  // Set up real-time subscription for chat rooms (single subscription)
  useEffect(() => {
    if (!user || isSubscribedRef.current) return;

    console.log("Setting up chat rooms subscription for user:", user.uid);
    isSubscribedRef.current = true;
    
    // Clean up any existing subscription
    if (chatRoomsUnsubRef.current) {
      chatRoomsUnsubRef.current();
    }

    chatRoomsUnsubRef.current = subscribeToChatRooms(user.uid, (rooms) => {
      console.log("Received chat rooms update:", rooms.length, "rooms");
      setChatRooms(rooms);
      setIsLoading(false);
      setError(null);
    });

    return () => {
      if (chatRoomsUnsubRef.current) {
        chatRoomsUnsubRef.current();
        chatRoomsUnsubRef.current = null;
      }
      isSubscribedRef.current = false;
    };
  }, [user?.uid]);


  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "";
      
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      } else if (diffDays === 1) {
        return "Yesterday";
      } else if (diffDays < 7) {
        return date.toLocaleDateString("en-US", { weekday: "short" });
      } else {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
    } catch {
      return "";
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

  // Show loading state during auth check
  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <AlertCircle className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Please Log In
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            You need to be logged in to view your messages
          </p>
          <Link
            href="/login"
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
        <button
          onClick={loadChatRooms}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-darkBlue-003 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[calc(100vh-120px)] lg:h-[calc(100vh-200px)]">
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading conversations...</p>
              </div>
            ) : chatRooms.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No conversations yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Start a conversation from a task or profile
                </p>
              </div>
            ) : (
              chatRooms.map((room) => (
                <button
                  key={room.chatRoomId}
                  onClick={() => router.push(`/chats/${room.chatRoomId}`)}
                  className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                >
                  {/* Profile Picture */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                      {room.otherParticipant?.photoUrl ? (
                        <img
                          src={room.otherParticipant.photoUrl}
                          alt={room.otherParticipant.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 font-semibold text-lg">
                          {(room.otherParticipant?.fullName || "U").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {room.unreadCount && room.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-medium">
                          {room.unreadCount > 9 ? "9+" : room.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Name and Message */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {room.otherParticipant?.fullName || "Unknown User"}
                      </p>
                      {room.lastMessageAt && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                          {formatTime(room.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    {room.lastMessage?.text && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {typeof room.lastMessage.text === "string" ? room.lastMessage.text : room.lastMessage.text?.text || ""}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
