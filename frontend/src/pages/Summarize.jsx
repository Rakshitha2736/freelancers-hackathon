import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { generateSummary } from '../services/api';

const Summarize = () => {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Calculate if text will be chunked
  const textLength = text.trim().length;
  const wordCount = text.trim().split(/\s+/).filter(w => w).length;
  const willBeChunked = textLength > 15000;
  const estimatedChunks = willBeChunked ? Math.ceil(textLength / 15000) : 1;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (!selected.name.endsWith('.txt')) {
        setError('Only .txt files are supported.');
        setFile(null);
        return;
      }
      setFile(selected);
      setError('');

      // Read file content into textarea
      const reader = new FileReader();
      reader.onload = (ev) => {
        setText(ev.target.result);
      };
      reader.readAsText(selected);
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!text.trim()) {
      setError('Please enter meeting text or upload a .txt file.');
      return;
    }

    setLoading(true);
    try {
      const res = await generateSummary({ rawText: text.trim() });
      const id = res.data.id || res.data._id || res.data.analysisId;
      navigate(`/analysis/${id}`);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to generate summary. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>Meeting Summarization</h1>
            <p className="text-muted">
              Paste your meeting transcript or upload a .txt file
            </p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="summarize-card">
          <div className="form-group">
            <label htmlFor="meeting-text">Meeting Text</label>
            <textarea
              id="meeting-text"
              className="summarize-textarea"
              placeholder="Paste your meeting transcript here...&#10;&#10;Example:&#10;John: Let's discuss the Q4 roadmap...&#10;Sarah: I think we should prioritize the mobile app..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={14}
              disabled={loading}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              {text.trim() && (
                <span className="char-count">
                  {wordCount} words · {textLength.toLocaleString()} characters
                </span>
              )}
              {willBeChunked && (
                <span className="char-count" style={{ 
                  color: '#3b82f6', 
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  Will be processed in {estimatedChunks} chunks for optimal results
                </span>
              )}
            </div>
          </div>

          <div className="upload-area" onClick={() => !loading && fileInputRef.current?.click()}>
            <input
              type="file"
              accept=".txt"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="file-input-hidden"
            />
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="upload-icon">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {file ? (
              <span className="upload-label"><strong>{file.name}</strong> — click to change</span>
            ) : (
              <span className="upload-label">Click to upload a <strong>.txt</strong> file, or drag & drop</span>
            )}
          </div>

          <button
            className="btn btn-primary btn-lg btn-glow"
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
          >
            {loading ? (
              <>
                <span className="spinner-sm" /> 
                {willBeChunked 
                  ? `Analyzing ${estimatedChunks} chunks with AI...` 
                  : 'Analyzing with AI...'}
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Generate Summary
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
};

export default Summarize;
