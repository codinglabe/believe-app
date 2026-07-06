export const ENROLLMENT_BILLING_CYCLES = ["one_time", "monthly"] as const

export type EnrollmentBillingCycle = (typeof ENROLLMENT_BILLING_CYCLES)[number]

export function enrollmentBillingCycleLabel(cycle: string): string {
  return cycle === "monthly" ? "Monthly" : "One-time"
}

export function enrollmentBillingCycleSuffix(cycle: string): string {
  return cycle === "monthly" ? "/month" : ""
}

/** Meetups and Companion listings may offer monthly billing when paid. */
export function hostCanChooseEnrollmentBillingCycle(hubType: string): boolean {
  return hubType === "companion" || hubType === "events"
}
