import React, { useState, useEffect, useRef } from 'react';
import './OrderTracking.css';

// Constants for order statuses
const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

const STATUS_ORDER = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED
];

const OrderTracking = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
  const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

  const getStatusTimestamp = (order, status) => {
    if (!order.statusHistory) return null;
    const historyItem = order.statusHistory.find(h => h.status === status);
    return historyItem ? historyItem.timestamp : null;
  };

  const getStatusProgress = (status) => {
    const index = STATUS_ORDER.indexOf(status);
    if (status === ORDER_STATUS.CANCELLED) {
      return -1; // Special case for cancelled
    }
    return index;
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/orders`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setError(`Failed to fetch orders: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchOrders();

    // Setup WebSocket connection
    const connectWebSocket = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'ORDER_UPDATE') {
            console.log('Received order update:', message);
            
            setOrders((prevOrders) => {
              if (message.action === 'created') {
                return [...prevOrders, message.order];
              } else if (message.action === 'updated') {
                return prevOrders.map(order => 
                  order.id === message.order.id ? message.order : order
                );
              } else if (message.action === 'deleted') {
                return prevOrders.filter(order => order.id !== message.order.id);
              }
              return prevOrders;
            });
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        
        // Reconnect after 3 seconds
        setTimeout(() => {
          console.log('Attempting to reconnect...');
          connectWebSocket();
        }, 3000);
      };
    };

    connectWebSocket();

    // Cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE_URL, WS_URL]);

  if (loading) {
    return <div className="order-tracking-loading">Loading order tracking...</div>;
  }

  if (error) {
    return (
      <div className="order-tracking-error">
        <p>{error}</p>
        <button onClick={fetchOrders} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="order-tracking-container">
      <div className="order-tracking-header">
        <h2>Track Order</h2>
      </div>
      
      {orders.length === 0 ? (
        <div className="no-orders">No orders to track.</div>
      ) : (
        <div className="orders-tracking-list">
          {[...orders].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).map((order) => (
            <div key={order.id} className="order-tracking-card">
              <h3 className="order-number-title">Order Number: {order.id}</h3>
              
              <div className="order-timeline">
                {order.status === ORDER_STATUS.CANCELLED ? (
                  <div className="timeline-cancelled">
                    <div className="timeline-step cancelled-step">
                      <div className="step-icon">✕</div>
                      <div className="step-label">Order Cancelled</div>
                    </div>
                  </div>
                ) : (
                  <div className="timeline-steps">
                    {STATUS_ORDER.map((status, index) => {
                      const currentProgress = getStatusProgress(order.status);
                      const isCompleted = index <= currentProgress;
                      const isCurrent = index === currentProgress;
                      const timestamp = getStatusTimestamp(order, status);
                      
                      return (
                        <React.Fragment key={`${order.id}-${status}-${index}`}>
                          <div className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                            <div className="step-icon">
                              {isCompleted ? '✓' : ''}
                            </div>
                            <div className="step-label">{status}</div>
                            {timestamp && (
                              <div className="step-timestamp">
                                {new Date(timestamp).toLocaleString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </div>
                            )}
                          </div>
                          {index < STATUS_ORDER.length - 1 && (
                            <div className={`timeline-connector ${isCompleted && index < currentProgress ? 'completed' : ''}`}></div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderTracking;
