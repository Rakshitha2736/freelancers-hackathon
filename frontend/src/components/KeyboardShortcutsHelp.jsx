import React, { useState } from 'react';
import { shortcuts } from '../utils/shortcuts';

export const KeyboardShortcutsHelp = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="btn btn-outline btn-sm"
        onClick={() => setIsOpen(!isOpen)}
        title="Keyboard shortcuts"
        style={{ padding: '6px 10px' }}
      >
        ⌨️  
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            zIndex: 2000,
            maxWidth: '400px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Keyboard Shortcuts</h3>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {Object.entries(shortcuts).map(([action, shortcut]) => (
              <div key={action} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#f9fafb', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>{shortcut.desc}</span>
                <kbd style={{
                  background: '#e5e7eb',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace'
                }}>
                  {shortcut.ctrl && 'Ctrl+'}
                  {shortcut.shift && 'Shift+'}
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      )}

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1999
          }}
        />
      )}
    </>
  );
};
