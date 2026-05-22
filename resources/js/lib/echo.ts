/**
 * Shared Laravel Echo instance (configured in app.tsx via configureEcho).
 * Do not create a second `new Echo()` here — private channels need /broadcasting/auth.
 */
import { echo as getEcho } from "@laravel/echo-react"

const echo = getEcho()

export { echo }
export default echo
