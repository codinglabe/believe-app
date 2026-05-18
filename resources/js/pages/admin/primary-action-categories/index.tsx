"use client"

import React, { useState } from "react"
import { Head, router, useForm } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, LayoutGrid } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

interface CategoryRow {
    id: number
    name: string
    slug: string
    sort_order: number
    is_active: boolean
    created_at: string
}

interface Props {
    categories: CategoryRow[]
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Org Primary Action Categories", href: "/admin/primary-action-categories" },
]

export default function PrimaryActionCategoriesIndex({ categories }: Props) {
    const [addOpen, setAddOpen] = useState(false)
    const [editRow, setEditRow] = useState<CategoryRow | null>(null)
    const [deleteRow, setDeleteRow] = useState<CategoryRow | null>(null)

    const addForm = useForm({
        name: "",
        sort_order: 0,
        is_active: true,
    })

    const editForm = useForm({
        name: "",
        sort_order: 0,
        is_active: true,
    })

    const openEdit = (row: CategoryRow) => {
        setEditRow(row)
        editForm.setData({
            name: row.name,
            sort_order: row.sort_order,
            is_active: row.is_active,
        })
    }

    const submitAdd = (e: React.FormEvent) => {
        e.preventDefault()
        addForm.post("/admin/primary-action-categories", {
            preserveScroll: true,
            onSuccess: () => {
                setAddOpen(false)
                addForm.reset()
            },
        })
    }

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!editRow) return
        editForm.put(`/admin/primary-action-categories/${editRow.id}`, {
            preserveScroll: true,
            onSuccess: () => setEditRow(null),
        })
    }

    const confirmDelete = () => {
        if (!deleteRow) return
        router.delete(`/admin/primary-action-categories/${deleteRow.id}`, {
            preserveScroll: true,
            onFinish: () => setDeleteRow(null),
        })
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Org Primary Action Categories" />

            <div className="space-y-6 p-4 sm:p-6 w-full max-w-none">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <LayoutGrid className="h-7 w-7 text-muted-foreground" />
                            Category Grid (Primary Action)
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Options shown in the organization registration form. Inactive categories are hidden from new
                            registrations.
                        </p>
                    </div>
                    <Button type="button" onClick={() => setAddOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add category
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Categories</CardTitle>
                        <CardDescription>Sort order is ascending (lower first).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {categories.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-8 text-center">No categories yet. Add one above.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Slug</TableHead>
                                        <TableHead className="text-right">Order</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categories.map((c) => (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-medium">{c.name}</TableCell>
                                            <TableCell className="text-muted-foreground font-mono text-sm">{c.slug}</TableCell>
                                            <TableCell className="text-right tabular-nums">{c.sort_order}</TableCell>
                                            <TableCell>
                                                {c.is_active ? (
                                                    <Badge>Active</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Inactive</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(c)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteRow(c)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent>
                    <form onSubmit={submitAdd}>
                        <DialogHeader>
                            <DialogTitle>Add category</DialogTitle>
                            <DialogDescription>This will appear in the nonprofit registration dropdown.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="add-name">Name</Label>
                                <Input
                                    id="add-name"
                                    value={addForm.data.name}
                                    onChange={(e) => addForm.setData("name", e.target.value)}
                                    required
                                />
                                {addForm.errors.name && (
                                    <p className="text-sm text-destructive">{addForm.errors.name}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="add-order">Sort order</Label>
                                <Input
                                    id="add-order"
                                    type="number"
                                    min={0}
                                    value={addForm.data.sort_order}
                                    onChange={(e) => addForm.setData("sort_order", parseInt(e.target.value, 10) || 0)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="add-active"
                                    checked={addForm.data.is_active}
                                    onCheckedChange={(v) => addForm.setData("is_active", v === true)}
                                />
                                <Label htmlFor="add-active">Active</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={addForm.processing}>
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
                <DialogContent>
                    <form onSubmit={submitEdit}>
                        <DialogHeader>
                            <DialogTitle>Edit category</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Name</Label>
                                <Input
                                    id="edit-name"
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData("name", e.target.value)}
                                    required
                                />
                                {editForm.errors.name && (
                                    <p className="text-sm text-destructive">{editForm.errors.name}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-order">Sort order</Label>
                                <Input
                                    id="edit-order"
                                    type="number"
                                    min={0}
                                    value={editForm.data.sort_order}
                                    onChange={(e) => editForm.setData("sort_order", parseInt(e.target.value, 10) || 0)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="edit-active"
                                    checked={editForm.data.is_active}
                                    onCheckedChange={(v) => editForm.setData("is_active", v === true)}
                                />
                                <Label htmlFor="edit-active">Active</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditRow(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editForm.processing}>
                                Update
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete category?</DialogTitle>
                        <DialogDescription>
                            {deleteRow
                                ? `Remove “${deleteRow.name}”. Only allowed if no organization uses it.`
                                : ""}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeleteRow(null)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={confirmDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    )
}
