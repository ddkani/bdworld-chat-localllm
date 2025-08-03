import { WS_BASE_URL } from '../config';
import { WebSocketMessage } from '../types';

export type MessageHandler = (message: WebSocketMessage) => void;
export type ErrorHandler = (error: Event) => void;
export type ConnectionHandler = () => void;

export class ChatWebSocket {
  private ws: WebSocket | null = null;
  private messageHandlers: MessageHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private openHandlers: ConnectionHandler[] = [];
  private closeHandlers: ConnectionHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private sessionId: string;
  private isReconnecting = false;
  private isManuallyDisconnected = false;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.isManuallyDisconnected = false;
    const wsUrl = `${WS_BASE_URL}/chat/${this.sessionId}/`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.openHandlers.forEach(handler => handler());
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.messageHandlers.forEach(handler => handler(message));
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      if (this.ws?.readyState !== WebSocket.CLOSED) {
        console.error('WebSocket error:', error);
        this.errorHandlers.forEach(handler => handler(error));
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected', { 
        wasClean: event.wasClean, 
        code: event.code, 
        sessionId: this.sessionId,
        isManuallyDisconnected: this.isManuallyDisconnected 
      });
      this.closeHandlers.forEach(handler => handler());
      if (!this.isManuallyDisconnected) {
        this.attemptReconnect();
      }
    };
  }

  disconnect(): void {
    this.isManuallyDisconnected = true;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  onOpen(handler: ConnectionHandler): void {
    this.openHandlers.push(handler);
  }

  onClose(handler: ConnectionHandler): void {
    this.closeHandlers.push(handler);
  }

  removeMessageHandler(handler: MessageHandler): void {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  removeErrorHandler(handler: ErrorHandler): void {
    this.errorHandlers = this.errorHandlers.filter(h => h !== handler);
  }

  removeOpenHandler(handler: ConnectionHandler): void {
    this.openHandlers = this.openHandlers.filter(h => h !== handler);
  }

  removeCloseHandler(handler: ConnectionHandler): void {
    this.closeHandlers = this.closeHandlers.filter(h => h !== handler);
  }

  private attemptReconnect(): void {
    if (this.isManuallyDisconnected || this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    setTimeout(() => {
      if (!this.isManuallyDisconnected) {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  getState(): number | undefined {
    return this.ws?.readyState;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  clearHandlers(): void {
    this.messageHandlers = [];
    this.errorHandlers = [];
    this.openHandlers = [];
    this.closeHandlers = [];
  }
}