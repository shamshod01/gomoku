import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { GameService } from './game.service';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('GameGateway');
  private gameRooms: Map<string, Set<string>> = new Map(); // gameId -> Set of socketIds
  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Remove from all game rooms
    for (const [gameId, sockets] of this.gameRooms.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.gameRooms.delete(gameId);
        }
      }
    }

    // Remove from user sockets
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(
    @MessageBody() data: { gameId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { gameId, userId } = data;
    
    // Join the game room
    client.join(gameId);
    
    // Track the socket for this game
    if (!this.gameRooms.has(gameId)) {
      this.gameRooms.set(gameId, new Set());
    }
    this.gameRooms.get(gameId).add(client.id);
    
    // Track user socket
    this.userSockets.set(userId, client.id);
    
    this.logger.log(`User ${userId} joined game ${gameId}`);
    
    // Notify other players in the room
    client.to(gameId).emit('playerJoined', { userId });
  }

  @SubscribeMessage('leaveGame')
  handleLeaveGame(
    @MessageBody() data: { gameId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { gameId, userId } = data;
    
    client.leave(gameId);
    
    if (this.gameRooms.has(gameId)) {
      this.gameRooms.get(gameId).delete(client.id);
      if (this.gameRooms.get(gameId).size === 0) {
        this.gameRooms.delete(gameId);
      }
    }
    
    this.userSockets.delete(userId);
    
    this.logger.log(`User ${userId} left game ${gameId}`);
    
    // Notify other players in the room
    client.to(gameId).emit('playerLeft', { userId });
  }

  // Method to be called from GameService to notify game updates
  notifyGameUpdate(gameId: string, gameData: any) {
    this.server.to(gameId).emit('gameUpdate', gameData);
    this.logger.log(`Game update sent to room ${gameId}`);
  }

  // Method to notify when a player joins a game
  notifyPlayerJoined(gameId: string, gameData: any) {
    this.server.to(gameId).emit('playerJoinedGame', gameData);
    this.logger.log(`Player joined notification sent to room ${gameId}`);
  }

  // Method to notify when a move is made
  notifyMoveMade(gameId: string, gameData: any) {
    this.server.to(gameId).emit('moveMade', gameData);
    this.logger.log(`Move notification sent to room ${gameId}`);
  }

  // Method to notify game status changes (finished, etc.)
  notifyGameStatusChange(gameId: string, gameData: any) {
    this.server.to(gameId).emit('gameStatusChange', gameData);
    this.logger.log(`Game status change sent to room ${gameId}`);
  }
}
