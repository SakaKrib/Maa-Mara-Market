import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Join from './component/join/Join';
import Chat from './component/chat/Chat';
import ErrorBoundary from './ErrorBoundary';

const App = () => {
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/join-chat" element={<Join />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
};

export default App;





