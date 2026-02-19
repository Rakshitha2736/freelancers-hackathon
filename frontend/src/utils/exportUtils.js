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
