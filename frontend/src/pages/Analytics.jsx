import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Navbar from '../components/Navbar';
import { getAnalyticsOverview, getAnalyticsTrends, getTeamPerformance } from '../services/api';

const Analytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);
  
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [teamPerformance, setTeamPerformance] = useState([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, trendsRes, teamRes] = await Promise.all([
        getAnalyticsOverview(),
        getAnalyticsTrends(timeRange),
        getTeamPerformance()
      ]);

      setOverview(overviewRes.data.overview);
      setTrends(trendsRes.data.trends);
      setTeamPerformance(teamRes.data.teamPerformance);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <main className="main-content">
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading analytics...</p>
          </div>
        </main>
      </div>
    );
  }

  const statusData = overview ? [
    { name: 'Completed', value: overview.completedTasks, color: '#10b981' },
    { name: 'In Progress', value: overview.inProgressTasks, color: '#f59e0b' },
    { name: 'Pending', value: overview.pendingTasks, color: '#ef4444' }
  ] : [];

  const priorityData = overview ? [
    { name: 'High', value: overview.priorityDistribution?.high || 0, fill: '#ef4444' },
    { name: 'Medium', value: overview.priorityDistribution?.medium || 0, fill: '#f59e0b' },
    { name: 'Low', value: overview.priorityDistribution?.low || 0, fill: '#10b981' }
  ] : [];

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>Analytics Dashboard</h1>
            <p className="text-muted">Insights and performance metrics</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="filter-select"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="metrics-grid" style={{ marginBottom: '32px' }}>
          <div className="metric-card">
            <div className="metric-icon" style={{ backgroundColor: '#dbeafe' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="metric-content">
              <div className="metric-value">{overview?.totalTasks || 0}</div>
              <div className="metric-label">Total Tasks</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ backgroundColor: '#d1fae5' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="metric-content">
              <div className="metric-value">{overview?.completionRate || 0}%</div>
              <div className="metric-label">Completion Rate</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ backgroundColor: '#fef3c7' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="metric-content">
              <div className="metric-value">{overview?.totalMeetings || 0}</div>
              <div className="metric-label">Meetings Analyzed</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ backgroundColor: '#fee2e2' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round"/>
                <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="metric-content">
              <div className="metric-value">{overview?.overdueTasks || 0}</div>
              <div className="metric-label">Overdue Tasks</div>
            </div>
          </div>
        </div>

        <div className="analytics-grid">
          {/* Task Trends */}
          <div className="analytics-card">
            <h3>Task Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="tasksCreated" stroke="#3b82f6" name="Tasks Created" strokeWidth={2} />
                <Line type="monotone" dataKey="tasksCompleted" stroke="#10b981" name="Tasks Completed" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Status Distribution */}
          <div className="analytics-card">
            <h3>Task Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Priority Distribution */}
          <div className="analytics-card">
            <h3>Priority Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Team Performance */}
          <div className="analytics-card">
            <h3>Team Performance</h3>
            <div className="team-performance-list">
              {teamPerformance.slice(0, 10).map((member, index) => (
                <div key={index} className="team-member-row">
                  <div className="team-member-info">
                    <div className="team-member-avatar">
                      {member.owner.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="team-member-name">{member.owner}</div>
                      <div className="team-member-stats">
                        {member.completed}/{member.total} tasks
                      </div>
                    </div>
                  </div>
                  <div className="team-member-rate">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${member.completionRate}%`,
                          backgroundColor: member.completionRate >= 75 ? '#10b981' : member.completionRate >= 50 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                    <span className="completion-rate">{member.completionRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;
