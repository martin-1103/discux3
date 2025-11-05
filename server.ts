import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initializeSocket } from './src/lib/services/socket-service'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

// Create the Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize Socket.io
  initializeSocket(server)
  console.log('[Socket] Socket.io server initialized')

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})