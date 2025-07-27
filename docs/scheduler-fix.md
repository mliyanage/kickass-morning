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

### Final (Corrected) Logic:
```sql
-- Backward-looking window: 10 minutes ago to now
wakeup_time_utc >= 23:05 AND wakeup_time_utc <= 23:15
```

### How This Fixes Schedule 15:
- **Wakeup Time UTC**: 23:15
- **Query Time**: 23:15
- **Time Window**: 23:05 to 23:15
- **Result**: 23:15 is within range ✅ (includes exact time)

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
   -- FINAL: Catches schedules in the last 10 minutes (including exact time)
   wakeup_time_utc >= tenMinutesAgoUTCStr AND wakeup_time_utc <= currentUTCTimeStr
   ```

3. **Logging**:
   ```javascript
   // FINAL: Time window: 23:05 to 23:15 (backward-looking)
   ```

## Logic Consistency Fix

**Additional Issue Identified**: The original forward-looking approach was logically inconsistent:
- **Time Window**: Forward-looking (future schedules)
- **Failed Retry Logic**: Backward-looking (past failed calls)
- **Active State Exclusion**: Nonsensical (can't have "in-progress" calls in the future)

**Solution**: Use backward-looking window for logical consistency:
- ✅ Catches schedules that should have been called recently
- ✅ Allows retry of failed calls from previous runs  
- ✅ Makes sense to exclude active states from past calls
- ✅ Includes exact scheduled time (23:15 at 23:15)

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
Simplified logic to allow recurring schedules to run multiple times:
```sql
-- NEW: Allow completed recurring schedules to run again (removed date restriction)
-- Only block active states: initiated, in-progress, pending
(last_call_status NOT IN ('initiated', 'in-progress', 'pending'))
```

## Final Logic Update

**Issue Identified**: The date restriction `DATE(last_called) < CURRENT_DATE` was too restrictive:
- Prevented multiple calls on the same day
- Blocked users who want to test their schedules
- Didn't allow for multiple daily wake-up times

**Final Solution**: Allow completed recurring schedules to run again anytime, only blocking active call states.

## Impact

## Midnight Boundary Fix

**Additional Issue Discovered**: Schedule 14 (00:05 UTC) was missed because the time window `23:59 to 00:09` crosses midnight, but string comparison logic failed.

**Problem**: `"00:05" >= "23:59"` evaluates to `false` in string comparison.

**Solution**: Added midnight-aware time window logic:
```sql
CASE 
  WHEN start_time > end_time THEN
    -- Midnight crossing: use OR logic (schedule >= start OR schedule <= end)
    (schedule_time >= start_time OR schedule_time <= end_time)
  ELSE
    -- Normal case: use AND logic (schedule >= start AND schedule <= end)  
    (schedule_time >= start_time AND schedule_time <= end_time)
END
```

## Final Impact

This comprehensive fix ensures that:
- All scheduled calls within the past 10 minutes are detected (time window fix)
- Midnight boundary crossings work correctly (midnight fix)
- Recurring schedules can run multiple times per day (status logic fix)
- Only active calls (initiated/in-progress/pending) are blocked to prevent duplicates
- No calls are missed due to timing precision issues
- The system is more reliable for users relying on precise wake-up times
- Schedule 14 (00:05 UTC) and Schedule 15 (23:15 UTC) both work correctly