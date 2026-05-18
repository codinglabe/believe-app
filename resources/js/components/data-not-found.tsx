import { NotFoundPage } from "@/components/not-found-page"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Link } from "@inertiajs/react"
interface DataNotFoundProps {
    entityName?: string
    adminLink?: string
    canCreate?: boolean
    createLink?: string
}

export function DataNotFound({
    entityName = "content",
    canCreate = false,
    createLink = "/admin/create",
}: DataNotFoundProps) {
    const customActions = (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {canCreate && (
                <Button asChild className="group">
                    <Link href={createLink}>
                        <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                        Add {entityName}
                    </Link>
                </Button>
            )}
        </div>
    )

    return (
        <NotFoundPage
            type="data"
            title={`No ${entityName} Found`}
            description={`There is no ${entityName} available at the moment. Please check back later or contact an administrator to add some ${entityName}.`}
            showBackButton={true}
            showHomeButton={false}
            showRefreshButton={true}
            customActions={customActions}
        />
    )
}
