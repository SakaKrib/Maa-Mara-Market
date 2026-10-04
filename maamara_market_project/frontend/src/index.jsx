import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './ErrorBoundary/ErrorBoundary';
import { AuthProvider } from './cmponents/Auth/AuthContext/Context';
import "./main.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CurrencyProvider } from './PublicUiForAll/PublicUi/Customer/DesktopView/Main/Currency/CurrencyContext';

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <CurrencyProvider>
              <App />
            </CurrencyProvider>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
