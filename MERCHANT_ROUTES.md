# Merchant Program Routes

All merchant program routes have been added to `routes/web.php`. Here are all available routes:

## 🔗 Available Routes

### Supporter/User Routes

1. **Welcome Screen**
   - **URL:** `/merchant/welcome`
   - **Route Name:** `merchant.welcome`
   - **Page:** `merchant/Welcome.tsx`
   - **Description:** Welcome screen with points balance and action buttons

2. **Merchant Hub**
   - **URL:** `/merchant/hub`
   - **Route Name:** `merchant.hub`
   - **Page:** `merchant/Hub.tsx`
   - **Description:** Browse and search merchant offers

3. **Earn Points**
   - **URL:** `/merchant/earn-points`
   - **Route Name:** `merchant.earn-points`
   - **Page:** `merchant/EarnPoints.tsx`
   - **Description:** Volunteer opportunities and digital actions to earn points

4. **Offer Detail**
   - **URL:** `/merchant/offers/{id}`
   - **Route Name:** `merchant.offers.show`
   - **Page:** `merchant/OfferDetail.tsx`
   - **Example:** `/merchant/offers/3`
   - **Description:** View offer details and redemption options

5. **Redemption Confirmed**
   - **URL:** `/merchant/redemption-confirmed`
   - **Route Name:** `merchant.redemption.confirmed`
   - **Page:** `merchant/RedemptionConfirmed.tsx`
   - **Description:** Confirmation screen after successful redemption

6. **QR Code**
   - **URL:** `/merchant/qr-code`
   - **Route Name:** `merchant.qr-code`
   - **Page:** `merchant/QRCode.tsx`
   - **Description:** Display QR code for merchant scanning

### Merchant Dashboard

7. **Merchant Dashboard**
   - **URL:** `/merchant/dashboard`
   - **Route Name:** `merchant.dashboard`
   - **Page:** `merchant/Dashboard.tsx`
   - **Description:** Merchant analytics and overview dashboard

## 🔐 Authentication

All routes are protected with:
- `auth` middleware (user must be logged in)
- `EnsureEmailIsVerified` middleware (email must be verified)

## 📝 Route Group

All routes are grouped under:
```php
Route::middleware(['auth', 'EnsureEmailIsVerified'])
    ->prefix('merchant')
    ->name('merchant.')
    ->group(function () {
        // Routes here
    });
```

## 🚀 Quick Access Links

After logging in, you can access:

- **Welcome:** http://your-domain.com/merchant/welcome
- **Hub:** http://your-domain.com/merchant/hub
- **Earn Points:** http://your-domain.com/merchant/earn-points
- **Dashboard:** http://your-domain.com/merchant/dashboard

## 🔄 Navigation Flow

```
Welcome
  ├─→ Earn Points → Volunteer Opportunities / Digital Actions
  └─→ Redeem Points → Merchant Hub → Offer Detail → Redemption Confirmed → QR Code

Merchant Dashboard (separate flow)
```

## 📋 Using Routes in Components

You can use these routes in your components:

```tsx
import { Link } from '@inertiajs/react'
import { route } from 'ziggy-js'

// Using Link component
<Link href="/merchant/hub">Merchant Hub</Link>

// Using route helper (if ziggy is configured)
<Link href={route('merchant.hub')}>Merchant Hub</Link>
```

## ✅ All Routes Added

All routes have been successfully added to `routes/web.php` and are ready to use!

