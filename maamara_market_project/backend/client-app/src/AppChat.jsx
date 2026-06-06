import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Join from './component/join/Join';
import Chat from './component/chat/Chat';
import ErrorBoundary from './ErrorBoundary';
import { Buffer } from 'buffer'; // Importing Buffer for encoding purposes

const App = () => {
  // Example usage of Buffer
 

  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          {/* Route definitions */}
          <Route path="/join-chat" element={<Join />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
};

export default App;







