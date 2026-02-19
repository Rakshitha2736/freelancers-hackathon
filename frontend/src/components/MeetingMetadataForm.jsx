// frontend/src/components/MeetingMetadataForm.jsx
import React, { useState } from 'react';

const MeetingMetadataForm = ({ onSubmit, initialData = {} }) => {
  const [metadata, setMetadata] = useState({
    title: initialData.title || '',
    date: initialData.date || new Date().toISOString().split('T')[0],
    participants: initialData.participants?.join(', ') || '',
    meetingType: initialData.meetingType || 'Other',
    location: initialData.location || '',
    duration: initialData.duration || 0,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMetadata(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!metadata.title.trim()) {
      setErrors({ title: 'Meeting title is required' });
      return;
    }

    const participantsArray = metadata.participants
      .split(',')
      .map(p => p.trim())
      .filter(p => p);

    onSubmit({
      ...metadata,
      participants: participantsArray,
      duration: parseInt(metadata.duration) || 0,
    });
  };

  const meetingTypes = ['Standup', 'Planning', 'Review', 'Retrospective', '1:1', 'Other'];

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3>Meeting Details</h3>

      {/* Title */}
      <div style={styles.formGroup}>
        <label htmlFor="title">Meeting Title *</label>
        <input
          id="title"
          type="text"
          name="title"
          value={metadata.title}
          onChange={handleChange}
          placeholder="e.g., Q1 Planning Session"
          style={styles.input}
          required
        />
        {errors.title && <span style={styles.error}>{errors.title}</span>}
      </div>

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

      {/* Participants */}
      <div style={styles.formGroup}>
        <label htmlFor="participants">Participants (comma-separated)</label>
        <textarea
          id="participants"
          name="participants"
          value={metadata.participants}
          onChange={handleChange}
          placeholder="e.g., John Doe, Jane Smith, Bob Johnson"
          style={{ ...styles.input, minHeight: '80px' }}
        />
      </div>

      <button type="submit" style={styles.submitBtn}>
        Continue
      </button>
    </form>
  );
};

const styles = {
  form: {
    maxWidth: '500px',
    margin: '20px auto',
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    borderLeft: '4px solid #007bff',
  },
  formGroup: {
    marginBottom: '15px',
    display: 'flex',
    flexDirection: 'column',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    marginTop: '5px',
    fontFamily: 'inherit',
  },
  error: {
    color: '#dc3545',
    fontSize: '12px',
    marginTop: '4px',
  },
  submitBtn: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    width: '100%',
  },
};

export default MeetingMetadataForm;
