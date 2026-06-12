# Screen Time API — Implementation Plan

> **Status: unscheduled proposal.** No implementation exists. Do not implement from this doc without explicit prioritization.

## Overview

Apple's Screen Time APIs (DeviceActivity framework + FamilyControls) provide access to device usage data: pickups, screen time by app category, first pickup time, and notification counts. This is high-value coaching data for understanding digital habits.

## Key Frameworks

### DeviceActivity (iOS 15+)

- `DeviceActivityMonitor` — app extension that runs on schedule boundaries
- `DeviceActivityReport` — SwiftUI view extension for rendering usage data
- `DeviceActivitySchedule` — defines monitoring windows

### FamilyControls (iOS 16+)
- `AuthorizationCenter` — requests Screen Time permission
- Provides `FamilyActivitySelection` for picking apps/categories to monitor

### ManagedSettings (iOS 16+)

- `ShieldConfiguration` — app blocking (not needed for data collection)

## Apple Approval Process

**Required entitlement:** `com.apple.developer.family-controls`

### Steps

1. Submit request via Apple Developer portal → Certificates, Identifiers & Profiles
2. Fill out "Family Controls" capability request form
3. Explain use case: personal health coaching (self-monitoring, not parental controls)
4. Approval timeline: typically 1-4 weeks
5. Once approved, add capability to App ID and Xcode project

### Important Notes

- Apple is restrictive — they want to see legitimate use cases
- Parental control framing works better than "tracking" framing
- The entitlement is per-App-ID, not per-developer
- TestFlight builds work without the entitlement on the developer's own device

## Data Available

### From DeviceActivityReport

- **Total screen time** per day (minutes)
- **Screen time by category** (Social, Entertainment, Productivity, etc.)
- **Number of pickups** per day
- **First pickup time** (proxy for wake time)
- **Notification count** per day
- **Most used apps** (tokenized — see Privacy below)

### From DeviceActivityMonitor (extension):
- Threshold alerts (e.g., "2 hours of social media reached")
- Schedule boundary events (monitoring window start/end)
- Interval device activity reports

## Privacy Constraints

### Tokenized App Names

- Apps are identified by opaque `ApplicationToken`, not bundle IDs
- You **cannot** resolve token → app name outside the reporting UI
- Category names (Social, Entertainment, etc.) ARE readable
- This means backend storage should use category-level aggregates, not per-app data

### On-Device Only

- `DeviceActivityReport` renders as a SwiftUI view — data doesn't leave the device easily
- To extract numeric data, use `DeviceActivityReport` with a custom `DeviceActivityReportScene` that computes aggregates and stores them locally

## Known iOS Bugs & Limitations

1. **iOS 16.0-16.1**: `AuthorizationCenter.shared.requestAuthorization()` silently fails on some devices — fixed in 16.2+
2. **DeviceActivityMonitor extension** has very limited memory (6MB) — keep processing minimal
3. **Schedule-based monitoring** resets if the device restarts before the schedule fires
4. **Background execution** is unreliable — the extension may not fire exactly on time
5. **Simulator support** is limited — test on physical devices only
6. **Family Sharing conflicts**: if the device is part of a Family Sharing group with Screen Time managed by a parent, the API may not work correctly for the individual user

## Architecture

### App Extension: `DeviceActivityMonitorExtension`
- Runs outside main app process
- Receives schedule boundary callbacks
- Minimal logic: compute aggregates, write to shared App Group container

### App Extension: `DeviceActivityReportExtension`

- Provides SwiftUI views for rendering usage data
- Custom `DeviceActivityReportScene` extracts numeric aggregates
- Stores computed data to shared App Group UserDefaults or file

### Main App

- Reads aggregated data from shared App Group
- Uploads to Convex via existing ingestion pipeline

## Implementation Phases

### Phase A: Entitlement & Basic Setup
1. Request `com.apple.developer.family-controls` entitlement from Apple
2. Add FamilyControls capability to Xcode project
3. Create App Group for data sharing between extensions and main app
4. Implement `AuthorizationCenter.shared.requestAuthorization(for: .individual)`
5. Add authorization status to MoreView

### Phase B: DeviceActivityReport Extension

1. Create `DeviceActivityReportExtension` target
2. Implement custom `DeviceActivityReportScene` that computes:
   - Total screen time (minutes)
   - Screen time by category (dict)
   - Pickup count
   - First pickup time
   - Notification count
3. Store aggregates in shared App Group container (JSON file)
4. Display report in a SwiftUI view within the app

### Phase C: DeviceActivityMonitor Extension

1. Create `DeviceActivityMonitorExtension` target
2. Define daily monitoring schedule (midnight to midnight)
3. On `intervalDidEnd`: compute daily aggregates
4. Write to shared App Group container
5. Schedule local notification to wake main app for upload

### Phase D: Data Pipeline

1. Create `ScreenTimeEvent` model:
   ```swift
   struct ScreenTimeEvent: Codable {
       let date: String // YYYY-MM-DD
       let totalScreenTimeMin: Double
       let categoryBreakdown: [String: Double] // category → minutes
       let pickupCount: Int
       let firstPickupTime: Double? // ms timestamp
       let notificationCount: Int
   }
   ```
2. Add `uploadScreenTimeEvents` to `ConvexAPIClient`
3. Backend: `screen_time_events` table, HTTP route, ingestion mutation
4. Expand `computeDailyFeatures` with screen time fields
5. Update analyst prompt with screen time coaching hints

### Phase E: Coaching Integration

- "You picked up your phone 47 times yesterday (baseline: 32)"
- "Social media: 2h 15m — that's 45min above your baseline"
- "First pickup at 6:23 AM — 20min before your alarm"
- Correlate: screen time vs sleep quality, pickups vs stress rating

## Data Model

```typescript
// schema.ts
screen_time_events: defineTable({
  userId: v.id("users"),
  date: v.string(),
  totalScreenTimeMin: v.number(),
  categoryBreakdown: v.any(), // { "Social": 45, "Entertainment": 30, ... }
  pickupCount: v.number(),
  firstPickupTime: v.optional(v.number()),
  notificationCount: v.number(),
}).index("by_user_date", ["userId", "date"]),
```

## Timeline Estimate

- Phase A: Blocked on Apple approval (1-4 weeks)
- Phase B: 1-2 days after approval
- Phase C: 1 day
- Phase D: 1 day
- Phase E: Included in coaching prompt updates

## References

- [DeviceActivity | Apple Developer](https://developer.apple.com/documentation/deviceactivity)
- [FamilyControls | Apple Developer](https://developer.apple.com/documentation/familycontrols)
- [Screen Time API WWDC 2022](https://developer.apple.com/videos/play/wwdc2022/110336/)
- [Requesting Family Controls entitlement](https://developer.apple.com/documentation/familycontrols/familycontrols-entitlement)
