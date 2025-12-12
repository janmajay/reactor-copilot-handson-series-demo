import React, { useState, useEffect, useRef } from 'react';
import './OrderTracking.css';

const OrderTracking = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const wsRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
  const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

  const statusOrder = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  const getStatusProgress = (status) => {
    const index = statusOrder.indexOf(status);
    if (status === 'cancelled') {
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
        setConnectionStatus('connected');
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
        setConnectionStatus('error');
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');
        
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
        <h2>Real-Time Order Tracking</h2>
        <div className="connection-status">
          <span className={`status-indicator ${connectionStatus}`}></span>
          <span className="status-text">
            {connectionStatus === 'connected' ? 'Live' : 
             connectionStatus === 'error' ? 'Connection Error' : 'Connecting...'}
          </span>
        </div>
      </div>
      
      {orders.length === 0 ? (
        <div className="no-orders">No orders to track.</div>
      ) : (
        <div className="orders-tracking-list">
          {orders.map((order) => (
            <div key={order.id} className="order-tracking-card">
              <div className="order-header">
                <div className="order-info">
                  <h3>Order #{order.id}</h3>
                  <p className="customer-id">Customer: {order.customerId}</p>
                  <p className="order-total">Total: ${order.total.toFixed(2)}</p>
                </div>
                <div className={`status-badge status-${order.status}`}>
                  {order.status}
                </div>
              </div>
              
              <div className="order-timeline">
                {order.status === 'cancelled' ? (
                  <div className="timeline-cancelled">
                    <div className="timeline-step cancelled-step">
                      <div className="step-icon">✕</div>
                      <div className="step-label">Order Cancelled</div>
                    </div>
                  </div>
                ) : (
                  <div className="timeline-steps">
                    {statusOrder.slice(0, 4).map((status, index) => {
                      const currentProgress = getStatusProgress(order.status);
                      const isCompleted = index <= currentProgress;
                      const isCurrent = index === currentProgress;
                      
                      return (
                        <React.Fragment key={`${order.id}-${status}-${index}`}>
                          <div className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                            <div className="step-icon">
                              {isCompleted ? '✓' : index + 1}
                            </div>
                            <div className="step-label">{status}</div>
                          </div>
                          {index < 3 && (
                            <div className={`timeline-connector ${isCompleted && index < currentProgress ? 'completed' : ''}`}></div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="order-items">
                <h4>Items:</h4>
                <ul>
                  {order.items.map((item, index) => (
                    <li key={index}>
                      {item.name} - Qty: {item.quantity} @ ${item.price.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="order-timestamps">
                <small>Created: {new Date(order.createdAt).toLocaleString()}</small>
                <small>Updated: {new Date(order.updatedAt).toLocaleString()}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderTracking;
