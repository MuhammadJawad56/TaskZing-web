"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/api/AuthContext";
import { ChatRoomWithParticipants } from "@/lib/types/message";
import { cn } from "@/lib/utils/cn";
import {
  getChatRoomsByUserId,
  subscribeToChatRooms,
} from "@/lib/api/messages";
import { MessageSquare, RefreshCw } from "lucide-react";

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [chatRooms, setChatRooms] = useState<ChatRoomWithParticipants[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load chat rooms
  useEffect(() => {
    if (user) {
      console.log("User logged in:", {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });
      loadChatRooms();
    } else {
      console.log("No user logged in");
      setIsLoading(false);
    }
  }, [user]);

  // Subscribe to real-time chat rooms updates
  useEffect(() => {
    if (!user) {
      console.log("No user, skipping subscription");
      return;
    }

    console.log("Setting up chat rooms subscription for user:", user.uid);
    const unsubscribe = subscribeToChatRooms(user.uid, (rooms) => {
      console.log("Chat rooms updated via subscription:", rooms.length, rooms);
      setChatRooms(rooms);
      setIsLoading(false);
    });

    return () => {
      console.log("Unsubscribing from chat rooms");
      unsubscribe();
    };
  }, [user]);

  const loadChatRooms = async () => {
    if (!user) {
      console.log("No user found, cannot load chat rooms");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log("Loading chat rooms for user:", user.uid, user.email);
      
      const rooms = await getChatRoomsByUserId(user.uid);
      console.log("Loaded chat rooms:", rooms);
      setChatRooms(rooms);
    } catch (error: any) {
      console.error("Error loading chat rooms:", error);
    } finally {
      setIsLoading(false);
    }
  };


  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getLastMessageTime = (room: ChatRoomWithParticipants) => {
    if (room.lastMessageAt) {
      return formatTime(room.lastMessageAt);
    }
    return "";
  };

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

      {/* Messages List */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-darkBlue-003 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[calc(100vh-120px)] lg:h-[calc(100vh-200px)]">
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
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
                  {room.otherParticipant && (
                    <>
                      {/* Profile Picture */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                          {room.otherParticipant.photoUrl ? (
                            <img
                              src={room.otherParticipant.photoUrl}
                              alt={room.otherParticipant.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-600 dark:text-gray-400 font-semibold">
                              {room.otherParticipant.fullName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        {/* Online status dot */}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 rounded-full border-2 border-white dark:border-darkBlue-003"></div>
                      </div>

                      {/* Name and Message */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {room.otherParticipant.fullName}
                        </p>
                        {room.lastMessage && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">
                            {room.lastMessage.text || "Media"}
                          </p>
                        )}
                      </div>

                      {/* Time */}
                      {room.lastMessageAt && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                          {getLastMessageTime(room)}
                        </div>
                      )}
                    </>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

