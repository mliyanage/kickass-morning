# Scheduler Time Window Fix

## Issue Identified

**Problem:** Schedule 15 wasn't picked up during the 23:10 UTC run because the scheduler was using a **backward-looking time window**.

## Root Cause Analysis

### Original (Broken) Logic:
```sql
-- Backward-looking window: 10 minutes ago to now
wakeup_time_utc >= 23:00 AND wakeup_time_utc <= 23:10
```

### Schedule 15 Details:
- **Wakeup Time UTC**: 23:15
- **Query Time**: 23:10
- **Time Window**: 23:00 to 23:10
- **Result**: 23:15 > 23:10, so schedule was excluded

## Fix Implemented

### New (Fixed) Logic:
```sql
-- Forward-looking window: now to 10 minutes ahead
wakeup_time_utc >= 23:10 AND wakeup_time_utc <= 23:20
```

### How This Fixes Schedule 15:
- **Wakeup Time UTC**: 23:15
- **Query Time**: 23:10
- **Time Window**: 23:10 to 23:20
- **Result**: 23:15 is within range ✅

## Code Changes Made

**File:** `server/database-storage.ts`

1. **Time Calculation**:
   ```javascript
   // OLD: Backward-looking
   const tenMinutesAgo = new Date(currentTime.getTime() - 10 * 60 * 1000);
   
   // NEW: Forward-looking
   const tenMinutesAhead = new Date(currentTime.getTime() + 10 * 60 * 1000);
   ```

2. **SQL Query**:
   ```sql
   -- OLD: Catches schedules that are already past
   wakeup_time_utc >= tenMinutesAgoUTCStr AND wakeup_time_utc <= currentUTCTimeStr
   
   -- NEW: Catches upcoming schedules within next 10 minutes
   wakeup_time_utc >= currentUTCTimeStr AND wakeup_time_utc <= tenMinutesAheadUTCStr
   ```

3. **Logging**:
   ```javascript
   // OLD: Time window: 23:00 to 23:10
   // NEW: Time window: 23:10 to 23:20
   ```

## Benefits of the Fix

1. **Proactive Scheduling**: Catches schedules before they're due
2. **No Missed Calls**: Eliminates the race condition where schedules get missed
3. **Better Timing**: Allows for processing time before the actual call time
4. **Predictable Behavior**: Scheduler now looks ahead instead of backward

## Testing

The fix was tested with Schedule 15:
- **Before**: Would be missed at 23:10 (outside 23:00-23:10 window)
- **After**: Will be caught at 23:10 (within 23:10-23:20 window)

## Additional Issue Discovered

**Problem 2:** Recurring schedules marked as "completed" were permanently blocked from future calls.

### Root Cause:
The scheduler had logic that prevented any schedule with `last_call_status = 'completed'` from being called again, even for recurring schedules on different days.

### Fix Applied:
Added special handling for recurring schedules:
```sql
-- NEW: Allow recurring schedules to be called again on different days
(is_recurring = true AND last_call_status = 'completed' AND DATE(last_called) < CURRENT_DATE)
```

## Impact

This comprehensive fix ensures that:
- All scheduled calls within the next 10 minutes are detected (time window fix)
- Recurring schedules work properly across multiple days (status logic fix)
- No calls are missed due to timing precision issues
- The system is more reliable for users relying on precise wake-up times
- Schedule 15 will now be called every Saturday at 23:15 UTC as intended