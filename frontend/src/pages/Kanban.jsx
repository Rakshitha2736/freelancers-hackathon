import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import useSocket from '../hooks/useSocket';
import { getTasks, updateTask } from '../services/api';

const Kanban = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connected, on, off } = useSocket(user?._id);
  const [tasks, setTasks] = useState({ pending: [], inProgress: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState(null);
  const [error, setError] = useState('');
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [showMyTasksOnly]);

  const normalizeStatusKey = (status) => {
    // Backend sends: 'Pending', 'In Progress', 'Completed'
    // Frontend uses: 'pending', 'inProgress', 'completed'
    const statusStr = (status || 'Pending').toString();
    if (statusStr === 'In Progress') return 'inProgress';
    if (statusStr === 'Completed') return 'completed';
    return 'pending';
  };

  const denormalizeStatus = (statusKey) => {
    // Convert frontend keys back to backend values
    if (statusKey === 'inProgress') return 'In Progress';
    if (statusKey === 'completed') return 'Completed';
    return 'Pending';
  };

  // Listen for real-time task updates via WebSocket
  useEffect(() => {
    if (!connected) return;

    const handleTaskUpdate = (data) => {
      setTasks((prev) => {
        const foundInPending = prev.pending.find(t => t._id === data._id);
        const foundInProgress = prev.inProgress.find(t => t._id === data._id);
        const foundInCompleted = prev.completed.find(t => t._id === data._id);
        const oldStatus = foundInPending
          ? 'pending'
          : foundInProgress
          ? 'inProgress'
          : foundInCompleted
          ? 'completed'
          : null;
        const newStatusKey = normalizeStatusKey(data.status);

        if (!oldStatus) {
          return {
            ...prev,
            [newStatusKey]: [...prev[newStatusKey], { ...data }]
          };
        }

        return {
          ...prev,
          [oldStatus]: prev[oldStatus].filter(t => t._id !== data._id),
          [newStatusKey]: [...prev[newStatusKey], { ...data }]
        };
      });
    };

    const handleTaskDeleted = (taskId) => {
      setTasks((prev) => ({
        pending: prev.pending.filter(t => t._id !== taskId),
        inProgress: prev.inProgress.filter(t => t._id !== taskId),
        completed: prev.completed.filter(t => t._id !== taskId)
      }));
    };

    const handleAnalysisUpdate = () => {
      // Refetch all tasks when analysis is updated (new tasks with owners)
      fetchTasks();
    };

    on('task:updated', handleTaskUpdate);
    on('task:deleted', handleTaskDeleted);
    on('analysis:updated', handleAnalysisUpdate);

    return () => {
      off('task:updated', handleTaskUpdate);
      off('task:deleted', handleTaskDeleted);
      off('analysis:updated', handleAnalysisUpdate);
    };
  }, [connected, on, off]);

  const fetchTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { isConfirmed: true };
      if (showMyTasksOnly) {
        params.mine = true;
      }
      
      const res = await getTasks(params);
      const allTasks = res.data.tasks || res.data || [];
      
      // Group tasks by status
      const grouped = {
        pending: allTasks.filter(t => t.status === 'Pending'),
        inProgress: allTasks.filter(t => t.status === 'In Progress'),
        completed: allTasks.filter(t => t.status === 'Completed')
      };
      
      setTasks(grouped);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('Failed to load tasks. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = (e) => {
    setDraggedTask(null);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    
    if (!draggedTask) return;
    
    if (draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    const oldStatus = draggedTask.status;
    const oldStatusKey = normalizeStatusKey(oldStatus);
    const newStatusKey = normalizeStatusKey(newStatus);

    // Optimistic update
    setTasks(prev => ({
      ...prev,
      [oldStatusKey]: prev[oldStatusKey].filter(t => t._id !== draggedTask._id),
      [newStatusKey]: [...prev[newStatusKey], { ...draggedTask, status: newStatus }]
    }));

    setDraggedTask(null);

    try {
      // Update task status in backend
      await updateTask(draggedTask.analysisId, draggedTask._id, { status: newStatus });
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('Failed to update task. Rolling back...');
      
      // Rollback on error
      setTasks(prev => ({
        ...prev,
        [newStatusKey]: prev[newStatusKey].filter(t => t._id !== draggedTask._id),
        [oldStatusKey]: [...prev[oldStatusKey], { ...draggedTask, status: oldStatus }]
      }));
      
      setTimeout(() => setError(''), 5000);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'No deadline';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isOverdue = (date, status) => {
    if (!date || status === 'Completed') return false;
    return new Date(date) < new Date();
  };

  const totalTasks = tasks.pending.length + tasks.inProgress.length + tasks.completed.length;
  const completionRate = totalTasks === 0 ? '0%' : `${Math.round((tasks.completed.length / totalTasks) * 100)}%`;

  if (loading) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <main className="main-content">
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading tasks...</p>
          </div>
        </main>
      </div>
    );
  }

  const KanbanCard = ({ task }) => {
    const isMyTask = task.ownerUserId && user?._id && task.ownerUserId.toString() === user._id.toString();
    
    return (
      <div
        className="kanban-card"
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        onDragEnd={handleDragEnd}
        style={{ 
          border: isMyTask ? '2px solid #3b82f6' : undefined,
          boxShadow: isMyTask ? '0 4px 6px -1px rgba(59, 130, 246, 0.2)' : undefined
        }}
      >
        {isMyTask && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: '#3b82f6',
            color: 'white',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: '600'
          }}>
            YOU
          </div>
        )}
        <div className="kanban-card-title">{task.description}</div>
        <div className="kanban-card-meta">
          <div className="kanban-card-row" style={{ alignItems: 'center', gap: '8px' }}>
            {task.owner ? (
              <>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isMyTask ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  fontSize: '0.75rem',
                  flexShrink: 0
                }}>
                  {task.owner.charAt(0).toUpperCase()}
                </div>
                <span style={{ 
                  fontWeight: isMyTask ? '600' : '500', 
                  color: isMyTask ? '#3b82f6' : '#1f2937',
                  fontSize: '0.85rem'
                }}>
                  {task.owner}
                </span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Unassigned</span>
              </>
            )}
          </div>
          <div className="kanban-card-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span style={{ color: isOverdue(task.deadline, task.status) ? '#dc2626' : 'inherit' }}>
              {formatDate(task.deadline)}
            </span>
          </div>
          <div className="kanban-card-row">
            <span className={`kanban-priority ${task.priority.toLowerCase()}`}>
              {task.priority}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>Kanban Board</h1>
            <p className="text-muted">Drag and drop tasks to update their status</p>
            {showMyTasksOnly && (
              <div style={{ 
                marginTop: '8px', 
                padding: '6px 12px', 
                background: '#dbeafe', 
                color: '#1e40af', 
                borderRadius: '6px', 
                display: 'inline-block',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                👤 Showing tasks assigned to: {user?.name || 'you'}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              className={showMyTasksOnly ? "btn btn-primary" : "btn btn-secondary"}
              onClick={() => setShowMyTasksOnly(!showMyTasksOnly)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontWeight: showMyTasksOnly ? '600' : '500'
              }}
            >
              {showMyTasksOnly ? '✓' : ''} My Tasks Only
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/analytics')}
            >
              📊 Analytics
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Progress Stats */}
        <div className="kanban-stats-grid">
          <div className="kanban-stat-card kanban-stat-total">
            <div className="kanban-stat-value">{totalTasks}</div>
            <div className="kanban-stat-label">Total Tasks</div>
          </div>
          <div className="kanban-stat-card kanban-stat-completed">
            <div className="kanban-stat-value">{tasks.completed.length}</div>
            <div className="kanban-stat-label">Completed</div>
          </div>
          <div className="kanban-stat-card kanban-stat-progress">
            <div className="kanban-stat-value">{tasks.inProgress.length}</div>
            <div className="kanban-stat-label">In Progress</div>
          </div>
          <div className="kanban-stat-card kanban-stat-rate">
            <div className="kanban-stat-value">{completionRate}</div>
            <div className="kanban-stat-label">Completion Rate</div>
          </div>
        </div>

        <div className="kanban-container">
          {/* Pending Column */}
          <div
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'Pending')}
          >
            <div className="kanban-header" style={{ borderColor: '#ef4444' }}>
              <h3 style={{ color: '#ef4444' }}>
                📋 Pending
              </h3>
              <span className="kanban-count">{tasks.pending.length}</span>
            </div>
            <div className="kanban-cards">
              {tasks.pending.map(task => (
                <KanbanCard key={task._id} task={task} />
              ))}
              {tasks.pending.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                  No pending tasks
                </div>
              )}
            </div>
          </div>

          {/* In Progress Column */}
          <div
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'In Progress')}
          >
            <div className="kanban-header" style={{ borderColor: '#f59e0b' }}>
              <h3 style={{ color: '#f59e0b' }}>
                ⚡ In Progress
              </h3>
              <span className="kanban-count">{tasks.inProgress.length}</span>
            </div>
            <div className="kanban-cards">
              {tasks.inProgress.map(task => (
                <KanbanCard key={task._id} task={task} />
              ))}
              {tasks.inProgress.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                  No tasks in progress
                </div>
              )}
            </div>
          </div>

          {/* Completed Column */}
          <div
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'Completed')}
          >
            <div className="kanban-header" style={{ borderColor: '#10b981' }}>
              <h3 style={{ color: '#10b981' }}>
                ✅ Completed
              </h3>
              <span className="kanban-count">{tasks.completed.length}</span>
            </div>
            <div className="kanban-cards">
              {tasks.completed.map(task => (
                <KanbanCard key={task._id} task={task} />
              ))}
              {tasks.completed.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                  No completed tasks
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Kanban;
