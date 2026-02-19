import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import useSocket from '../hooks/useSocket';
import { getTasks, updateTask } from '../services/api';

const Kanban = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connected, on } = useSocket(user?._id);
  const [tasks, setTasks] = useState({ pending: [], inProgress: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  // Listen for real-time task updates via WebSocket
  useEffect(() => {
    if (!connected) return;

    const handleTaskUpdate = (data) => {
      setTasks((prev) => {
        const oldStatus = prev.pending.find(t => t._id === data._id) ? 'pending' :
                          prev.inProgress.find(t => t._id === data._id) ? 'inProgress' : 'completed';
        const newStatusKey = data.status.toLowerCase().replace(' ', '') === 'inprogress' ? 'inProgress' : data.status.toLowerCase();

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

    on('task:updated', handleTaskUpdate);
    on('task:deleted', handleTaskDeleted);

    return () => {
      // Cleanup handled by useSocket hook
    };
  }, [connected, on]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await getTasks({ isConfirmed: true });
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

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    
    if (!draggedTask) return;
    
    if (draggedTask.status === newStatus) return;

    try {
      // Update task status in backend
      await updateTask(draggedTask.analysisId, draggedTask._id, { status: newStatus });
      
      // Update local state
      setTasks(prev => {
        const oldStatus = draggedTask.status.toLowerCase().replace(' ', '');
        const oldStatusKey = oldStatus === 'inprogress' ? 'inProgress' : oldStatus;
        const newStatusKey = newStatus.toLowerCase().replace(' ', '');
        const finalNewKey = newStatusKey === 'inprogress' ? 'inProgress' : newStatusKey;
        
        return {
          ...prev,
          [oldStatusKey]: prev[oldStatusKey].filter(t => t._id !== draggedTask._id),
          [finalNewKey]: [...prev[finalNewKey], { ...draggedTask, status: newStatus }]
        };
      });
    } catch (err) {
      console.error('Failed to update task:', err);
    }
    
    setDraggedTask(null);
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

  const KanbanCard = ({ task }) => (
    <div
      className="kanban-card"
      draggable
      onDragStart={(e) => handleDragStart(e, task)}
    >
      <div className="kanban-card-title">{task.description}</div>
      <div className="kanban-card-meta">
        <div className="kanban-card-row">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span>{task.owner || 'Unassigned'}</span>
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

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>Kanban Board</h1>
            <p className="text-muted">Drag and drop tasks to update their status</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
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
