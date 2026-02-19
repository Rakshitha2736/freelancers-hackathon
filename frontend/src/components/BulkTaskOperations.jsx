import React, { useState } from 'react';

export const BulkTaskOperations = ({ tasks, onUpdate }) => {
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkPriority, setBulkPriority] = useState('');

  const toggleSelected = (index) => {
    const newSelected = new Set(selected);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelected(newSelected);
  };

  const toggleSelectAll = () => {
    if (selected.size === tasks.length) {
      setSelected(new Set());
    } else {
      const all = new Set(tasks.map((_, i) => i));
      setSelected(all);
    }
  };

  const applyBulkUpdate = (field, value) => {
    selected.forEach(index => {
      onUpdate(index, field, value);
    });
    setSelected(new Set());
    setBulkStatus('');
    setBulkPriority('');
  };

  return (
    <div style={{ marginBottom: '24px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={selected.size === tasks.length && tasks.length > 0}
            onChange={toggleSelectAll}
            disabled={tasks.length === 0}
          />
          <span style={{ fontSize: '0.9rem' }}>
            Select All ({selected.size}/{tasks.length})
          </span>
        </label>

        {selected.size > 0 && (
          <>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            >
              <option value="">Change Status...</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>

            {bulkStatus && (
              <button
                className="btn btn-sm btn-primary"
                onClick={() => applyBulkUpdate('status', bulkStatus)}
              >
                Apply Status
              </button>
            )}

            <select
              value={bulkPriority}
              onChange={(e) => setBulkPriority(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            >
              <option value="">Change Priority...</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {bulkPriority && (
              <button
                className="btn btn-sm btn-primary"
                onClick={() => applyBulkUpdate('priority', bulkPriority)}
              >
                Apply Priority
              </button>
            )}

            <button
              className="btn btn-sm btn-outline"
              onClick={() => {
                selected.forEach(index => {
                  onUpdate(index, 'status', 'Completed');
                });
                setSelected(new Set());
              }}
            >
              ✓ Mark Done ({selected.size})
            </button>
          </>
        )}
      </div>
    </div>
  );
};
