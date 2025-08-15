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
import { PlusCircle, Search, Trash2, Edit } from "lucide-react"
import { motion } from "framer-motion"
import { debounce } from "lodash"
import type { User } from "@/types"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/admin/Pagination"
import AppLayout from "@/layouts/app-layout"
import { TextArea } from "@/components/ui/textarea" // Changed from TextArea to Textarea for consistency

interface Topic {
    id: number
    name: string
    description: string
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

interface TopicsIndexProps {
    topics: LaravelPagination<Topic>
    filters: {
        search?: string
    }
}

export default function TopicsIndex() {
    const { topics, filters } = usePage<TopicsIndexProps>().props
    const { auth } = usePage().props as { auth: { user: User } }

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)

    const {
        data,
        setData,
        post,
        put,
        delete: destroy,
        processing,
        errors,
        reset,
    } = useForm({
        name: "",
        description: "",
        search: filters.search || "",
    })

    // Debounced search handler
    const handleSearch = debounce((value: string) => {
        router.get(route("chat-group-topics.index"), { search: value }, { preserveState: true, replace: true })
    }, 300)

    // Sync form data with filters on initial load or filter change
    useEffect(() => {
        setData("search", filters.search || "")
    }, [filters.search])

    const openCreateModal = () => {
        reset()
        setIsCreateModalOpen(true)
    }

    const closeCreateModal = () => {
        setIsCreateModalOpen(false)
        reset()
    }

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        post(route("chat-group-topics.store"), {
            onSuccess: () => {
                closeCreateModal()
            },
            onError: (err) => {
                console.error("Creation error:", err)
            },
        })
    }

    const openEditModal = (topic: Topic) => {
        setSelectedTopic(topic)
        setData({
            name: topic.name,
            description: topic.description,
        })
        setIsEditModalOpen(true)
    }

    const closeEditModal = () => {
        setIsEditModalOpen(false)
        setSelectedTopic(null)
        reset()
    }

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (selectedTopic) {
            put(route("chat-group-topics.update", selectedTopic.id), {
                onSuccess: () => {
                    closeEditModal()
                },
                onError: (err) => {
                    console.error("Update error:", err)
                },
            })
        }
    }

    const openDeleteModal = (topic: Topic) => {
        setSelectedTopic(topic)
        setIsDeleteModalOpen(true)
    }

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false)
        setSelectedTopic(null)
    }

    const handleDelete = () => {
        if (selectedTopic) {
            destroy(route("chat-group-topics.destroy", selectedTopic.id), {
                onSuccess: () => {
                    closeDeleteModal()
                },
                onError: (err) => {
                    console.error("Deletion error:", err)
                },
            })
        }
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 },
    }

    return (
        <AppLayout>
            <Head title="Manage Topics" />

            <div className="py-12">
                <div className="mx-auto sm:px-6 lg:px-8">
                    <motion.div
                        className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg p-6"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.div
                            className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4"
                            variants={itemVariants}
                        >
                            <div className="flex items-center w-full md:w-auto space-x-2">
                                <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                <Input
                                    type="text"
                                    placeholder="Search topics..."
                                    value={data.search}
                                    onChange={(e) => {
                                        setData("search", e.target.value)
                                        handleSearch(e.target.value)
                                    }}
                                    className="flex-grow bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
                                />
                            </div>
                            <Button onClick={openCreateModal} className="w-full md:w-auto">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add New Topic
                            </Button>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50 dark:bg-gray-700">
                                        <TableHead className="text-gray-700 dark:text-gray-200">ID</TableHead>
                                        <TableHead className="text-gray-700 dark:text-gray-200">Name</TableHead>
                                        <TableHead className="text-gray-700 dark:text-gray-200">Description</TableHead>
                                        <TableHead className="text-gray-700 dark:text-gray-200">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topics.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-4 text-gray-500 dark:text-gray-400">
                                                No topics found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        topics.data.map((topic) => (
                                            <motion.tr
                                                key={topic.id}
                                                variants={itemVariants}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                            >
                                                <TableCell className="text-gray-900 dark:text-gray-100">{topic.id}</TableCell>
                                                <TableCell className="font-medium text-gray-900 dark:text-gray-100">{topic.name}</TableCell>
                                                <TableCell className="text-gray-900 dark:text-gray-100">
                                                    {topic.description ? (
                                                        <span className="line-clamp-1">{topic.description}</span>
                                                    ) : (
                                                        <span className="text-gray-400 dark:text-gray-500">No description</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openEditModal(topic)}
                                                        className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    >
                                                        <Edit className="h-4 w-4 mr-1" /> Edit
                                                    </Button>
                                                    <Button variant="destructive" size="sm" onClick={() => openDeleteModal(topic)}>
                                                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                                                    </Button>
                                                </TableCell>
                                            </motion.tr>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </motion.div>

                        {/* Pagination */}
                        {topics.last_page > 1 && (
                            <motion.div className="mt-6 flex justify-center" variants={itemVariants}>
                                <Pagination>
                                    <PaginationContent>
                                        {topics.links.map((link, index) => (
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

            {/* Create Topic Dialog */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                    <DialogHeader>
                        <DialogTitle>Create New Topic</DialogTitle>
                        <DialogDescription>Enter the details for the new topic.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">
                                Topic Name
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e) => setData("name", e.target.value)}
                                className="mt-1 block w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
                                required
                            />
                            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <Label htmlFor="description" className="text-gray-700 dark:text-gray-300">
                                Description
                            </Label>
                            <TextArea
                                id="description"
                                value={data.description}
                                onChange={(e) => setData("description", e.target.value)}
                                className="mt-1 block w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
                                rows={3}
                            />
                            {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeCreateModal}
                                className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? "Creating..." : "Create Topic"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Topic Dialog */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                    <DialogHeader>
                        <DialogTitle>Edit Topic</DialogTitle>
                        <DialogDescription>Edit the details of the topic.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="edit-name" className="text-gray-700 dark:text-gray-300">
                                Topic Name
                            </Label>
                            <Input
                                id="edit-name"
                                type="text"
                                value={data.name}
                                onChange={(e) => setData("name", e.target.value)}
                                className="mt-1 block w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
                                required
                            />
                            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <Label htmlFor="edit-description" className="text-gray-700 dark:text-gray-300">
                                Description
                            </Label>
                            <TextArea
                                id="edit-description"
                                value={data.description}
                                onChange={(e) => setData("description", e.target.value)}
                                className="mt-1 block w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
                                rows={3}
                            />
                            {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeEditModal}
                                className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the topic "<span className="font-semibold">{selectedTopic?.name}</span>"?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={closeDeleteModal}
                            className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleDelete} disabled={processing}>
                            {processing ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    )
}
