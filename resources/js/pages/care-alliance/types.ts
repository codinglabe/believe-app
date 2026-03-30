export type CareAllianceAlliance = {
  id: number
  slug: string
  name: string
  description: string | null
  city: string | null
  state: string | null
  website: string | null
  ein: string | null
  management_fee_bps: number | null
  fund_model: string
  status: string
  balance_cents: number
  categories: { id: number; name: string }[]
}

export type CareAllianceMembershipRow = {
  id: number
  status: string
  invited_at: string | null
  responded_at: string | null
  organization: { id: number; name: string; ein: string | null } | null
}

export type CareAllianceInvitationRow = {
  id: number
  status: string
  email: string | null
  organization: { id: number; name: string; ein: string | null } | null
}

export type CareAllianceJoinRequestRow = {
  id: number
  message: string | null
  created_at: string | null
  organization: { id: number; name: string; ein: string | null } | null
  requested_by: { name: string | null; email: string | null } | null
}

export type CareAllianceCampaignSplitRow = {
  is_alliance_fee: boolean
  percent_bps: number
  organization: { id: number; name: string; ein: string | null } | null
}

export type CareAllianceCampaignRow = {
  id: number
  slug: string
  name: string
  description: string | null
  status: string
  alliance_fee_bps_override: number | null
  donations_count: number
  public_donate_url: string
  primary_action_categories?: Array<{ id: number; name: string }>
  splits?: CareAllianceCampaignSplitRow[]
}

export type PrimaryActionCategoryOption = { id: number; name: string }

export type OrganizationSearchHit = {
  id: number
  name: string
  ein: string | null
  email: string | null
}

/** Care Alliance workspace Members page URL `tab` (each tab loads its own payload). */
export type CareAllianceMembersTab = "invite" | "requests" | "invitations" | "memberships"

/** Campaigns workspace URL `tab` (list tab loads campaign rows from the server). */
export type CareAllianceCampaignsTab = "create" | "list"

export type CareAllianceWorkspaceProps = {
  alliance: CareAllianceAlliance
  memberships: CareAllianceMembershipRow[]
  invitations: CareAllianceInvitationRow[]
  joinRequests: CareAllianceJoinRequestRow[]
  campaigns: CareAllianceCampaignRow[]
  primaryActionCategories: PrimaryActionCategoryOption[]
  /** Campaigns workspace: URL `tab`; list tab loads full `campaigns` from the server. */
  campaignsTab?: CareAllianceCampaignsTab
  /** Total campaigns for this alliance (for badges; cheap count even when `tab=create`). */
  campaignsCount?: number
  /** Members workspace only; drives which tab data the server returns. */
  activeTab?: CareAllianceMembersTab
  /** URL `q` param (invite tab org search); drives `organizationSearchResults`. */
  membersSearchQuery?: string
  organizationSearchResults?: OrganizationSearchHit[]
  /** Pending org join requests (always loaded for tab badge). */
  pendingJoinRequestsCount?: number
}
