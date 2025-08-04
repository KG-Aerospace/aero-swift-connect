import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connect = () => {
      try {
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          setIsConnected(true);
          console.log('WebSocket connected');
        };

        wsRef.current.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            setLastMessage(message);
            
            // Show toast notifications for real-time updates
            switch (message.type) {
              case 'order_created':
                toast({
                  title: "New Order",
                  description: `Order ${message.data.orderNumber} has been created`,
                });
                break;
              case 'quote_created':
                toast({
                  title: "Quote Received",
                  description: "A new quote has been received from a supplier",
                });
                break;
              case 'order_updated':
                toast({
                  title: "Order Updated",
                  description: `Order ${message.data.orderNumber} status updated`,
                });
                break;
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        wsRef.current.onclose = () => {
          setIsConnected(false);
          console.log('WebSocket disconnected');
          
          // Attempt to reconnect after 3 seconds
          setTimeout(connect, 3000);
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [toast]);

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
  };
}
