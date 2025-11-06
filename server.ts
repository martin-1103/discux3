import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initializeSocket } from './src/lib/services/socket-service'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = Number(process.env.PORT) || 3000

async function startServer() {
  try {
    console.log(`[Server] Starting ${dev ? 'development' : 'production'} server...`)
    console.log(`[Server] Hostname: ${hostname}`)
    console.log(`[Server] Port: ${port}`)

    // Create the Next.js app with proper error handling
    const app = next({
      dev,
      hostname,
      port: Number(port),
      dir: './', // Ensure correct working directory
      quiet: false // Show build output
    })

    const handle = app.getRequestHandler()

    console.log('[Server] Initializing Next.js...')

    // Prepare Next.js app with timeout
    await Promise.race([
      app.prepare(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Next.js preparation timeout')), 30000)
      )
    ])

    console.log('[Server] Next.js prepared successfully!')

    // Create HTTP server
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url || '/', true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('[Server] Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    })

    console.log('[Server] HTTP server created')

    // Initialize Socket.io
    initializeSocket(server)
    console.log('[Socket] Socket.io server initialized')

    // Start listening with proper error handling
    server.listen(port, hostname, () => {
      console.log(`[Server] Ready on http://${hostname}:${port}`)
      console.log('[Server] All systems operational!')
    })

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[Server] Port ${port} is already in use`)
        process.exit(1)
      } else {
        console.error('[Server] Server error:', error)
        process.exit(1)
      }
    })

  } catch (error) {
    console.error('[Server] Failed to start server:', error)

    if (error instanceof Error && error.message.includes('timeout')) {
      console.error('[Server] Next.js preparation timed out. Try:')
      console.error('[Server] - Clean .next folder: rm -rf .next')
      console.error('[Server] - Clear node_modules: npm ci')
      console.error('[Server] - Check for port conflicts')
    }

    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('[Server] Received SIGINT, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('[Server] Received SIGTERM, shutting down gracefully...')
  process.exit(0)
})

// Start the server
startServer()