import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import ComplianceFailSafe from './ComplianceFailSafe.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ComplianceFailSafe>
      <App />
    </ComplianceFailSafe>
  </React.StrictMode>
);
