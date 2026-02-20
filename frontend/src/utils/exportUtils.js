// Export analysis to PDF (via browser print)
export const exportToPDF = async (analysis, options = {}) => {
  const filename = options.filename || 'analysis.pdf';
  const currentUser = options.currentUser || null;

  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  const autoTable = autoTableModule.default || autoTableModule;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxWidth = pageWidth - margin * 2;
  let yPosition = margin;
  const sectionSpacing = 20;
  const paragraphLineHeight = 16;
  const paragraphSpacing = 8;

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
    if (yPosition + extra > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  const addTitle = (text) => {
    addPageIfNeeded(36);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(text, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 14;
  };

  const addHeading = (text) => {
    addPageIfNeeded(24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(text, margin, yPosition);
    yPosition += 18;
  };

  const addParagraph = (text) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(text || '', maxWidth);
    lines.forEach((line) => {
      addPageIfNeeded(paragraphLineHeight);
      doc.text(line, margin, yPosition);
      yPosition += paragraphLineHeight;
    });
    yPosition += paragraphSpacing;
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
        addPageIfNeeded(paragraphLineHeight);
        doc.text(line, margin, yPosition);
        yPosition += paragraphLineHeight;
      });
    });
    yPosition += paragraphSpacing;
  };

  const addTasks = (tasks) => {
    if (!tasks.length) {
      addParagraph('No tasks available.');
      return;
    }

    const rows = tasks.map((task, index) => ([
      String(index + 1),
      task.description || '',
      task.owner || 'Unassigned',
      formatDate(task.deadline),
      task.priority || 'Medium',
      task.status || 'Pending'
    ]));

    autoTable(doc, {
      startY: yPosition,
      margin: { left: margin, right: margin },
      tableWidth: 'auto',
      theme: 'grid',
      head: [['#', 'Task', 'Owner', 'Deadline', 'Priority', 'Status']],
      body: rows,
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 6,
        overflow: 'linebreak',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [235, 235, 235],
        textColor: 20,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248]
      },
      columnStyles: {
        0: { cellWidth: 24 },
        2: { cellWidth: 90 },
        3: { cellWidth: 72 },
        4: { cellWidth: 55 },
        5: { cellWidth: 60 }
      },
      didDrawPage: (data) => {
        yPosition = data.cursor.y;
      }
    });

    yPosition = (doc.lastAutoTable && doc.lastAutoTable.finalY)
      ? doc.lastAutoTable.finalY + 6
      : yPosition + 6;
  };

  const allTasks = Array.isArray(analysis.tasks) ? analysis.tasks : [];
  const userTasks = allTasks.filter(isMyTask);
  const meeting = analysis.meetingMetadata || {};

  addTitle('Meeting Analysis');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Exported: ${new Date().toLocaleString()}`, margin, yPosition);
  yPosition += 16;

  addHeading('Executive Summary');
  addParagraph(analysis.summary || 'No summary available');
  yPosition += sectionSpacing;

  addHeading('Meeting Details');
  const meetingDetails = [
    meeting.title ? `Title: ${meeting.title}` : null,
    meeting.date ? `Date: ${formatDate(meeting.date)}` : null,
    meeting.meetingType ? `Type: ${meeting.meetingType}` : null,
    meeting.location ? `Location: ${meeting.location}` : null,
    Number.isFinite(meeting.duration) ? `Duration: ${meeting.duration} minutes` : null
  ].filter(Boolean);
  addList(meetingDetails);
  yPosition += sectionSpacing;

  addHeading('Key Decisions');
  addList(Array.isArray(analysis.decisions) ? analysis.decisions : []);
  yPosition += sectionSpacing;

  addHeading('All Tasks');
  addTasks(allTasks);
  yPosition += sectionSpacing;

  const userLabel = currentUser?.name ? `Your Tasks (${currentUser.name})` : 'Your Tasks';
  addHeading(userLabel);
  addTasks(userTasks);

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 18,
      { align: 'right' }
    );
  }

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
