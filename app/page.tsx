import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-red-500 to-yellow-500">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight text-red-600">UNO</h1>
          <p className="mt-4 text-gray-600">Play the classic card game online with friends</p>
        </div>

        <div className="space-y-4">
          <Link href="/create-room" className="w-full">
            <Button className="w-full bg-red-600 hover:bg-red-700 text-lg py-6">Create Room</Button>
          </Link>

          <Link href="/join-room" className="w-full">
            <Button variant="outline" className="w-full text-lg py-6 border-2">
              Join Room
            </Button>
          </Link>
        </div>

        <div className="text-center text-sm text-gray-500 pt-4">
          <p>Built with Next.js and Pusher</p>
        </div>
      </div>
    </main>
  )
}
