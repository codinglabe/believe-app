# Believe Merchant Program - Frontend Components

This directory contains all frontend components and pages for the Believe Merchant Program, a points-based commerce and loyalty system.

## 📁 Structure

```
merchant/
├── components/
│   ├── PointsDisplay.tsx      # Displays points balance with icon
│   ├── OfferCard.tsx          # Card component for merchant offers
│   ├── QRCodeDisplay.tsx      # QR code display for redemption
│   ├── MerchantHeader.tsx     # Reusable header component
│   ├── AnalyticsChart.tsx     # Chart component for analytics
│   └── index.ts               # Barrel export file
└── pages/
    ├── Welcome.tsx            # Welcome screen with points balance
    ├── Hub.tsx                # Merchant Hub - offers listing
    ├── OfferDetail.tsx        # Product/offer detail page
    ├── RedemptionConfirmed.tsx # Redemption confirmation screen
    ├── QRCode.tsx             # QR code display page
    └── Dashboard.tsx         # Merchant dashboard with analytics
```

## 🎨 Components

### PointsDisplay
Displays points balance with customizable size and styling.

**Props:**
- `points: number` - The points value to display
- `size?: 'sm' | 'md' | 'lg'` - Size variant
- `showLabel?: boolean` - Show "Points" label
- `className?: string` - Additional CSS classes

### OfferCard
Card component for displaying merchant offers in the hub.

**Props:**
- `id: string` - Unique offer identifier
- `title: string` - Offer title
- `image: string` - Offer image URL
- `pointsRequired: number` - Points needed for redemption
- `cashRequired?: number` - Optional cash amount
- `merchantName?: string` - Merchant name
- `category?: string` - Offer category
- `onClick?: () => void` - Click handler

### QRCodeDisplay
Displays QR code for redemption with download/share options.

**Props:**
- `qrCodeData: string` - QR code data string
- `onDownload?: () => void` - Download handler
- `onShare?: () => void` - Share handler
- `title?: string` - Display title
- `instruction?: string` - Instruction text

### MerchantHeader
Reusable header component with menu, search, notifications, and profile options.

**Props:**
- `title?: string` - Header title (default: "Believe")
- `showBack?: boolean` - Show back button
- `showSearch?: boolean` - Show search icon
- `showNotifications?: boolean` - Show notifications icon
- `showProfile?: boolean` - Show profile icon
- Various click handlers for each action

### AnalyticsChart
Chart component for displaying analytics data.

**Props:**
- `title: string` - Chart title
- `data: ChartData[]` - Array of chart data points
- `totalLabel?: string` - Label for total value
- `totalValue?: string | number` - Total value to display
- `icon?: React.ReactNode` - Optional icon

## 📄 Pages

### Welcome.tsx
Welcome screen showing user's points balance with "Earn Points" and "Redeem Points" action buttons.

**Route:** `/merchant/welcome`

### Hub.tsx
Merchant Hub listing all available offers with search and filter functionality.

**Route:** `/merchant/hub`

**Features:**
- Search offers by title or merchant name
- Filter by category
- Grid layout of offer cards
- Click to view details

### OfferDetail.tsx
Product/offer detail page with pricing options and redemption rules.

**Route:** `/merchant/offers/:id`

**Features:**
- Product image and details
- Points-only or Points + Cash options
- Redemption rules display
- Redeem button

### RedemptionConfirmed.tsx
Confirmation screen after successful redemption.

**Route:** `/merchant/redemption-confirmed`

**Features:**
- Success confirmation
- Points locked display
- QR code button

### QRCode.tsx
QR code display page for merchant scanning.

**Route:** `/merchant/qr-code`

**Features:**
- Large QR code display
- Download and share options
- Scan instructions

### Dashboard.tsx
Merchant dashboard with analytics and overview.

**Route:** `/merchant/dashboard`

**Features:**
- Active offers count
- Total redemptions
- Weekly points redemptions chart
- Recent redemptions list
- Total rewards redeemed chart

## 🎯 Key Concepts

### BelieveM Points
- Points used to redeem merchant offers
- Cannot be cashed out
- Cannot be transferred between supporters
- Appear in Merchant Hub

### Offer Redemption Flow
1. User browses Merchant Hub
2. Selects an offer
3. Views offer details
4. Selects pricing option (points or points + cash)
5. Confirms redemption
6. Receives QR code
7. Merchant scans QR code
8. Redemption completed

## 🚀 Integration Notes

### Routing
To integrate these pages, add routes in `routes/web.php`:

```php
Route::middleware(['auth', 'EnsureEmailIsVerified'])->prefix('merchant')->name('merchant.')->group(function () {
    Route::get('/welcome', function () {
        return Inertia::render('merchant/Welcome');
    })->name('welcome');
    
    Route::get('/hub', function () {
        return Inertia::render('merchant/Hub');
    })->name('hub');
    
    Route::get('/offers/{id}', function ($id) {
        return Inertia::render('merchant/OfferDetail', [
            'offer' => [] // Pass offer data from backend
        ]);
    })->name('offers.show');
    
    Route::get('/redemption-confirmed', function () {
        return Inertia::render('merchant/RedemptionConfirmed');
    })->name('redemption.confirmed');
    
    Route::get('/qr-code', function () {
        return Inertia::render('merchant/QRCode');
    })->name('qr-code');
    
    Route::get('/dashboard', function () {
        return Inertia::render('merchant/Dashboard');
    })->name('dashboard');
});
```

### Data Integration
Currently, pages use mock data. To integrate with backend:

1. Pass data through Inertia props
2. Update component props interfaces
3. Replace mock data with actual data
4. Add loading states
5. Add error handling

### Styling
All components use:
- Tailwind CSS for styling
- Framer Motion for animations
- Radix UI components
- Lucide React for icons
- Dark mode support

## 📝 Notes

- This is frontend-only design (no backend integration)
- All data is currently mocked
- QR code generation uses a simple canvas pattern (replace with actual QR library)
- Images use placeholder fallbacks
- All navigation uses Inertia router

## 🔄 Next Steps

1. Integrate with backend API
2. Add actual QR code generation library (e.g., `qrcode.react`)
3. Add form validation
4. Add error boundaries
5. Add loading states
6. Add unit tests
7. Add E2E tests

