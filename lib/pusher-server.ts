import Pusher from "pusher"

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.PUSHER_KEY || "", // Changed from NEXT_PUBLIC_PUSHER_KEY to PUSHER_KEY
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.PUSHER_CLUSTER || "", // Changed from NEXT_PUBLIC_PUSHER_CLUSTER to PUSHER_CLUSTER
  useTLS: true,
})
