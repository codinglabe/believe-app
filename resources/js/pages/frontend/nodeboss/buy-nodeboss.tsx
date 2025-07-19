import { useState } from "react"
import { DollarSign, Info, X } from "lucide-react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { type NodeBox, generateUniqueId } from "@/lib/nodebox-data"
import { ShareCertificate } from "@/components/share-certificate"
import { Textarea } from "@/components/frontend/ui/textarea"

const suggestedAmounts = [10, 25, 50, 100, 250]

// Mock NodeBox data for demonstration on a page
const mockNodebox: NodeBox = {
  id: "nodebox-123",
  name: "Community Wi-Fi Project",
  description: "Providing free internet access to underserved communities in rural areas.",
  image: "/placeholder.svg?height=64&width=64",
  category: "Technology",
  targetAmount: 10000,
  currentSoldAmount: 7500,
  status: "open", // or another valid status value
  startDate: "2024-01-01", // use a valid date string
  endDate: "2024-12-31",   // use a valid date string
}

export default function BuySharePage() {
  const nodebox = mockNodebox // Use the mock data for the page
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [donorInfo, setDonorInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [certificateDetails, setCertificateDetails] = useState<any>(null)

  const remainingAmount = nodebox.targetAmount - nodebox.currentSoldAmount

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount)
    setCustomAmount("")
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value)
    setSelectedAmount(null)
  }

  const getCurrentAmount = () => {
    return selectedAmount || Number.parseFloat(customAmount) || 0
  }

  const handlePurchase = async () => {
    const amountToPurchase = getCurrentAmount()
    if (amountToPurchase <= 0 || amountToPurchase > remainingAmount) {
      alert(`Please enter a valid amount up to $${remainingAmount.toFixed(2)}`)
      return
    }

    // Basic validation for required fields
    if (!donorInfo.firstName || !donorInfo.lastName || !donorInfo.email) {
      alert("Please fill in all required donor information fields.")
      return
    }

    setIsProcessing(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const certId = generateUniqueId()
    const purchaseDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    setCertificateDetails({
      certificateId: certId,
      nodeboxName: nodebox.name,
      nodeboxId: nodebox.id,
      amount: amountToPurchase,
      buyerName: `${donorInfo.firstName} ${donorInfo.lastName}`,
      purchaseDate: purchaseDate,
    })

    setIsProcessing(false)
    setIsSuccess(true)

    // In a real app, you might redirect or update global state here
    // For this example, we just show the success screen.
  }

  const getImpactText = (amount: number) => {
    if (amount >= 250) return "Significantly contribute to the project's completion!"
    if (amount >= 100) return "Help us reach our goal faster and make a bigger impact."
    if (amount >= 50) return "Your share brings us closer to funding this vital initiative."
    if (amount >= 25) return "Every share helps us make a difference."
    return "Your contribution, no matter the size, is valuable."
  }

  // Function to reset state and allow re-submission or navigation
  const handleResetForm = () => {
    setIsSuccess(false)
    setSelectedAmount(null)
    setCustomAmount("")
    setDonorInfo({ firstName: "", lastName: "", email: "", message: "" })
    setCertificateDetails(null)
  }

  return (
    <FrontendLayout>
      <main className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="w-full max-w-7xl rounded-lg p-6">
          {isSuccess ? (
            <ShareCertificate {...certificateDetails} />
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-gray-900 dark:text-white text-3xl font-bold flex items-center gap-3 mb-2">
                  <DollarSign className="h-6 w-6 text-green-500" />
                  Buy Share for {nodebox.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-lg">
                  Contribute to this NodeBox and help us reach our funding goal.
                </p>
              </div>
              <div className="space-y-6">
                {/* NodeBox Info */}
                <Card className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={nodebox.image || "/placeholder.svg?height=64&width=64&query=nodebox image"}
                        alt={nodebox.name}
                        width={64}
                        height={64}
                        className="rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{nodebox.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{nodebox.description}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {nodebox.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            ID: {nodebox.id}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-300">Target Amount:</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          ${nodebox.targetAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-300">Currently Sold:</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          ${nodebox.currentSoldAmount.toLocaleString()}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-600 dark:text-gray-300">Remaining to Fund:</p>
                        <p className="font-bold text-lg text-blue-600 dark:text-blue-400">
                          ${remainingAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* Amount Selection */}
                <div>
                  <Label className="text-base font-semibold mb-3 block text-gray-900 dark:text-white">
                    Select Share Amount
                  </Label>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {suggestedAmounts.map((amount) => (
                      <Button
                        key={amount}
                        variant={selectedAmount === amount ? "default" : "outline"}
                        onClick={() => handleAmountSelect(amount)}
                        className="h-12 text-lg"
                        disabled={amount > remainingAmount}
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>
                  {/* <div>
                    <Label htmlFor="custom-amount" className="text-sm text-gray-600 dark:text-gray-300 mb-2 block">
                      Or enter custom amount (max ${remainingAmount.toLocaleString()})
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                      <Input
                        id="custom-amount"
                        type="number"
                        placeholder="0.00"
                        value={customAmount}
                        onChange={(e) => handleCustomAmountChange(e.target.value)}
                        className="pl-10 h-12 text-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        max={remainingAmount}
                      />
                    </div>
                    {getCurrentAmount() > remainingAmount && (
                      <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                        <X className="h-4 w-4" />
                        Amount exceeds remaining funds. Max: ${remainingAmount.toLocaleString()}
                      </p>
                    )}
                  </div> */}
                </div>
                {/* Impact Preview */}
                {getCurrentAmount() > 0 && getCurrentAmount() <= remainingAmount && (
                  <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Your Impact</h4>
                          <p className="text-blue-800 dark:text-blue-200 text-sm">{getImpactText(getCurrentAmount())}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {/* Donor Information */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold text-gray-900 dark:text-white">Your Information</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-gray-900 dark:text-white">
                        First Name *
                      </Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={donorInfo.firstName}
                        onChange={(e) => setDonorInfo({ ...donorInfo, firstName: e.target.value })}
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-gray-900 dark:text-white">
                        Last Name *
                      </Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={donorInfo.lastName}
                        onChange={(e) => setDonorInfo({ ...donorInfo, lastName: e.target.value })}
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="email" className="text-gray-900 dark:text-white">
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={donorInfo.email}
                        onChange={(e) => setDonorInfo({ ...donorInfo, email: e.target.value })}
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        required
                      />
                    </div>
                  </div>
                </div>
                {/* Message */}
                <div>
                  <Label htmlFor="message" className="text-gray-900 dark:text-white">
                    Message (Optional)
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Add a message for the project team..."
                    value={donorInfo.message}
                    onChange={(e) => setDonorInfo({ ...donorInfo, message: e.target.value })}
                    className="min-h-[80px] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                </div>
                <Separator />
                {/* Purchase Summary */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Purchase Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Share Amount:</span>
                      <span className="font-medium text-gray-900 dark:text-white">${getCurrentAmount().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Processing Fee:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${(getCurrentAmount() * 0.029 + 0.3).toFixed(2)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-900 dark:text-white">Total Payment:</span>
                      <span className="text-gray-900 dark:text-white">
                        ${(getCurrentAmount() + getCurrentAmount() * 0.029 + 0.3).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleResetForm} // Changed to reset form for page context
                    className="flex-1 bg-transparent"
                    disabled={isProcessing}
                  >
                    Reset Form
                  </Button>
                  <Button
                    onClick={handlePurchase}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={
                      getCurrentAmount() <= 0 ||
                      getCurrentAmount() > remainingAmount ||
                      !donorInfo.firstName ||
                      !donorInfo.lastName ||
                      !donorInfo.email ||
                      isProcessing
                    }
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      <>
                        <DollarSign className="mr-2 h-4 w-4" />
                        Buy Share (${getCurrentAmount().toFixed(2)})
                      </>
                    )}
                  </Button>
                </div>
                {/* Security Notice */}
                <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                  🔒 Your payment information is secure and encrypted
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </FrontendLayout>
  )
}
