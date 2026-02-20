# Meeting-Based Task Filtering - Usage Guide

## For End Users

### How to Use Meeting-Based Filtering

1. **View All Meetings**
   - On the Dashboard, look at the left sidebar showing a list of all your meetings
   - Each meeting shows:
     - Meeting title
     - Meeting date (abbreviated)
     - Meeting type (Standup, Planning, etc.)
     - Number of tasks in that meeting

2. **Filter Tasks by Meeting**
   - Click on any meeting in the sidebar
   - The meeting will highlight with a purple background
   - The task table below will show ONLY tasks from that meeting
   - The page subtitle will show which meeting you're viewing

3. **View All Tasks Again**
   - Click on "All Meetings" at the top of the meeting list
   - Or click the × button in the header
   - Task table will show all tasks from all meetings

4. **Combine Filters**
   - You can combine meeting filter with other filters:
     - Select a meeting
     - Then apply priority filter (High/Medium/Low)
     - Or apply date range filter
     - Or filter by owner
     - Or select "My Tasks Only"
   - All filters work together (AND logic)

### Example Workflows

**Scenario 1: Focus on one meeting**
- Click "Sprint Planning" meeting
- See only tasks from Sprint Planning
- Can still sort/filter by priority or owner within that meeting

**Scenario 2: See all high-priority tasks**
- Leave meeting filter on "All Meetings"
- Select "High" priority
- See all high-priority tasks across all meetings

**Scenario 3: Review my tasks from last week**
- Click on specific meeting from last week
- Select "My Tasks Only"
- Set date range (previous week)
- See your assigned tasks from that meeting during that period

---

## For Developers

### Component Structure

```
Dashboard (pages/Dashboard.jsx)
├── MeetingFilterList (components/MeetingFilterList.jsx)
├── MetricsCards
├── TaskTable
└── Filters
```

### State Management

```javascript
// Meeting selection state
const [selectedMeetingId, setSelectedMeetingId] = useState(null);

// Meetings data
const [meetings, setMeetings] = useState([]);

// Other filters (preserved)
const [filters, setFilters] = useState({
  owner: '',
  priority: '',
  myTasksOnly: false,
  meetingType: '',
  dateFrom: '',
  dateTo: '',
});
```

### Filtering Logic (useMemo)

```javascript
const filteredTasks = useMemo(() => {
  let result = tasks;

  // 1. Meeting filter (takes priority)
  if (selectedMeetingId) {
    result = result.filter((task) => task.meetingId === selectedMeetingId);
  }

  // 2. Date range filter
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

### API Endpoints

**Fetch meetings:**
```javascript
GET /api/tasks/meetings
Headers: Authorization: Bearer <token>
Response: {
  meetings: [
    {
      _id: "meeting_id",
      meetingId: "meeting_id",
      title: "Sprint Planning",
      date: "2024-01-15",
      meetingType: "Planning",
      taskCount: 8,
      confirmedAt: "2024-01-15T10:00:00Z"
    }
  ]
}
```

**Fetch tasks (now includes meetingId):**
```javascript
GET /api/tasks?isConfirmed=true
Response: {
  tasks: [
    {
      _id: "task_id",
      analysisId: "meeting_id",
      meetingId: "meeting_id",  // NEW
      meetingTitle: "Sprint Planning",  // NEW
      description: "...",
      owner: "...",
      deadline: "...",
      priority: "High",
      ...
    }
  ]
}
```

### Component Props

**MeetingFilterList Component:**
```javascript
<MeetingFilterList
  meetings={meetings}           // Array of meeting objects
  selectedMeetingId={selectedMeetingId}  // Currently selected ID (null = all)
  onSelectMeeting={setSelectedMeetingId} // Selection callback
  loading={loading}             // Loading state
/>
```

### CSS Classes

**Dashboard Layout:**
- `.dashboard-container`: Main grid container (sidebar + main)
- `.dashboard-sidebar`: Left sidebar with meeting list
- `.dashboard-main`: Right main content area

**Meeting Filter:**
- `.meeting-filter-container`: Container for meeting list
- `.meeting-item`: Individual meeting card
- `.meeting-item.active`: Active/selected meeting state
- `.meeting-filter-header`: Header with title and clear button

### Integration Points

1. **Task Updates via WebSocket:**
   - `task:updated` - Updates task in list
   - `task:deleted` - Removes task from list
   - `analysis:updated` - Refreshes all data including meetings

2. **Real-time Sync:**
   - Meeting filter automatically syncs with real-time updates
   - If task is moved to different meeting, it will disappear/appear based on filter

3. **Search Integration:**
   - Search functionality works independently
   - Search results can be clicked to navigate to analysis page

### Adding More Meeting Fields

To add additional fields to meetings:

1. **Backend** (`backend/routes/tasks.js` - GET /api/tasks/meetings):
   ```javascript
   const meetings = analyses.map(a => ({
     // ... existing fields
     newField: a.newField,  // Add here
   }));
   ```

2. **Frontend** (`MeetingFilterList.jsx`):
   ```javascript
   // Use the new field in rendering
   <div>{meeting.newField}</div>
   ```

### Performance Considerations

1. **useMemo Dependency Array:**
   - Only includes: `[tasks, selectedMeetingId, filters.dateFrom, filters.dateTo]`
   - Excludes other filters that are applied server-side
   - Other filters (priority, owner) not in memoization as they're handled separately

2. **Meeting List:**
   - Sidebar is sticky (performance: translate not transform)
   - Meeting list scrolls within container
   - Max-height prevents layout shift

3. **Fetching:**
   - Meetings fetched once on page load
   - Updates through WebSocket events
   - No polling required

### Debugging

**Check if meetings are loading:**
```javascript
// In browser console
// Dashboard should log meetings when fetched
console.log('Meetings:', meetings);
console.log('Selected Meeting ID:', selectedMeetingId);
console.log('Filtered Tasks:', filteredTasks);
```

**Check backend endpoint:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3002/api/tasks/meetings
```

**Verify task structure:**
```javascript
// Each task should have:
task.meetingId      // Should match selected meeting _id
task.meetingTitle   // Should match meeting title
task.analysisId     // For update operations
```

### Common Issues & Solutions

**Issue: Meetings not showing in sidebar**
- Check that `getMeetings()` API call succeeds
- Verify backend has confirmed analyses
- Check browser console for errors

**Issue: Task filtering not working**
- Verify tasks have `meetingId` field
- Check that `selectedMeetingId` state is updating
- Inspect browser DevTools to verify task.meetingId values

**Issue: Performance degradation**
- Verify useMemo is working (check DevTools)
- Check if large task sets are being filtered
- Monitor network requests for duplicate fetches

**Issue: Meeting list scrolling issues**
- Check CSS `.dashboard-sidebar` max-height
- Verify `.meeting-list` height constraints
- Test on different screen sizes

---

## Testing Recommendations

### Unit Tests
- MeetingFilterList component rendering
- Task filtering logic with various inputs
- Date parsing utilities

### Integration Tests
- Dashboard loads meetings
- Meeting selection updates tasks
- Filter combinations work correctly
- WebSocket updates work with filter

### E2E Tests
- Test meeting filtering workflow
- Test filter combinations
- Test responsive layout
- Test keyboard navigation
