type StripeCheckoutPostResult =
  | { ok: true }
  | { ok: false; message: string }

function csrfToken(): string {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
}

/** POST to a Laravel checkout endpoint and navigate to Stripe Checkout (JSON redirect). */
export async function postStripeCheckoutRedirect(
  url: string,
  body: Record<string, unknown>
): Promise<StripeCheckoutPostResult> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-CSRF-TOKEN': csrfToken(),
      'X-Requested-With': 'XMLHttpRequest',
    },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  })

  const data = (await response.json().catch(() => ({}))) as {
    redirect?: string
    message?: string
    errors?: Record<string, string[]>
  }

  if (!response.ok) {
    const firstFieldError = data.errors ? Object.values(data.errors).flat()[0] : undefined
    return {
      ok: false,
      message: data.message ?? firstFieldError ?? 'Failed to create checkout session. Please try again.',
    }
  }

  if (typeof data.redirect === 'string' && data.redirect !== '') {
    window.location.assign(data.redirect)
    return { ok: true }
  }

  return { ok: false, message: 'Invalid response from server.' }
}
