// frontend/src/pages/IntegrationSettings.jsx
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

const IntegrationSettings = () => {
  const navigate = useNavigate();
  const [notionToken, setNotionToken] = useState('');
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tokenValidated, setTokenValidated] = useState(false);

  // Load saved token from localStorage on component mount
  useEffect(() => {
    const savedToken = localStorage.getItem('notionToken');
    const savedDb = localStorage.getItem('selectedNotionDatabase');
    if (savedToken) {
      setNotionToken(savedToken);
      setTokenValidated(true);
      if (savedDb) {
        setSelectedDatabase(savedDb);
      }
    }
  }, []);

  const validateToken = async () => {
    if (!notionToken.trim()) {
      setError('Please enter a Notion API token');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/integrations/notion/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ notionToken: notionToken.trim() }),
      });

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      setTokenValidated(true);
      localStorage.setItem('notionToken', notionToken.trim());
      setSuccess('Token validated successfully!');
      
      // Fetch databases
      fetchDatabases();
    } catch (err) {
      setError(`Validation failed: ${err.message}`);
      setTokenValidated(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabases = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/notion/databases', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Notion-Token': notionToken.trim(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch databases');
      }

      const data = await response.json();
      setDatabases(data.databases || []);
    } catch (err) {
      setError(`Failed to fetch databases: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveSelectedDatabase = () => {
    if (!selectedDatabase) {
      setError('Please select a database');
      return;
    }

    localStorage.setItem('selectedNotionDatabase', selectedDatabase);
    setSuccess('Database saved successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const revokeIntegration = () => {
    if (window.confirm('Are you sure you want to revoke Notion integration?')) {
      localStorage.removeItem('notionToken');
      localStorage.removeItem('selectedNotionDatabase');
      setNotionToken('');
      setSelectedDatabase('');
      setDatabases([]);
      setTokenValidated(false);
      setSuccess('Integration revoked');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>Integration Settings</h1>
            <p className="text-muted">
              Connect your project management tools to export analyses and action items
            </p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div style={{ maxWidth: '600px' }}>
          {/* Notion Integration */}
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '32px', marginRight: '15px' }}>🔗</div>
              <div>
                <h3 style={{ margin: 0, color: '#1f2937' }}>Notion Integration</h3>
                <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '13px' }}>
                  {tokenValidated ? '✅ Connected' : 'Not connected'}
                </p>
              </div>
            </div>

            {!tokenValidated ? (
              <>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1f2937' }}>
                    Notion API Token
                  </label>
                  <input
                    type="password"
                    value={notionToken}
                    onChange={(e) => setNotionToken(e.target.value)}
                    placeholder="secret_..."
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                    Get your token from <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>Notion Developer Settings</a>
                  </p>
                </div>

                <button
                  onClick={validateToken}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Validating...' : 'Connect'}
                </button>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1f2937' }}>
                    Target Database
                  </label>
                  <select
                    value={selectedDatabase}
                    onChange={(e) => setSelectedDatabase(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Select a database...</option>
                    {databases.map(db => (
                      <option key={db.id} value={db.id}>
                        {db.title}
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                    {databases.length > 0
                      ? `Found ${databases.length} database(s)`
                      : 'No databases available'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={saveSelectedDatabase}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '500',
                    }}
                  >
                    Save Database
                  </button>
                  <button
                    onClick={revokeIntegration}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '500',
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Trello Integration (Coming Soon) */}
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '20px',
            opacity: 0.6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '32px', marginRight: '15px' }}>🎯</div>
              <div>
                <h3 style={{ margin: 0, color: '#1f2937' }}>Trello Integration</h3>
                <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '13px' }}>
                  Coming soon
                </p>
              </div>
            </div>
            <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
              Export action items directly to Trello boards
            </p>
          </div>

          {/* Integration Info */}
          <div style={{
            backgroundColor: '#e7f3ff',
            border: '1px solid #b3d9ff',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#004085' }}>How integrations work</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#004085' }}>
              <li>Connected integrations will be available when you export analyses</li>
              <li>Your API tokens are stored locally and never shared with our servers</li>
              <li>You can disconnect anytime and your data will remain in your tools</li>
              <li>Exported content includes summary, action items, and meeting metadata</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default IntegrationSettings;
