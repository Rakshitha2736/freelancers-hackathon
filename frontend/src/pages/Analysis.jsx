import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import useSocket from '../hooks/useSocket';
import TaskTable from '../components/TaskTable';
import { TaskTemplateSelector } from '../components/TaskTemplateSelector';
import { getAnalysis, confirmSummary } from '../services/api';
import { exportToJSON, exportToCSV, exportToMarkdown, saveDraft, loadDraft, deleteDraft } from '../utils/exportUtils';
import { useKeyboardShortcuts } from '../utils/shortcuts';

const Analysis = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connected, on } = useSocket(user?._id);

  const [, setAnalysis] = useState(null);
  const [summary, setSummary] = useState('');
  const [decisions, setDecisions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [meetingMetadata, setMeetingMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const res = await getAnalysis(id);
        const data = res.data.analysis || res.data;
        setAnalysis(data);
        setSummary(data.summary || '');
        setDecisions(data.decisions || []);
        setTasks(
          (data.tasks || []).map((t) => ({
            ...t,
            status: t.status || 'Pending',
            isUnassigned: !t.owner,
          }))
        );
        setMetadata(data.metadata || null);
        setMeetingMetadata(data.meetingMetadata || null);
      } catch (err) {
        setError('Failed to load analysis.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [id]);

  // Listen for real-time analysis updates via WebSocket
  useEffect(() => {
    if (!connected) return;

    const handleAnalysisUpdate = (data) => {
      // Update state if this analysis receives updates from other users
      if (data._id === id) {
        setSummary(data.summary || '');
        setDecisions(data.decisions || []);
        setTasks((prev) =>
          data.tasks ? data.tasks.map(t => ({
            ...t,
            status: t.status || 'Pending',
            isUnassigned: !t.owner
          })) : prev
        );
        setMetadata(data.metadata || null);
        setMeetingMetadata(data.meetingMetadata || null);
      }
    };

    on('analysis:updated', handleAnalysisUpdate);

    return () => {
      // Cleanup handled by useSocket hook
    };
  }, [connected, on, id]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft(id, { summary, decisions, tasks });
    }, 30000);

    return () => clearInterval(interval);
  }, [id, summary, decisions, tasks]);

  // Check for saved draft on component mount
  useEffect(() => {
    const draft = loadDraft(id);
    if (draft && draft.summary) {
      setSuccess('Draft recovered from last session. Changes not saved yet.');
      setTimeout(() => setSuccess(''), 4000);
    }
  }, [id]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    SAVE_DRAFT: () => {
      saveDraft(id, { summary, decisions, tasks });
      setSuccess('Draft saved!');
      setTimeout(() => setSuccess(''), 2000);
    },
    EXPORT_JSON: () => {
      exportToJSON({ summary, decisions, tasks, metadata }, `analysis-${id}.json`);
    },
    EXPORT_CSV: () => {
      exportToCSV({ summary, decisions, tasks, metadata }, `analysis-${id}.csv`);
    },
    NEW_TASK: () => {
      const newTask = {
        description: '',
        owner: '',
        deadline: '',
        priority: 'Medium',
        status: 'Pending'
      };
      setTasks(prev => [...prev, newTask]);
    }
  });

  const handleTaskUpdate = (index, field, value) => {
    setTasks((prev) =>
      prev.map((t, i) =>
        i === index
          ? {
              ...t,
              [field]: value,
              isUnassigned: field === 'owner' ? !value : t.isUnassigned,
            }
          : t
      )
    );
  };

  const handleDecisionChange = (index, value) => {
    setDecisions((prev) =>
      prev.map((d, i) => (i === index ? value : d))
    );
  };

  const addDecision = () => {
    setDecisions((prev) => [...prev, '']);
  };

  const removeDecision = (index) => {
    setDecisions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setError('');
    try {
      await confirmSummary(id, {
        summary,
        decisions,
        tasks,
      });
      setSuccess('Summary confirmed successfully!');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to confirm summary.'
      );
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <main className="main-content">
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading analysis...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>Analysis Review</h1>
            <p className="text-muted">
              Review and edit before confirming
            </p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {meetingMetadata && (
          <section className="analysis-section" style={{ marginBottom: '24px' }}>
            <div className="section-header">
              <h2>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign:'middle',marginRight:8}}>
                  <path d="M8 7V3M16 7V3M3 11h18M5 7h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Meeting Details
              </h2>
            </div>
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div>
                <strong>Title:</strong> {meetingMetadata.title || 'Untitled'}
              </div>
              <div>
                <strong>Date:</strong> {meetingMetadata.date ? new Date(meetingMetadata.date).toLocaleDateString() : 'Unknown'}
              </div>
              <div>
                <strong>Type:</strong> {meetingMetadata.meetingType || 'Other'}
              </div>
              <div>
                <strong>Duration:</strong> {meetingMetadata.duration ? `${meetingMetadata.duration} mins` : 'N/A'}
              </div>
              <div>
                <strong>Location:</strong> {meetingMetadata.location || 'N/A'}
              </div>
              <div>
                <strong>Participants:</strong> {Array.isArray(meetingMetadata.participants) && meetingMetadata.participants.length > 0
                  ? meetingMetadata.participants.join(', ')
                  : 'N/A'}
              </div>
            </div>
          </section>
        )}

        {/* Processing Metadata Info */}
        {metadata && metadata.chunked && (
          <div className="alert" style={{ 
            backgroundColor: '#eff6ff', 
            borderColor: '#3b82f6',
            color: '#1e40af',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <strong>Large Document Processing:</strong> 
              <span>
                This {metadata.wordCount?.toLocaleString() || 0}-word meeting transcript was processed in {metadata.totalChunks} chunks for optimal analysis.
              </span>
            </div>
          </div>
        )}

        {/* Executive Summary */}
        <section className="analysis-section">
          <div className="section-header">
            <h2>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign:'middle',marginRight:8}}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Executive Summary
            </h2>
          </div>
          <textarea
            className="analysis-textarea"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={6}
          />
        </section>

        {/* Key Decisions */}
        <section className="analysis-section">
          <div className="section-header">
            <h2>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign:'middle',marginRight:8}}>
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Key Decisions
            </h2>
            <button className="btn btn-outline btn-sm" onClick={addDecision}>
              + Add Decision
            </button>
          </div>
          <ul className="decisions-list">
            {decisions.map((decision, index) => (
              <li key={index} className="decision-item">
                <span className="decision-number">{index + 1}</span>
                <input
                  type="text"
                  className="inline-input decision-input"
                  value={decision}
                  onChange={(e) => handleDecisionChange(index, e.target.value)}
                  placeholder="Enter decision..."
                />
                <button
                  className="btn-icon btn-remove"
                  onClick={() => removeDecision(index)}
                  title="Remove"
                >
                  ✕
                </button>
              </li>
            ))}
            {decisions.length === 0 && (
              <li className="empty-decision">No key decisions extracted.</li>
            )}
          </ul>
        </section>

        {/* Extracted Tasks */}
        <section className="analysis-section">
          <div className="section-header">
            <h2>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign:'middle',marginRight:8}}>
                <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Extracted Tasks
            </h2>
            <TaskTemplateSelector 
              onSelect={(template) => {
                setTasks(prev => [...prev, { ...template, status: 'Pending', confidence: 1 }]);
              }}
            />
          </div>
          <TaskTable tasks={tasks} onUpdate={handleTaskUpdate} editable={true} />
        </section>

        {/* Buttons Section */}
        <div className="confirm-section" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn btn-primary btn-lg btn-glow"
            onClick={handleConfirm}
            disabled={confirming}
          >
            {confirming ? (
              <><span className="spinner-sm" /> Confirming...</>
            ) : (
              <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round"/></svg> Confirm &amp; Save</>
            )}
          </button>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              onClick={() => exportToJSON({ summary, decisions, tasks, metadata }, `analysis-${id}.json`)}
              title="Ctrl+Shift+E"
            >
              📄 JSON
            </button>
            <button
              className="btn btn-outline"
              onClick={() => exportToCSV({ summary, decisions, tasks, metadata }, `analysis-${id}.csv`)}
              title="Ctrl+Shift+C"
            >
              📊 CSV
            </button>
            <button
              className="btn btn-outline"
              onClick={() => exportToMarkdown({ summary, decisions, tasks, metadata }, `analysis-${id}.md`)}
            >
              📝 Markdown
            </button>
            <button
              className="btn btn-outline"
              onClick={() => {
                saveDraft(id, { summary, decisions, tasks });
                setSuccess('Draft saved! (Ctrl+S)');
                setTimeout(() => setSuccess(''), 2000);
              }}
              title="Ctrl+S"
            >
              💾 Save Draft
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analysis;
