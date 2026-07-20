const socketAuthMiddleware = require('./socketAuth');
const roomHandler = require('./handlers/roomHandler');
const messageHandler = require('./handlers/messageHandler');
const escalationHandler = require('./handlers/escalationHandler');

class ChatSocketHandler {
  constructor(io) {
    this.io = io;
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    // Enforce authentication on every connection
    this.io.use(socketAuthMiddleware);

    this.io.on('connection', (socket) => {
      const role = socket.data.role;
      const id   = socket.data.userId || socket.data.customerId || socket.id;
      console.log(`[Socket] Connected: ${role} (${id})`);

      // Register modular handlers
      roomHandler(socket, this.io);
      messageHandler(socket, this.io);
      escalationHandler(socket, this.io);

      socket.on('disconnect', (reason) => {
        console.log(`[Socket] Disconnected: ${role} (${id}) — ${reason}`);
      });

      socket.on('error', (err) => {
        console.error(`[Socket] Error from ${id}:`, err.message);
      });
    });
  }

  // Emit events from other parts of the application
  emitToChat(chatId, event, data) {
    this.io.to(chatId.toString()).emit(event, data);
  }

  emitToAgents(companyId, event, data) {
    if (companyId) {
      this.io.to(`agents_${companyId.toString()}`).to('superusers').emit(event, data);
    } else {
      this.io.to('superusers').emit(event, data);
    }
  }
}

module.exports = ChatSocketHandler;
