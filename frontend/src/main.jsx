import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Global secure session token injection for all API calls
const nativeFetch = window.fetch;
window.fetch = async (input, init = {}) => {
  const token = sessionStorage.getItem('auth_token');
  if (token) {
    init = init || {};
    init.headers = init.headers || {};
    if (init.headers instanceof Headers) {
      if (!init.headers.has('Authorization')) {
        init.headers.set('Authorization', `Bearer ${token}`);
      }
    } else if (Array.isArray(init.headers)) {
      init.headers.push(['Authorization', `Bearer ${token}`]);
    } else {
      if (!init.headers['Authorization']) {
        init.headers['Authorization'] = `Bearer ${token}`;
      }
    }
  }
  return nativeFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
