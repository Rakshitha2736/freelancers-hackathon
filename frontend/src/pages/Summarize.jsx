import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MeetingMetadataForm from '../components/MeetingMetadataForm';
import FileUploadDropZone from '../components/FileUploadDropZone';
import { generateSummary } from '../services/api';

const Summarize = () => {
  const [text, setText] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadMode, setUploadMode] = useState('text'); // 'text' or 'file'
  const navigate = useNavigate();

  // Calculate if text will be chunked
  const textLength = text.trim().length;
  const wordCount = text.trim().split(/\s+/).filter(w => w).length;
  const willBeChunked = textLength > 15000;
  const estimatedChunks = willBeChunked ? Math.ceil(textLength / 15000) : 1;

  const handleSubmit = async () => {
    setError('');

    if (!text.trim()) {
      setError('Please enter meeting text or upload a file.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        rawText: text.trim(),
      };

      // Include metadata if provided
      if (metadata) {
        payload.meetingMetadata = metadata;
      }

      const res = await generateSummary(payload);
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
              Capture meeting details and generate AI-powered summaries and action items
            </p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="summarize-card">
          {/* Meeting Metadata Form */}
          <div style={{ marginBottom: '30px', paddingBottom: '30px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ marginBottom: '15px', color: '#1f2937' }}>Meeting Details</h3>
            <MeetingMetadataForm 
              onSubmit={(meta) => setMetadata(meta)}
              onChange={(meta) => setMetadata(meta)}
              initialData={metadata}
            />
          </div>

          {/* Upload Mode Selector */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setUploadMode('text')}
              style={{
                padding: '10px 20px',
                backgroundColor: uploadMode === 'text' ? '#007bff' : '#e9ecef',
                color: uploadMode === 'text' ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              Paste Text
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('file')}
              style={{
                padding: '10px 20px',
                backgroundColor: uploadMode === 'file' ? '#007bff' : '#e9ecef',
                color: uploadMode === 'file' ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              Upload File
            </button>
          </div>

          {/* Text Input Mode */}
          {uploadMode === 'text' && (
            <>
              <div className="form-group">
                <label htmlFor="meeting-text">Meeting Transcript</label>
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
                      {text.trim().split(/\s+/).filter(w => w).length} words · {text.trim().length.toLocaleString()} characters
                    </span>
                  )}
                  {text.trim().length > 15000 && (
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
                      Large text - will be processed in chunks
                    </span>
                  )}
                </div>
              </div>

              <button
                className="btn btn-primary btn-lg btn-glow"
                onClick={handleSubmit}
                disabled={loading || !text.trim()}
              >
                {loading ? (
                  <>
                    <span className="spinner-sm" /> 
                    Analyzing with AI...
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
            </>
          )}

          {/* File Upload Mode */}
          {uploadMode === 'file' && (
            <>
              <FileUploadDropZone 
                onFileSelect={(uploadData) => {
                  // After file upload, navigate to analysis
                  navigate(`/analysis/${uploadData.analysisId}`);
                }}
                metadata={metadata || {}}
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                Files are processed immediately. Meeting metadata will be attached to your analysis.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Summarize;
