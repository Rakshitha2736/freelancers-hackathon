// Export analysis to PDF (via browser print)
export const exportToPDF = async (analysis, options = {}) => {
  const filename = options.filename || 'analysis.pdf';
  const currentUser = options.currentUser || null;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

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

  const addPageIfNeeded = (extra = 0) => {
    if (y + extra > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addTitle = (text) => {
    addPageIfNeeded(28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(text, margin, y);
    y += 22;
  };

  const addHeading = (text) => {
    addPageIfNeeded(24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(text, margin, y);
    y += 18;
  };

  const addParagraph = (text) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(text || '', maxWidth);
    lines.forEach((line) => {
      addPageIfNeeded(14);
      doc.text(line, margin, y);
      y += 14;
    });
    y += 6;
  };

  const addList = (items) => {
    if (!items.length) {
      addParagraph('No items recorded.');
      return;
    }
    items.forEach((item, index) => {
      const prefix = `${index + 1}. `;
      const lines = doc.splitTextToSize(`${prefix}${item}`, maxWidth);
      lines.forEach((line) => {
        addPageIfNeeded(14);
        doc.text(line, margin, y);
        y += 14;
      });
    });
    y += 6;
  };

  const addTasks = (tasks) => {
    if (!tasks.length) {
      addParagraph('No tasks available.');
      return;
    }

    tasks.forEach((task, index) => {
      const owner = task.owner || 'Unassigned';
      const line = `${index + 1}. ${task.description || ''} | ${owner} | ${formatDate(task.deadline)} | ${task.priority || 'Medium'} | ${task.status || 'Pending'}`;
      const lines = doc.splitTextToSize(line, maxWidth);
      lines.forEach((l) => {
        addPageIfNeeded(14);
        doc.text(l, margin, y);
        y += 14;
      });
    });
    y += 6;
  };

  const allTasks = Array.isArray(analysis.tasks) ? analysis.tasks : [];
  const userTasks = allTasks.filter(isMyTask);
  const meeting = analysis.meetingMetadata || {};

  addTitle('Meeting Analysis');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Exported: ${new Date().toLocaleString()}`, margin, y);
  y += 16;

  addHeading('Executive Summary');
  addParagraph(analysis.summary || 'No summary available');

  addHeading('Meeting Details');
  const meetingDetails = [
    meeting.title ? `Title: ${meeting.title}` : null,
    meeting.date ? `Date: ${formatDate(meeting.date)}` : null,
    meeting.meetingType ? `Type: ${meeting.meetingType}` : null,
    meeting.location ? `Location: ${meeting.location}` : null,
    Number.isFinite(meeting.duration) ? `Duration: ${meeting.duration} minutes` : null
  ].filter(Boolean);
  addList(meetingDetails);

  addHeading('Key Decisions');
  addList(Array.isArray(analysis.decisions) ? analysis.decisions : []);

  addHeading('All Tasks');
  addTasks(allTasks);

  const userLabel = currentUser?.name ? `Your Tasks (${currentUser.name})` : 'Your Tasks';
  addHeading(userLabel);
  addTasks(userTasks);

  doc.save(filename);
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
