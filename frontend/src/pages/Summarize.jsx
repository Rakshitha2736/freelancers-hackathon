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

    const trimmedText = text.trim();
    
    if (!trimmedText) {
      setError('Please enter meeting text or upload a file.');
      return;
    }

    if (trimmedText.length < 50) {
      setError('Meeting text must be at least 50 characters long.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        rawText: trimmedText,
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
          {/* Step 1: Meeting Details */}
          <section style={{ 
            padding: '24px', 
            backgroundColor: '#f9fafb', 
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>1</div>
              <h3 style={{ margin: 0, color: '#1f2937', fontSize: '18px', fontWeight: '600' }}>
                Meeting Details (Optional)
              </h3>
            </div>
            <MeetingMetadataForm 
              onChange={(meta) => setMetadata(meta)}
              initialData={metadata}
            />
          </section>

          {/* Step 2: Choose Input Method */}
          <section style={{ 
            padding: '24px', 
            backgroundColor: '#f9fafb', 
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>2</div>
              <h3 style={{ margin: 0, color: '#1f2937', fontSize: '18px', fontWeight: '600' }}>
                Choose Input Method
              </h3>
            </div>

            {/* Upload Mode Selector */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setUploadMode('text')}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  backgroundColor: uploadMode === 'text' ? '#6366f1' : 'white',
                  color: uploadMode === 'text' ? 'white' : '#4b5563',
                  border: uploadMode === 'text' ? 'none' : '2px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '15px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: uploadMode === 'text' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                Paste Text
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  backgroundColor: uploadMode === 'file' ? '#6366f1' : 'white',
                  color: uploadMode === 'file' ? 'white' : '#4b5563',
                  border: uploadMode === 'file' ? 'none' : '2px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '15px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: uploadMode === 'file' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload File
              </button>
            </div>

            {/* Text Input Mode */}
            {uploadMode === 'text' && (
              <>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label htmlFor="meeting-text" style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500',
                    color: '#374151',
                    fontSize: '14px'
                  }}>Meeting Transcript</label>
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
                  style={{ width: '100%', fontSize: '16px', padding: '14px 24px' }}
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
                <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '12px', textAlign: 'center' }}>
                  📎 Files are processed immediately after upload
                </p>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Summarize;
