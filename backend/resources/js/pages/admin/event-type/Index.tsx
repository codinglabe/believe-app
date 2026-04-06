"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Head, router, useForm, usePage } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { PlusCircle, Search, Trash2, Edit } from "lucide-react"
import { motion } from "framer-motion"
import { debounce } from "lodash"
import type { Auth } from "@/types"
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/admin/Pagination"
import AppLayout from "@/layouts/app-layout"

interface EventTypeRow {
    id: number
    name: string
    category: string
    description: string | null
    is_active: boolean
}

interface LaravelPagination<T> {
    data: T[]
    links: { url: string | null; label: string; active: boolean }[]
    current_page: number
    last_page: number
    from: number | null
    to: number | null
    total: number
}

interface EventTypesIndexProps {
    eventTypes: LaravelPagination<EventTypeRow>
    filters: {
        search?: string
    }
    canManageEventTypes?: boolean
}

export default function EventTypesIndex() {
    const { eventTypes, filters, canManageEventTypes = false } = usePage<EventTypesIndexProps>().props
    const { auth } = usePage().props as { auth: Auth }
    const permissions = auth?.permissions ?? []
    const canCreate = canManageEventTypes && permissions.includes("event_type.create")
    const canUpdate = canManageEventTypes && permissions.includes("event_type.update")
    const canDelete = canManageEventTypes && permissions.includes("event_type.delete")

    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [selected, setSelected] = useState<EventTypeRow | null>(null)

    const { data, setData, post, put, delete: destroyFn, processing, errors, reset } = useForm({
        name: "",
        category: "",
        description: "",
        is_active: true as boolean,
        search: filters.search || "",
    })

    const handleSearch = debounce((value: string) => {
        router.get(route("event-types.index"), { search: value }, { preserveState: true, replace: true })
    }, 300)

    useEffect(() => {
        setData("search", filters.search || "")
    }, [filters.search])

    const openCreate = () => {
        reset("name", "category", "description")
        setData("is_active", true)
        setIsCreateOpen(true)
    }

    const openEdit = (row: EventTypeRow) => {
        setSelected(row)
        setData("name", row.name)
        setData("category", row.category)
        setData("description", row.description ?? "")
        setData("is_active", row.is_active)
        setIsEditOpen(true)
    }

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault()
        post(route("event-types.store"), {
            onSuccess: () => {
                setIsCreateOpen(false)
                reset("name", "category", "description")
            },
        })
    }

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!selected) return
        put(route("event-types.update", selected.id), {
            onSuccess: () => {
                setIsEditOpen(false)
                setSelected(null)
            },
        })
    }

    const handleDelete = () => {
        if (!selected) return
        destroyFn(route("event-types.destroy", selected.id), {
            onSuccess: () => {
                setIsDeleteOpen(false)
                setSelected(null)
            },
        })
    }

    const actionCol = canUpdate || canDelete
    const colSpanEmpty = actionCol ? 6 : 5

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
    }
    const itemVariants = { hidden: { y: 16, opacity: 0 }, visible: { y: 0, opacity: 1 } }

    return (
        <AppLayout>
            <Head title="Event types" />

            <div className="py-12">
                <div className="mx-auto sm:px-6 lg:px-8">
                    <motion.div
                        className="border overflow-hidden shadow-sm sm:rounded-lg p-6"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4" variants={itemVariants}>
                            <div className="flex items-center w-full md:w-auto space-x-2">
                                <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                <Input
                                    type="text"
                                    placeholder="Search by name or category..."
                                    value={data.search}
                                    onChange={(e) => {
                                        setData("search", e.target.value)
                                        handleSearch(e.target.value)
                                    }}
                                    className="grow bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
                                />
                            </div>
                            {canCreate && (
                                <Button onClick={openCreate} className="w-full md:w-auto">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add event type
                                </Button>
                            )}
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-gray-700 dark:text-gray-200">ID</TableHead>
                                        <TableHead className="text-gray-700 dark:text-gray-200">Category</TableHead>
                                        <TableHead className="text-gray-700 dark:text-gray-200">Name</TableHead>
                                        <TableHead className="text-gray-700 dark:text-gray-200">Description</TableHead>
                                        <TableHead className="text-gray-700 dark:text-gray-200">Active</TableHead>
                                        {actionCol && (
                                            <TableHead className="text-gray-700 dark:text-gray-200">Actions</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {eventTypes.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={colSpanEmpty}
                                                className="text-center py-4 text-gray-500 dark:text-gray-400"
                                            >
                                                No event types found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        eventTypes.data.map((row) => (
                                            <TableRow key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b">
                                                <TableCell className="text-gray-900 dark:text-gray-100">{row.id}</TableCell>
                                                <TableCell className="text-gray-900 dark:text-gray-100">{row.category}</TableCell>
                                                <TableCell className="font-medium text-gray-900 dark:text-gray-100">{row.name}</TableCell>
                                                <TableCell className="max-w-xs truncate text-gray-600 dark:text-gray-300 text-sm">
                                                    {row.description ?? "—"}
                                                </TableCell>
                                                <TableCell className="text-gray-900 dark:text-gray-100">
                                                    {row.is_active ? "Yes" : "No"}
                                                </TableCell>
                                                {actionCol && (
                                                    <TableCell className="flex flex-wrap gap-2">
                                                        {canUpdate && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openEdit(row)}
                                                                className="bg-white dark:bg-gray-900"
                                                            >
                                                                <Edit className="h-4 w-4 mr-1" /> Edit
                                                            </Button>
                                                        )}
                                                        {canDelete && (
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelected(row)
                                                                    setIsDeleteOpen(true)
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-1" /> Delete
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </motion.div>

                        {eventTypes.last_page > 1 && (
                            <motion.div className="mt-6 flex justify-center" variants={itemVariants}>
                                <Pagination>
                                    <PaginationContent>
                                        {eventTypes.links.map((link, index) => (
                                            <PaginationItem key={index}>
                                                {link.url ? (
                                                    <PaginationLink href={link.url} isActive={link.active} size="icon">
                                                        {link.label.includes("Previous") ? (
                                                            <PaginationPrevious size="icon" />
                                                        ) : link.label.includes("Next") ? (
                                                            <PaginationNext size="icon" />
                                                        ) : (
                                                            link.label
                                                        )}
                                                    </PaginationLink>
                                                ) : (
                                                    <PaginationEllipsis />
                                                )}
                                            </PaginationItem>
                                        ))}
                                    </PaginationContent>
                                </Pagination>
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                    <DialogHeader>
                        <DialogTitle>New event type</DialogTitle>
                        <DialogDescription>Add a catalog entry for courses and events.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <Label htmlFor="cat">Category</Label>
                            <Input
                                id="cat"
                                value={data.category}
                                onChange={(e) => setData("category", e.target.value)}
                                className="mt-1"
                                required
                            />
                            {errors.category && <p className="text-sm text-red-500 mt-1">{errors.category}</p>}
                        </div>
                        <div>
                            <Label htmlFor="nm">Name</Label>
                            <Input
                                id="nm"
                                value={data.name}
                                onChange={(e) => setData("name", e.target.value)}
                                className="mt-1"
                                required
                            />
                            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <Label htmlFor="desc">Description</Label>
                            <Input
                                id="desc"
                                value={data.description}
                                onChange={(e) => setData("description", e.target.value)}
                                className="mt-1"
                            />
                            {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="active"
                                checked={data.is_active}
                                onCheckedChange={(c) => setData("is_active", c === true)}
                            />
                            <Label htmlFor="active">Active</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? "Saving…" : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                    <DialogHeader>
                        <DialogTitle>Edit event type</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div>
                            <Label htmlFor="ecat">Category</Label>
                            <Input
                                id="ecat"
                                value={data.category}
                                onChange={(e) => setData("category", e.target.value)}
                                className="mt-1"
                                required
                            />
                            {errors.category && <p className="text-sm text-red-500 mt-1">{errors.category}</p>}
                        </div>
                        <div>
                            <Label htmlFor="enm">Name</Label>
                            <Input
                                id="enm"
                                value={data.name}
                                onChange={(e) => setData("name", e.target.value)}
                                className="mt-1"
                                required
                            />
                            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <Label htmlFor="edesc">Description</Label>
                            <Input
                                id="edesc"
                                value={data.description}
                                onChange={(e) => setData("description", e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="eactive"
                                checked={data.is_active}
                                onCheckedChange={(c) => setData("is_active", c === true)}
                            />
                            <Label htmlFor="eactive">Active</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? "Saving…" : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800">
                    <DialogHeader>
                        <DialogTitle>Delete event type</DialogTitle>
                        <DialogDescription>
                            Delete &quot;{selected?.name}&quot;? This cannot be undone if unused.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={processing}>
                            {processing ? "Deleting…" : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    )
}
