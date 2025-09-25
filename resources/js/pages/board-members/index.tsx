"use client"

import type React from "react"
import { useState } from "react"
import { useForm, router, usePage } from "@inertiajs/react"
import type { PageProps, Organization, BoardMember as BoardMemberType, User } from "@/types"
import AppLayout from "@/layouts/app-layout"
import { Users, Plus, UserCheck, UserX, Calendar, Mail, Briefcase, Shield, Crown } from "lucide-react"

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

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8" />
              <h1 className="text-3xl font-bold text-balance">Board of Directors</h1>
            </div>
            <p className="text-primary-foreground/80 text-lg">{organization.name}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-white/20 px-2 py-1 rounded text-sm">
                Your role: {auth.user.organization_role}
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Members</p>
                  <p className="text-3xl font-bold text-card-foreground">{boardMembers.length}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Active Members</p>
                  <p className="text-3xl font-bold text-card-foreground">{activeMembers.length}</p>
                </div>
                <UserCheck className="h-8 w-8 text-secondary" />
              </div>
            </div>
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Inactive Members</p>
                  <p className="text-3xl font-bold text-card-foreground">{inactiveMembers.length}</p>
                </div>
                <UserX className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Admins</p>
                  <p className="text-3xl font-bold text-card-foreground">
                    {boardMembers.filter(m => m.user.organization_role === 'admin').length}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-card-foreground">Board Members</h2>
                  <p className="text-muted-foreground text-sm mt-1">Manage your organization's board members</p>
                </div>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add Member
                  </button>
              </div>
            </div>

            {showAddForm && (
              <div className="p-6 bg-muted border-b border-border">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2.5 text-muted-foreground hover:text-card-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={processing}
                      className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing ? "Adding..." : "Add Member"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="p-6">
              {/* Mobile view - Cards */}
              <div className="block md:hidden space-y-4">
                {boardMembers.map((member) => (
                  <div key={member.id} className="bg-popover border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-popover-foreground">{member.user.name}</h3>
                          {getRoleIcon(member.user.organization_role)}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Mail className="h-3 w-3" />
                          {member.user.email}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
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
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {member.position}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(member.appointed_on).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      {canEdit(member) && (
                        <button
                          onClick={() => updateStatus(member, !member.is_active)}
                          className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors duration-200 ${
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
                          className="px-3 py-2 text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors duration-200"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop view - Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">Member</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">Position</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">Appointed</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boardMembers.map((member) => (
                      <tr
                        key={member.id}
                        className="border-b border-border hover:bg-muted/30 transition-colors duration-200"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium text-card-foreground">{member.user.name}</div>
                              <div className="text-sm text-muted-foreground">{member.user.email}</div>
                            </div>
                            {getRoleIcon(member.user.organization_role)}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${getRoleColor(member.user.organization_role)}`}>
                            {member.user.organization_role}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-card-foreground">{member.position}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
                              member.is_active ? "bg-green-700 text-white" : "bg-red-700 text-white"
                            }`}
                          >
                            {member.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">
                          {new Date(member.appointed_on).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {canEdit(member) && (
                              <button
                                onClick={() => updateStatus(member, !member.is_active)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 ${
                                  member.is_active
                                    ? "bg-red-700 text-white hover:bg-red-900"
                                    : "bg-green-700 text-white hover:bg-green-900"
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
                                className="px-3 py-1.5 text-xs font-medium bg-red-700 text-white hover:bg-red-900 rounded-lg transition-colors duration-200"
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
