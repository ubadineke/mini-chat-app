import WebSocket from 'ws';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// MongoDB Message Schema
interface IMessage {
  sender: string;
  recipient: string;
  content: string;
  timestamp: Date;
  delivered: boolean;
}

const MessageSchema = new mongoose.Schema<IMessage>({
  sender: { type: String, required: true },
  recipient: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  delivered: { type: Boolean, default: false },
});

const Message = mongoose.model<IMessage>('Message', MessageSchema);

class ChatServer {
  private wss: WebSocket.Server;
  private redisPublisher: Redis.Redis;
  private redisSubscriber: Redis.Redis;
  private clients: Map<string, WebSocket>;

  constructor(port: number) {
    // MongoDB Connection
    mongoose.connect('mongodb://localhost:27017/chatapp', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Redis Setup
    this.redisPublisher = new Redis();
    this.redisSubscriber = new Redis();

    // WebSocket Server
    this.wss = new WebSocket.Server({ port });
    this.clients = new Map();

    this.setupWebSocketServer();
    this.setupRedisSubscription();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const username = this.extractUsername(req.url);

      // Store client connection
      this.clients.set(username, ws);

      // Handle incoming messages
      ws.on('message', async (message: string) => {
        const parsedMessage = JSON.parse(message);
        await this.handleMessage(parsedMessage);
      });

      // Handle disconnection
      ws.on('close', () => {
        this.clients.delete(username);
      });

      // Send any pending messages
      this.sendPendingMessages(username);
    });
  }

  private async handleMessage(message: any) {
    const { sender, recipient, content } = message;

    // Check if recipient is online
    const recipientClient = this.clients.get(recipient);

    if (recipientClient && recipientClient.readyState === WebSocket.OPEN) {
      // Send directly via WebSocket
      recipientClient.send(
        JSON.stringify({
          sender,
          content,
        })
      );
    } else {
      // Store in MongoDB for offline delivery
      await Message.create({
        sender,
        recipient,
        content,
        delivered: false,
      });
    }

    // Publish to Redis for potential multi-server support
    this.redisPublisher.publish('chat-messages', JSON.stringify(message));
  }

  private setupRedisSubscription() {
    this.redisSubscriber.subscribe('chat-messages');
    this.redisSubscriber.on('message', (channel, message) => {
      // Additional message handling if needed
      console.log('Redis message:', message);
    });
  }

  private async sendPendingMessages(username: string) {
    const pendingMessages = await Message.find({
      recipient: username,
      delivered: false,
    });

    const userClient = this.clients.get(username);
    if (userClient && userClient.readyState === WebSocket.OPEN) {
      for (const msg of pendingMessages) {
        userClient.send(
          JSON.stringify({
            sender: msg.sender,
            content: msg.content,
          })
        );

        // Mark as delivered
        msg.delivered = true;
        await msg.save();
      }
    }
  }

  private extractUsername(url: string): string {
    // Extract username from connection URL
    const urlParams = new URLSearchParams(url.split('?')[1]);
    return urlParams.get('username') || 'unknown';
  }
}

// Start the server
new ChatServer(8080);
