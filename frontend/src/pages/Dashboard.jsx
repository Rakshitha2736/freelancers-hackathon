import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import MetricsCards from '../components/MetricsCards';
import TaskTable from '../components/TaskTable';
import { getTasks, getMetrics, updateTask } from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [metrics, setMetrics] = useState({
    totalTasks: 0,
    highPriority: 0,
    overdue: 0,
    assignedToMe: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    owner: '',
    priority: '',
    myTasksOnly: false,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { isConfirmed: true };
      if (filters.owner) params.owner = filters.owner;
      if (filters.priority) params.priority = filters.priority;
      if (filters.myTasksOnly && user) params.owner = user.name || user.email;

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

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
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
            <span className="btn-icon-left">✨</span>
            New Summarization
          </button>
        </div>

        <MetricsCards metrics={metrics} />

        {/* Filters */}
        <div className="filters-bar">
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
          <TaskTable tasks={tasks} onUpdate={handleTaskUpdate} editable={false} showStatus={false} />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
