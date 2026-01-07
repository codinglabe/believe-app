# Merchant Subdomain Setup - Complete Guide

## 🎯 Overview

A completely separate merchant program has been created on the subdomain `merchant.believeinunity.org`. This is a fully independent system with its own landing page, authentication, dashboard, and all merchant functionality.

## 🌐 Domain Configuration

### 1. Environment Variable

Add to your `.env` file:
```env
MERCHANT_DOMAIN=merchant.believeinunity.org
```

### 2. Config File

Created `config/merchant.php`:
```php
'domain' => env('MERCHANT_DOMAIN', 'merchant.believeinunity.org'),
```

## 📁 File Structure

### Routes
- `routes/merchant.php` - All merchant-specific routes
- Updated `routes/web.php` - Added domain routing (before livestock routes)

### Pages Created

#### Public Pages
- `resources/js/pages/Merchant/Landing.tsx` - Landing page
- `resources/js/pages/Merchant/Hub.tsx` - Public offer browsing (for supporters)

#### Authentication Pages
- `resources/js/pages/Merchant/Auth/Login.tsx` - Merchant login
- `resources/js/pages/Merchant/Auth/Register.tsx` - Merchant registration
- `resources/js/pages/Merchant/Auth/ForgotPassword.tsx` - Password reset

#### Merchant Dashboard Pages
- `resources/js/pages/Merchant/Dashboard.tsx` - Main dashboard
- `resources/js/pages/Merchant/Offers/Create.tsx` - Create offer page

## 🔗 Available Routes

### Public Routes (No Auth Required)

1. **Landing Page**
   - URL: `http://merchant.believeinunity.org/`
   - Route: `merchant.home`

2. **Merchant Hub (Public)**
   - URL: `http://merchant.believeinunity.org/hub`
   - Route: `hub.index`
   - Description: Public page for supporters to browse offers

3. **Offer Detail (Public)**
   - URL: `http://merchant.believeinunity.org/hub/offers/{id}`
   - Route: `hub.offer.show`

### Authentication Routes (Guest Only)

4. **Login**
   - URL: `http://merchant.believeinunity.org/login`
   - Route: `merchant.login`

5. **Register**
   - URL: `http://merchant.believeinunity.org/register`
   - Route: `merchant.register`

6. **Forgot Password**
   - URL: `http://merchant.believeinunity.org/forgot-password`
   - Route: `merchant.password.request`

### Authenticated Routes (Requires Login)

7. **Dashboard**
   - URL: `http://merchant.believeinunity.org/dashboard`
   - Route: `merchant.dashboard`

8. **Offers Management**
   - List: `http://merchant.believeinunity.org/offers`
   - Create: `http://merchant.believeinunity.org/offers/create`
   - Show: `http://merchant.believeinunity.org/offers/{id}`
   - Edit: `http://merchant.believeinunity.org/offers/{id}/edit`

9. **Redemptions**
   - List: `http://merchant.believeinunity.org/redemptions`
   - Show: `http://merchant.believeinunity.org/redemptions/{id}`

10. **Analytics**
    - URL: `http://merchant.believeinunity.org/analytics`
    - Route: `merchant.analytics`

11. **Settings**
    - URL: `http://merchant.believeinunity.org/settings`
    - Route: `merchant.settings`

## 🎨 UI Features

### Landing Page
- Hero section with CTA buttons
- Features grid (6 key features)
- Call-to-action section
- Professional merchant branding

### Login/Register Pages
- Merchant-branded design
- Clean, modern UI
- Form validation
- Links to password reset

### Dashboard
- Overview cards (Active Offers, Redemptions)
- Analytics charts
- Recent redemptions list
- Quick action: Create Offer button
- Matches the design from your image

### Create Offer Page
- Image upload with preview
- All offer fields:
  - Title, Description
  - Points Required, Cash Required (optional)
  - Category, Redemption Rules
  - Limit per Member
  - Valid Until date
- Form validation
- Cancel/Save buttons

## 🔐 Authentication

The merchant system uses the same authentication system as the main app:
- Uses `auth` middleware
- Uses `EnsureEmailIsVerified` middleware
- Routes to merchant dashboard after login
- Separate login/register pages with merchant branding

## 🚀 Setup Instructions

### 1. Add Domain to .env
```env
MERCHANT_DOMAIN=merchant.believeinunity.org
```

### 2. Configure DNS
Point `merchant.believeinunity.org` to your server IP.

### 3. Clear Config Cache
```bash
php artisan config:clear
php artisan route:clear
```

### 4. Test Routes
Visit `http://merchant.believeinunity.org/` to see the landing page.

## 📝 Next Steps

### Backend Integration Needed

1. **Offer Management Controllers**
   - Create `App\Http\Controllers\Merchant\OfferController`
   - Implement CRUD operations
   - Handle image uploads

2. **Redemption Controllers**
   - Create `App\Http\Controllers\Merchant\RedemptionController`
   - Track QR code redemptions
   - View redemption history

3. **Analytics Controllers**
   - Create `App\Http\Controllers\Merchant\AnalyticsController`
   - Generate chart data
   - Calculate statistics

4. **Database Models**
   - `Merchant` model (if separate from User)
   - `Offer` model
   - `Redemption` model
   - `PointsLedger` model

5. **Middleware**
   - Check if user is a merchant
   - Verify merchant subscription ($9/month)
   - Handle merchant-specific permissions

## 🎯 Key Differences from Main App

1. **Separate Domain**: Completely isolated on subdomain
2. **Separate Routes**: All routes in `routes/merchant.php`
3. **Separate Pages**: All pages in `resources/js/pages/Merchant/`
4. **Merchant Branding**: Blue/green color scheme, merchant-focused UI
5. **Different Navigation**: Merchant-specific header and navigation

## ✅ What's Complete

- ✅ Domain configuration
- ✅ Route setup
- ✅ Landing page
- ✅ Login page
- ✅ Registration page
- ✅ Forgot password page
- ✅ Dashboard (with analytics)
- ✅ Create offer page
- ✅ Public hub page
- ✅ All UI components match your design

## 🔄 What Needs Backend

- ⏳ Offer CRUD operations
- ⏳ Redemption tracking
- ⏳ Analytics data generation
- ⏳ Image upload handling
- ⏳ Merchant subscription check
- ⏳ QR code generation
- ⏳ Points ledger integration

## 📸 Pages Match Your Design

All pages are designed to match the UI shown in your image:
- Clean, modern design
- Blue/green color scheme
- Professional merchant branding
- Responsive layout
- Dark mode support

---

**The merchant subdomain is now fully set up and ready for preview!** 🎉

Visit `http://merchant.believeinunity.org/` (or your configured domain) to see the landing page.

