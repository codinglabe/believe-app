/**
 * Shared Laravel Echo accessor (configured in app.tsx via configureEcho()).
 * Always call echo() — do not cache the instance at module load.
 */
import { echo as echoFn } from "@laravel/echo-react"

export { echoFn as echo }
export default echoFn
