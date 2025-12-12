import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrderTracking from './OrderTracking';

// Mock fetch globally
global.fetch = jest.fn();

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }

  send(data) {
    this.lastMessage = data;
  }

  close() {
    if (this.onclose) this.onclose();
  }

  static instances = [];
  static reset() {
    MockWebSocket.instances = [];
  }
}

global.WebSocket = MockWebSocket;

describe('OrderTracking Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    MockWebSocket.reset();
  });

  const mockOrders = [
    {
      id: 1,
      customerId: 'customer-123',
      items: [
        { name: 'Product A', quantity: 2, price: 25.99 },
        { name: 'Product B', quantity: 1, price: 15.50 }
      ],
      status: 'processing',
      total: 67.48,
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-01T10:00:00.000Z'
    },
    {
      id: 2,
      customerId: 'customer-456',
      items: [
        { name: 'Product C', quantity: 5, price: 6.00 }
      ],
      status: 'shipped',
      total: 30.00,
      createdAt: '2024-01-01T11:00:00.000Z',
      updatedAt: '2024-01-01T11:00:00.000Z'
    }
  ];

  test('renders loading state initially', () => {
    fetch.mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );

    render(<OrderTracking />);
    expect(screen.getByText('Loading order tracking...')).toBeInTheDocument();
  });

  test('renders order tracking with correct data', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOrders,
    });

    render(<OrderTracking />);

    await waitFor(() => {
      expect(screen.getByText('Real-Time Order Tracking')).toBeInTheDocument();
    });

    // Check connection status indicator
    expect(screen.getByText('Live')).toBeInTheDocument();

    // Check first order
    expect(screen.getByText('Order #1')).toBeInTheDocument();
    expect(screen.getByText('Customer: customer-123')).toBeInTheDocument();
    expect(screen.getByText('Total: $67.48')).toBeInTheDocument();

    // Check second order
    expect(screen.getByText('Order #2')).toBeInTheDocument();
    expect(screen.getByText('Customer: customer-456')).toBeInTheDocument();
    expect(screen.getByText('Total: $30.00')).toBeInTheDocument();
  });

  test('displays status timeline correctly', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOrders,
    });

    render(<OrderTracking />);

    await waitFor(() => {
      expect(screen.getByText('Real-Time Order Tracking')).toBeInTheDocument();
    });

    // Check timeline steps are present (pending, processing, shipped, delivered)
    const pendingElements = screen.getAllByText('pending');
    expect(pendingElements.length).toBeGreaterThan(0);
    
    const processingElements = screen.getAllByText('processing');
    expect(processingElements.length).toBeGreaterThan(0);
    
    const shippedElements = screen.getAllByText('shipped');
    expect(shippedElements.length).toBeGreaterThan(0);
    
    const deliveredElements = screen.getAllByText('delivered');
    expect(deliveredElements.length).toBeGreaterThan(0);
  });

  test('displays items for each order', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOrders,
    });

    render(<OrderTracking />);

    await waitFor(() => {
      expect(screen.getByText('Real-Time Order Tracking')).toBeInTheDocument();
    });

    // Check items are displayed
    expect(screen.getByText(/Product A/)).toBeInTheDocument();
    expect(screen.getByText(/Product B/)).toBeInTheDocument();
    expect(screen.getByText(/Product C/)).toBeInTheDocument();
  });

  test('renders empty state when no orders', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<OrderTracking />);

    await waitFor(() => {
      expect(screen.getByText('No orders to track.')).toBeInTheDocument();
    });
  });

  test('renders error state on fetch failure', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<OrderTracking />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch orders/)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  test('establishes WebSocket connection', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOrders,
    });

    render(<OrderTracking />);

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1);
      expect(MockWebSocket.instances[0].url).toBe('ws://localhost:8000');
    });
  });

  test('displays cancelled orders correctly', async () => {
    const cancelledOrder = {
      id: 3,
      customerId: 'customer-789',
      items: [{ name: 'Product D', quantity: 1, price: 10.00 }],
      status: 'cancelled',
      total: 10.00,
      createdAt: '2024-01-01T12:00:00.000Z',
      updatedAt: '2024-01-01T12:00:00.000Z'
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [cancelledOrder],
    });

    render(<OrderTracking />);

    await waitFor(() => {
      expect(screen.getByText('Order Cancelled')).toBeInTheDocument();
    });
  });
});
