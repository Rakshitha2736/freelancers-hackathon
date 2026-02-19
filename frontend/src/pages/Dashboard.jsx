import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import MetricsCards from '../components/MetricsCards';
import TaskTable from '../components/TaskTable';
import useSocket from '../hooks/useSocket';
import { getTasks, getMetrics, updateTask, searchAnalyses } from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { connected, on, off } = useSocket(user?._id);

  const [tasks, setTasks] = useState([]);
  const [metrics, setMetrics] = useState({
    totalTasks: 0,
    highPriority: 0,
    overdue: 0,
    assignedToMe: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    owner: '',
    priority: '',
    myTasksOnly: false,
    meetingType: '',
    dateFrom: '',
    dateTo: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { isConfirmed: true };
      if (filters.owner) params.owner = filters.owner;
      if (filters.priority) params.priority = filters.priority;
      if (filters.myTasksOnly) params.mine = true;
      if (filters.meetingType) params.meetingType = filters.meetingType;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      const [tasksRes, metricsRes] = await Promise.all([
        getTasks(params),
        getMetrics(),
      ]);

      setTasks(tasksRes.data.tasks || tasksRes.data || []);
      setMetrics(metricsRes.data.metrics || metricsRes.data || {});
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [filters, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for real-time task updates via WebSocket
  useEffect(() => {
    if (!connected) return;

    const handleTaskUpdate = (data) => {
      setTasks((prev) =>
        prev.map((task) =>
          task._id === data._id ? { ...task, ...data } : task
        )
      );
    };

    const handleTaskDeleted = (taskId) => {
      setTasks((prev) => prev.filter((task) => task._id !== taskId));
    };

    const handleAnalysisUpdate = (data) => {
      // Refresh all data when analysis is updated (including new tasks with owners)
      fetchData();
    };

    on('task:updated', handleTaskUpdate);
    on('task:deleted', handleTaskDeleted);
    on('analysis:updated', handleAnalysisUpdate);

    return () => {
      off('task:updated', handleTaskUpdate);
      off('task:deleted', handleTaskDeleted);
      off('analysis:updated', handleAnalysisUpdate);
    };
  }, [connected, on, off, fetchData]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => {
      if (field === 'myTasksOnly' && value) {
        return { ...prev, myTasksOnly: true, owner: '' };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleTaskUpdate = async (index, field, value) => {
    const task = tasks[index];
    if (!task._id || !task.analysisId) return;
    try {
      await updateTask(task.analysisId, task._id, { [field]: value });
      setTasks((prev) =>
        prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
      );
    } catch {
      setError('Failed to update task.');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const hasQuery = searchQuery.trim().length >= 2;
    const hasFilter = !!(filters.meetingType || filters.dateFrom || filters.dateTo);

    if (!hasQuery && !hasFilter) {
      setSearchResults([]);
      return;
    }

    if (searchQuery.trim().length > 0 && searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await searchAnalyses(searchQuery, {
        meetingType: filters.meetingType,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
      setSearchResults(res.data.results || []);
    } catch (err) {
      setError('Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const canSearch = searchQuery.trim().length >= 2 || filters.meetingType || filters.dateFrom || filters.dateTo;

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p className="text-muted">Your confirmed tasks and metrics overview</p>
          </div>
          <button
            className="btn btn-primary btn-glow"
            onClick={() => navigate('/summarize')}
          >
            <span className="btn-icon-left"></span>
            New Summarization
          </button>
        </div>

        {/* Search Bar */}
        <div className="search-section" style={{ marginBottom: '24px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', maxWidth: '600px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="filter-input"
                placeholder="🔍 Search meetings, tasks, decisions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingRight: searchQuery ? '40px' : '12px' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#9ca3af'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            <button 
              type="submit" 
              className="btn btn-secondary"
              disabled={searching || !canSearch}
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                  Found {searchResults.length} meeting{searchResults.length !== 1 ? 's' : ''}
                </h3>
                <button onClick={clearSearch} className="btn btn-sm btn-outline">
                  Close Results
                </button>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {searchResults.map(result => (
                  <div 
                    key={result._id}
                    onClick={() => navigate(`/analysis/${result._id}`)}
                    style={{
                      background: 'white',
                      padding: '16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: '1px solid #e5e7eb',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ fontSize: '0.9rem', color: '#1f2937', marginBottom: '8px' }}>
                      {result.summary}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: '#64748b' }}>
                      <span>📅 {new Date(result.confirmedAt).toLocaleDateString()}</span>
                      <span>✅ {result.matchedTasks}/{result.totalTasks} tasks</span>
                      <span>💡 {result.matchedDecisions}/{result.totalDecisions} decisions</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <MetricsCards metrics={metrics} />

        {/* Filters */}
        <div className="filters-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="filter-group">
            <input
              type="text"
              placeholder="🔍 Filter by owner..."
              value={filters.owner}
              onChange={(e) => handleFilterChange('owner', e.target.value)}
              className="filter-input"
              disabled={filters.myTasksOnly}
            />
          </div>
          <div className="filter-group">
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="filter-select"
            >
              <option value="">All Priorities</option>
              <option value="High">🔴 High</option>
              <option value="Medium">🟠 Medium</option>
              <option value="Low">🔵 Low</option>
            </select>
          </div>
          <div className="filter-group">
            <select
              value={filters.meetingType}
              onChange={(e) => handleFilterChange('meetingType', e.target.value)}
              className="filter-select"
            >
              <option value="">All Meeting Types</option>
              <option value="Standup">Standup</option>
              <option value="Planning">Planning</option>
              <option value="Review">Review</option>
              <option value="Retrospective">Retrospective</option>
              <option value="1:1">1:1</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="filter-group" style={{ display: 'flex', gap: '8px' }}>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="filter-input"
              style={{ width: '150px' }}
              title="From date"
            />
            <span>to</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="filter-input"
              style={{ width: '150px' }}
              title="To date"
            />
          </div>
          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={filters.myTasksOnly}
              onChange={(e) => handleFilterChange('myTasksOnly', e.target.checked)}
            />
            <span>My Tasks Only</span>
          </label>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="section-label">
          <h2>Tasks</h2>
          <span className="task-count">{tasks.length} total</span>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading tasks...</p>
          </div>
        ) : (
          <TaskTable 
            tasks={tasks} 
            onUpdate={handleTaskUpdate} 
            editable={true} 
            showStatus={false} 
            currentUser={user}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
