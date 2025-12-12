# Bridge Wallet Integration

This document outlines the Bridge wallet integration that has been implemented.

## Overview

The integration connects your wallet system with Bridge API (https://apidocs.bridge.xyz) to enable:
- Deposit functionality
- Send/Transfer money
- Receive money
- KYC (Know Your Customer) for individual users
- KYB (Know Your Business) for organizations
- Admin-configurable transaction fees

## What Has Been Implemented

### 1. Backend Components

#### Bridge Service (`app/Services/BridgeService.php`)
- Handles all Bridge API interactions
- Methods for creating customers, wallets, transfers
- KYC/KYB link generation
- Balance fetching

#### Bridge Wallet Controller (`app/Http/Controllers/BridgeWalletController.php`)
- `/wallet/bridge/initialize` - Initialize Bridge customer and wallet
- `/wallet/bridge/balance` - Get Bridge wallet balance
- `/wallet/bridge/deposit` - Deposit money (with fee calculation)
- `/wallet/bridge/send` - Send money to recipients (with fee calculation)
- `/wallet/bridge/kyc-link` - Create KYC/KYB verification links

#### Models
- `BridgeIntegration` - Stores Bridge customer IDs, wallet IDs, KYC/KYB status
- `WalletFee` - Stores admin-configurable fees for transactions

#### Admin Fee Management (`app/Http/Controllers/Admin/WalletFeeController.php`)
- Admin can configure fees for: deposit, send, receive, withdraw
- Fee types: fixed amount or percentage
- Min/max fee constraints
- Enable/disable fees per transaction type

### 2. Database Migrations

#### `bridge_integrations` table
- Stores Bridge customer and wallet IDs
- Tracks KYC/KYB status and links
- Polymorphic relationship (User or Organization)

#### `wallet_fees` table
- Stores fee configuration per transaction type
- Supports fixed or percentage fees
- Min/max fee constraints

### 3. Frontend Updates

#### WalletPopup Component
- Automatically initializes Bridge when opened
- Checks KYC/KYB status
- Shows verification banner when required
- Uses Bridge endpoints for deposit and send
- Handles verification requirements gracefully

## Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```env
BRIDGE_API_KEY=your_bridge_api_key_here
BRIDGE_BASE_URL=https://api.bridge.xyz/v0
BRIDGE_WEBHOOK_SECRET=your_webhook_secret_here
```

**Important Notes:**
- Bridge uses the same base URL (`https://api.bridge.xyz/v0`) for both sandbox and production environments
- The difference between sandbox and production is in the **API key itself**, not the URL
- Make sure you're using the correct API key for your environment (sandbox or production)
- You can get your API keys from the Bridge Dashboard: https://dashboard.bridge.xyz
- The API key is sent in the `Api-Key` header as per Bridge documentation

### 2. Run Migrations

```bash
php artisan migrate
```

This will create:
- `bridge_integrations` table
- `wallet_fees` table

### 3. Seed Initial Fee Settings (Optional)

You can create default fee settings via tinker or a seeder:

```php
// Default fees (all inactive by default)
WalletFee::create(['transaction_type' => 'deposit', 'fee_type' => 'percentage', 'fee_amount' => 0, 'is_active' => false]);
WalletFee::create(['transaction_type' => 'send', 'fee_type' => 'percentage', 'fee_amount' => 0, 'is_active' => false]);
WalletFee::create(['transaction_type' => 'receive', 'fee_type' => 'percentage', 'fee_amount' => 0, 'is_active' => false]);
WalletFee::create(['transaction_type' => 'withdraw', 'fee_type' => 'percentage', 'fee_amount' => 0, 'is_active' => false]);
```

## How It Works

### For Organizations (KYB Required)

1. When wallet popup opens, Bridge is automatically initialized
2. Organization gets a Bridge customer ID and wallet ID
3. To use wallet features, organization must complete KYB verification
4. Admin can create KYB link via `/wallet/bridge/kyc-link` (type: kyb)
5. Once KYB is approved, organization can deposit, send, receive

### For Users (KYC Required)

1. When wallet popup opens, Bridge is automatically initialized
2. User gets a Bridge customer ID and wallet ID
3. To use wallet features, user must complete KYC verification
4. Admin can create KYC link via `/wallet/bridge/kyc-link` (type: kyc)
5. Once KYC is approved, user can deposit, send, receive

### Fee System

1. Admin goes to `/admin/wallet-fees` (route needs to be created)
2. Admin configures fees for each transaction type
3. When fees are active, they're automatically calculated and applied
4. Fees are deducted from the transaction amount
5. Fee amount is recorded in transaction metadata

## API Endpoints

### User/Organization Endpoints

- `POST /wallet/bridge/initialize` - Initialize Bridge (auto-called)
- `GET /wallet/bridge/balance` - Get Bridge balance
- `POST /wallet/bridge/deposit` - Deposit money
- `POST /wallet/bridge/send` - Send money
- `POST /wallet/bridge/kyc-link` - Create KYC/KYB link

### Webhook & Callback Endpoints

- `POST /webhooks/bridge` - Bridge webhook endpoint (no auth required, signature verified)
- `GET /wallet/kyc-callback` - KYC verification callback (no auth required)
- `GET /wallet/kyb-callback` - KYB verification callback (no auth required)

### Admin Endpoints

- `GET /admin/wallet-fees` - View all fee settings
- `PUT /admin/wallet-fees/{fee}` - Update fee setting
- `POST /admin/wallet-fees/{fee}/toggle` - Toggle fee active status

## KYC/KYB Flow

1. User/Organization tries to deposit or send
2. System checks if KYC/KYB is approved
3. If not approved, returns `requires_verification: true`
4. Frontend shows verification banner
5. User clicks "Start Verification" button
6. System creates KYC/KYB link via Bridge API
7. User is redirected to Bridge verification page
8. After completion, Bridge webhook updates status (needs implementation)
9. User can now use wallet features

## Fee Calculation Examples

### Percentage Fee (2% with $0.50 min, $10 max)
- Deposit $100 → Fee: $2.00 (2% of $100)
- Deposit $10 → Fee: $0.50 (min fee applied)
- Deposit $1000 → Fee: $10.00 (max fee applied)

### Fixed Fee ($1.00)
- Any deposit → Fee: $1.00

## Webhook Setup

### Webhook Endpoint
- **URL**: `https://yourdomain.com/webhooks/bridge`
- **Method**: POST
- **Authentication**: Signature verification using `BRIDGE_WEBHOOK_SECRET`

### Webhook Events Handled

1. **KYC Status Updates** (`kyc.status.updated`)
   - Updates user KYC status in database
   - Updates `bridge_integrations.kyc_status`

2. **KYB Status Updates** (`kyb.status.updated`)
   - Updates organization KYB status in database
   - Updates `bridge_integrations.kyb_status`

3. **Transfer Status Updates** (`transfer.status.updated`)
   - Updates transaction status
   - Updates user balances when transfers complete
   - Refunds balance if transfer fails

4. **Transfer Completed** (`transfer.completed`)
   - Marks transaction as completed
   - Adds balance to recipient
   - Sets `processed_at` timestamp

5. **Transfer Failed** (`transfer.failed`)
   - Marks transaction as failed
   - Refunds balance to sender

6. **Wallet Balance Updates** (`wallet.balance.updated`)
   - Updates balance metadata in integration record

### Configuring Webhook in Bridge Dashboard

1. Go to Bridge Dashboard → Webhooks
2. Add webhook endpoint: `https://yourdomain.com/webhooks/bridge`
3. **Select Event Categories** (in the Bridge UI):
   - ✅ **Kyc link** - for KYC/KYB status updates
   - ✅ **Transfer** - for transfer status updates
4. Copy the webhook secret and add to `.env` as `BRIDGE_WEBHOOK_SECRET`

### Testing Webhooks Locally

To test webhooks from your local development environment:

1. **Install ngrok** (or similar tunneling tool):
   ```bash
   # Download from https://ngrok.com/download
   # Or using package managers:
   # Windows: choco install ngrok
   # Mac: brew install ngrok
   # Linux: snap install ngrok
   ```

2. **Start your Laravel server**:
   ```bash
   php artisan serve
   # Server runs on http://localhost:8000
   ```

3. **Start ngrok tunnel**:
   ```bash
   ngrok http 8000
   # This will give you a public URL like: https://abc123.ngrok.io
   ```

4. **Configure Bridge webhook**:
   - Endpoint URL: `https://abc123.ngrok.io/webhooks/bridge`
   - Event Categories: Select **Kyc link** and **Transfer**
   - Event epoch: Choose "From webhook creation" for testing

5. **Add webhook secret to `.env`**:
   ```env
   BRIDGE_WEBHOOK_SECRET=your_webhook_secret_from_bridge
   ```

6. **Monitor webhook requests**:
   - Check ngrok dashboard: http://localhost:4040 (shows all requests)
   - Check Laravel logs: `storage/logs/laravel.log`
   - All webhook events are logged automatically

**Note**: The ngrok URL changes each time you restart ngrok (unless you have a paid plan with a static domain). Update the webhook URL in Bridge dashboard if needed.

### Webhook Security

- Webhooks are verified using HMAC SHA256 signature
- Signature is checked against `BRIDGE_WEBHOOK_SECRET`
- Invalid signatures return 401 Unauthorized
- All webhook events are logged for debugging

## Next Steps

1. ✅ **Webhook Handler**: Implemented - automatically updates KYC/KYB status and transaction status
2. **Admin UI**: Create admin page for fee management (`/admin/wallet-fees`)
3. **Testing**: Test with Bridge sandbox environment
4. **Error Handling**: Add more comprehensive error handling
5. **Virtual Accounts**: Implement virtual accounts for deposits if needed
6. **Exchange Rates**: Use Bridge exchange rates for currency conversion

## Notes

- Bridge API documentation: https://apidocs.bridge.xyz/api-reference/introduction/introduction
- All Bridge API calls use HTTP Basic Auth with Api-Key header
- KYC/KYB links are embedded - users don't leave your platform
- Fees are calculated server-side and included in transaction records
- Balance is synced between local database and Bridge

## Troubleshooting

### Bridge not initializing
- Check `BRIDGE_API_KEY` in `.env` - make sure it's set and correct
- Verify `BRIDGE_BASE_URL` is set to `https://api.bridge.xyz/v0` (same for both sandbox and production)
- Review logs in `storage/logs/laravel.log` for detailed error messages

### "Invalid credentials - wrong environment" error
- **This means your API key doesn't match the environment you're using**
- Bridge uses the same base URL for both sandbox and production - the difference is in the API key
- Make sure you're using a sandbox API key if testing, or production API key for live use
- Get the correct API key from Bridge Dashboard: https://dashboard.bridge.xyz
- Make sure there are no extra spaces or characters in your API key
- Verify the API key format matches what's shown in your Bridge dashboard

### KYC/KYB links not working
- Ensure Bridge customer is created first
- Check Bridge dashboard for link status
- Verify redirect URLs are whitelisted in Bridge

### Fees not applying
- Check if fee is active in database
- Verify fee calculation logic in `WalletFee::calculateFee()`
- Check transaction metadata for fee amount

