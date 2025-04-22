import { useState, useEffect, useCallback } from 'react';

// Dynamic WebSocket URL based on environment
const getWsUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // In production, use relative WebSocket protocol
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}`;
  }
  // In development, use localhost with port
  return 'ws://localhost:3001';
};

const useWebSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Reconnect logic
  useEffect(() => {
    const WS_URL = getWsUrl();
    
    // Create a new WebSocket connection
    const connectWebSocket = () => {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setSocket(ws);
        setReconnectAttempt(0); // Reset reconnect attempts
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket disconnected: code ${event.code}`);
        setIsConnected(false);
        setSocket(null);
        
        // Try to reconnect with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempt + 1})`);
        
        setTimeout(() => {
          setReconnectAttempt(prev => prev + 1);
        }, delay);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      return ws;
    };
    
    // Connect or reconnect when needed
    let ws = null;
    if (!socket && reconnectAttempt >= 0) {
      ws = connectWebSocket();
    }
    
    // Clean up on unmount
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [socket, reconnectAttempt]);
  
  // Send message function
  const sendMessage = useCallback((type, data) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({ type, data }));
      return true;
    }
    console.error('Cannot send message: WebSocket not connected');
    return false;
  }, [socket, isConnected]);
  
  return { isConnected, lastMessage, sendMessage };
};

export default useWebSocket;