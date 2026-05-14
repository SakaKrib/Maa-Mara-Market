import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './ErrorBoundary/ErrorBoundary';
import { AuthProvider } from './cmponents/Auth/AuthContext/Context';
import "./main.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ✅ Create a QueryClient instance
const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
          {/* ReactQueryDevtools removed */}
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

