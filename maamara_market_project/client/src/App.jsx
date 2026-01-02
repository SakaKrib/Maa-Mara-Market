import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Join from './component/join/Join';
import Chat from './component/chat/Chat';
import ErrorBoundary from './ErrorBoundary';
import { Buffer } from 'buffer'; // Importing Buffer for encoding purposes

const App = () => {
  // Example usage of Buffer
  const EMPTY_BUFFER = Buffer.concat([]);
  const err = { type: 'error', data: 'parser error' };
  const encodedData = Buffer.from('Example Data', 'utf-8');

  console.log('Error Object:', err);
  console.log('Empty Buffer:', EMPTY_BUFFER);
  console.log('Encoded Data:', encodedData);

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







