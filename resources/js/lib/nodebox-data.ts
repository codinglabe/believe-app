// lib/nodebox-data.ts
export interface NodeBox {
  id: string
  name: string
  description: string
  targetAmount: number
  currentSoldAmount: number
  status: "open" | "closed"
  image: string
  category: string
  startDate: string
  endDate: string
}

export const mockNodeBoxes: NodeBox[] = [
  {
    id: "NB-00001",
    name: "Clean Water Well Project - Phase 1",
    description: "Fund the construction of a new water well in rural Kenya, providing clean water to 500 families.",
    targetAmount: 2000,
    currentSoldAmount: 1980, // Example: almost full
    status: "open",
    image: "/placeholder.svg?height=200&width=300",
    category: "Water Access",
    startDate: "2024-06-01",
    endDate: "2024-08-31",
  },
  {
    id: "NB-00002",
    name: "School Supplies for Underprivileged Children",
    description: "Provide essential school supplies and textbooks for 200 children in underserved communities.",
    targetAmount: 1500,
    currentSoldAmount: 750,
    status: "open",
    image: "/placeholder.svg?height=200&width=300",
    category: "Education",
    startDate: "2024-07-01",
    endDate: "2024-09-30",
  },
]

export function generateUniqueId(prefix = "CERT-"): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = prefix
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}
