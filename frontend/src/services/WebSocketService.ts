import { EventEmitter } from 'events';

export interface WebSocketMessage {
  event: string;
  data: any;
}

export class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectInterval = 2000; // Start with 2 seconds
  private eventEmitter = new EventEmitter();
  private isConnecting = false;
  private isAuthenticated = false;
  private messageQueue: WebSocketMessage[] = [];

  constructor(baseUrl?: string) {
    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = baseUrl || window.location.host;
    this.url = `${protocol}//${host}/socket.io/?EIO=4&transport=websocket`;
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): Promise<void> {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }

    if (this.isConnecting) {
      return new Promise((resolve, reject) => {
        this.eventEmitter.once('connected', () => resolve());
        this.eventEmitter.once('connection_error', (error) => reject(error));
      });
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.eventEmitter.emit('connected');
          this.processMessageQueue();
          resolve();
        };

        this.socket.onmessage = this.handleMessage.bind(this);

        this.socket.onclose = (event) => {
          console.log(`WebSocket closed: ${event.code} ${event.reason}`);
          this.isConnecting = false;
          this.isAuthenticated = false;
          this.eventEmitter.emit('disconnected', event);
          
          if (!event.wasClean) {
            this.scheduleReconnect();
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.eventEmitter.emit('connection_error', error);
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        console.error('Failed to create WebSocket:', error);
        this.eventEmitter.emit('connection_error', error);
        this.scheduleReconnect();
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.close(1000, 'Client disconnected');
      this.socket = null;
    }
  }

  /**
   * Send a message to the WebSocket server
   */
  public send(event: string, data: any): void {
    const message = { event, data };
    
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      // Queue message if socket is not open
      this.messageQueue.push(message);
      this.connect().catch(error => {
        console.error('Failed to connect for sending message:', error);
      });
      return;
    }

    this.sendMessage(message);
  }

  /**
   * Join a scan room to receive updates
   */
  public joinScan(scanId: string, token: string): void {
    this.send('join_scan', { scan_id: scanId, token });
  }

  /**
   * Leave a scan room
   */
  public leaveScan(scanId: string): void {
    this.send('leave_scan', { scan_id: scanId });
  }

  /**
   * Subscribe to WebSocket events
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Unsubscribe from WebSocket events
   */
  public off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  /**
   * Check if WebSocket is connected
   */
  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = event.data;
      
      // Socket.IO v4 message format starts with a number followed by JSON
      if (typeof data === 'string') {
        if (data.startsWith('0')) {
          // Socket.IO handshake
          this.handleHandshake(data);
        } else if (data.startsWith('40')) {
          // Socket.IO connection established
          console.log('Socket.IO connection established');
        } else if (data.startsWith('42')) {
          // Socket.IO event
          const jsonStr = data.substring(2);
          const [eventName, eventData] = JSON.parse(jsonStr);
          this.eventEmitter.emit(eventName, eventData);
          
          // Special handling for specific events
          if (eventName === 'joined_scan') {
            this.isAuthenticated = true;
          }
        } else if (data.startsWith('2')) {
          // Socket.IO ping
          this.sendPong();
        } else if (data.startsWith('3')) {
          // Socket.IO pong
          // Nothing to do
        } else if (data.startsWith('41')) {
          // Socket.IO error
          console.error('Socket.IO error:', data);
          this.eventEmitter.emit('error', { message: 'Socket.IO error' });
        }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error, event.data);
    }
  }

  /**
   * Handle Socket.IO handshake
   */
  private handleHandshake(data: string): void {
    try {
      const handshakeData = JSON.parse(data.substring(1));
      console.log('Socket.IO handshake successful, sid:', handshakeData.sid);
      
      // Send connection message
      this.socket?.send('40');
    } catch (error) {
      console.error('Error handling Socket.IO handshake:', error);
    }
  }

  /**
   * Send a pong message in response to a ping
   */
  private sendPong(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send('3');
    }
  }

  /**
   * Send a message to the WebSocket server
   */
  private sendMessage(message: WebSocketMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message);
      return;
    }

    try {
      // Format as Socket.IO message: 42["event",data]
      const socketIOMessage = `42${JSON.stringify([message.event, message.data])}`;
      this.socket.send(socketIOMessage);
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      this.eventEmitter.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;
    
    console.log(`Processing ${this.messageQueue.length} queued messages`);
    
    // Create a copy of the queue and clear it
    const queue = [...this.messageQueue];
    this.messageQueue = [];
    
    // Send each message
    queue.forEach(message => {
      this.sendMessage(message);
    });
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnection attempts reached');
      this.eventEmitter.emit('max_reconnect_attempts');
      return;
    }

    const delay = this.calculateReconnectDelay();
    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      this.reconnectAttempts++;
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Calculate exponential backoff delay for reconnection
   */
  private calculateReconnectDelay(): number {
    // Exponential backoff with jitter
    const baseDelay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts);
    const maxDelay = 30000; // 30 seconds max
    const jitter = Math.random() * 0.5 + 0.75; // 75% to 125% of calculated delay
    return Math.min(baseDelay * jitter, maxDelay);
  }
}

// Create a singleton instance
export const webSocketService = new WebSocketService();

export default webSocketService;