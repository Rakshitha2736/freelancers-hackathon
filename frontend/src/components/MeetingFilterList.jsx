import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTheme } from '../context/ThemeContext';
import './MeetingFilterList.css';

const MeetingFilterList = ({ meetings, selectedMeetingId, onSelectMeeting, onDeleteMeeting, loading = false }) => {
  const { isDark } = useTheme();
  const [deletingMeetingId, setDeletingMeetingId] = useState(null);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (deletingMeetingId) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [deletingMeetingId]);
  if (loading) {
    return (
      <>
        <div className={`meeting-sidebar-header ${isDark ? 'dark' : 'light'}`}>
          <h3>📅 Meetings</h3>
        </div>
        <div className={`meeting-sidebar-content ${isDark ? 'dark' : 'light'}`}>
          <div className="meeting-list-loading">Loading meetings...</div>
        </div>
      </>
    );
  }

  if (!meetings || meetings.length === 0) {
    return (
      <>
        <div className={`meeting-sidebar-header ${isDark ? 'dark' : 'light'}`}>
          <h3>📅 Meetings</h3>
        </div>
        <div className={`meeting-sidebar-content ${isDark ? 'dark' : 'light'}`}>
          <div className="meeting-list-empty">
            <p>No meetings yet</p>
          </div>
        </div>
      </>
    );
  }

  const handleDeleteClick = (e, meeting) => {
    e.stopPropagation();
    setDeletingMeetingId(meeting._id);
  };

  const confirmDelete = (meeting) => {
    setDeletingMeetingId(null);
    if (onDeleteMeeting) {
      onDeleteMeeting(meeting._id);
    }
  };

  // Render modal using React Portal at document.body level with dark mode support
  const modalContent = deletingMeetingId ? ReactDOM.createPortal(
    <div className={`delete-confirmation-overlay ${isDark ? 'dark' : 'light'}`} onClick={() => setDeletingMeetingId(null)}>
      <div className={`delete-confirmation-modal ${isDark ? 'dark' : 'light'}`} onClick={(e) => e.stopPropagation()}>
        <div className={`delete-confirmation-header ${isDark ? 'dark' : 'light'}`}>
          <span className="delete-confirmation-icon">⚠️</span>
          <h2>Delete Meeting?</h2>
        </div>
        <div className={`delete-confirmation-body ${isDark ? 'dark' : 'light'}`}>
          <p>Are you sure you want to delete this meeting?</p>
          <p className={`delete-confirmation-warning ${isDark ? 'dark' : 'light'}`}>
            This will also permanently delete all {meetings.find(m => m._id === deletingMeetingId)?.taskCount || 0} related tasks.
          </p>
        </div>
        <div className={`delete-confirmation-buttons ${isDark ? 'dark' : 'light'}`}>
          <button
            className={`btn btn-secondary ${isDark ? 'dark' : 'light'}`}
            onClick={() => setDeletingMeetingId(null)}
          >
            Cancel
          </button>
          <button
            className={`btn btn-danger ${isDark ? 'dark' : 'light'}`}
            onClick={() => confirmDelete(meetings.find(m => m._id === deletingMeetingId))}
          >
            Delete Meeting
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {/* Modal rendered via React Portal */}
      {modalContent}

      {/* Sidebar Header - Sticky */}
      <div className={`meeting-sidebar-header ${isDark ? 'dark' : 'light'}`}>
        <h3>📅 Meetings ({meetings.length})</h3>
        {selectedMeetingId && (
          <button
            className={`btn-clear-filter ${isDark ? 'dark' : 'light'}`}
            onClick={() => onSelectMeeting(null)}
            title="Show all meetings"
          >
            ✕
          </button>
        )}
      </div>

      {/* Scrollable Meeting List */}
      <div className={`meeting-sidebar-content ${isDark ? 'dark' : 'light'}`}>
        {/* "All Meetings" option */}
        <div
          className={`meeting-item ${selectedMeetingId === null ? 'active' : ''} ${isDark ? 'dark' : 'light'}`}
          onClick={() => onSelectMeeting(null)}
        >
          <div className="meeting-item-content">
            <div className="meeting-item-title">All Meetings</div>
            <div className="meeting-item-meta">
              Total: {meetings.reduce((sum, m) => sum + m.taskCount, 0)} tasks
            </div>
          </div>
        </div>

        {/* Individual meetings */}
        {meetings.map((meeting) => (
          <div
            key={meeting._id}
            className={`meeting-item ${selectedMeetingId === meeting._id ? 'active' : ''} ${isDark ? 'dark' : 'light'}`}
            onClick={() => onSelectMeeting(meeting._id)}
            title={meeting.title}
          >
            <div className="meeting-item-icon">
              {getMeetingTypeIcon(meeting.meetingType)}
            </div>
            <div className="meeting-item-content">
              <div className="meeting-item-title">{meeting.title}</div>
              <div className="meeting-item-meta">
                <span className={`meeting-date ${isDark ? 'dark' : 'light'}`}>
                  {new Date(meeting.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className={`meeting-type ${isDark ? 'dark' : 'light'}`}>{meeting.meetingType}</span>
                <span className={`task-badge ${isDark ? 'dark' : 'light'}`}>{meeting.taskCount}</span>
              </div>
            </div>
            <button
              className={`btn-delete-meeting ${isDark ? 'dark' : 'light'}`}
              onClick={(e) => handleDeleteClick(e, meeting)}
              title="Delete meeting and all related tasks"
              aria-label="Delete meeting"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

function getMeetingTypeIcon(type) {
  const icons = {
    Standup: '⚡',
    Planning: '📋',
    Review: '✅',
    Retrospective: '🔄',
    '1:1': '👥',
    Other: '🎯',
  };
  return icons[type] || icons.Other;
}

export default MeetingFilterList;
