# Deployment Monitoring and SIGTERM Issue Resolution

## Issue Analysis

The logs you provided show a SIGTERM signal termination:

```
2025-07-27 08:52:08.61 - system: received signal terminated
2025-07-27 08:52:08.62 - command finished with error [npm run start]: signal: terminated  
2025-07-27 08:52:08.65 - main done, exiting
```

## What SIGTERM Means

**SIGTERM (Signal Terminated)** is a graceful shutdown request that can be caused by:

1. **Memory Limits**: App exceeded allocated memory
2. **CPU Limits**: Process used too much CPU time  
3. **Health Check Failures**: Deployment system detected unresponsive app
4. **Automatic Scaling**: Replit's autoscale system terminated instance during load balancing
5. **Infrastructure Maintenance**: Platform-level restarts or updates

## Monitoring Improvements Implemented

### 1. Process Signal Handling
Added comprehensive signal handling in `server/index.ts`:

```javascript
// Graceful shutdown on SIGTERM/SIGINT
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal. Starting graceful shutdown...');
  process.exit(0);
});

// Enhanced error logging
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
```

### 2. Memory Monitoring
Added automatic memory usage logging every 5 minutes:

```javascript
setInterval(() => {
  const memUsage = process.memoryUsage();
  const mbUsed = Math.round(memUsage.rss/1024/1024);
  const heapUsed = Math.round(memUsage.heapUsed/1024/1024);
  const heapTotal = Math.round(memUsage.heapTotal/1024/1024);
  console.log(`Memory Usage: RSS=${mbUsed}MB, Heap=${heapUsed}MB/${heapTotal}MB`);
}, 300000);
```

### 3. Enhanced Health Check Endpoint
Created `/api/health` endpoint with detailed system information:

```javascript
app.get("/api/health", (req, res) => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    memory: {
      rss: Math.round(memUsage.rss/1024/1024),
      heapUsed: Math.round(memUsage.heapUsed/1024/1024),
      heapTotal: Math.round(memUsage.heapTotal/1024/1024)
    },
    environment: process.env.NODE_ENV || 'development'
  });
});
```

## Next Steps for Production

### 1. External Monitoring
Set up external monitoring services like:
- **UptimeRobot**: Monitor health endpoint every 1-5 minutes
- **Pingdom**: Track response times and uptime
- **DataDog/New Relic**: Comprehensive application monitoring

### 2. Resource Optimization
Monitor memory patterns and consider:
- Implementing memory leak detection
- Adding request rate limiting
- Optimizing database queries
- Caching frequently used data

## Memory Leak Prevention

### Fixed Development Environment Issues
To prevent production memory leaks similar to the MemoryStore issue:

1. **Session Storage**: ✅ Fixed - Uses PostgreSQL in production, Memory only in development
2. **Scheduler Jobs**: ✅ Fixed - Added graceful shutdown with `stopAllSchedulers()`
3. **Toast Timeouts**: ✅ Fixed - Proper timeout cleanup in frontend
4. **Audio Cache**: ✅ Fixed - Consistent mock filenames, no file accumulation

### Scheduler Cleanup
```javascript
// Graceful shutdown now properly cleans up all scheduled jobs
process.on('SIGTERM', () => {
  stopAllSchedulers(); // Cancels all node-schedule jobs
  process.exit(0);
});
```

### Frontend Timer Management
```javascript
// Toast timeouts are now properly cleared to prevent memory leaks
case "REMOVE_TOAST":
  const timeout = toastTimeouts.get(action.toastId)
  if (timeout) {
    clearTimeout(timeout)
    toastTimeouts.delete(action.toastId)
  }
```

### 3. Alerting
Configure alerts for:
- Memory usage > 80%
- Response time > 5 seconds  
- Error rate > 5%
- Downtime > 1 minute

## Log Analysis Tips

**Normal Restart**: `Application health check - OK` logs should resume after restart
**Memory Issue**: Look for memory usage trending upward before termination
**Error Crash**: Check for uncaught exceptions in logs before SIGTERM
**Platform Issue**: Multiple similar timestamps across different apps

## Deployment Configuration

The current configuration in `.replit`:
- **Deployment Target**: `autoscale` (automatic scaling)
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`

This setup allows Replit to automatically scale and restart your application as needed.

## Session Store Warning Fix

### Issue
The warning you saw:
```
Warning: connect.session() MemoryStore is not designed for a production environment, 
as it will leak memory, and will not scale past a single process.
```

### Solution Implemented
- **Development**: Uses MemoryStore (acceptable for dev/testing)
- **Production**: Uses PostgreSQL-based session storage via `connect-pg-simple`
- **Benefits**: 
  - No memory leaks in production
  - Sessions persist across app restarts
  - Scales to multiple processes
  - Better security with `httpOnly` cookies

### Configuration
```javascript
// Automatically detects environment and uses appropriate store
const isProduction = process.env.NODE_ENV === 'production';
store: isProduction ? new PostgreSqlStore({
  pool: pool,
  tableName: 'session',
  createTableIfMissing: true
}) : undefined
```

## Conclusion

The SIGTERM signal is often part of normal platform operations. With the monitoring improvements in place, you'll now have better visibility into:
- When and why restarts occur
- Memory usage patterns
- Application health status
- Performance trends
- Session storage efficiency

This will help identify if future terminations are due to application issues or platform maintenance.