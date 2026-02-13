import { useState, useEffect } from 'react';

export default function DebugPanel() {
  const [logs, setLogs] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const originalConsoleError = console.error;
    const originalConsoleLog = console.log;

    console.error = (...args) => {
      setLogs(prev => [...prev.slice(-10), `ERROR: ${args.join(' ')}`]);
      originalConsoleError.apply(console, args);
    };

    console.log = (...args) => {
        // Optional: Log everything or just important stuff
      // setLogs(prev => [...prev.slice(-10), `LOG: ${args.join(' ')}`]);
      originalConsoleLog.apply(console, args);
    };

    const handleError = (event) => {
      setLogs(prev => [...prev.slice(-10), `window.onerror: ${event.message}`]);
    };

    const handleRejection = (event) => {
      setLogs(prev => [...prev.slice(-10), `Unhandled Promise: ${event.reason}`]);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      console.error = originalConsoleError;
      console.log = originalConsoleLog;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          left: '10px',
          zIndex: 9999,
          background: 'red',
          color: 'white',
          padding: '5px',
          borderRadius: '5px',
          opacity: 0.7
        }}
      >
        Debug
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      height: '200px',
      background: 'rgba(0,0,0,0.9)',
      color: '#0f0',
      zIndex: 9999,
      overflowY: 'auto',
      padding: '10px',
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <strong>Debug Console</strong>
        <button onClick={() => setIsVisible(false)} style={{ background: '#333', color: 'white' }}>Close</button>
      </div>
      {logs.length === 0 && <div>No errors logged yet.</div>}
      {logs.map((log, i) => (
        <div key={i} style={{ borderBottom: '1px solid #333', padding: '2px 0' }}>
          {log}
        </div>
      ))}
    </div>
  );
}
