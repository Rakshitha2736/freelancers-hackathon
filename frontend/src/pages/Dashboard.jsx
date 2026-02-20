import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import MetricsCards from '../components/MetricsCards';
import TaskTable from '../components/TaskTable';
import MeetingFilterList from '../components/MeetingFilterList';
import useSocket from '../hooks/useSocket';
import { getTasks, getMetrics, updateTask, searchAnalyses, getMeetings, deleteMeeting } from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { connected, on, off } = useSocket(user?._id);

  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
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
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);

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
      // Date filters are handled client-side based on task deadlines.

      const [tasksRes, metricsRes, meetingsRes] = await Promise.all([
        getTasks(params),
        getMetrics(),
        getMeetings(),
      ]);

      setTasks(tasksRes.data.tasks || tasksRes.data || []);
      setMetrics(metricsRes.data.metrics || metricsRes.data || {});
      setMeetings(meetingsRes.data.meetings || []);
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [filters, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const parseDateInput = (value, { endOfDay } = {}) => {
    if (!value || typeof value !== 'string') return null;
    const parts = value.split('-');
    if (parts.length !== 3) return null;
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return null;
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  };

  const parseDeadlineDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const ddmmyyyyMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = Number(ddmmyyyyMatch[1]);
      const month = Number(ddmmyyyyMatch[2]);
      const year = Number(ddmmyyyyMatch[3]);
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        date.setHours(0, 0, 0, 0);
        return date;
      }
      return null;
    }

    const yyyymmddMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (yyyymmddMatch) {
      const year = Number(yyyymmddMatch[1]);
      const month = Number(yyyymmddMatch[2]);
      const day = Number(yyyymmddMatch[3]);
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        date.setHours(0, 0, 0, 0);
        return date;
      }
      return null;
    }

    const fallback = new Date(trimmed);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  };

  // Optimized filtering using useMemo
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Filter by selected meeting
    if (selectedMeetingId) {
      result = result.filter((task) => task.meetingId === selectedMeetingId);
    }

    // Filter by date range
    const fromDate = parseDateInput(filters.dateFrom);
    const toDate = parseDateInput(filters.dateTo, { endOfDay: true });

    if (fromDate || toDate) {
      result = result.filter((task) => {
        const deadlineDate = parseDeadlineDate(task.deadline);
        if (!deadlineDate) return false;
        if (fromDate && deadlineDate < fromDate) return false;
        if (toDate && deadlineDate > toDate) return false;
        return true;
      });
    }

    return result;
  }, [tasks, selectedMeetingId, filters.dateFrom, filters.dateTo]);

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

  const handleTaskUpdate = async (task, field, value, index) => {
    const targetTask = task || tasks[index];
    if (!targetTask?._id || !targetTask?.analysisId) return;
    try {
      await updateTask(targetTask.analysisId, targetTask._id, { [field]: value });
      setTasks((prev) =>
        prev.map((t, i) =>
          t._id === targetTask._id
            ? { ...t, [field]: value }
            : i === index
            ? { ...t, [field]: value }
            : t
        )
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

  // Get selected meeting title if any
  const selectedMeeting = selectedMeetingId
    ? meetings.find((m) => m._id === selectedMeetingId)
    : null;

  // Compute dashboard metrics dynamically based on filtered tasks
  const computedMetrics = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const userId = user?._id?.toString();
    let totalTasks = filteredTasks.length;
    let highPriority = 0;
    let overdue = 0;
    let assignedToMe = 0;

    filteredTasks.forEach((task) => {
      // Count high priority tasks
      if (task.priority === 'High') {
        highPriority++;
      }

      // Count overdue tasks (deadline in past, not completed)
      if (task.deadline) {
        const deadlineDate = parseDeadlineDate(task.deadline);
        if (deadlineDate && deadlineDate < now && task.status !== 'Completed') {
          overdue++;
        }
      }

      // Count tasks assigned to current user
      if (userId && task.ownerUserId && task.ownerUserId.toString() === userId) {
        assignedToMe++;
      }
    });

    return {
      totalTasks,
      highPriority,
      overdue,
      assignedToMe,
    };
  }, [filteredTasks, user]);

  // Update metrics state when computed metrics change
  useEffect(() => {
    setMetrics(computedMetrics);
  }, [computedMetrics]);

  const handleDeleteMeeting = useCallback(async (meetingId) => {
    try {
      // Delete meeting from database
      await deleteMeeting(meetingId);

      // Remove meeting from meetings list
      setMeetings((prev) => prev.filter((m) => m._id !== meetingId));

      // Remove all tasks associated with this meeting
      setTasks((prev) => prev.filter((task) => task.meetingId !== meetingId));

      // Reset selected meeting if it was the deleted one
      if (selectedMeetingId === meetingId) {
        setSelectedMeetingId(null);
      }
    } catch (err) {
      console.error('Failed to delete meeting:', err);
      setError('Failed to delete meeting. Please try again.');
    }
  }, [selectedMeetingId]);

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main-content-full">
        <div className="dashboard-container">
          {/* Meeting Filter Sidebar */}
          <aside className="dashboard-sidebar">
            <MeetingFilterList
              meetings={meetings}
              selectedMeetingId={selectedMeetingId}
              onSelectMeeting={setSelectedMeetingId}
              onDeleteMeeting={handleDeleteMeeting}
              loading={loading}
            />
          </aside>

          {/* Main Content */}
          <section className="dashboard-main">
            <div className="page-header">
              <div>
                <h1>Dashboard</h1>
                <p className="text-muted">
                  {selectedMeeting
                    ? `Tasks from: ${selectedMeeting.title}`
                    : 'Your confirmed tasks and metrics overview'}
                </p>
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
              <span className="task-count">{filteredTasks.length} total</span>
            </div>

            {loading ? (
              <div className="loading-container">
                <div className="spinner" />
                <p>Loading tasks...</p>
              </div>
            ) : (
              <TaskTable 
                tasks={filteredTasks} 
                onUpdate={handleTaskUpdate} 
                editable={true} 
                showStatus={false} 
                currentUser={user}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
