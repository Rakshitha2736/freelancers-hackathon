import React from 'react';

// Keyboard shortcuts
export const shortcuts = {
  SAVE_DRAFT: { key: 'S', ctrl: true, desc: 'Save as draft' },
  EXPORT_JSON: { key: 'E', ctrl: true, shift: true, desc: 'Export as JSON' },
  EXPORT_CSV: { key: 'C', ctrl: true, shift: true, desc: 'Export as CSV' },
  NEW_TASK: { key: 'T', ctrl: true, desc: 'New task' },
  SEARCH: { key: 'K', ctrl: true, desc: 'Search' },
  FOCUS_SUMMARY: { key: '1', ctrl: true, desc: 'Focus summary' },
  FOCUS_DECISIONS: { key: '2', ctrl: true, desc: 'Focus decisions' },
  FOCUS_TASKS: { key: '3', ctrl: true, desc: 'Focus tasks' },
};

export const useKeyboardShortcuts = (handlers) => {
  React.useEffect(() => {
    const handleKeyPress = (e) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      for (const [action, shortcut] of Object.entries(shortcuts)) {
        const matchesKey = e.key.toUpperCase() === shortcut.key;
        const matchesCtrl = !shortcut.ctrl || modifier;
        const matchesShift = !shortcut.shift || e.shiftKey;

        if (matchesKey && matchesCtrl && matchesShift && handlers[action]) {
          e.preventDefault();
          handlers[action]();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlers]);
};
