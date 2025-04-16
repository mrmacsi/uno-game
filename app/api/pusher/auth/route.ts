import { NextResponse } from "next/server"
import { pusherServer } from "@/lib/pusher-server"

export async function POST(request: Request) {
  const body = await request.json()
  const { socket_id, channel_name } = body

  const authResponse = pusherServer.authorizeChannel(socket_id, channel_name)

  return NextResponse.json(authResponse)
}
