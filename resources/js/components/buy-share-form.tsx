// components/buy-share-form.tsx
"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DollarSign, Loader2 } from "lucide-react"
import type { NodeBox } from "@/lib/nodebox-data"
import { ShareCertificate } from "@/components/share-certificate"
import { generateUniqueId } from "@/lib/nodebox-data"
import { toast } from "./frontend/ui/use-toast"

interface BuyShareFormProps {
  nodebox: NodeBox
  onPurchaseSuccess: (
    nodeboxId: string,
    amount: number,
    certificateId: string,
    buyerName: string,
    purchaseDate: string,
  ) => void
}

export function BuyShareForm({ nodebox, onPurchaseSuccess }: BuyShareFormProps) {
  const [amount, setAmount] = useState<string>("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [purchaseComplete, setPurchaseComplete] = useState(false)
  const [certificateDetails, setCertificateDetails] = useState<{
    certificateId: string
    nodeboxName: string
    nodeboxId: string
    amount: number
    buyerName: string
    purchaseDate: string
  } | null>(null)

  const remainingAmount = nodebox.targetAmount - nodebox.currentSoldAmount
  const parsedAmount = Number.parseFloat(amount)

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!parsedAmount || parsedAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than zero.",
        variant: "destructive",
      })
      return
    }

    if (parsedAmount > remainingAmount) {
      toast({
        title: "Amount Exceeds Remaining",
        description: `You can only purchase up to $${remainingAmount.toLocaleString()} for this NodeBox.`,
        variant: "destructive",
      })
      return
    }

    if (!firstName || !lastName || !email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all your details (First Name, Last Name, Email).",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    try {
      const newCertificateId = generateUniqueId("CERT-")
      const purchaseDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      const buyerFullName = `${firstName} ${lastName}`

      setCertificateDetails({
        certificateId: newCertificateId,
        nodeboxName: nodebox.name,
        nodeboxId: nodebox.id,
        amount: parsedAmount,
        buyerName: buyerFullName,
        purchaseDate: purchaseDate,
      })

      onPurchaseSuccess(nodebox.id, parsedAmount, newCertificateId, buyerFullName, purchaseDate)
      setPurchaseComplete(true)
      toast({
        title: "Purchase Successful!",
        description: `You have successfully purchased $${parsedAmount.toLocaleString()} share in ${nodebox.name}.`,
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Purchase Failed",
        description: "There was an error processing your purchase. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (purchaseComplete && certificateDetails) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
      >
        <ShareCertificate {...certificateDetails} />
        <div className="mt-8 text-center">
          <Button
            onClick={() => (window.location.href = "/nodeboxes")}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Back to NodeBoxes
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
    >
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
        Purchase Share in {nodebox.name}
      </h2>

      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
          <span className="font-semibold">Target Amount:</span> ${nodebox.targetAmount.toLocaleString()}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
          <span className="font-semibold">Already Sold:</span> ${nodebox.currentSoldAmount.toLocaleString()}
        </p>
        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
          <span className="font-semibold">Remaining:</span> ${remainingAmount.toLocaleString()}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="amount" className="text-gray-700 dark:text-gray-200">
            Amount to Purchase ($)
          </Label>
          <div className="relative mt-1">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              id="amount"
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder={`Enter amount (max $${remainingAmount.toLocaleString()})`}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              min="1"
              max={remainingAmount.toString()}
              step="any"
              required
            />
          </div>
          {parsedAmount > remainingAmount && amount !== "" && (
            <p className="text-red-500 text-sm mt-2">
              Amount exceeds remaining. Max: ${remainingAmount.toLocaleString()}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName" className="text-gray-700 dark:text-gray-200">
              First Name
            </Label>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-gray-700 dark:text-gray-200">
              Last Name
            </Label>
            <Input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email" className="text-gray-700 dark:text-gray-200">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors duration-200"
          disabled={
            isProcessing ||
            !parsedAmount ||
            parsedAmount <= 0 ||
            parsedAmount > remainingAmount ||
            !firstName ||
            !lastName ||
            !email
          }
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Complete Purchase"
          )}
        </Button>
      </form>
    </motion.div>
  )
}
