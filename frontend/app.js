import { ChatClient } from './chatClient.js';

class ChatApp {
  constructor() {
    this.userSelect = document.getElementById('user-select');
    this.chatContainer = document.getElementById('chat-container');
    this.messagesArea = document.getElementById('messages-area');
    this.messageInput = document.getElementById('message-input');
    this.sendButton = document.getElementById('send-button');
    this.onlineStatus = document.getElementById('online-status');
    this.recipientName = document.getElementById('recipient-name');

    this.currentUser = null;
    this.recipient = null;
    this.chatClient = null;

    this.initEventListeners();
  }

  initEventListeners() {
    this.userSelect.addEventListener('change', this.handleUserSelection.bind(this));
    this.sendButton.addEventListener('click', this.sendMessage.bind(this));
    this.messageInput.addEventListener('keypress', this.handleKeyPress.bind(this));

    // Handle online/offline status
    window.addEventListener('online', this.handleOnlineStatus.bind(this));
    window.addEventListener('offline', this.handleOfflineStatus.bind(this));
  }

  handleUserSelection(event) {
    this.currentUser = event.target.value;
    if (this.currentUser) {
      this.recipient = this.currentUser === 'alice' ? 'bob' : 'alice';
      this.recipientName.textContent =
        this.recipient.charAt(0).toUpperCase() + this.recipient.slice(1);
      this.chatContainer.style.display = 'flex';
      this.initializeChatClient();
    }
  }

  initializeChatClient() {
    this.chatClient = new ChatClient(
      this.currentUser,
      this.recipient,
      this.handleIncomingMessage.bind(this),
      this.handleConnectionStatusChange.bind(this)
    );
  }

  sendMessage() {
    const message = this.messageInput.value.trim();
    if (message) {
      this.chatClient.sendMessage(message);
      this.displayMessage(message, 'sent');
      this.messageInput.value = '';
    }
  }

  handleKeyPress(event) {
    if (event.key === 'Enter') {
      this.sendMessage();
    }
  }

  displayMessage(message, type) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${type}-message`);
    messageElement.textContent = message;
    this.messagesArea.appendChild(messageElement);
    this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
  }

  handleIncomingMessage(message) {
    this.displayMessage(message, 'received');
  }

  handleConnectionStatusChange(isConnected) {
    this.onlineStatus.textContent = isConnected ? 'Online' : 'Offline';
    this.onlineStatus.classList.toggle('online', isConnected);
    this.onlineStatus.classList.toggle('offline', !isConnected);
  }

  handleOnlineStatus() {
    if (navigator.onLine) {
      this.chatClient.reconnect();
    }
  }

  handleOfflineStatus() {
    this.chatClient.disconnect();
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => new ChatApp());
