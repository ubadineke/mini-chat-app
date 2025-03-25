export class ChatClient {
  constructor(username, recipient, onMessageCallback, onConnectionStatusChange) {
    this.username = username;
    this.recipient = recipient;
    this.onMessageCallback = onMessageCallback;
    this.onConnectionStatusChange = onConnectionStatusChange;
    this.socket = null;

    this.connect();
  }

  connect() {
    // Use wss for secure WebSocket in production
    this.socket = new WebSocket(`ws://localhost:8080?username=${this.username}`);

    this.socket.onopen = () => {
      console.log('WebSocket connection established');
      this.onConnectionStatusChange(true);
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      // Only process messages from the current recipient
      if (message.sender === this.recipient) {
        this.onMessageCallback(message.content);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket connection closed');
      this.onConnectionStatusChange(false);

      // Attempt reconnection
      setTimeout(() => this.reconnect(), 3000);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.onConnectionStatusChange(false);
    };
  }

  sendMessage(content) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          sender: this.username,
          recipient: this.recipient,
          content,
        })
      );
    } else {
      console.error('WebSocket is not connected');
    }
  }

  reconnect() {
    if (this.socket) {
      this.socket.close();
    }
    this.connect();
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}
