import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Join from './componentChat/join/Join';
import Chat from './componentChat/chat/Chat';
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







