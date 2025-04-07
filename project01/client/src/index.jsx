import React from 'react';
// Import createRoot from react-dom/client
import { createRoot } from 'react-dom/client';
import App from './App';


// Create a root using createRoot
const root = createRoot(document.getElementById('root'));
// Render your app into the root
root.render(<App />); // Changed from ReactDOM.render to root.render




