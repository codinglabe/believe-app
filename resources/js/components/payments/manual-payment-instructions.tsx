type ManualPaymentType = "cashapp" | "zelle" | "venmo_manual"

export interface ManualPaymentInstructionsData {
  type?: string
  username?: string | null
  cashtag?: string | null
  qr_image_url?: string | null
  email?: string | null
  phone?: string | null
  wallet_info?: string | null
}

interface ManualPaymentInstructionsProps {
  instructions: ManualPaymentInstructionsData
  paymentMethod?: string
  actionLabel?: string
}

const METHOD_LABELS: Record<ManualPaymentType, string> = {
  cashapp: "Cash App",
  zelle: "Zelle",
  venmo_manual: "Venmo",
}

function resolvePaymentType(
  instructions: ManualPaymentInstructionsData,
  paymentMethod?: string,
): ManualPaymentType {
  const type = instructions.type ?? paymentMethod
  if (type === "zelle" || type === "venmo_manual" || type === "cashapp") {
    return type
  }
  if (instructions.email || instructions.phone) return "zelle"
  if (instructions.username) return "venmo_manual"
  return "cashapp"
}

function isCashAppOrQrSpecific(text: string): boolean {
  return /qr\s*code|cash\s*app|scan the qr/i.test(text)
}

function shouldShowWalletInfo(type: ManualPaymentType, walletInfo?: string | null): boolean {
  const trimmed = walletInfo?.trim()
  if (!trimmed) return false
  if (type === "cashapp") return true
  return !isCashAppOrQrSpecific(trimmed)
}

export function ManualPaymentInstructions({
  instructions,
  paymentMethod,
  actionLabel = "donation",
}: ManualPaymentInstructionsProps) {
  const type = resolvePaymentType(instructions, paymentMethod)
  const methodLabel = METHOD_LABELS[type]
  const showWalletInfo = shouldShowWalletInfo(type, instructions.wallet_info)

  return (
    <div className="rounded-xl bg-purple-50/80 dark:bg-purple-900/30 p-4 mb-6 space-y-3">
      <h2 className="font-semibold text-purple-900 dark:text-purple-100">Payment Instructions</h2>

      <p className="text-sm text-gray-700 dark:text-white/80">
        Send your {actionLabel} via {methodLabel} using the details below:
      </p>

      {type === "zelle" && (
        <>
          {instructions.email && (
            <p className="text-sm">
              Zelle email: <strong>{instructions.email}</strong>
            </p>
          )}
          {instructions.phone && (
            <p className="text-sm">
              Zelle phone: <strong>{instructions.phone}</strong>
            </p>
          )}
        </>
      )}

      {type === "venmo_manual" && instructions.username && (
        <p className="text-sm">
          Venmo username: <strong>{instructions.username}</strong>
        </p>
      )}

      {type === "cashapp" && instructions.cashtag && (
        <p className="text-sm">
          Cash App cashtag: <strong>{instructions.cashtag}</strong>
        </p>
      )}

      {type === "cashapp" && instructions.qr_image_url && (
        <>
          <img
            src={instructions.qr_image_url}
            alt={`${methodLabel} QR code`}
            className="max-w-[200px] mx-auto rounded-lg"
          />
          <p className="text-sm text-gray-700 dark:text-white/80">
            Please scan the QR code for {methodLabel} to make your {actionLabel}.
          </p>
        </>
      )}

      {showWalletInfo && (
        <p className="text-sm text-gray-700 dark:text-white/80 whitespace-pre-wrap">
          {instructions.wallet_info}
        </p>
      )}
    </div>
  )
}
