// Export analysis to JSON
export const exportToJSON = (analysis, filename = 'analysis.json') => {
  const data = {
    summary: analysis.summary,
    decisions: analysis.decisions,
    tasks: analysis.tasks,
    metadata: analysis.metadata,
    exportedAt: new Date().toISOString()
  };
  
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadFile(blob, filename);
};

// Export analysis to CSV
export const exportToCSV = (analysis, filename = 'analysis.csv') => {
  let csv = 'Summary\n';
  csv += '"' + (analysis.summary || '').replace(/"/g, '""') + '"\n\n';
  
  csv += 'Decisions\n';
  if (analysis.decisions?.length > 0) {
    analysis.decisions.forEach(d => {
      csv += '"' + (d || '').replace(/"/g, '""') + '"\n';
    });
  }
  csv += '\n';
  
  csv += 'Tasks\n';
  csv += 'Description,Owner,Deadline,Priority,Status\n';
  if (analysis.tasks?.length > 0) {
    analysis.tasks.forEach(t => {
      csv += `"${(t.description || '').replace(/"/g, '""')}","${(t.owner || '').replace(/"/g, '""')}","${t.deadline || ''}","${t.priority || ''}","${t.status || ''}"\n`;
    });
  }
  
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadFile(blob, filename);
};

// Export analysis to Markdown
export const exportToMarkdown = (analysis, filename = 'analysis.md') => {
  let md = '# Meeting Analysis\n\n';
  
  md += '## Executive Summary\n\n';
  md += (analysis.summary || 'No summary available') + '\n\n';
  
  md += '## Key Decisions\n\n';
  if (analysis.decisions?.length > 0) {
    analysis.decisions.forEach((d, i) => {
      md += `${i + 1}. ${d}\n`;
    });
  } else {
    md += '- No decisions recorded\n';
  }
  md += '\n';
  
  md += '## Tasks\n\n';
  if (analysis.tasks?.length > 0) {
    md += '| Task | Owner | Deadline | Priority | Status |\n';
    md += '|------|-------|----------|----------|--------|\n';
    analysis.tasks.forEach(t => {
      md += `| ${t.description || ''} | ${t.owner || 'Unassigned'} | ${t.deadline || 'N/A'} | ${t.priority || 'Medium'} | ${t.status || 'Pending'} |\n`;
    });
  } else {
    md += 'No tasks extracted.\n';
  }
  md += '\n';
  
  md += `*Exported: ${new Date().toLocaleString()}*\n`;
  
  const blob = new Blob([md], { type: 'text/markdown' });
  downloadFile(blob, filename);
};

// Export analysis to PDF (via browser print)
export const exportToPDF = (analysis, options = {}) => {
  const filename = options.filename || 'analysis.pdf';
  const currentUser = options.currentUser || null;

  const escapeHtml = (value) => {
    const str = value == null ? '' : String(value);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString();
  };

  const isMyTask = (task) => {
    if (!currentUser) return false;
    if (task.ownerUserId && currentUser._id) {
      return task.ownerUserId.toString() === currentUser._id.toString();
    }
    if (task.owner && currentUser.name) {
      return task.owner.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
    }
    return false;
  };

  const allTasks = Array.isArray(analysis.tasks) ? analysis.tasks : [];
  const userTasks = allTasks.filter(isMyTask);

  const buildTasksTable = (tasks) => {
    if (!tasks.length) {
      return '<p class="muted">No tasks available.</p>';
    }
    return `
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th>Owner</th>
            <th>Deadline</th>
            <th>Priority</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map((t, i) => {
            const owner = t.owner || 'Unassigned';
            return `
              <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(t.description || '')}</td>
                <td>${escapeHtml(owner)}</td>
                <td>${escapeHtml(formatDate(t.deadline))}</td>
                <td>${escapeHtml(t.priority || 'Medium')}</td>
                <td>${escapeHtml(t.status || 'Pending')}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  };

  const meeting = analysis.meetingMetadata || {};
  const meetingDetails = [
    meeting.title ? `Title: ${escapeHtml(meeting.title)}` : null,
    meeting.date ? `Date: ${escapeHtml(formatDate(meeting.date))}` : null,
    meeting.meetingType ? `Type: ${escapeHtml(meeting.meetingType)}` : null,
    meeting.location ? `Location: ${escapeHtml(meeting.location)}` : null,
    Number.isFinite(meeting.duration) ? `Duration: ${meeting.duration} minutes` : null
  ].filter(Boolean);

  const decisions = Array.isArray(analysis.decisions) ? analysis.decisions : [];

  const html = `
    <html>
      <head>
        <title>${escapeHtml(filename)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
          h1 { margin: 0 0 8px 0; font-size: 24px; }
          h2 { margin: 24px 0 8px 0; font-size: 18px; }
          p { margin: 8px 0; }
          .meta { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
          .muted { color: #6b7280; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #f9fafb; }
          .pill { display: inline-block; background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        </style>
      </head>
      <body>
        <h1>Meeting Analysis</h1>
        <div class="meta">Exported: ${escapeHtml(new Date().toLocaleString())}</div>

        <h2>Executive Summary</h2>
        <p>${escapeHtml(analysis.summary || 'No summary available')}</p>

        <h2>Meeting Details</h2>
        ${meetingDetails.length ? `
          <ul>
            ${meetingDetails.map((d) => `<li>${d}</li>`).join('')}
          </ul>
        ` : '<p class="muted">No meeting details available.</p>'}

        <h2>Key Decisions</h2>
        ${decisions.length ? `
          <ol>
            ${decisions.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}
          </ol>
        ` : '<p class="muted">No decisions recorded.</p>'}

        <h2>All Tasks</h2>
        ${buildTasksTable(allTasks)}

        <h2>Your Tasks ${currentUser?.name ? `<span class="pill">${escapeHtml(currentUser.name)}</span>` : ''}</h2>
        ${buildTasksTable(userTasks)}
      </body>
    </html>
  `;

  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
};

// Helper to trigger download
const downloadFile = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Draft management
export const saveDraft = (analysisId, data) => {
  const drafts = JSON.parse(localStorage.getItem('drafts') || '{}');
  drafts[analysisId] = {
    ...data,
    savedAt: new Date().toISOString()
  };
  localStorage.setItem('drafts', JSON.stringify(drafts));
};

export const loadDraft = (analysisId) => {
  const drafts = JSON.parse(localStorage.getItem('drafts') || '{}');
  return drafts[analysisId] || null;
};

export const deleteDraft = (analysisId) => {
  const drafts = JSON.parse(localStorage.getItem('drafts') || '{}');
  delete drafts[analysisId];
  localStorage.setItem('drafts', JSON.stringify(drafts));
};

export const getAllDrafts = () => {
  return JSON.parse(localStorage.getItem('drafts') || '{}');
};
