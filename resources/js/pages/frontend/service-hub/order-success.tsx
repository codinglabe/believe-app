"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { CheckCircle, Sparkles, Package, ArrowRight, Home } from "lucide-react"
import { Link } from "@inertiajs/react"
import { Head } from "@inertiajs/react"

export default function OrderSuccess() {
  return (
    <FrontendLayout>
      <Head title="Order Placed Successfully - Service Hub" />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl w-full"
        >
          <Card className="border-2">
            <CardContent className="pt-12 pb-12 px-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mb-6"
              >
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse" />
                  <CheckCircle className="h-24 w-24 text-green-500 relative z-10 mx-auto" />
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl md:text-4xl font-bold mb-4"
              >
                Order Placed Successfully!
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-muted-foreground mb-8"
              >
                Your order has been confirmed and the seller has been notified. You'll receive updates on your order status.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
                  <Package className="h-4 w-4" />
                  <span>Order #12345</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/service-hub">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      <Sparkles className="mr-2 h-5 w-5" />
                      Browse More Services
                    </Button>
                  </Link>
                  <Link href="/service-hub/my-orders">
                    <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                      View My Orders
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>

                <Link href="/">
                  <Button variant="ghost" className="mt-4">
                    <Home className="mr-2 h-4 w-4" />
                    Back to Home
                  </Button>
                </Link>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </FrontendLayout>
  )
}

