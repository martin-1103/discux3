"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
exports.initializeSocket = initializeSocket;
exports.getSocketService = getSocketService;
const socket_io_1 = require("socket.io");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
/**
 * Socket.io Service for Real-time Communication
 */
class SocketService {
    constructor(httpServer) {
        this.typingUsers = new Map(); // roomId -> Set of userIds
        this.onlineUsers = new Map(); // roomId -> Set of userIds
        this.userSockets = new Map(); // userId -> socketId
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: process.env.NODE_ENV === 'production'
                    ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ["https://discux3.com"])
                    : ["http://localhost:3000"],
                methods: ["GET", "POST"]
            },
            transports: ['websocket', 'polling']
        });
        this.setupMiddleware();
        this.setupEventHandlers();
    }
    /**
     * Setup authentication middleware
     */
    setupMiddleware() {
        this.io.use(async (socket, next) => {
            try {
                // Authenticate user using NextAuth session
                const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
                if (!session?.user?.id) {
                    return next(new Error('Unauthorized'));
                }
                socket.data.userId = session.user.id;
                socket.data.userName = session.user.name || 'Anonymous';
                next();
            }
            catch (error) {
                next(new Error('Authentication failed'));
            }
        });
    }
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            const userId = socket.data.userId;
            const userName = socket.data.userName;
            console.log(`[Socket] User connected: ${userName} (${userId})`);
            // Store user socket mapping
            this.userSockets.set(userId, socket.id);
            // Handle room joins
            socket.on('join_room', async (data) => {
                await this.handleJoinRoom(socket, data.roomId);
            });
            // Handle room leaves
            socket.on('leave_room', async (data) => {
                await this.handleLeaveRoom(socket, data.roomId);
            });
            // Handle typing indicators
            socket.on('typing', (data) => {
                this.handleTyping(socket, data);
            });
            // Handle presence updates
            socket.on('presence', (data) => {
                this.handlePresence(socket, data);
            });
            // Handle message broadcasting
            socket.on('message', (data) => {
                this.handleMessage(socket, data);
            });
            // Handle discussion updates
            socket.on('discussion_update', (data) => {
                this.handleDiscussionUpdate(socket, data);
            });
            // Handle disconnect
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
        });
    }
    /**
     * Handle room join
     */
    async handleJoinRoom(socket, roomId) {
        try {
            const userId = socket.data.userId;
            const userName = socket.data.userName;
            // Join socket room
            socket.join(roomId);
            // Add to online users for this room
            if (!this.onlineUsers.has(roomId)) {
                this.onlineUsers.set(roomId, new Set());
            }
            this.onlineUsers.get(roomId).add(userId);
            // Update presence
            const presence = {
                userId,
                userName,
                roomId,
                status: 'online',
                lastSeen: new Date()
            };
            // Broadcast to room (excluding sender)
            socket.to(roomId).emit('user_joined', presence);
            socket.to(roomId).emit('presence_update', presence);
            // Send current online users list to new user
            const roomUsers = this.onlineUsers.get(roomId) || new Set();
            const onlineUsersList = Array.from(roomUsers).map(id => ({
                userId: id,
                status: 'online'
            }));
            socket.emit('online_users', onlineUsersList);
            console.log(`[Socket] User ${userName} joined room ${roomId}`);
        }
        catch (error) {
            console.error('[Socket] Error handling join_room:', error);
        }
    }
    /**
     * Handle room leave
     */
    async handleLeaveRoom(socket, roomId) {
        try {
            const userId = socket.data.userId;
            const userName = socket.data.userName;
            // Leave socket room
            socket.leave(roomId);
            // Remove from online users
            const roomUsers = this.onlineUsers.get(roomId);
            if (roomUsers) {
                roomUsers.delete(userId);
                if (roomUsers.size === 0) {
                    this.onlineUsers.delete(roomId);
                }
            }
            // Remove from typing users
            const roomTyping = this.typingUsers.get(roomId);
            if (roomTyping) {
                roomTyping.delete(userId);
                if (roomTyping.size === 0) {
                    this.typingUsers.delete(roomId);
                }
            }
            // Broadcast to room
            const presence = {
                userId,
                userName,
                roomId,
                status: 'offline',
                lastSeen: new Date()
            };
            socket.to(roomId).emit('user_left', presence);
            socket.to(roomId).emit('presence_update', presence);
            console.log(`[Socket] User ${userName} left room ${roomId}`);
        }
        catch (error) {
            console.error('[Socket] Error handling leave_room:', error);
        }
    }
    /**
     * Handle typing indicators
     */
    handleTyping(socket, data) {
        try {
            const { roomId, userId, isTyping } = data;
            const userName = socket.data.userName;
            // Update typing state
            if (!this.typingUsers.has(roomId)) {
                this.typingUsers.set(roomId, new Set());
            }
            const roomTyping = this.typingUsers.get(roomId);
            if (isTyping) {
                roomTyping.add(userId);
            }
            else {
                roomTyping.delete(userId);
            }
            // Broadcast typing indicator to room (excluding sender)
            socket.to(roomId).emit('typing_indicator', {
                userId,
                userName,
                roomId,
                isTyping
            });
            // Clean up if no one is typing
            if (roomTyping.size === 0) {
                this.typingUsers.delete(roomId);
            }
        }
        catch (error) {
            console.error('[Socket] Error handling typing:', error);
        }
    }
    /**
     * Handle presence updates
     */
    handlePresence(socket, data) {
        try {
            const { roomId, status } = data;
            const userId = socket.data.userId;
            const userName = socket.data.userName;
            const presence = {
                userId,
                userName,
                roomId,
                status,
                lastSeen: new Date()
            };
            // Broadcast to room
            socket.to(roomId).emit('presence_update', presence);
            console.log(`[Socket] User ${userName} presence updated to ${status} in room ${roomId}`);
        }
        catch (error) {
            console.error('[Socket] Error handling presence:', error);
        }
    }
    /**
     * Handle message broadcasting
     */
    handleMessage(socket, data) {
        try {
            const { roomId } = data;
            // Broadcast message to room (excluding sender)
            socket.to(roomId).emit('new_message', data);
            console.log(`[Socket] Message broadcasted to room ${roomId}`);
        }
        catch (error) {
            console.error('[Socket] Error handling message:', error);
        }
    }
    /**
     * Handle discussion updates
     */
    handleDiscussionUpdate(socket, data) {
        try {
            const { roomId, status, discussionId, currentAgent, nextAgent } = data;
            // Broadcast discussion update to room
            socket.to(roomId).emit('discussion_update', {
                discussionId,
                status,
                currentAgent,
                nextAgent,
                intensity: data.intensity,
                timestamp: new Date()
            });
            console.log(`[Socket] Discussion ${discussionId} update: ${status} in room ${roomId}`);
        }
        catch (error) {
            console.error('[Socket] Error handling discussion_update:', error);
        }
    }
    /**
     * Handle disconnect
     */
    handleDisconnect(socket) {
        try {
            const userId = socket.data.userId;
            const userName = socket.data.userName;
            // Remove from user sockets mapping
            this.userSockets.delete(userId);
            // Mark user as offline in all rooms
            this.onlineUsers.forEach((users, roomId) => {
                if (users.has(userId)) {
                    users.delete(userId);
                    const presence = {
                        userId,
                        userName,
                        roomId,
                        status: 'offline',
                        lastSeen: new Date()
                    };
                    socket.to(roomId).emit('user_left', presence);
                    socket.to(roomId).emit('presence_update', presence);
                }
            });
            // Clean up empty rooms
            this.onlineUsers.forEach((users, roomId) => {
                if (users.size === 0) {
                    this.onlineUsers.delete(roomId);
                }
            });
            this.typingUsers.forEach((typers, roomId) => {
                if (typers.has(userId)) {
                    typers.delete(userId);
                    socket.to(roomId).emit('typing_indicator', {
                        userId,
                        userName: socket.data.userName,
                        roomId,
                        isTyping: false
                    });
                }
                if (typers.size === 0) {
                    this.typingUsers.delete(roomId);
                }
            });
            console.log(`[Socket] User disconnected: ${userName} (${userId})`);
        }
        catch (error) {
            console.error('[Socket] Error handling disconnect:', error);
        }
    }
    /**
     * Broadcast message to specific room
     */
    broadcastMessage(roomId, message) {
        this.io.to(roomId).emit('new_message', message);
    }
    /**
     * Broadcast typing indicator
     */
    broadcastTyping(roomId, typing) {
        this.io.to(roomId).emit('typing_indicator', typing);
    }
    /**
     * Broadcast discussion update
     */
    broadcastDiscussionUpdate(roomId, update) {
        this.io.to(roomId).emit('discussion_update', update);
    }
    /**
     * Get online users in room
     */
    getOnlineUsers(roomId) {
        return Array.from(this.onlineUsers.get(roomId) || []);
    }
    /**
     * Get typing users in room
     */
    getTypingUsers(roomId) {
        return Array.from(this.typingUsers.get(roomId) || []);
    }
    /**
     * Check if user is online
     */
    isUserOnline(userId) {
        return this.userSockets.has(userId);
    }
    /**
     * Get server instance
     */
    getIO() {
        return this.io;
    }
}
exports.SocketService = SocketService;
// Global socket service instance
let socketService = null;
/**
 * Initialize Socket.io service
 */
function initializeSocket(httpServer) {
    if (!socketService) {
        socketService = new SocketService(httpServer);
    }
    return socketService;
}
/**
 * Get socket service instance
 */
function getSocketService() {
    return socketService;
}
