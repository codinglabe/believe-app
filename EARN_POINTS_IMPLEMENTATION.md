# Earn Points System - Implementation Guide

## Overview

This document describes the implementation of the Earn Points system for the Believe Merchant Program, including volunteer opportunities and digital actions.

## 🎯 Key Features

### 1. Volunteer Points System
- **Verification Required:** All volunteer points must be verified before awarding
- **Multiple Verification Methods:**
  - Nonprofit admin approval
  - QR code check-in at event
  - Volunteer sign-in form
  - Admin review
  - Time-based confirmation (hours logged)
- **No Self-Reporting:** All activities require external verification

### 2. Digital Actions System
- **Safe & Auditable:** All actions completed within Believe platform
- **No Physical Presence Required:** 100% digital actions
- **Categories:**
  - Discovery (Follow merchants, view profiles)
  - Feedback (Surveys, polls, ratings)
  - Content (Written feedback, Q&A)
  - Promotion (Internal sharing only)
  - Education (Videos, webinars, modules)

### 3. Separation of Earn vs Redeem
- **Earn Points Tab:** Volunteer opportunities and digital actions
- **Merchant Hub:** Only for redeeming points (spending)
- **Clear Separation:** Prevents clutter and maintains focus

## 📁 File Structure

```
resources/js/
├── components/
│   └── merchant/
│       ├── EarnPointsTabs.tsx          # Tab navigation component
│       ├── VolunteerOpportunityCard.tsx # Volunteer opportunity display
│       ├── DigitalActionCard.tsx       # Digital action display
│       ├── VolunteerHistory.tsx        # History tracking component
│       ├── QRCheckIn.tsx              # QR code check-in modal
│       ├── VolunteerSignInForm.tsx     # Sign-in form component
│       └── index.ts                    # Barrel exports
└── pages/
    └── merchant/
        └── EarnPoints.tsx              # Main Earn Points page
```

## 🧩 Components

### EarnPointsTabs
Tab navigation component with three tabs:
- **Volunteer & Earn:** Volunteer opportunities
- **Digital Actions:** Digital action opportunities
- **My History:** Activity history

### VolunteerOpportunityCard
Displays volunteer opportunities with:
- Event details (date, time, location)
- Points awarded (verified only)
- Verification methods badges
- Status indicators (upcoming, active, completed, verified)
- Action buttons (Join, Check In, Submit Verification)

### DigitalActionCard
Displays digital actions with:
- Category badges
- Points awarded
- Time requirements
- Status (available, completed, pending)
- Requirements list
- One-time vs repeatable indicators

### VolunteerHistory
History tracking with:
- Summary cards (Total Earned, Pending, Total Activities)
- Filter buttons (All, Volunteer, Digital, Verified, Pending)
- Detailed entry list with verification methods

### QRCheckIn
QR code check-in modal for event verification:
- QR scanner interface
- Scan confirmation
- Event details

### VolunteerSignInForm
Sign-in form for time-based verification:
- Hours logged input
- Activities description
- Additional notes
- Form validation

## 📄 Main Page: EarnPoints.tsx

### Features
1. **Three-Tab Interface:**
   - Volunteer & Earn tab
   - Digital Actions tab
   - My History tab

2. **Volunteer Opportunities:**
   - Search functionality
   - Grid layout of opportunity cards
   - Join/Check In/Verify actions
   - Modal dialogs for verification

3. **Digital Actions:**
   - Search functionality
   - Category filtering
   - Grid layout of action cards
   - Complete/Start actions

4. **History:**
   - Filter by type and status
   - Summary statistics
   - Detailed entry list

## 🔒 Verification Methods

### 1. QR Code Check-In
- Event location QR code scanning
- Instant verification
- Used for: In-person events

### 2. Sign-In Form
- Hours logged input
- Activities description
- Admin review required
- Used for: Time-based activities

### 3. Admin Approval
- Nonprofit admin reviews submission
- Manual verification
- Used for: Complex activities

### 4. Admin Review
- Platform admin reviews
- For edge cases
- Used for: Disputes, special cases

### 5. Time-Based Confirmation
- Automatic verification after time threshold
- System tracks duration
- Used for: Virtual activities, online sessions

## 📊 Ledger Entry Types

When points are awarded, ledger entries use:

```typescript
{
  entry_type: 'IMPACT_AWARD', // For volunteer activities
  // OR
  entry_type: 'MERCHANT_DIGITAL_ACTION', // For digital actions
  
  source_type: 'platform',
  source_id: null,
  points_delta: +100, // Points awarded
  reference_type: 'volunteer_event' | 'digital_action',
  reference_id: 'event_123' | 'action_456',
  verified: true, // Only true after verification
  verification_method: 'qr_checkin' | 'signin_form' | 'admin_approval' | 'admin_review' | 'time_based'
}
```

## 🚀 Integration Steps

### 1. Add Route

Add to `routes/web.php`:

```php
Route::middleware(['auth', 'EnsureEmailIsVerified'])->prefix('merchant')->name('merchant.')->group(function () {
    // ... existing routes ...
    
    Route::get('/earn-points', function () {
        return Inertia::render('merchant/EarnPoints', [
            'volunteerOpportunities' => [], // Pass from backend
            'digitalActions' => [], // Pass from backend
            'history' => [] // Pass from backend
        ]);
    })->name('earn-points');
});
```

### 2. Backend Integration

Replace mock data with actual API calls:

1. **Fetch Volunteer Opportunities:**
   ```typescript
   // GET /api/merchant/volunteer-opportunities
   // Returns: Array of volunteer opportunities
   ```

2. **Fetch Digital Actions:**
   ```typescript
   // GET /api/merchant/digital-actions
   // Returns: Array of available digital actions
   ```

3. **Fetch History:**
   ```typescript
   // GET /api/merchant/earn-history
   // Returns: Array of history entries
   ```

4. **Join Event:**
   ```typescript
   // POST /api/merchant/volunteer-opportunities/{id}/join
   ```

5. **QR Check-In:**
   ```typescript
   // POST /api/merchant/volunteer-opportunities/{id}/check-in
   // Body: { qr_code: string }
   ```

6. **Submit Sign-In:**
   ```typescript
   // POST /api/merchant/volunteer-opportunities/{id}/sign-in
   // Body: { hours_logged: number, activities: string, notes?: string }
   ```

7. **Complete Digital Action:**
   ```typescript
   // POST /api/merchant/digital-actions/{id}/complete
   ```

## 🛡️ Guardrails Implementation

### Monthly Caps
```typescript
// Check monthly point cap before awarding
const monthlyPoints = await getMonthlyPoints(userId, currentMonth)
if (monthlyPoints + pointsToAward > MONTHLY_CAP) {
  throw new Error('Monthly point cap reached')
}
```

### One-Time Rewards
```typescript
// Check if user already completed this action
const existing = await checkExistingCompletion(userId, actionId)
if (existing && action.isOneTime) {
  throw new Error('Action already completed')
}
```

### Fraud Monitoring
```typescript
// Check for suspicious patterns
const suspicious = await checkFraudPatterns(userId, action)
if (suspicious) {
  // Flag for admin review
  await flagForReview(userId, action)
}
```

### Expiration
```typescript
// Set expiration date (e.g., 12 months)
const expirationDate = new Date()
expirationDate.setMonth(expirationDate.getMonth() + 12)
```

## 📱 User Flow

### Volunteer Flow
1. User browses volunteer opportunities
2. Clicks "Join Event"
3. Attends event
4. Scans QR code OR submits sign-in form
5. Admin reviews (if required)
6. Points awarded to ledger
7. Points appear in balance

### Digital Action Flow
1. User browses digital actions
2. Clicks "Start" or "Complete"
3. Completes action (survey, video, etc.)
4. System verifies completion
5. Points awarded to ledger
6. Points appear in balance

## 🎨 Design Principles

1. **Clear Separation:** Earn vs Redeem are separate sections
2. **Verification Prominence:** Verification methods clearly displayed
3. **Status Indicators:** Clear visual status for all activities
4. **Search & Filter:** Easy discovery of opportunities
5. **History Tracking:** Full audit trail visible to users

## ✅ Board-Ready Policy

> "Believe awards points for verified volunteer and impact activities to encourage participation and community engagement. Points are promotional, non-monetary, and redeemable only within the Believe platform."

## 🔄 Next Steps

1. **Backend API Development:**
   - Create volunteer opportunity endpoints
   - Create digital action endpoints
   - Implement verification logic
   - Add ledger entry creation

2. **QR Code Integration:**
   - Integrate camera/QR scanner library
   - Generate QR codes for events
   - Validate QR codes server-side

3. **Admin Interface:**
   - Admin approval interface
   - Verification review dashboard
   - Fraud monitoring alerts

4. **Notifications:**
   - Points awarded notifications
   - Verification pending alerts
   - Event reminders

5. **Testing:**
   - Unit tests for components
   - Integration tests for flows
   - E2E tests for user journeys

---

**Note:** This is a frontend-only implementation. All data is mocked and should be replaced with actual backend integration when ready.

