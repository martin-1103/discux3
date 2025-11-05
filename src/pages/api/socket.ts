import { NextApiRequest, NextApiResponse } from "next"
import { NextApiResponseWithSocket, initializeSocket } from "@/lib/services/socket-service"
import { Server as NetServer } from "http"

export const config = {
  api: {
    bodyParser: false,
  },
}

// Socket.io handler
const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (res.socket.server.io) {
    console.log("[Socket] Socket.io already initialized")
    res.end()
    return
  }

  console.log("[Socket] Initializing Socket.io server")

  // Initialize Socket.io
  const httpServer: NetServer = res.socket.server as any
  const io = initializeSocket(httpServer)

  // Store io instance on response socket
  res.socket.server.io = io

  res.end()
}

export default SocketHandler