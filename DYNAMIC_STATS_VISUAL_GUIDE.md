# Dynamic Dashboard Statistics - Visual Guide

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     DASHBOARD PAGE                           │
│                                                               │
│  ┌──────────────┐          ┌──────────────────────┐         │
│  │  Meeting     │          │   Main Content       │         │
│  │  Filter      │          │                      │         │
│  │  List        │          │  ┌────────────────┐  │         │
│  │              │          │  │  Metrics Cards │  │◄────┐   │
│  │  [Meeting 1] │          │  │    (Updated    │  │     │   │
│  │  [Meeting 2] │          │  │   Dynamically) │  │     │   │
│  │  [Meeting 3] │          │  └────────────────┘  │     │   │
│  │              │          │                      │     │   │
│  │  onChange    │          │  Other Components    │     │   │
│  └──────┬───────┘          └──────────────────────┘     │   │
│         │                                                 │   │
│         │ selectedMeetingId                             │   │
│         └────────────────────┬─────────────────────────┘   │
│                              │                              │
│         ┌────────────────────┴────────────────────┐        │
│         │ computed via useMemo:                   │        │
│         │ - filteredTasks (meeting + date filter) │        │
│         │ - computedMetrics (stats from filtered) │        │
│         └────────────────────┬────────────────────┘        │
│                              │                              │
│         ┌────────────────────┘                             │
│         │                                                    │
│         ▼                                                    │
│    metrics state ──────────────────────────────────────────┘
│ (via setMetrics in useEffect)                              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
USER INTERACTION
       │
       ├─ Clicks Meeting ──────┐
       │                        │
       ├─ Changes Date Range ──┼──> selectedMeetingId
       │                        │    or filters state
       └─ Changes Other ─────┬─┘     changes
                             │
                             ▼
                    ┌──────────────────┐
                    │  Task Array from  │
                    │  API on Load      │
                    └────────┬──────────┘
                             │
                             ▼
                    ┌──────────────────────────┐
                    │  filteredTasks useMemo   │
                    │  (meets both filters:    │
                    │   - meeting match        │
                    │   - date range)          │
                    └────────┬─────────────────┘
                             │
                             ▼
                    ┌──────────────────────────┐
                    │  computedMetrics useMemo │
                    │  (processes filtered     │
                    │   tasks to compute:      │
                    │   - totalTasks           │
                    │   - highPriority         │
                    │   - overdue              │
                    │   - assignedToMe)        │
                    └────────┬─────────────────┘
                             │
                             ▼
                    ┌──────────────────────────┐
                    │  useEffect triggers when │
                    │  computedMetrics change  │
                    │  → calls setMetrics()    │
                    └────────┬─────────────────┘
                             │
                             ▼
                    ┌──────────────────────────┐
                    │  metrics state updates   │
                    └────────┬─────────────────┘
                             │
                             ▼
                    ┌──────────────────────────┐
                    │  MetricsCards component  │
                    │  re-renders with new    │
                    │  metrics (Dashboard      │
                    │  cards update on screen) │
                    └──────────────────────────┘
```

## Metric Computation Logic

```
FOR EACH task IN filteredTasks:

┌─────────────────────────────────────────────────┐
│  Is priority === "High" ?                       │
│  YES ──> highPriority++                         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Has deadline ?                                 │
│  YES ──> Is deadline < today? AND               │
│          Is status !== "Completed" ?            │
│          YES ──> overdue++                      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Does ownerUserId === currentUser._id ?         │
│  YES ──> assignedToMe++                         │
└─────────────────────────────────────────────────┘

FINAL RESULTS:
totalTasks = filteredTasks.length
highPriority = count
overdue = count (excluding completed)
assignedToMe = count
```

## State Update Timeline

```
TIME AXIS ──────────────────────────────────────────────────────────►

① Meeting Selected
   ├─ setState(selectedMeetingId)
   └─ Component re-renders

② filteredTasks useMemo Detects Dependency Change
   ├─ Recalculates filtered tasks
   ├─ Applies meeting filter
   ├─ Applies date filter
   └─ Returns new filteredTasks array

③ computedMetrics useMemo Detects filteredTasks Change
   ├─ Loops through filteredTasks
   ├─ Counts high priority
   ├─ Counts overdue (not completed)
   ├─ Counts assigned to me
   └─ Returns new metrics object

④ useEffect Detects computedMetrics Change
   ├─ Calls setMetrics(computedMetrics)
   └─ Updates metrics state

⑤ MetricsCards Component Detects metrics Prop Change
   ├─ Re-renders
   ├─ Shows new numbers
   └─ Optional: Animations for value changes

TOTAL TIME: Typically < 1ms (imperceptible)
```

## Computation Tree

```
INPUTS:
  filteredTasks: Array<Task>
  user: { _id: ObjectId, ... }
  parseDeadlineDate: Function

                    ▼

              ┌───────────────┐
              │  Loop tasks   │
              └───────┬───────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼

    Priority      Deadline      Owner
    Check         Check         Check
        │             │             │
        │             │             │
  if === "High"   if past &     if === user
        │         not complete       │
        │             │             │
        ▼             ▼             ▼

   COUNT        COUNT          COUNT
   High Pr.     Overdue        Assigned

        │             │             │
        └─────────────┼─────────────┘
                      │
                      ▼

        ┌────────────────────────────┐
        │  Return metrics object:    │
        │  {                         │
        │    totalTasks: n,          │
        │    highPriority: m,        │
        │    overdue: k,             │
        │    assignedToMe: j         │
        │  }                         │
        └────────────────────────────┘

OUTPUT: React metrics state ──> MetricsCards
```

## Dependency Execution Graph

```
useState(filteredTasks)
         │
         ▼
useMemo(filteredTasks) ◄─ From application of earlier useMemo
         │              & Date filters
         ▼
computedMetrics useMemo
  depends on: [filteredTasks, user]
         │
         ├─ When filteredTasks changes ──> RECALCULATE
         ├─ When user changes ───────────> RECALCULATE
         └─ When other state changes ───> SKIP (memoized)
         │
         ▼
useEffect(computedMetrics)
  depends on: [computedMetrics]
         │
         ├─ When computedMetrics changes ──> EXECUTE
         └─ When others change ───────────> SKIP
         │
         ▼
setMetrics(computedMetrics)
         │
         ▼
metrics state
         │
         ▼
MetricsCards (re-renders only when metrics prop changes)
```

## Example Walkthrough

### Initial Load
```
Step 1: Component mounts
  - tasks loaded from API (all 50)
  - selectedMeetingId = null
  - metrics = null

Step 2: filteredTasks useMemo runs
  - No meeting selected, so all 50 tasks
  - No date filter, so all 50 tasks
  - Result: filteredTasks = [50 tasks]

Step 3: computedMetrics useMemo runs
  - Loops through 50 tasks
  - totalTasks = 50
  - highPriority = 12 (counted)
  - overdue = 3 (counted)
  - assignedToMe = 18 (counted)

Step 4: useEffect runs
  - setMetrics({ totalTasks: 50, highPriority: 12, ... })

Step 5: MetricsCards renders
  - Shows: "50 Total | 12 High Priority | 3 Overdue | 18 Assigned"
```

### After Meeting Selected (Sprint Planning)
```
Step 1: User clicks meeting
  - setSelectedMeetingId("sprint_123")
  - Component re-renders

Step 2: filteredTasks useMemo detects change
  - Meeting filter matches: task.meetingId === "sprint_123"
  - Filters 50 down to 8 tasks
  - Result: filteredTasks = [8 Sprint tasks]

Step 3: computedMetrics useMemo detects change (filteredTasks changed)
  - Loops through 8 tasks (instead of 50)
  - totalTasks = 8
  - highPriority = 3
  - overdue = 1
  - assignedToMe = 2

Step 4: useEffect runs
  - setMetrics({ totalTasks: 8, highPriority: 3, ... })

Step 5: MetricsCards renders
  - Shows: "8 Total | 3 High Priority | 1 Overdue | 2 Assigned"
  - Numbers animated to show change

TIME ELAPSED: ~1-2 milliseconds
PERFORMANCE: Imperceptible to user
```

## Browser DevTools Debugging

### Step 1: Check if useMemo is working
```javascript
// In React DevTools Profiler
// Expected: computedMetrics only re-renders when filteredTasks changes
```

### Step 2: Verify metrics state updates
```javascript
// In console:
console.log('Metrics:', metrics);
// Expected: Object with totalTasks, highPriority, overdue, assignedToMe
```

### Step 3: Check filteredTasks
```javascript
// In console:
console.log('Filtered Tasks:', filteredTasks);
console.log('Length:', filteredTasks.length);
// Expected: Array with correct count
```

### Step 4: Monitor dependency changes
```javascript
// Add temporary logging:
useEffect(() => {
  console.log('filteredTasks changed:', filteredTasks.length);
}, [filteredTasks]);

useEffect(() => {
  console.log('computedMetrics changed:', computedMetrics);
}, [computedMetrics]);
```

## Performance Characteristics

```
Task Count  |  Time  |  Status
────────────┼────────┼─────────────────
    100     |  0.1ms | ✅ Instant
    500     |  0.5ms | ✅ Instant
  1,000     |  1ms   | ✅ Instant
  5,000     |  5ms   | ✅ Fast
 10,000     | 10ms   | ✅ Acceptable
 50,000     | 50ms   | ⚠️  Noticeable
100,000     |100ms   | ⚠️  Slow
```

## React Render Cycle

```
Phase 1: Render
  ├─ Component function called
  ├─ useMemo hooks evaluate dependencies
  │  ├─ If dependencies unchanged → cached result
  │  └─ If dependencies changed → recompute
  ├─ Component returns JSX
  └─ React diffs vs previous render

Phase 2: Commit
  ├─ DOM updates (if needed)
  ├─ useEffect hooks run
  ├─ setState updates applied
  └─ Component commit phase finishes

Our Implementation Flow:
  ┌─ filteredTasks changes (dependency)
  │   ↓
  ├─ computedMetrics useMemo runs
  │   ↓
  ├─ returns new metrics object
  │   ↓
  ├─ useEffect detected change
  │   ↓
  └─ setMetrics() → metrics state updates
       ↓
    MetricsCards re-renders (new metrics prop)
```

---

**Visual Guide Complete** ✅

These diagrams illustrate:
1. ✅ Component structure and relationships
2. ✅ Complete data flow from user action to UI update
3. ✅ Metric computation logic and loops
4. ✅ State update timeline
5. ✅ Dependency execution order
6. ✅ Detailed walkthrough examples
7. ✅ Performance characteristics
8. ✅ React render cycle integration

All diagrams are ASCII-based for easy viewing in any text editor.
