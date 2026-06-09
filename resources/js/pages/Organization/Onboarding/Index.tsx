"use client"

import { useCallback, useRef, useState } from "react"
import { Head, Link, router, useForm, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  Users,
} from "lucide-react"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"

type OnboardingItem = {
  id: string
  label: string
  description: string
  benefit: string
  type: "upload" | "form" | "board_members"
  storage_path: string | null
  route: string
  connected: boolean
  submitted_at?: string | null
  file_name?: string | null
}

type PageProps = {
  items: OnboardingItem[]
  percent: number
  completed: number
  total: number
  authorizedSigner: {
    full_name?: string
    title?: string
    email?: string
    phone?: string
    address?: string
  } | null
  boardMembersHref: string
  storageHref: string
}

function getCsrfToken(): string {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? ""
}

function uploadOnboardingDocument(
  documentType: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append("file", file)
    formData.append("document_type", documentType)

    xhr.open("POST", route("governance.onboarding.upload"))
    xhr.setRequestHeader("X-CSRF-TOKEN", getCsrfToken())
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest")
    xhr.setRequestHeader("Accept", "application/json")

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
      }
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ success: data.success ?? true, message: data.message ?? "Uploaded." })
        } else {
          resolve({ success: false, message: data.message ?? "Upload failed." })
        }
      } catch {
        reject(new Error("Invalid server response"))
      }
    }

    xhr.onerror = () => reject(new Error("Network error"))
    xhr.send(formData)
  })
}

function DocumentUploadCard({
  item,
  onUploaded,
}: {
  item: OnboardingItem
  onUploaded: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true)
      setProgress(0)
      try {
        const result = await uploadOnboardingDocument(item.id, file, setProgress)
        if (result.success) {
          toast.success(result.message)
          onUploaded()
        } else {
          toast.error(result.message)
        }
      } catch {
        toast.error("Upload failed. Please try again.")
      } finally {
        setUploading(false)
        setProgress(0)
      }
    },
    [item.id, onUploaded]
  )

  return (
    <div
      id={item.id}
      className={cn(
        "rounded-xl border p-5 scroll-mt-24 transition-colors",
        item.connected
          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
          : "border-border bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {item.connected ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            <h3 className="font-semibold text-foreground">{item.label}</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
          {item.storage_path && (
            <p className="text-xs text-muted-foreground mt-2 font-mono truncate">
              Governance Storage → {item.storage_path.replace("/Governance/", "")}
            </p>
          )}
          {item.connected && item.file_name && (
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-2">
              Uploaded: {item.file_name}
            </p>
          )}
        </div>
        {!item.connected && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              aria-label={`Upload ${item.label}`}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFile(file)
                e.target.value = ""
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="shrink-0 gap-2"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </>
        )}
      </div>
      {uploading && (
        <div className="mt-4">
          <Progress value={progress} className="h-2" />
        </div>
      )}
    </div>
  )
}

export default function OrganizationOnboardingIndex({
  items,
  percent,
  completed,
  total,
  authorizedSigner,
  boardMembersHref,
  storageHref,
}: PageProps) {
  const { flash } = usePage().props as { flash?: { success?: string; error?: string } }

  const signerForm = useForm({
    full_name: authorizedSigner?.full_name ?? "",
    title: authorizedSigner?.title ?? "",
    email: authorizedSigner?.email ?? "",
    phone: authorizedSigner?.phone ?? "",
    address: authorizedSigner?.address ?? "",
  })

  const refresh = () => {
    router.reload({ only: ["items", "percent", "completed", "total", "authorizedSigner"] })
  }

  const signerItem = items.find((i) => i.id === "authorized_signer")
  const boardItem = items.find((i) => i.id === "board_member_list")
  const uploadItems = items.filter((i) => i.type === "upload")

  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Organization onboarding", href: route("governance.onboarding.index") },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Organization onboarding" />
      <div className="w-full min-h-screen bg-background">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex flex-col gap-6">
        {flash?.success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
            {flash.success}
          </div>
        )}
        {flash?.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
            {flash.error}
          </div>
        )}

        <div className="rounded-2xl border bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-purple-950/30 dark:via-neutral-950 dark:to-blue-950/30 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Required onboarding
          </p>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mt-1">
            Organization compliance checklist
          </h1>
          <p className="text-muted-foreground mt-2">
            Complete all required documents and information. Uploads are filed in your Governance Storage folders in Dropbox when connected.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="text-sm font-medium">
              {completed} of {total} complete ({percent}%)
            </div>
            <div className="flex-1 min-w-[200px]">
              <Progress value={percent} className="h-2.5" />
            </div>
            <Link href={storageHref} className="text-sm text-purple-600 hover:underline dark:text-purple-400">
              View Governance Storage
            </Link>
          </div>
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Required documents</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {uploadItems.map((item) => (
              <DocumentUploadCard key={item.id} item={item} onUploaded={refresh} />
            ))}
          </div>
        </section>

        <section
          id="authorized_signer"
          className={cn(
            "rounded-xl border p-5 scroll-mt-24",
            signerItem?.connected
              ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
              : "border-border bg-card"
          )}
        >
          <div className="flex items-center gap-2 mb-4">
            {signerItem?.connected ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            )}
            <h3 className="font-semibold">Authorized signer information</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Person legally authorized to sign on behalf of your organization.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              signerForm.post(route("governance.onboarding.authorized-signer"), {
                preserveScroll: true,
                onSuccess: () => {
                  toast.success("Authorized signer saved.")
                  refresh()
                },
              })
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div>
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={signerForm.data.full_name}
                onChange={(e) => signerForm.setData("full_name", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={signerForm.data.title}
                onChange={(e) => signerForm.setData("title", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={signerForm.data.email}
                onChange={(e) => signerForm.setData("email", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={signerForm.data.phone}
                onChange={(e) => signerForm.setData("phone", e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address">Address (optional)</Label>
              <Input
                id="address"
                value={signerForm.data.address}
                onChange={(e) => signerForm.setData("address", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={signerForm.processing} className="gap-2">
                {signerForm.processing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save authorized signer
              </Button>
            </div>
          </form>
        </section>

        <section
          id="board_member_list"
          className={cn(
            "rounded-xl border p-5 scroll-mt-24",
            boardItem?.connected
              ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
              : "border-border bg-card"
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                {boardItem?.connected ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Users className="h-5 w-5 text-muted-foreground" />
                )}
                <h3 className="font-semibold">Board member list</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Add at least one active board member. Board records are managed separately and can be reflected in Governance Storage.
              </p>
            </div>
            <Link href={boardMembersHref}>
              <Button variant="outline" className="gap-2 shrink-0">
                Manage board
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
        </div>
      </div>
    </AppLayout>
  )
}
