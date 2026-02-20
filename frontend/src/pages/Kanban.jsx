import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import MeetingFilterList from '../components/MeetingFilterList';
import useSocket from '../hooks/useSocket';
import { getTasks, updateTask, getMeetings } from '../services/api';

const Kanban = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connected, on, off } = useSocket(user?._id);
  const [tasks, setTasks] = useState({ pending: [], inProgress: [], completed: [] });
  const [meetings, setMeetings] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
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

  const removeTaskFromAllColumns = (columns, taskId) => ({
    pending: columns.pending.filter((task) => task._id !== taskId),
    inProgress: columns.inProgress.filter((task) => task._id !== taskId),
    completed: columns.completed.filter((task) => task._id !== taskId),
  });

  const upsertTaskInColumn = (columns, task, targetStatusKey) => {
    const withoutTask = removeTaskFromAllColumns(columns, task._id);
    return {
      ...withoutTask,
      [targetStatusKey]: [...withoutTask[targetStatusKey], task],
    };
  };

  // Listen for real-time task updates via WebSocket
  useEffect(() => {
    if (!connected) return;

    const handleTaskUpdate = (data) => {
      setTasks((prev) => {
        const newStatusKey = normalizeStatusKey(data.status);
        return upsertTaskInColumn(prev, { ...data }, newStatusKey);
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
      
      const [tasksRes, meetingsRes] = await Promise.all([
        getTasks(params),
        getMeetings(),
      ]);
      
      const allTasks = tasksRes.data.tasks || tasksRes.data || [];
      
      // Group tasks by status
      const grouped = {
        pending: allTasks.filter(t => t.status === 'Pending'),
        inProgress: allTasks.filter(t => t.status === 'In Progress'),
        completed: allTasks.filter(t => t.status === 'Completed')
      };
      
      setTasks(grouped);
      setMeetings(meetingsRes.data.meetings || []);
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
    const optimisticTask = { ...draggedTask, status: newStatus };

    // Optimistic update
    setTasks((prev) => upsertTaskInColumn(prev, optimisticTask, newStatusKey));

    setDraggedTask(null);

    try {
      // Update task status in backend
      await updateTask(draggedTask.analysisId, draggedTask._id, { status: newStatus });
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('Failed to update task. Rolling back...');
      
      // Rollback on error
      setTasks((prev) => upsertTaskInColumn(prev, { ...draggedTask, status: oldStatus }, oldStatusKey));
      
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

  // Handle meeting deletion
  const handleDeleteMeeting = useCallback((meetingId) => {
    // Remove meeting from meetings list
    setMeetings((prev) => prev.filter((m) => m._id !== meetingId));

    // Remove all tasks associated with this meeting
    setTasks((prev) => ({
      pending: prev.pending.filter((task) => task.meetingId !== meetingId),
      inProgress: prev.inProgress.filter((task) => task.meetingId !== meetingId),
      completed: prev.completed.filter((task) => task.meetingId !== meetingId),
    }));

    // Reset selected meeting if it was the deleted one
    if (selectedMeetingId === meetingId) {
      setSelectedMeetingId(null);
    }
  }, [selectedMeetingId]);

  // Filter tasks by selected meeting
  const filteredTasks = useMemo(() => {
    if (!selectedMeetingId) {
      return tasks;
    }

    return {
      pending: tasks.pending.filter((task) => task.meetingId === selectedMeetingId),
      inProgress: tasks.inProgress.filter((task) => task.meetingId === selectedMeetingId),
      completed: tasks.completed.filter((task) => task.meetingId === selectedMeetingId),
    };
  }, [tasks, selectedMeetingId]);

  // Compute stats from filtered tasks
  const totalTasks = filteredTasks.pending.length + filteredTasks.inProgress.length + filteredTasks.completed.length;
  const completionRate = totalTasks === 0 ? '0%' : `${Math.round((filteredTasks.completed.length / totalTasks) * 100)}%`;

  // Find selected meeting for display
  const selectedMeeting = useMemo(() => {
    return selectedMeetingId ? meetings.find((m) => m._id === selectedMeetingId) : null;
  }, [selectedMeetingId, meetings]);

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

          {/* Main Kanban Content */}
          <section className="dashboard-main">
            <div className="page-header">
              <div>
                <h1>Kanban Board</h1>
                <p className="text-muted">
                  {selectedMeeting
                    ? `Tasks from: ${selectedMeeting.title}`
                    : 'Drag and drop tasks to update their status'}
                </p>
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
                <div className="kanban-stat-value">{filteredTasks.completed.length}</div>
                <div className="kanban-stat-label">Completed</div>
              </div>
              <div className="kanban-stat-card kanban-stat-progress">
                <div className="kanban-stat-value">{filteredTasks.inProgress.length}</div>
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
                  <span className="kanban-count">{filteredTasks.pending.length}</span>
                </div>
                <div className="kanban-cards">
                  {filteredTasks.pending.map(task => (
                    <KanbanCard key={task._id} task={task} />
                  ))}
                  {filteredTasks.pending.length === 0 && (
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
                  <span className="kanban-count">{filteredTasks.inProgress.length}</span>
                </div>
                <div className="kanban-cards">
                  {filteredTasks.inProgress.map(task => (
                    <KanbanCard key={task._id} task={task} />
                  ))}
                  {filteredTasks.inProgress.length === 0 && (
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
                  <span className="kanban-count">{filteredTasks.completed.length}</span>
                </div>
                <div className="kanban-cards">
                  {filteredTasks.completed.map(task => (
                    <KanbanCard key={task._id} task={task} />
                  ))}
                  {filteredTasks.completed.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                      No completed tasks
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Kanban;
