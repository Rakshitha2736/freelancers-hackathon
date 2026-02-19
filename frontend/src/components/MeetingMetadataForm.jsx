// frontend/src/components/MeetingMetadataForm.jsx
import React, { useState, useEffect, useRef } from 'react';

const MeetingMetadataForm = ({ onSubmit, onChange, initialData = null }) => {
  const safeData = initialData || {};
  const [metadata, setMetadata] = useState({
    title: safeData.title || '',
    date: safeData.date || new Date().toISOString().split('T')[0],
    meetingType: safeData.meetingType || 'Other',
    location: safeData.location || '',
    duration: safeData.duration || 0,
  });

  const [errors, setErrors] = useState({});
  const isInitialMount = useRef(true);

  const normalizeMetadata = (data) => {
    return {
      ...data,
      duration: parseInt(data.duration, 10) || 0,
    };
  };

  // Call onChange when metadata changes (after render, not during)
  // Skip initial mount to avoid infinite loop
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (onChange) {
      onChange(normalizeMetadata(metadata));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadata]); // Only depend on metadata, not onChange

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMetadata(prev => ({ ...prev, [name]: value }));
  };

  const meetingTypes = ['Standup', 'Planning', 'Review', 'Retrospective', '1:1', 'Other'];

  return (
    <div style={styles.container}>
      {/* Title */}
      <div style={styles.formGroup}>
        <label htmlFor="title">Meeting Title</label>
        <input
          id="title"
          type="text"
          name="title"
          value={metadata.title}
          onChange={handleChange}
          placeholder="e.g., Q1 Planning Session"
          style={styles.input}
        />
      </div>

      <div style={styles.row}>
        {/* Date */}
        <div style={styles.formGroup}>
          <label htmlFor="date">Meeting Date</label>
          <input
            id="date"
            type="date"
            name="date"
            value={metadata.date}
            onChange={handleChange}
            style={styles.input}
          />
        </div>

        {/* Meeting Type */}
        <div style={styles.formGroup}>
          <label htmlFor="meetingType">Meeting Type</label>
          <select
            id="meetingType"
            name="meetingType"
            value={metadata.meetingType}
            onChange={handleChange}
            style={styles.input}
          >
            {meetingTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.row}>
        {/* Duration */}
        <div style={styles.formGroup}>
          <label htmlFor="duration">Duration (minutes)</label>
          <input
            id="duration"
            type="number"
            name="duration"
            value={metadata.duration}
            onChange={handleChange}
            min="0"
            style={styles.input}
          />
        </div>

        {/* Location */}
        <div style={styles.formGroup}>
          <label htmlFor="location">Location/Channel</label>
          <input
            id="location"
            type="text"
            name="location"
            value={metadata.location}
            onChange={handleChange}
            placeholder="e.g., Zoom, Conference Room A"
            style={styles.input}
          />
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  formGroup: {
    marginBottom: '15px',
    display: 'flex',
    flexDirection: 'column',
  },
  input: {
    padding: '10px 14px',
    border: '1.5px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    marginTop: '5px',
    fontFamily: 'inherit',
    width: '100%',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  error: {
    color: '#dc3545',
    fontSize: '12px',
    marginTop: '4px',
  },
};

export default MeetingMetadataForm;
