# Implementation Details - Code Examples

## Part 1: Backend Implementation

### Backend Route: GET /api/tasks/meetings

**File:** `backend/routes/tasks.js` (Lines 127-145)

```javascript
// ─── GET /api/tasks/meetings ────────────────────────────────────────────────
router.get('/meetings', auth, async (req, res) => {
  try {
    const analyses = await Analysis.find({
      userId: req.user._id,
      isConfirmed: true,
    }).sort({ 'meetingMetadata.date': -1 });

    const meetings = analyses.map(a => ({
      _id: a._id,
      meetingId: a._id,
      title: a.meetingMetadata?.title || 'Untitled Meeting',
      date: a.meetingMetadata?.date || a.createdAt,
      meetingType: a.meetingMetadata?.meetingType || 'Other',
      taskCount: (a.tasks || []).length,
      confirmedAt: a.confirmedAt,
    }));

    res.json({ meetings });
  } catch (err) {
    console.error('Get meetings error:', err);
    res.status(500).json({ message: 'Failed to load meetings.' });
  }
});
```

**What it does:**
1. Finds all confirmed analyses (meetings) for the logged-in user
2. Sorts by date (newest first)
3. Maps each analysis to a clean meeting object
4. Returns array of meetings with task counts

**Data Flow:**
```
Database (Analysis documents)
    ↓
Filter by userId & isConfirmed
    ↓
Sort by date descending
    ↓
Map to clean meeting objects
    ↓
Response to frontend
```

### Task Object Enhancement

**File:** `backend/routes/tasks.js` (Lines 55-63)

**Before:**
```javascript
tasks.push({
  _id: t._id,
  analysisId: a._id,
  description: t.description,
  owner: t.owner,
  // ... other fields
});
```

**After:**
```javascript
tasks.push({
  _id: t._id,
  analysisId: a._id,
  meetingId: a._id,                    // NEW: explicit meetingId
  meetingTitle: a.meetingMetadata?.title || '',  // NEW: meeting title for convenience
  description: t.description,
  owner: t.owner,
  // ... other fields
});
```

**Why both `analysisId` and `meetingId`?**
- `analysisId`: Used for task updates (PATCH /api/tasks/:analysisId/:taskId)
- `meetingId`: Used for filtering tasks by meeting
- They have the same value but semantic meaning is clearer

---

## Part 2: Frontend - React Implementation

### State Management

**File:** `frontend/src/pages/Dashboard.jsx` (Lines 15-30)

```javascript
const [tasks, setTasks] = useState([]);
const [meetings, setMeetings] = useState([]);  // NEW: meetings list
const [metrics, setMetrics] = useState({...});
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState([]);
const [searching, setSearching] = useState(false);
const [selectedMeetingId, setSelectedMeetingId] = useState(null);  // NEW: selected filter

// Filters (existing)
const [filters, setFilters] = useState({
  owner: '',
  priority: '',
  myTasksOnly: false,
  meetingType: '',
  dateFrom: '',
  dateTo: '',
});
```

**State relationship:**
```
selectedMeetingId (null | "meeting_id")
       ↓
    Combined with → meetings array to find selected meeting
       ↓
    Combined with → tasks array to filter in useMemo
```

### Data Fetching

**File:** `frontend/src/pages/Dashboard.jsx` (Lines 40-68)

```javascript
const fetchData = useCallback(async () => {
  setLoading(true);
  setError('');
  try {
    const params = { isConfirmed: true };
    // ... build params from filters ...

    // Parallel fetch: all three API calls at once
    const [tasksRes, metricsRes, meetingsRes] = await Promise.all([
      getTasks(params),
      getMetrics(),
      getMeetings(),  // NEW: fetch meetings
    ]);

    // Extract data from responses
    setTasks(tasksRes.data.tasks || tasksRes.data || []);
    setMetrics(metricsRes.data.metrics || metricsRes.data || {});
    setMeetings(meetingsRes.data.meetings || []);  // NEW: store meetings
  } catch (err) {
    setError('Failed to load dashboard data.');
  } finally {
    setLoading(false);
  }
}, [filters, user]);
```

**Performance note:**
- Uses `Promise.all()` for parallel fetching
- Faster than sequential fetches
- Reduces page load time

### Filtering Logic with useMemo

**File:** `frontend/src/pages/Dashboard.jsx` (Lines 150-182)

```javascript
// Optimized filtering using useMemo
const filteredTasks = useMemo(() => {
  let result = tasks;

  // STEP 1: Meeting filter (takes priority)
  if (selectedMeetingId) {
    result = result.filter(
      (task) => task.meetingId === selectedMeetingId
    );
  }

  // STEP 2: Date range filter
  const fromDate = parseDateInput(filters.dateFrom);
  const toDate = parseDateInput(filters.dateTo, { endOfDay: true });

  if (fromDate || toDate) {
    result = result.filter((task) => {
      const deadlineDate = parseDeadlineDate(task.deadline);
      if (!deadlineDate) return false;
      if (fromDate && deadlineDate < fromDate) return false;
      if (toDate && deadlineDate > toDate) return false;
      return true;
    });
  }

  return result;
}, [tasks, selectedMeetingId, filters.dateFrom, filters.dateTo]);
```

**How it works:**

1. **Input:** tasks array + filters
2. **Processing:**
   - Apply meeting filter (if selected)
   - Apply date range filter (if set)
3. **Output:** filtered tasks array
4. **Optimization:** Only recalculates when dependencies change

**Dependency array explanation:**
```javascript
], [
  tasks,              // Recalculate when tasks data changes
  selectedMeetingId,  // Recalculate when meeting selection changes
  filters.dateFrom,   // Recalculate when from-date changes
  filters.dateTo      // Recalculate when to-date changes
]);
// Notable: NOT including priority, owner - those filters are applied server-side
```

**Filter combination example:**

If user has:
- Created a meeting: "Sprint Planning"
- Selected that meeting: `selectedMeetingId = "meeting_123"`
- Set date range: from 2024-01-01 to 2024-01-31

Then filtered tasks will be tasks where:
- `task.meetingId === "meeting_123"` AND
- `task.deadline >= 2024-01-01` AND
- `task.deadline <= 2024-01-31`

### MeetingFilterList Component

**File:** `frontend/src/components/MeetingFilterList.jsx` (Lines 1-80)

```javascript
import React from 'react';
import './MeetingFilterList.css';

const MeetingFilterList = ({
  meetings,
  selectedMeetingId,
  onSelectMeeting,
  loading = false
}) => {
  // Render loading state
  if (loading) {
    return (
      <div className="meeting-filter-container">
        <div className="meeting-filter-header">
          <h3>📅 Meetings</h3>
        </div>
        <div className="meeting-list-loading">Loading meetings...</div>
      </div>
    );
  }

  // Render empty state
  if (!meetings || meetings.length === 0) {
    return (
      <div className="meeting-filter-container">
        <div className="meeting-filter-header">
          <h3>📅 Meetings</h3>
        </div>
        <div className="meeting-list-empty">
          <p>No meetings yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="meeting-filter-container">
      <div className="meeting-filter-header">
        <h3>📅 Meetings ({meetings.length})</h3>
        {selectedMeetingId && (
          <button
            className="btn-clear-filter"
            onClick={() => onSelectMeeting(null)}
            title="Show all meetings"
          >
            ✕
          </button>
        )}
      </div>

      <div className="meeting-list">
        {/* "All Meetings" option */}
        <div
          className={`meeting-item ${selectedMeetingId === null ? 'active' : ''}`}
          onClick={() => onSelectMeeting(null)}
        >
          <div className="meeting-item-content">
            <div className="meeting-item-title">All Meetings</div>
            <div className="meeting-item-meta">
              Total: {meetings.reduce((sum, m) => sum + m.taskCount, 0)} tasks
            </div>
          </div>
        </div>

        {/* Individual meetings */}
        {meetings.map((meeting) => (
          <div
            key={meeting._id}
            className={`meeting-item ${
              selectedMeetingId === meeting._id ? 'active' : ''
            }`}
            onClick={() => onSelectMeeting(meeting._id)}
            title={meeting.title}
          >
            <div className="meeting-item-icon">
              {getMeetingTypeIcon(meeting.meetingType)}
            </div>
            <div className="meeting-item-content">
              <div className="meeting-item-title">{meeting.title}</div>
              <div className="meeting-item-meta">
                <span className="meeting-date">
                  {new Date(meeting.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="meeting-type">{meeting.meetingType}</span>
                <span className="task-badge">{meeting.taskCount}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function getMeetingTypeIcon(type) {
  const icons = {
    Standup: '⚡',
    Planning: '📋',
    Review: '✅',
    Retrospective: '🔄',
    '1:1': '👥',
    Other: '🎯',
  };
  return icons[type] || icons.Other;
}

export default MeetingFilterList;
```

**Component logic:**
1. Shows loading state while fetching
2. Shows empty state if no meetings
3. Renders "All Meetings" option at top
4. Maps through meetings array
5. Shows selected meeting with active class
6. Calls `onSelectMeeting(null)` to clear filter
7. Calls `onSelectMeeting(meeting._id)` to select meeting

### Dashboard Layout Structure

**File:** `frontend/src/pages/Dashboard.jsx` (Lines 280+)

```javascript
return (
  <div className="page-wrapper">
    <Navbar />
    <main className="main-content">
      <div className="dashboard-container">  {/* Grid container */}
        
        {/* LEFT: Meeting Filter Sidebar */}
        <aside className="dashboard-sidebar">
          <MeetingFilterList
            meetings={meetings}
            selectedMeetingId={selectedMeetingId}
            onSelectMeeting={setSelectedMeetingId}
            loading={loading}
          />
        </aside>

        {/* RIGHT: Main Content */}
        <section className="dashboard-main">
          <div className="page-header">
            <div>
              <h1>Dashboard</h1>
              <p className="text-muted">
                {selectedMeeting
                  ? `Tasks from: ${selectedMeeting.title}`
                  : 'Your confirmed tasks and metrics overview'}
              </p>
            </div>
            {/* ... rest of header ... */}
          </div>

          {/* Search, Metrics, Filters, and Tasks below */}
          {/* ... */}
        </section>
      </div>
    </main>
  </div>
);
```

**Layout hierarchy:**
```
page-wrapper
  └── Navbar
  └── main.main-content
      └── div.dashboard-container (CSS Grid)
          ├── aside.dashboard-sidebar
          │   └── MeetingFilterList
          │       ├── header
          │       └── meeting-list
          │           ├── all-meetings
          │           └── individual-meetings[]
          └── section.dashboard-main
              ├── page-header
              ├── search-section
              ├── MetricsCards
              ├── filters-bar
              └── TaskTable
```

### CSS Grid Layout

**File:** `frontend/src/App.css` (Lines 2023+)

```css
.dashboard-container {
  display: grid;
  grid-template-columns: 280px 1fr;  /* Sidebar | Main */
  gap: 24px;
  width: 100%;
}

.dashboard-sidebar {
  position: sticky;
  top: 24px;
  height: fit-content;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.dashboard-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Responsive: Stack on tablets and below */
@media (max-width: 1024px) {
  .dashboard-container {
    grid-template-columns: 1fr;  /* Stack vertically */
    gap: 16px;
  }

  .dashboard-sidebar {
    position: static;  /* Not sticky on mobile */
    top: auto;
    max-height: none;
  }
}
```

**Why this CSS?**
- `grid-template-columns: 280px 1fr`: Fixed 280px sidebar, flexible main
- `sticky` + `top: 24px`: Sidebar stays in view while scrolling
- `max-height: calc(100vh - 200px)`: Sidebar doesn't exceed viewport
- `gap: 24px`: Spacing between sidebar and main
- Media query: Makes layout responsive below 1024px

---

## Part 3: Data Flow Diagram

### Complete Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERACTION                        │
│  (Click meeting in sidebar or change filters)               │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
        ┌─────────────────────────┐
        │ setSelectedMeetingId    │
        │  OR handleFilterChange  │
        └────────┬────────────────┘
                 │
                 ▼
      ┌──────────────────────────────┐
      │  State Updates               │
      │  - selectedMeetingId OR      │
      │  - filters.dateFrom/dateTo   │
      └────────┬─────────────────────┘
               │
               ▼
      ┌──────────────────────────────┐
      │  useMemo triggers (detects   │
      │  dependency change)          │
      └────────┬─────────────────────┘
               │
               ▼
      ┌──────────────────────────────┐
      │  Filter Logic Executes:      │
      │  1. Meeting filter (if set)  │
      │  2. Date range filter (if set)
      └────────┬─────────────────────┘
               │
               ▼
      ┌──────────────────────────────┐
      │  filteredTasks calculated    │
      │  (memoized result)           │
      └────────┬─────────────────────┘
               │
               ▼
      ┌──────────────────────────────┐
      │  Component Re-renders with   │
      │  filtered tasks only         │
      └──────────────────────────────┘

                   ▲
                   │
        ┌──────────┴────────────┐
        │                       │
    Tasks from              Meetings from
    /api/tasks/meetings     /api/tasks
    (in fetchData)          (in fetchData)
```

### Real-time Update Flow

```
User creates new meeting summary and confirms tasks
           │
           ▼
Backend emits: analysis:updated
           │
           ▼
WebSocket event received in Dashboard
           │
           ▼
fetchData() called
           │
           ▼
getMeetings() fetches new meetings list
getTasks() fetches updated tasks
           │
           ▼
setMeetings() updates meeting list
setTasks() updates task list
           │
           ▼
useMemo recalculates with new data
           │
           ▼
UI updates with new meeting in sidebar
TaskTable shows/filters new tasks accordingly
```

---

## Part 4: API Response Examples

### Example: GET /api/tasks/meetings

```json
{
  "meetings": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "meetingId": "507f1f77bcf86cd799439011",
      "title": "Sprint Planning",
      "date": "2024-01-15T10:00:00.000Z",
      "meetingType": "Planning",
      "taskCount": 8,
      "confirmedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "meetingId": "507f1f77bcf86cd799439012",
      "title": "Daily Standup",
      "date": "2024-01-16T09:30:00.000Z",
      "meetingType": "Standup",
      "taskCount": 3,
      "confirmedAt": "2024-01-16T10:00:00.000Z"
    }
  ]
}
```

### Example: GET /api/tasks (with meetingId)

```json
{
  "tasks": [
    {
      "_id": "task_001",
      "analysisId": "507f1f77bcf86cd799439011",
      "meetingId": "507f1f77bcf86cd799439011",
      "meetingTitle": "Sprint Planning",
      "description": "Setup new development environment",
      "owner": "John Doe",
      "ownerUserId": "user_123",
      "deadline": "2024-01-20T00:00:00.000Z",
      "priority": "High",
      "status": "In Progress",
      "confidence": 0.95,
      "isUnassigned": false
    },
    {
      "_id": "task_002",
      "analysisId": "507f1f77bcf86cd799439012",
      "meetingId": "507f1f77bcf86cd799439012",
      "meetingTitle": "Daily Standup",
      "description": "Review PR comments",
      "owner": "Jane Smith",
      "ownerUserId": "user_456",
      "deadline": "2024-01-17T00:00:00.000Z",
      "priority": "Medium",
      "status": "Pending",
      "confidence": 0.88,
      "isUnassigned": false
    }
  ]
}
```

---

## Part 5: Testing Examples

### Test: Meeting Selection Filtering

```javascript
// When user selects "Sprint Planning" meeting
// selectedMeetingId = "507f1f77bcf86cd799439011"

// Incoming tasks:
const tasks = [
  { _id: "t1", meetingId: "507f1f77bcf86cd799439011", description: "Task A" },
  { _id: "t2", meetingId: "507f1f77bcf86cd799439012", description: "Task B" },
  { _id: "t3", meetingId: "507f1f77bcf86cd799439011", description: "Task C" },
];

// After filtering:
const filteredTasks = [
  { _id: "t1", meetingId: "507f1f77bcf86cd799439011", description: "Task A" },
  { _id: "t3", meetingId: "507f1f77bcf86cd799439011", description: "Task C" },
];

// ✅ Only tasks from the selected meeting are shown
```

### Test: Combined Meeting + Date Filter

```javascript
// Selected: "Sprint Planning" meeting + date range Jan 15-20

// Filtering steps:
// 1. Filter by meeting (3 tasks)
// 2. Filter by date (1 task with deadline in range)

const tasks = [
  {
    _id: "t1",
    meetingId: "planning_id",
    deadline: "2024-01-14T00:00:00Z"  // Before range
  },
  {
    _id: "t2",
    meetingId: "planning_id",
    deadline: "2024-01-18T00:00:00Z"  // In range ✅
  },
  {
    _id: "t3",
    meetingId: "planning_id",
    deadline: "2024-01-25T00:00:00Z"  // After range
  },
];

// Result: Only t2 shown (meeting match + date in range)
```

---

This comprehensive guide covers all aspects of the implementation!
