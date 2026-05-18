import type { CareAllianceMembershipRow } from "../types"

/** Split rows passed in only need `kind` and `organization_id` for org rows. */
export type OrgSplitRowForFilter = { kind: "org" | "fee"; organization_id?: number | "" }

/**
 * Active members available for one org split row: excludes organizations already chosen on other org rows,
 * but always includes this row’s current selection (if any).
 */
export function activeMembersForOrgSplitRow(
  activeMembers: CareAllianceMembershipRow[],
  splitRows: OrgSplitRowForFilter[],
  rowIndex: number,
): CareAllianceMembershipRow[] {
  const takenElsewhere = new Set<number>()
  splitRows.forEach((r, i) => {
    if (i === rowIndex || r.kind !== "org") return
    if (r.organization_id !== "" && r.organization_id !== undefined) {
      takenElsewhere.add(Number(r.organization_id))
    }
  })
  const currentRow = splitRows[rowIndex]
  const currentId =
    currentRow?.kind === "org" && currentRow.organization_id !== "" && currentRow.organization_id !== undefined
      ? Number(currentRow.organization_id)
      : null

  return activeMembers.filter((m) => {
    const oid = m.organization?.id
    if (!oid) return false
    if (currentId !== null && oid === currentId) return true
    return !takenElsewhere.has(oid)
  })
}

/** Match organization dashboard cards (e.g. dashboard.tsx StatCard / bg-card border-border). */
export const dashboardCardClass =
  "border border-border bg-card text-card-foreground shadow-sm [&_.text-muted-foreground]:text-muted-foreground [&_label]:text-foreground"

export const dashboardSurfaceClass =
  "rounded-lg border border-border bg-muted/50 text-foreground"

export const dashboardWellClass =
  "rounded-lg border border-border bg-muted/40 p-3"

export const dashboardInputClass =
  "border-input bg-background text-foreground placeholder:text-muted-foreground"

export const dashboardTextareaClass = dashboardInputClass

export const dashboardSelectTriggerClass =
  "border-input bg-background text-foreground [&>span]:text-foreground data-[placeholder]:text-muted-foreground [&_svg]:text-muted-foreground"

export const dashboardCheckboxClass =
  "border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary"

export const dashboardSelectContentClass =
  "border-border bg-popover text-popover-foreground"

export const dashboardSelectItemClass = "cursor-pointer"

export const dashboardSplitControlWrap =
  "overflow-hidden rounded-md border border-border bg-muted/40"

export const dashboardSplitLabelCell =
  "flex min-h-10 flex-1 items-center rounded-md border border-border bg-muted/40 px-3 text-sm font-medium text-foreground"

export const dashboardSelectTriggerInsetClass =
  "h-10 w-full border-0 bg-transparent text-foreground shadow-none ring-offset-0 focus:ring-2 focus:ring-ring focus:ring-offset-0 [&>span]:line-clamp-1 data-[placeholder]:text-muted-foreground [&_svg]:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"

export const dashboardInputInsetClass =
  "h-10 border-0 bg-transparent text-foreground placeholder:text-muted-foreground shadow-none ring-offset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
