import { render, screen } from '@testing-library/react';
import App from './App';

// Mock fetch globally
global.fetch = jest.fn();

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1;
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }
  send() {}
  close() {}
}

global.WebSocket = MockWebSocket;

beforeEach(() => {
  fetch.mockClear();
  fetch.mockResolvedValue({
    ok: true,
    json: async () => [],
  });
});

test('renders Order Management System header', () => {
  render(<App />);
  const headerElement = screen.getByText(/Order Management System/i);
  expect(headerElement).toBeInTheDocument();
});
