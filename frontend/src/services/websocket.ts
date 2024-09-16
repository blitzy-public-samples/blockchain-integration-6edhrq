import { getAuthToken } from '../utils/auth';

class WebSocketService {
  private socket: WebSocket;
  private messageHandler: Function;

  constructor(url: string, messageHandler: Function) {
    this.messageHandler = messageHandler;
    this.socket = new WebSocket(url);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.socket.onopen = () => {
      console.log('WebSocket connection established');
      // Send authentication token
      const token = getAuthToken();
      if (token) {
        this.sendMessage({ type: 'authenticate', token });
      }
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.messageHandler(data);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.socket.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }

  // HUMAN ASSISTANCE NEEDED
  // The connect method might need additional error handling and reconnection logic
  connect(): void {
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
      this.socket = new WebSocket(this.socket.url);
      this.setupEventListeners();
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // HUMAN ASSISTANCE NEEDED
  // The sendMessage method might need additional error handling and queueing mechanism for messages when the connection is not open
  sendMessage(data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.error('WebSocket is not connected. Unable to send message.');
      // Attempt to reconnect or implement a message queue here
    }
  }
}

export default WebSocketService;