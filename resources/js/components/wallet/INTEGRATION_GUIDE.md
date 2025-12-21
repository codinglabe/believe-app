# WalletPopup Integration Guide

## ✅ All Components Created

All wallet components have been extracted and are ready to use:

### Core Components
- ✅ `types.ts` - All TypeScript types
- ✅ `utils.ts` - Utility functions
- ✅ `SuccessMessage.tsx` - Success overlay
- ✅ `BalanceDisplay.tsx` - Balance display

### View Components
- ✅ `SwapView.tsx` - Swap feature
- ✅ `ReceiveMoney.tsx` - Receive with QR code
- ✅ `AddMoney.tsx` - Deposit instructions
- ✅ `SendMoney.tsx` - Send money
- ✅ `WalletScreen.tsx` - Main wallet view
- ✅ `ActivityList.tsx` - Transaction history
- ✅ `ConnectWallet.tsx` - Initial connection
- ✅ `CreateWallet.tsx` - Create wallet
- ✅ `ExternalAccounts.tsx` - External accounts
- ✅ `TransferFromExternal.tsx` - Transfer from external

### Complex Forms (To Be Extracted)
- ⏳ `KYCForm.tsx` - Individual KYC form (~300 lines)
- ⏳ `KYBForm.tsx` - Business KYB form (~1000+ lines, multi-step)

## 🔄 Integration Steps

### Step 1: Update Imports in WalletPopup.tsx

Add at the top of the file:

```tsx
import {
    SuccessMessage,
    BalanceDisplay,
    SwapView,
    ReceiveMoney,
    AddMoney,
    SendMoney,
    WalletScreen,
    ActivityList,
    ConnectWallet,
    CreateWallet,
    ExternalAccounts,
    TransferFromExternal,
    type ActionView,
    type DepositInstructions,
    type Activity,
    type ExternalAccount,
    type Recipient,
    formatCurrency,
    formatAddress,
    formatDate,
    getCsrfToken
} from '@/components/wallet'
```

### Step 2: Replace Inline JSX with Components

#### Replace Success Overlay:
```tsx
// OLD:
{showSuccess && (
    <motion.div>...</motion.div>
)}

// NEW:
<SuccessMessage
    show={showSuccess}
    successType={successType}
    message={successMessage}
/>
```

#### Replace Balance Display:
```tsx
// OLD:
{(actionView === 'send' || ...) && !showSuccess && (
    <motion.div>...</motion.div>
)}

// NEW:
{(actionView === 'send' || actionView === 'receive' || actionView === 'swap' || actionView === 'addMoney' || actionView === 'transfer_from_external') && !showSuccess && (
    <BalanceDisplay
        balance={walletBalance}
        isLoading={isLoading}
        onRefresh={handleRefresh}
    />
)}
```

#### Replace Send View:
```tsx
// OLD:
{!showSuccess && actionView === 'send' ? (
    <motion.div>...</motion.div>
) : ...}

// NEW:
{!showSuccess && actionView === 'send' ? (
    <SendMoney
        sendAmount={sendAmount}
        walletBalance={walletBalance}
        recipientSearch={recipientSearch}
        searchResults={searchResults}
        selectedRecipient={selectedRecipient}
        sendAddress={sendAddress}
        isLoading={isLoading}
        isLoadingSearch={isLoadingSearch}
        showDropdown={showDropdown}
        searchInputRef={searchInputRef}
        dropdownRef={dropdownRef}
        onAmountChange={setSendAmount}
        onSearchChange={(value) => {
            setRecipientSearch(value)
            setShowDropdown(true)
            if (!value) {
                setSelectedRecipient(null)
                setSendAddress('')
            }
        }}
        onSearchFocus={() => {
            if (searchResults.length > 0) {
                setShowDropdown(true)
            }
        }}
        onSelectRecipient={handleSelectRecipient}
        onSend={handleSend}
    />
) : ...}
```

#### Replace Receive View:
```tsx
// OLD:
{!showSuccess && actionView === 'receive' ? (
    <motion.div>...</motion.div>
) : ...}

// NEW:
{!showSuccess && actionView === 'receive' ? (
    <ReceiveMoney
        isLoading={isLoadingReceiveData}
        qrCodeUrl={qrCodeUrl}
        depositInstructions={receiveDepositInstructions}
        walletAddress={walletAddress}
        copied={copied}
        onCopyAddress={handleCopyReceiveAddress}
    />
) : ...}
```

#### Replace Add Money View:
```tsx
// OLD:
{!showSuccess && actionView === 'addMoney' ? (
    <motion.div>...</motion.div>
) : ...}

// NEW:
{!showSuccess && actionView === 'addMoney' ? (
    <AddMoney
        isLoading={isLoadingDepositInstructions}
        depositInstructions={depositInstructions}
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodChange={setSelectedPaymentMethod}
    />
) : ...}
```

#### Replace Swap View:
```tsx
// OLD:
{!showSuccess && actionView === 'swap' ? (
    <motion.div>...</motion.div>
) : ...}

// NEW:
{!showSuccess && actionView === 'swap' ? (
    <SwapView />
) : ...}
```

#### Replace External Accounts View:
```tsx
// OLD:
{!showSuccess && actionView === 'external_accounts' ? (
    <motion.div>...</motion.div>
) : ...}

// NEW:
{!showSuccess && actionView === 'external_accounts' ? (
    <ExternalAccounts
        externalAccounts={externalAccounts}
        isLoading={isLoadingExternalAccounts}
        onRefresh={fetchExternalAccounts}
        onLinkAccount={handleLinkExternalAccount}
    />
) : ...}
```

#### Replace Transfer From External View:
```tsx
// OLD:
{!showSuccess && actionView === 'transfer_from_external' ? (
    <motion.div>...</motion.div>
) : ...}

// NEW:
{!showSuccess && actionView === 'transfer_from_external' ? (
    <TransferFromExternal
        externalAccounts={externalAccounts}
        selectedExternalAccount={selectedExternalAccount}
        transferAmount={transferAmount}
        isLoading={isLoading}
        onAccountChange={setSelectedExternalAccount}
        onAmountChange={setTransferAmount}
        onTransfer={handleTransferFromExternal}
    />
) : ...}
```

#### Replace Wallet Screen:
```tsx
// OLD:
})() === 'wallet_screen' ? (
    <div className="p-4 space-y-4">...</div>
) : ...}

// NEW:
})() === 'wallet_screen' ? (
    <WalletScreen
        walletBalance={walletBalance}
        walletAddress={walletAddress}
        isLoading={isLoading}
        copied={copied}
        isSandbox={isSandbox}
        onRefresh={handleRefresh}
        onCopyAddress={handleCopyAddress}
        onActionViewChange={setActionView}
    />
) : ...}
```

#### Replace Connect Wallet:
```tsx
// OLD:
})() === 'connect_wallet' ? (
    <motion.div>...</motion.div>
) : ...}

// NEW:
})() === 'connect_wallet' ? (
    <ConnectWallet
        isLoading={isLoading}
        organizationName={organizationName}
        onConnect={handleConnectWallet}
    />
) : ...}
```

#### Replace Create Wallet:
```tsx
// OLD:
})() === 'create_wallet' ? (
    <motion.div>...</motion.div>
) : ...}

// NEW:
})() === 'create_wallet' ? (
    <CreateWallet
        isLoading={isLoading}
        isSandbox={isSandbox}
        verificationType={verificationType}
        onCreateWallet={handleCreateWallet}
    />
) : ...}
```

#### Replace Activity List:
```tsx
// OLD:
{activeTab === 'activity' ? (
    <div>...</div>
) : ...}

// NEW:
{activeTab === 'activity' ? (
    <ActivityList
        activities={activities}
        isLoading={isLoadingActivities}
        hasMore={hasMoreActivities}
        isLoadingMore={isLoadingMore}
        onScroll={handleActivityScroll}
    />
) : ...}
```

### Step 3: Remove Duplicate Code

After replacing all components, remove:
- Duplicate `formatAddress` function (now in utils.ts)
- Duplicate balance display JSX
- Duplicate view JSX sections

### Step 4: Extract KYC/KYB Forms (Optional - Complex)

The KYC and KYB forms are very large (~300-1000 lines each). They can remain in WalletPopup.tsx for now, or be extracted later into:
- `KYCForm.tsx` - Individual KYC form
- `KYBForm.tsx` - Business KYB multi-step form

## 📝 Notes

- All components use shared types from `types.ts`
- All utility functions are in `utils.ts`
- Components maintain existing styling and animations
- Props follow consistent patterns (data + callbacks)
- Loading and error states are handled in components

## ✅ Benefits

1. **Reduced File Size**: WalletPopup.tsx will be much smaller
2. **Better Organization**: Each component has single responsibility
3. **Easier Testing**: Components can be tested independently
4. **Reusability**: Components can be used elsewhere
5. **Maintainability**: Easier to find and fix issues

