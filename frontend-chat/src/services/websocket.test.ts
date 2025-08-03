import { ChatWebSocket } from './websocket';

// Mock WebSocket
class MockWebSocket {
  url: string;
  readyState: number;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url: string) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    
    // Simulate connection
    setTimeout(() => {
      if (this.readyState === MockWebSocket.CONNECTING) {
        this.readyState = MockWebSocket.OPEN;
        if (this.onopen) {
          this.onopen(new Event('open'));
        }
      }
    }, 10);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

describe('ChatWebSocket', () => {
  let wsService: ChatWebSocket;

  afterEach(() => {
    if (wsService) {
      wsService.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('should connect to WebSocket server', async () => {
      const onOpen = jest.fn();
      wsService = new ChatWebSocket('session123');
      wsService.onOpen(onOpen);
      wsService.connect();

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(onOpen).toHaveBeenCalled();
      expect(wsService.isConnected()).toBe(true);
    });

    it('should handle connection with correct URL', () => {
      wsService = new ChatWebSocket('session123');
      wsService.connect();

      const ws = (wsService as any).ws;
      expect(ws.url).toContain('/chat/session123/');
    });

    it('should disconnect from WebSocket', async () => {
      const onClose = jest.fn();
      wsService = new ChatWebSocket('session123');
      wsService.onClose(onClose);
      wsService.connect();
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      wsService.disconnect();

      expect(onClose).toHaveBeenCalled();
      expect(wsService.isConnected()).toBe(false);
    });
  });

  describe('Message Handling', () => {
    it('should send message when connected', async () => {
      wsService = new ChatWebSocket('session123');
      wsService.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const ws = (wsService as any).ws;
      const sendSpy = jest.spyOn(ws, 'send');

      const message = { type: 'message', content: 'Hello' };
      wsService.send(message);

      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should not send message when disconnected', () => {
      wsService = new ChatWebSocket('session123');
      const message = { type: 'message', content: 'Hello' };
      
      // Try to send without connecting
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      wsService.send(message);
      
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket is not connected');
      consoleSpy.mockRestore();
    });

    it('should handle incoming messages', async () => {
      const onMessage = jest.fn();
      wsService = new ChatWebSocket('session123');
      wsService.onMessage(onMessage);
      wsService.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const ws = (wsService as any).ws;
      const messageData = { type: 'response', content: 'Hello from server' };
      
      // Simulate incoming message
      if (ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify(messageData)
        }));
      }

      expect(onMessage).toHaveBeenCalledWith(messageData);
    });

    it('should handle malformed JSON messages', async () => {
      const onMessage = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      wsService = new ChatWebSocket('session123');
      wsService.onMessage(onMessage);
      wsService.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const ws = (wsService as any).ws;
      
      // Simulate malformed message
      if (ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: 'invalid json{'
        }));
      }

      expect(onMessage).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Error parsing WebSocket message:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors', async () => {
      const onError = jest.fn();
      wsService = new ChatWebSocket('session123');
      wsService.onError(onError);
      wsService.connect();
      
      const ws = (wsService as any).ws;
      
      // Simulate error
      if (ws.onerror) {
        ws.onerror(new Event('error'));
      }

      expect(onError).toHaveBeenCalled();
    });

    it('should handle unexpected disconnection', async () => {
      const onClose = jest.fn();
      wsService = new ChatWebSocket('session123');
      wsService.onClose(onClose);
      wsService.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const ws = (wsService as any).ws;
      
      // Simulate unexpected close
      ws.readyState = MockWebSocket.CLOSED;
      if (ws.onclose) {
        ws.onclose(new CloseEvent('close', { code: 1006 }));
      }

      expect(onClose).toHaveBeenCalled();
      expect(wsService.isConnected()).toBe(false);
    });
  });

  describe('Handler Management', () => {
    it('should add and remove message handlers', () => {
      wsService = new ChatWebSocket('session123');
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      wsService.onMessage(handler1);
      wsService.onMessage(handler2);

      // Remove first handler
      wsService.removeMessageHandler(handler1);

      // Trigger a message
      wsService.connect();
      const ws = (wsService as any).ws;
      if (ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify({ type: 'test' })
        }));
      }

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should clear all handlers', () => {
      wsService = new ChatWebSocket('session123');
      const messageHandler = jest.fn();
      const errorHandler = jest.fn();
      const openHandler = jest.fn();
      const closeHandler = jest.fn();

      wsService.onMessage(messageHandler);
      wsService.onError(errorHandler);
      wsService.onOpen(openHandler);
      wsService.onClose(closeHandler);

      wsService.clearHandlers();

      // Try to trigger handlers after clearing
      wsService.connect();
      const ws = (wsService as any).ws;
      
      if (ws.onopen) ws.onopen(new Event('open'));
      if (ws.onmessage) ws.onmessage(new MessageEvent('message', { data: '{}' }));
      if (ws.onerror) ws.onerror(new Event('error'));
      if (ws.onclose) ws.onclose(new CloseEvent('close'));

      expect(messageHandler).not.toHaveBeenCalled();
      expect(errorHandler).not.toHaveBeenCalled();
      expect(openHandler).not.toHaveBeenCalled();
      expect(closeHandler).not.toHaveBeenCalled();
    });
  });

  describe('Connection State', () => {
    it('should report connection state correctly', async () => {
      wsService = new ChatWebSocket('session123');
      expect(wsService.isConnected()).toBe(false);

      wsService.connect();
      expect(wsService.isConnected()).toBe(false); // Still connecting

      await new Promise(resolve => setTimeout(resolve, 20));
      expect(wsService.isConnected()).toBe(true);

      wsService.disconnect();
      expect(wsService.isConnected()).toBe(false);
    });
  });
});