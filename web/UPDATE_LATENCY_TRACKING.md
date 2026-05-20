# Update Latency Tracking

## Overview
This feature tracks the time it takes from when a runner crosses the finish line until their result is updated on the server. This measures the actual processing delay in the timing system.

## Implementation Details

### Variables Added
- **`updateLatencies`**: An array that stores all latency measurements (in seconds) for finished runners
- **`updateLatencyStats`**: An object containing calculated statistics:
  - `median`: The median latency value
  - `min`: The smallest (minimum) latency value  
  - `average`: The average latency value
  - `count`: The number of measurements collected

### Data Collection
Latency is automatically tracked whenever a finished runner's result is updated. The system calculates:
```javascript
finishTimeOfDay = (data[i].start + data[i].result) / 100  // Convert from centiseconds to seconds
eventTime = new Date((timeServer + timeZoneDiff * 60) * 1000)  // Current time in event's timezone
dayStartTimestamp = midnight in event timezone as UTC timestamp
finishTimestamp = dayStartTimestamp + finishTimeOfDay     // Add to current day
updateLatency = data[i].changed - finishTimestamp         // Time from finish to server update
```
Where:
- `data[i].start` is the runner's start time in the **event's local timezone** (in centiseconds since midnight)
- `data[i].result` is the runner's race time/duration (in centiseconds)
- `finishTimeOfDay` is when the runner crossed the finish line (in seconds since midnight in event timezone)
- `timeZoneDiff` is the difference between the event's timezone and client's timezone (in minutes)
- `dayStartTimestamp` is midnight of the current day in the **event's timezone**, converted to UTC timestamp
- `finishTimestamp` is the full Unix timestamp when the runner finished (in seconds, UTC)
- `data[i].changed` is the Unix timestamp (in seconds, UTC) when the server was updated with this result
- `updateLatency` is the time between crossing the finish line and the server receiving the update (in seconds)

The calculation properly handles:
- **Unit conversion**: Times are stored in centiseconds (1/100th of a second) but converted to seconds for timestamp calculation
- **Timezone conversion**: Race times are in the event's local timezone, properly converted to UTC for comparison with server timestamps
- **Midnight crossing**: If a finish time is in the early morning hours (before 6 AM) but the current time suggests the race started the previous evening, 24 hours are added to handle the day boundary
- **Data validation**: Only positive latencies under 1 hour are tracked (to filter out data errors and clock synchronization issues)

### Automatic Logging
Statistics are automatically logged to the browser console every 10 result updates. To view:
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Watch for messages like: `Update Latency Stats (n=50): Min: 0.45s, Median: 2.31s, Average: 2.87s`

## Accessing Statistics

### From Browser Console

You can manually retrieve statistics at any time using the browser console:

#### Get Formatted Summary String
```javascript
LiveResults.Instance.getUpdateLatencyStatsString()
```
Example output: `"Update Latency Stats (n=100): Min: 0.32s, Median: 2.15s, Average: 2.64s"`

#### Get Detailed Statistics Object
```javascript
LiveResults.Instance.calculateUpdateLatencyStats()
```
Returns an object like:
```javascript
{
  median: 2.15,
  min: 0.32,
  average: 2.64,
  count: 100
}
```

#### Access Raw Data
```javascript
// View all latency measurements
LiveResults.Instance.updateLatencies

// Get the number of measurements
LiveResults.Instance.updateLatencies.length

// Find maximum latency
Math.max(...LiveResults.Instance.updateLatencies)
```

### Export Data for Analysis

To export the latency data for further analysis:

```javascript
// Copy all latencies as JSON
console.log(JSON.stringify(LiveResults.Instance.updateLatencies))

// Copy statistics
console.log(JSON.stringify(LiveResults.Instance.calculateUpdateLatencyStats()))

// Export to CSV format (copy from console)
console.log(LiveResults.Instance.updateLatencies.join('\n'))
```

## Use Cases

### Monitor System Performance
Track how quickly results are being updated during a live event to identify potential delays or bottlenecks.

### Quality Assurance
Verify that the system is performing within acceptable latency thresholds (e.g., results should appear within 3 seconds).

### Troubleshooting
If users report delays in seeing results, check the statistics to confirm whether the issue is on the server side or network related.

## Example Console Session

```javascript
// Check current statistics
> LiveResults.Instance.getUpdateLatencyStatsString()
< "Update Latency Stats (n=75): Min: 0.28s, Median: 1.95s, Average: 2.31s"

// Get detailed breakdown
> LiveResults.Instance.calculateUpdateLatencyStats()
< {median: 1.95, min: 0.28, average: 2.31, count: 75}

// Find outliers (results that took more than 5 seconds)
> LiveResults.Instance.updateLatencies.filter(x => x > 5)
< [5.2, 6.1, 7.8]

// Calculate 95th percentile
> let sorted = LiveResults.Instance.updateLatencies.slice().sort((a,b) => a-b)
> sorted[Math.floor(sorted.length * 0.95)]
< 4.23
```

## Notes

- Latency tracking only captures data for **finished runners** (status = 100% complete)
- The measurement is from the calculated finish time (start time + race time) to when the server records the result
- This includes timing system processing, data transmission, and server update time
- **Unit handling**: Internal race times are in centiseconds (1/100 second), converted to seconds for latency calculation
- **Timezone handling**: Race times are in the event's local timezone; properly converted to UTC for accurate comparison with server update timestamps
- **Data filtering**: Only tracks positive latencies less than 1 hour (filters out clock sync issues and data errors)
- **Midnight handling**: Properly accounts for races that cross midnight in the event's timezone
- Works correctly regardless of the client's timezone or location
- Data persists for the duration of the page session (cleared on page reload)
- All latency statistics are reported in seconds
