import React from 'react';

const MetricsCards = ({ metrics }) => {
  const cards = [
    {
      label: 'Total Tasks',
      value: metrics.totalTasks ?? 0,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    },
    {
      label: 'High Priority',
      value: metrics.highPriority ?? 0,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      gradient: 'linear-gradient(135deg, #dc2626, #f43f5e)',
    },
    {
      label: 'Overdue',
      value: metrics.overdue ?? 0,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      gradient: 'linear-gradient(135deg, #ea580c, #f97316)',
    },
    {
      label: 'Assigned to Me',
      value: metrics.assignedToMe ?? 0,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)',
    },
  ];

  return (
    <div className="metrics-grid">
      {cards.map((card) => (
        <div key={card.label} className="metric-card">
          <div className="metric-icon-wrap" style={{ background: card.gradient }}>
            {card.icon}
          </div>
          <div className="metric-info">
            <span className="metric-value">{card.value}</span>
            <span className="metric-label">{card.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MetricsCards;
