"use client"

import { useMemo, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
    getPlanCustomFieldLucideIcon,
    PLAN_CUSTOM_FIELD_ICON_ENTRIES,
} from "@/lib/plan-custom-field-icons"

type Props = {
    value: string
    onChange: (iconName: string) => void
    disabled?: boolean
}

export function CustomFieldLucideIconPicker({ value, onChange, disabled }: Props) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const SelectedIcon = getPlanCustomFieldLucideIcon(value)

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return PLAN_CUSTOM_FIELD_ICON_ENTRIES
        return PLAN_CUSTOM_FIELD_ICON_ENTRIES.filter((e) => e.name.toLowerCase().includes(q))
    }, [query])

    return (
        <>
            <div className="flex w-full min-w-0 items-stretch gap-2">
                <Label className="sr-only">Icon</Label>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => setOpen(true)}
                    className="h-9 min-w-0 flex-1 justify-start gap-2"
                >
                    <SelectedIcon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate text-left">{value || "Choose icon"}</span>
                </Button>
                {value ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() => onChange("")}
                        className="h-9 shrink-0"
                    >
                        Clear
                    </Button>
                ) : null}
            </div>

            <Dialog
                open={open}
                onOpenChange={(next) => {
                    setOpen(next)
                    if (!next) setQuery("")
                }}
            >
                <DialogContent className="sm:max-w-lg max-h-[min(85vh,640px)] flex flex-col gap-3 p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle>Choose an icon</DialogTitle>
                        <DialogDescription>
                            Pick an icon from the library. You can search by name.
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        placeholder="Search…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoComplete="off"
                    />
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 overflow-y-auto min-h-0 flex-1 pr-1 max-h-[50vh]">
                        {filtered.map(({ name, Icon }) => (
                            <button
                                key={name}
                                type="button"
                                title={name}
                                onClick={() => {
                                    onChange(name)
                                    setOpen(false)
                                    setQuery("")
                                }}
                                className={cn(
                                    "flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors hover:bg-muted",
                                    value === name &&
                                        "border-primary bg-primary/5 ring-2 ring-primary/30",
                                )}
                            >
                                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                                <span className="text-[10px] leading-tight line-clamp-2 break-all text-muted-foreground">
                                    {name}
                                </span>
                            </button>
                        ))}
                    </div>
                    {filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No icons match.</p>
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    )
}
