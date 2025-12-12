import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import OrderList from './components/OrderList';
import OrderTracking from './components/OrderTracking';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Order Management System</h1>
          <nav className="App-nav">
            <Link to="/" className="nav-link">Order List</Link>
            <Link to="/tracking" className="nav-link">Order Tracking</Link>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<OrderList />} />
            <Route path="/tracking" element={<OrderTracking />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
