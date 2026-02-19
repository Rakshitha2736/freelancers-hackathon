import React from 'react';

const priorityColors = {
  High: 'badge-red',
  Medium: 'badge-orange',
  Low: 'badge-blue',
};

const statusOptions = ['Pending', 'In Progress', 'Completed'];

const isOverdue = (deadline) => {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
};

const TaskTable = ({ tasks, onUpdate, editable = false, showStatus = true, currentUser = null }) => {
  const handleChange = (index, field, value) => {
    if (onUpdate) {
      onUpdate(index, field, value);
    }
  };

  const isMyTask = (task) => {
    if (!currentUser || !task.ownerUserId) return false;
    return task.ownerUserId.toString() === currentUser._id.toString();
  };

  if (!tasks || tasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <h3>No tasks found</h3>
        <p>Tasks will appear here after you confirm a meeting summary.</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="task-table">
        <thead>
          <tr>
            <th className="th-num">#</th>
            <th>Description</th>
            <th>Owner</th>
            <th>Deadline</th>
            <th>Priority</th>
            {showStatus && <th>Status</th>}
            {editable && <th>Confidence</th>}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, index) => {
            const overdue = isOverdue(task.deadline) && task.status !== 'Completed';
            const myTask = isMyTask(task);
            const ownerName = typeof task.owner === 'string' ? task.owner.trim() : task.owner;
            const hasOwner = Boolean(ownerName);
            return (
              <tr 
                key={task._id || index} 
                className={`${overdue ? 'row-overdue' : ''} ${myTask ? 'row-my-task' : ''}`.trim()}
              >
                <td className="td-num">{index + 1}</td>
                <td>
                  {editable ? (
                    <input
                      type="text"
                      className="inline-input"
                      value={task.description || ''}
                      onChange={(e) => handleChange(index, 'description', e.target.value)}
                    />
                  ) : (
                    <span className="task-desc">{task.description}</span>
                  )}
                </td>
                <td>
                  {editable ? (
                    <div className="owner-cell">
                      <input
                        type="text"
                        className="inline-input"
                        value={task.owner || ''}
                        onChange={(e) => handleChange(index, 'owner', e.target.value)}
                        placeholder="Assign owner..."
                      />
                      {!hasOwner && (
                        <span className="badge badge-grey">Unassigned</span>
                      )}
                    </div>
                  ) : (
                    <div className="owner-display">
                      {hasOwner ? (
                        <div className="owner-badge-container">
                          <div className="owner-avatar">
                            {ownerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="owner-info">
                            <span className={`owner-name ${myTask ? 'owner-name-my-task' : ''}`.trim()}>
                              {ownerName}
                            </span>
                            {myTask && (
                              <span className="badge badge-blue" style={{ 
                                fontSize: '0.65rem', 
                                padding: '2px 6px',
                                marginLeft: '6px'
                              }}>
                                YOU
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="badge badge-grey">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                          Unassigned
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td>
                  {editable ? (
                    <input
                      type="date"
                      className="inline-input"
                      value={task.deadline ? task.deadline.substring(0, 10) : ''}
                      onChange={(e) => handleChange(index, 'deadline', e.target.value)}
                    />
                  ) : (
                    <span className={overdue ? 'deadline-overdue' : ''}>
                      {task.deadline
                        ? new Date(task.deadline).toLocaleDateString()
                        : '—'}
                      {overdue && <span className="overdue-dot" title="Overdue">!</span>}
                    </span>
                  )}
                </td>
                <td>
                  {editable ? (
                    <select
                      className="inline-select"
                      value={task.priority || 'Medium'}
                      onChange={(e) => handleChange(index, 'priority', e.target.value)}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  ) : (
                    <span className={`badge ${priorityColors[task.priority] || 'badge-blue'}`}>
                      {task.priority || 'Medium'}
                    </span>
                  )}
                </td>
                {showStatus && (
                  <td>
                    {editable ? (
                      <select
                        className="inline-select"
                        value={task.status || 'Pending'}
                        onChange={(e) => handleChange(index, 'status', e.target.value)}
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`badge ${
                          task.status === 'Completed'
                            ? 'badge-green'
                            : task.status === 'In Progress'
                            ? 'badge-orange'
                            : 'badge-grey'
                        }`}
                      >
                        {task.status || 'Pending'}
                      </span>
                    )}
                  </td>
                )}
                {editable && (
                  <td>
                    <div className="confidence-cell">
                      <div className="confidence-bar-bg">
                        <div
                          className="confidence-bar-fill"
                          style={{
                            width: task.confidence != null ? `${Math.round(task.confidence * 100)}%` : '0%',
                            backgroundColor: task.confidence > 0.8 ? '#16a34a' : task.confidence > 0.6 ? '#ca8a04' : '#ea580c',
                          }}
                        />
                      </div>
                      <span className="confidence-label">
                        {task.confidence != null ? `${Math.round(task.confidence * 100)}%` : '—'}
                      </span>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TaskTable;
