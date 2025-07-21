import { useState } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { NodeBoxCard } from "@/components/nodebox-card"
import BuyShareModal from "@/components/buy-share-modal"
import { mockNodeBoxes, type NodeBox } from "@/lib/nodebox-data"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { NodeBoss } from "@/types/nodeboss"

export default function NodeBoxesPage({nodeBosses}: { nodeBosses: NodeBoss[] }) {
  const [nodeboxes, setNodeboxes] = useState<NodeBoss[]>(nodeBosses)
  const [isBuyShareModalOpen, setIsBuyShareModalOpen] = useState(false)
  const [selectedNodeBox, setSelectedNodeBox] = useState<NodeBoss | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")

  const handleBuyShare = (nodebox: NodeBoss) => {
    setSelectedNodeBox(nodebox)
    setIsBuyShareModalOpen(true)
  }

  const handlePurchaseSuccess = (nodeboxId: string, amount: number) => {
    // setNodeboxes((prevNodeboxes) =>
    //   prevNodeboxes.map((nb) =>
    //     nb.id === nodeboxId
    //       ? {
    //         ...nb,
    //         currentSoldAmount: nb.currentSoldAmount + amount,
    //         status: nb.currentSoldAmount + amount >= nb.targetAmount ? "closed" : "open",
    //       }
    //       : nb,
    //   ),
    // )
  }

  // Get unique categories and statuses for filters
  const categories = ["all", ...Array.from(new Set(mockNodeBoxes.map((nb) => nb.category)))]
  const statuses = ["all", "open", "closed"]



  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 text-center">
              Explore NodeBoxes
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 text-center max-w-2xl mx-auto">
              Invest in specific projects by purchasing shares. Each NodeBox has a clear funding goal and direct impact.
            </p>

            {/* Filter and Search */}
            {/* <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search NodeBoxes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                  <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "all" ? "All Statuses" : status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> */}

            {nodeBosses.length === 0 ? (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No NodeBoxes Found</h2>
                <p className="text-gray-600 dark:text-gray-300">Try adjusting your search or filter criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nodeBosses.map((nodeboxs) => (
                  <NodeBoxCard key={nodeboxs.id} nodebox={nodeboxs} onBuyShare={handleBuyShare} />
                ))}
              </div>
            )}
          </motion.div>
        </div>

      </div>
    </FrontendLayout>
  )
}
