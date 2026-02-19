// frontend/src/components/FileUploadDropZone.jsx
import React, { useState, useRef } from 'react';
import { uploadMeetingFile, analyzeExisting } from '../services/api';

const FileUploadDropZone = ({ onFileSelect, metadata = {} }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e) => {
    handleFiles(e.target.files);
  };

  const handleFiles = (files) => {
    if (files.length === 0) return;

    const selectedFile = files[0];
    const allowedTypes = ['text/plain', 'application/pdf'];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Only .txt and .pdf files are allowed');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setError(null);
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', metadata.title || '');
      formData.append('date', metadata.date || new Date().toISOString());
      formData.append('participants', JSON.stringify(metadata.participants || []));
      formData.append('meetingType', metadata.meetingType || 'Other');
      formData.append('location', metadata.location || '');
      formData.append('duration', metadata.duration || 0);

      const response = await uploadMeetingFile(formData);
      const data = response.data;
      if (!data?.analysisId) {
        throw new Error('Upload failed');
      }

      await analyzeExisting(data.analysisId);
      setProgress(100);
      setUploading(false);

      // Call parent callback
      onFileSelect({
        analysisId: data.analysisId,
        fileName: data.fileName,
        textLength: data.textLength,
        wordCount: data.wordCount,
      });

      // Reset state
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(`Upload error: ${err.message}`);
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.dropZone,
          ...(isDragging ? styles.dropZoneHover : {}),
          ...(file ? styles.dropZoneWithFile : {}),
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!file ? (
          <>
            <div style={styles.dropZoneIcon}>📁</div>
            <h3>Drag & Drop Your Meeting File</h3>
            <p>or</p>
            <button
              type="button"
              style={styles.browseBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </button>
            <p style={styles.supportedText}>
              Supported: .txt, .pdf (Max 10MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
          </>
        ) : (
          <>
            <div style={styles.fileInfo}>
              <div style={styles.fileName}>
                ✅ {file.name}
              </div>
              <div style={styles.fileSize}>
                {(file.size / 1024).toFixed(2)} KB
              </div>
            </div>

            {uploading ? (
              <>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${progress}%` }}></div>
                </div>
                <p>{progress}% uploaded</p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  style={styles.uploadBtn}
                  onClick={handleUpload}
                >
                  Upload & Analyze
                </button>
                <button
                  type="button"
                  style={styles.clearBtn}
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  Choose Different File
                </button>
              </>
            )}
          </>
        )}
      </div>

      {error && (
        <div style={styles.errorMessage}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    marginBottom: '20px',
  },
  dropZone: {
    border: '2px dashed #007bff',
    borderRadius: '8px',
    padding: '40px 20px',
    textAlign: 'center',
    backgroundColor: '#f8f9ff',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  dropZoneHover: {
    backgroundColor: '#e8f0ff',
    borderColor: '#0056b3',
    boxShadow: '0 0 10px rgba(0, 86, 179, 0.2)',
  },
  dropZoneWithFile: {
    borderColor: '#28a745',
    backgroundColor: '#f0fff4',
  },
  dropZoneIcon: {
    fontSize: '48px',
    marginBottom: '10px',
  },
  browseBtn: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    marginTop: '10px',
  },
  supportedText: {
    marginTop: '15px',
    color: '#666',
    fontSize: '12px',
  },
  fileInfo: {
    marginBottom: '15px',
  },
  fileName: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  fileSize: {
    fontSize: '12px',
    color: '#666',
  },
  progressBar: {
    width: '100%',
    height: '6px',
    backgroundColor: '#e9ecef',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '10px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#28a745',
    transition: 'width 0.3s ease',
  },
  uploadBtn: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    width: '100%',
    marginBottom: '10px',
  },
  clearBtn: {
    padding: '8px 16px',
    backgroundColor: '#e9ecef',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    width: '100%',
  },
  errorMessage: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '4px',
    fontSize: '13px',
  },
};

export default FileUploadDropZone;
