import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { DollarSign, CheckCircle, CalendarDays } from "lucide-react"
import type { NodeBox } from "@/lib/nodebox-data"
import { Link } from "@inertiajs/react"

interface NodeBoxCardProps {
  nodebox: NodeBox
  onBuyShare: (nodebox: NodeBox) => void
}

export function NodeBoxCard({ nodebox, onBuyShare }: NodeBoxCardProps) {
  const progress = (nodebox.currentSoldAmount / nodebox.targetAmount) * 100
  const remainingAmount = nodebox.targetAmount - nodebox.currentSoldAmount
  const isClosed = nodebox.status === "closed" || remainingAmount <= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full"
    >
      <Card className="flex flex-col h-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-shadow duration-300">
        <div className="relative w-full overflow-hidden h-48 rounded-t-lg">
          <img
            src={"https://placehold.co/436x196"}
            alt={nodebox.name}
            className=" transition-transform duration-300 hover:scale-105 h-full w-full object-cover"
          />
          <Badge
            className={`absolute top-3 left-3 text-xs px-2 py-1 ${isClosed
              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              }`}
          >
            {isClosed ? "Closed" : "Open"}
          </Badge>
          <Badge className="absolute top-3 right-3 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-1">
            {nodebox.category}
          </Badge>
        </div>
        <CardHeader className="flex-grow pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">{nodebox.name}</CardTitle>
          <CardDescription className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {nodebox.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pb-3">
          <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-200">
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span>Target: ${nodebox.targetAmount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              <span>Sold: ${nodebox.currentSoldAmount.toLocaleString()}</span>
            </div>
          </div>
          <Progress value={progress} className="h-2 bg-gray-200 dark:bg-gray-700" />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium text-gray-900 dark:text-white">${remainingAmount.toLocaleString()}</span>{" "}
            remaining
          </p>
        </CardContent>
        <CardFooter className="pt-4 border-t border-gray-100 dark:border-gray-700">
          {/* <div className="flex items-center justify-between w-full text-xs text-gray-500 dark:text-gray-400 mb-3">
            <div className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              <span>Starts: {nodebox.startDate}</span>
            </div>
            <div className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              <span>Ends: {nodebox.endDate}</span>
            </div>
          </div> */}
          <Link href={route('buy.nodeboss', nodebox?.id)} className="w-full">
            <Button
              onClick={() => onBuyShare(nodebox)}
              disabled={isClosed}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isClosed ? "Fully Funded" : "Buy Share"}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
