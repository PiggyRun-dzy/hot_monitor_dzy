import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './index.css';

// React 18 still supports render() from 'react-dom'
const container = document.getElementById('root');
const root = ReactDOM.createRoot ? ReactDOM.createRoot(container) : null;
if (root) {
  root.render(<React.StrictMode><App /></React.StrictMode>);
} else {
  ReactDOM.render(<React.StrictMode><App /></React.StrictMode>, container);
}
