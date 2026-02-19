import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import TaskTable from '../components/TaskTable';
import { getAnalysis, confirmSummary } from '../services/api';

const Analysis = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [, setAnalysis] = useState(null);
  const [summary, setSummary] = useState('');
  const [decisions, setDecisions] = useState([]);
  const [tasks, setTasks] = useState([]);
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
      } catch (err) {
        setError('Failed to load analysis.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [id]);

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
          </div>
          <TaskTable tasks={tasks} onUpdate={handleTaskUpdate} editable={true} />
        </section>

        {/* Confirm Button */}
        <div className="confirm-section">
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
        </div>
      </main>
    </div>
  );
};

export default Analysis;
