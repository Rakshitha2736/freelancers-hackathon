import React, { useState } from 'react';

export const taskTemplates = {
  'Code Review': {
    description: 'Code review required',
    priority: 'High',
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  'Documentation': {
    description: 'Update documentation',
    priority: 'Medium',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  'Bug Fix': {
    description: 'Fix reported bug',
    priority: 'High',
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  'Feature Development': {
    description: 'Implement new feature',
    priority: 'Medium',
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  'Testing': {
    description: 'Test and QA',
    priority: 'Medium',
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  'Deployment': {
    description: 'Deploy to production',
    priority: 'High',
    deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
};

export const TaskTemplateSelector = ({ onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn btn-outline btn-sm"
        onClick={() => setIsOpen(!isOpen)}
        style={{ marginRight: '8px' }}
      >
        📋 Template
      </button>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 1000,
            minWidth: '200px',
            marginTop: '4px'
          }}
        >
          {Object.entries(taskTemplates).map(([name, template]) => (
            <button
              key={name}
              onClick={() => {
                onSelect(template);
                setIsOpen(false);
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 16px',
                textAlign: 'left',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                borderBottom: '1px solid #f3f4f6',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
