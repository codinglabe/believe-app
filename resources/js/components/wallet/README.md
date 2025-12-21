# Wallet Components

This folder contains modular components extracted from the large `WalletPopup.tsx` file.

## Structure

```
wallet/
├── types.ts              # Shared TypeScript types and interfaces
├── utils.ts              # Utility functions (CSRF token, formatting, etc.)
├── SuccessMessage.tsx    # Success animation overlay component
├── BalanceDisplay.tsx    # Balance display with refresh button
├── SwapView.tsx          # Swap feature view (coming soon)
├── ReceiveMoney.tsx      # Receive money view with QR code
├── AddMoney.tsx          # Add money/deposit view (TODO)
├── SendMoney.tsx          # Send money view (TODO)
├── WalletScreen.tsx       # Main wallet screen (TODO)
├── ConnectWallet.tsx      # Connect wallet view (TODO)
├── CreateWallet.tsx       # Create wallet view (TODO)
├── ActivityList.tsx       # Transaction activity list (TODO)
├── KYCForm.tsx            # KYC verification form (TODO)
├── KYBForm.tsx            # KYB verification form (TODO)
├── ExternalAccounts.tsx   # External accounts management (TODO)
├── TransferFromExternal.tsx # Transfer from external account (TODO)
└── index.ts               # Barrel export file
```

## Usage

Import components from the wallet folder:

```tsx
import { SuccessMessage, BalanceDisplay, ReceiveMoney, SwapView } from '@/components/wallet'
import type { DepositInstructions, Activity } from '@/components/wallet'
```

## ✅ All Components Created!

### Completed Components
1. ✅ **AddMoney.tsx** - Deposit instructions view
2. ✅ **SendMoney.tsx** - Send money with recipient search
3. ✅ **WalletScreen.tsx** - Main wallet view with balance and action buttons
4. ✅ **ActivityList.tsx** - Transaction history list
5. ✅ **ConnectWallet.tsx** - Initial wallet connection view
6. ✅ **CreateWallet.tsx** - Create wallet after KYC approval
7. ✅ **ExternalAccounts.tsx** - External bank accounts management
8. ✅ **TransferFromExternal.tsx** - Transfer from external account
9. ✅ **ReceiveMoney.tsx** - Receive money with QR code
10. ✅ **SwapView.tsx** - Swap feature view
11. ✅ **SuccessMessage.tsx** - Success animation overlay
12. ✅ **BalanceDisplay.tsx** - Balance display component

### Complex Forms (Can Extract Later)
- **KYCForm.tsx** - Individual KYC verification form (~300 lines) - Can remain in WalletPopup.tsx
- **KYBForm.tsx** - Business KYB verification form (~1000+ lines, multi-step) - Can remain in WalletPopup.tsx

## Refactoring Strategy

1. Extract each view/section into its own component
2. Pass necessary props and callbacks from parent
3. Keep shared state in main WalletPopup container
4. Use types from `types.ts` for consistency
5. Use utilities from `utils.ts` for common functions

## Notes

- All components should accept props for their specific data and callbacks
- Use motion from framer-motion for animations
- Follow existing UI patterns and styling
- Keep components focused on single responsibility

