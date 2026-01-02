// index.jsx
import { Buffer } from 'buffer';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Ensure Buffer is globally defined
if (!window.Buffer) {
    window.Buffer = Buffer;
}
console.log('Buffer is available:', typeof Buffer !== 'undefined');

// Render the React application
const root = createRoot(document.getElementById('root'));
root.render(<App />);




