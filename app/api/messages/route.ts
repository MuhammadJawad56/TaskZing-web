import { NextResponse } from "next/server";
import { getChatRoomsByUserId, chatRooms } from "@/lib/mock-data/messages";
import { getUserById } from "@/lib/mock-data/users";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const chatRoomId = searchParams.get("chatRoomId");

  if (chatRoomId) {
    // Return messages for specific chat room
    const { getMessagesByChatRoomId } = await import("@/lib/mock-data/messages");
    const messages = getMessagesByChatRoomId(chatRoomId);
    return NextResponse.json(messages);
  }

  if (userId) {
    // Return chat rooms for user
    const userRooms = getChatRoomsByUserId(userId);
    
    // Enrich with participant data
    const enrichedRooms = userRooms.map((room) => {
      const otherParticipantId = room.participantIds.find((id) => id !== userId);
      const otherParticipant = otherParticipantId ? getUserById(otherParticipantId) : undefined;

      return {
        ...room,
        otherParticipant: otherParticipant ? {
          id: otherParticipant.id,
          fullName: otherParticipant.fullName || "Unknown",
          photoUrl: otherParticipant.photoUrl,
        } : undefined,
      };
    });

    return NextResponse.json(enrichedRooms);
  }

  return NextResponse.json(chatRooms);
}

