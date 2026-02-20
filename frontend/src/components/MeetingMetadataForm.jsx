// frontend/src/components/MeetingMetadataForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

const MeetingMetadataForm = ({ onSubmit, onChange, initialData = null, validationErrors = {} }) => {
  const { isDark } = useTheme();
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

  const getStyles = () => ({
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
    },
    row: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '8px',
      color: isDark ? '#f3f4f6' : '#374151',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    required: {
      color: '#ef4444',
      fontSize: '16px',
    },
    input: {
      padding: '12px 14px',
      border: isDark ? '1.5px solid #4b5563' : '1.5px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'inherit',
      width: '100%',
      transition: 'all 0.2s ease',
      backgroundColor: isDark ? '#374151' : 'white',
      color: isDark ? '#f3f4f6' : '#1f2937',
    },
    error: {
      color: '#ef4444',
      fontSize: '12px',
      marginTop: '4px',
      fontWeight: '500',
    },
  });

  const styles = getStyles();

  return (
    <div style={styles.container}>
      {/* Title - Required */}
      <div style={styles.formGroup}>
        <label htmlFor="title" style={styles.label}>
          Meeting Title <span style={styles.required}>*</span>
        </label>
        <input
          id="title"
          type="text"
          name="title"
          value={metadata.title}
          onChange={handleChange}
          placeholder="e.g., Q1 Planning Session"
          style={{
            ...styles.input,
            borderColor: validationErrors.title ? '#ef4444' : (isDark ? '#4b5563' : '#e5e7eb'),
          }}
          required
        />
        {validationErrors.title && (
          <span style={styles.error}>{validationErrors.title}</span>
        )}
      </div>

      <div style={styles.row}>
        {/* Date */}
        <div style={styles.formGroup}>
          <label htmlFor="date" style={styles.label}>
            Meeting Date
          </label>
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
          <label htmlFor="meetingType" style={styles.label}>
            Meeting Type
          </label>
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
          <label htmlFor="duration" style={styles.label}>
            Duration (minutes)
          </label>
          <input
            id="duration"
            type="number"
            name="duration"
            value={metadata.duration}
            onChange={handleChange}
            min="0"
            placeholder="60"
            style={styles.input}
          />
        </div>

        {/* Location */}
        <div style={styles.formGroup}>
          <label htmlFor="location" style={styles.label}>
            Location / Channel
          </label>
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

export default MeetingMetadataForm;
