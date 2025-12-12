"use client"

import type React from "react"
import { useState } from "react"
import { useForm, router, usePage } from "@inertiajs/react"
import type { PageProps, Organization, BoardMember as BoardMemberType, User } from "@/types"
import AppLayout from "@/layouts/app-layout"
import { Users, Plus, UserCheck, UserX, Calendar, Mail, Briefcase, Shield, Crown, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface Props extends PageProps {
  organization: Organization
    boardMembers: BoardMemberType[]
}

export default function Index({ organization, boardMembers }: Props) {
    const [showAddForm, setShowAddForm] = useState(false)

    const auth = usePage().props.auth;

  const { data, setData, post, processing, errors, reset } = useForm({
    name: "",
    email: "",
    position: "",
    role: "" // Default role
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("board-members.store"), {
      onSuccess: () => {
        reset()
        setShowAddForm(false)
      },
    })
  }

  const updateStatus = (member: BoardMemberType, status: boolean) => {
    router.post(route("board-members.status", member.id), {
      is_active: status,
    })
  }

  const canEdit = (member: BoardMemberType) => {
    // Admin can edit everyone except themselves if they are the only admin
    if (auth.user.organization_role === 'admin') {
      const admins = boardMembers.filter(m => m.user.organization_role === 'admin' && m.is_active)
      if (member.user.id === auth.user.id && admins.length === 1) {
        return false // Cannot edit themselves if they are the only admin
      }
      return true
    }

    // Leader can edit members but not admins or other leaders
    if (auth.user.organization_role === 'leader') {
      return member.user.organization_role === 'member'
    }

    return false
  }

  const canDelete = (member: BoardMemberType) => {
    // Cannot delete admin users
    if (member.user.organization_role === 'admin') {
      return false
    }

    // Admin can delete everyone except themselves if they are the only admin
    if (auth.user.organization_role === 'admin') {
      const admins = boardMembers.filter(m => m.user.organization_role === 'admin' && m.is_active)
      if (member.user.id === auth.user.id && admins.length === 1) {
        return false // Cannot delete themselves if they are the only admin
      }
      return true
    }

    // Leader can only delete members
    if (auth.user.organization_role === 'leader') {
      return member.user.organization_role === 'member'
    }

    return false
  }

  const canDeactivate = (member: BoardMemberType) => {
    // Cannot deactivate Organization Administrator (admin) by anyone
    if (member.position === 'Organization Administrator') {
        return false;
    }

    // Cannot deactivate themselves
    if (member.user.id === auth.user.id) {
      return false
    }

    // Use canEdit logic for other cases
    return canEdit(member)
  }

  const activeMembers = boardMembers.filter((member) => member.is_active)
  const inactiveMembers = boardMembers.filter((member) => !member.is_active)

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />
      case 'leader':
        return <Crown className="h-4 w-4 text-yellow-500" />
      default:
        return <Users className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return "bg-blue-100 text-blue-800 border-blue-200"
      case 'leader':
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getVerificationStatusConfig = (status: string) => {
    switch (status) {
      case 'verified':
        return {
          label: 'Verified',
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700",
        }
      case 'unverified':
        return {
          label: 'Unverified',
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          className: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
        }
      case 'not_found':
        return {
          label: 'Not Found',
          icon: <XCircle className="h-3.5 w-3.5" />,
          className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
        }
      default:
        return {
          label: 'Pending',
          icon: <Clock className="h-3.5 w-3.5" />,
          className: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
        }
    }
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-xl">
          <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-10 lg:py-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-3">
                  <div className="p-2 sm:p-2.5 md:p-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                    <Users className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight truncate">Board of Directors</h1>
                    <p className="text-blue-100 text-sm sm:text-base md:text-lg mt-1 font-medium truncate">{organization.name}</p>
                  </div>
            </div>
                <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4">
                  <span className="bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium border border-white/30 shadow-sm inline-flex items-center gap-1.5 sm:gap-2">
                    <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">Your role: <span className="capitalize font-semibold">{auth.user.organization_role}</span></span>
              </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Enhanced Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 lg:mb-10">
            <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-muted-foreground text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1 sm:mb-2 truncate">Total Members</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-card-foreground">{boardMembers.length}</p>
                </div>
                <div className="p-2 sm:p-3 md:p-4 bg-primary/10 rounded-lg sm:rounded-xl flex-shrink-0">
                  <Users className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary" />
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-muted-foreground text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1 sm:mb-2 truncate">Active Members</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-secondary">{activeMembers.length}</p>
                </div>
                <div className="p-2 sm:p-3 md:p-4 bg-secondary/10 rounded-lg sm:rounded-xl flex-shrink-0">
                  <UserCheck className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-secondary" />
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-muted-foreground text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1 sm:mb-2 truncate">Verification Issues</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-yellow-600 dark:text-yellow-400">
                    {boardMembers.filter(m => m.verification_status === 'unverified' || m.verification_status === 'not_found').length}
                  </p>
                </div>
                <div className="p-2 sm:p-3 md:p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg sm:rounded-xl flex-shrink-0">
                  <AlertCircle className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-muted-foreground text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1 sm:mb-2 truncate">Administrators</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-card-foreground">
                    {boardMembers.filter(m => m.user.organization_role === 'admin').length}
                  </p>
                </div>
                <div className="p-2 sm:p-3 md:p-4 bg-primary/10 rounded-lg sm:rounded-xl flex-shrink-0">
                  <Shield className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary" />
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Main Card */}
          <div className="bg-card rounded-xl sm:rounded-2xl border border-border shadow-xl overflow-hidden">
            <div className="p-4 sm:p-5 md:p-6 bg-muted/50 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-card-foreground">Board Members</h2>
                  <p className="text-muted-foreground text-xs sm:text-sm mt-1 hidden sm:block">Manage and verify your organization's board members</p>
                </div>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">Add Member</span>
                  </button>
              </div>
            </div>

            {showAddForm && (
              <div className="p-4 sm:p-6 md:p-8 bg-muted/30 border-b border-border">
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-sm font-medium text-card-foreground">
                        Full Name
                      </label>
                      <input
                        id="name"
                        type="text"
                        value={data.name}
                        onChange={(e) => setData("name", e.target.value)}
                        className="w-full px-3 py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors duration-200"
                        placeholder="Enter full name"
                      />
                      {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-medium text-card-foreground">
                        Email Address
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData("email", e.target.value)}
                        className="w-full px-3 py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors duration-200"
                        placeholder="Enter email address"
                      />
                      {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="position" className="block text-sm font-medium text-card-foreground">
                        Position
                      </label>
                      <select
                        id="position"
                        value={data.position}
                        onChange={(e) => setData("position", e.target.value)}
                        className="w-full px-3 py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors duration-200"
                      >
                        <option value="">Select Position</option>
                        <option value="Chairperson">Chairperson</option>
                        <option value="President">President</option>
                        <option value="Vice President">Vice President</option>
                        <option value="CEO">CEO</option>
                        <option value="Vice Chairperson">Vice Chairperson</option>
                        <option value="Secretary">Secretary</option>
                        <option value="Treasurer">Treasurer</option>
                        <option value="Director">Director</option>
                        <option value="Committee Chair">Committee Chair</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.position && <p className="text-destructive text-sm">{errors.position}</p>}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="role" className="block text-sm font-medium text-card-foreground">
                        Role
                      </label>
                      <select
                        id="role"
                        value={data.role}
                        onChange={(e) => setData("role", e.target.value)}
                        className="w-full px-3 py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors duration-200"
                        disabled={auth.user.organization_role !== 'admin'} // Only admin can set roles
                                          >
                        <option value="">Select Role</option>
                        <option value="leader">Leader</option>
                        {auth.user.organization_role === 'admin' && (
                          <option value="admin">Admin</option>
                        )}
                      </select>
                      {errors.role && <p className="text-destructive text-sm">{errors.role}</p>}
                      {auth.user.organization_role !== 'admin' && (
                        <p className="text-xs text-muted-foreground">Only admins can change roles</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2.5 text-muted-foreground hover:text-card-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors duration-200 w-full sm:w-auto text-sm sm:text-base"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={processing}
                      className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto text-sm sm:text-base"
                    >
                      {processing ? "Adding..." : "Add Member"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="p-3 sm:p-4 md:p-6">
              {/* Enhanced Mobile view - Cards */}
              <div className="block lg:hidden space-y-3 sm:space-y-4">
                {boardMembers.map((member) => (
                  <div key={member.id} className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-3 sm:space-y-4 shadow-md hover:shadow-lg transition-all duration-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-card-foreground truncate text-sm sm:text-base">{member.user.name}</h3>
                          {getRoleIcon(member.user.organization_role)}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs sm:text-sm truncate">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{member.user.email}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 sm:gap-2 flex-shrink-0">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleColor(member.user.organization_role)}`}
                        >
                          {member.user.organization_role}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            member.is_active ? "bg-secondary/10 text-secondary" : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {member.is_active ? "Active" : "Inactive"}
                        </span>
                        {(() => {
                          // Show verification status for all statuses except pending
                          const status = member.verification_status || 'pending'
                          if (status === 'pending') {
                            return null
                          }
                          const verification = getVerificationStatusConfig(status)
                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${verification.className} cursor-help`}
                                >
                                  {verification.icon}
                                  {verification.label}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{member.verification_notes || 'No verification details available'}</p>
                              </TooltipContent>
                            </Tooltip>
                          )
                        })()}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{member.position}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{new Date(member.appointed_on).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      {canDeactivate(member) && (
                        <button
                          onClick={() => updateStatus(member, !member.is_active)}
                          className={`flex-1 sm:flex-none py-2 px-3 text-xs sm:text-sm font-medium rounded-lg transition-colors duration-200 ${
                            member.is_active
                              ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                              : "bg-secondary/10 text-secondary hover:bg-secondary/20"
                          }`}
                        >
                          {member.is_active ? "Deactivate" : "Activate"}
                        </button>
                      )}
                      {canDelete(member) && (
                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to remove this board member?")) {
                              router.delete(route("board-members.destroy", member.id))
                            }
                          }}
                          className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors duration-200"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Enhanced Desktop view - Table */}
              <div className="hidden lg:block overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6">
                <div className="inline-block min-w-full align-middle">
                <table className="w-full">
                  <thead>
                      <tr className="bg-muted/50 border-b-2 border-border">
                        <th className="text-left py-3 sm:py-4 px-3 sm:px-4 md:px-6 font-bold text-muted-foreground text-xs sm:text-sm uppercase tracking-wider">Member</th>
                        <th className="text-left py-3 sm:py-4 px-3 sm:px-4 md:px-6 font-bold text-muted-foreground text-xs sm:text-sm uppercase tracking-wider hidden xl:table-cell">Role</th>
                        <th className="text-left py-3 sm:py-4 px-3 sm:px-4 md:px-6 font-bold text-muted-foreground text-xs sm:text-sm uppercase tracking-wider">Position</th>
                        <th className="text-left py-3 sm:py-4 px-3 sm:px-4 md:px-6 font-bold text-muted-foreground text-xs sm:text-sm uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 sm:py-4 px-3 sm:px-4 md:px-6 font-bold text-muted-foreground text-xs sm:text-sm uppercase tracking-wider hidden xl:table-cell">Verification</th>
                        <th className="text-left py-3 sm:py-4 px-3 sm:px-4 md:px-6 font-bold text-muted-foreground text-xs sm:text-sm uppercase tracking-wider hidden 2xl:table-cell">Appointed</th>
                        <th className="text-right py-3 sm:py-4 px-3 sm:px-4 md:px-6 font-bold text-muted-foreground text-xs sm:text-sm uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                    <tbody className="divide-y divide-border">
                    {boardMembers.map((member) => (
                      <tr
                        key={member.id}
                        className="bg-card hover:bg-muted/30 transition-colors duration-150"
                      >
                        <td className="py-3 sm:py-4 md:py-5 px-3 sm:px-4 md:px-6">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs sm:text-sm">
                                {member.user.name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-card-foreground text-sm sm:text-base truncate">{member.user.name}</div>
                              <div className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">{member.user.email}</div>
                            </div>
                            <div className="xl:hidden">{getRoleIcon(member.user.organization_role)}</div>
                          </div>
                        </td>
                        <td className="py-3 sm:py-4 md:py-5 px-3 sm:px-4 md:px-6 hidden xl:table-cell">
                          <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-lg border-2 ${getRoleColor(member.user.organization_role)} shadow-sm`}>
                            <span className="capitalize">{member.user.organization_role}</span>
                          </span>
                        </td>
                        <td className="py-3 sm:py-4 md:py-5 px-3 sm:px-4 md:px-6">
                          <span className="text-card-foreground font-medium text-sm sm:text-base truncate block">{member.position}</span>
                        </td>
                        <td className="py-3 sm:py-4 md:py-5 px-3 sm:px-4 md:px-6">
                          <span
                            className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-lg shadow-sm ${
                              member.is_active
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"
                            }`}
                          >
                            {member.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 sm:py-4 md:py-5 px-3 sm:px-4 md:px-6 hidden xl:table-cell">
                          {(() => {
                            // Show verification status for all statuses except pending
                            const status = member.verification_status || 'pending'
                            if (status === 'pending') {
                              return <span className="text-muted-foreground text-sm">—</span>
                            }
                            const verification = getVerificationStatusConfig(status)
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 text-xs font-medium rounded-full border ${verification.className} cursor-help`}
                                  >
                                    {verification.icon}
                                    <span className="hidden 2xl:inline">{verification.label}</span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">{member.verification_notes || 'No verification details available'}</p>
                                </TooltipContent>
                              </Tooltip>
                            )
                          })()}
                        </td>
                        <td className="py-3 sm:py-4 md:py-5 px-3 sm:px-4 md:px-6 hidden 2xl:table-cell">
                          <span className="text-muted-foreground font-medium text-sm">
                            {new Date(member.appointed_on).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </td>
                        <td className="py-3 sm:py-4 md:py-5 px-3 sm:px-4 md:px-6">
                          <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-wrap">
                            {canDeactivate(member) && (
                              <button
                                onClick={() => updateStatus(member, !member.is_active)}
                                className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 whitespace-nowrap ${
                                  member.is_active
                                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                                }`}
                              >
                                <span className="hidden lg:inline">{member.is_active ? "Deactivate" : "Activate"}</span>
                                <span className="lg:hidden">{member.is_active ? "Deact" : "Act"}</span>
                              </button>
                            )}
                            {canDelete(member) && (
                              <button
                                onClick={() => {
                                  if (confirm("Are you sure you want to remove this board member?")) {
                                    router.delete(route("board-members.destroy", member.id))
                                  }
                                }}
                                className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 whitespace-nowrap"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>

              {boardMembers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-card-foreground mb-2">No board members yet</h3>
                  <p className="text-muted-foreground mb-6">Get started by adding your first board member.</p>
                  {(auth.user.organization_role === 'admin' || auth.user.organization_role === 'leader') && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 px-4 rounded-lg transition-colors duration-200"
                    >
                      <Plus className="h-4 w-4" />
                      Add First Member
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
