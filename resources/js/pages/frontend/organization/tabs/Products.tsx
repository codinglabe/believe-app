"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { ShoppingCart, Package } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { router } from "@inertiajs/react"
import { route } from "ziggy-js"
import { Head } from "@inertiajs/react"
import OrganizationProfileLayout from "@/components/frontend/organization/OrganizationProfileLayout"

interface Product {
  id: number
  name: string
  description: string
  unit_price: number
  image: string | null
  slug: string
  status: string
  publish_status: string
  categories?: Array<{ id: number; name: string }>
  variants?: Array<any>
}

interface Props {
  organization: any
  auth: any
  products?: {
    data: Product[]
    current_page: number
    last_page: number
    per_page: number
    total: number
  } | Product[]
}

export default function OrganizationProducts({ organization, auth, products }: Props) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  // Handle both paginated and array formats
  const productsList = products?.data || (Array.isArray(products) ? products : [])
  const isEmpty = !productsList || productsList.length === 0

  // Debug: Log products data structure
  if (process.env.NODE_ENV === 'development') {
    console.log('Products data:', products)
    console.log('Products list:', productsList)
  }

  return (
    <FrontendLayout>
      <Head title={`${organization.name} - Products`} />
      <OrganizationProfileLayout organization={organization} auth={auth}>
        {/* Products Grid */}
        <div>
          {isEmpty ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="inline-flex p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
                <Package className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                No Products Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                This organization hasn't published any products yet.
              </p>
            </motion.div>
          ) : (
            <>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {productsList.map((product) => (
                  <motion.div key={product.id} variants={itemVariants}>
                    <Card className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg overflow-hidden bg-white dark:bg-gray-800">
                      <div className="relative overflow-hidden">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.svg'
                            }}
                          />
                        ) : (
                          <div className="w-full h-64 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 flex items-center justify-center">
                            <Package className="h-16 w-16 text-blue-400" />
                          </div>
                        )}
                        <div className="absolute top-4 right-4">
                          <Badge className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                            ${product.unit_price?.toFixed(2) || '0.00'}
                          </Badge>
                        </div>
                      </div>

                      <CardHeader>
                        <CardTitle className="line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {product.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {product.description}
                        </CardDescription>
                      </CardHeader>

                      {product.categories && product.categories.length > 0 && (
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {product.categories.slice(0, 2).map((category) => (
                              <Badge key={category.id} variant="outline" className="text-xs">
                                {category.name}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      )}

                      <CardFooter>
                        <Button
                          className="w-full group/btn"
                          onClick={() => router.visit(route('products.show', product.slug))}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2 group-hover/btn:translate-x-1 transition-transform" />
                          View Details
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              {products && !Array.isArray(products) && products.last_page > 1 && (
                <div className="mt-12 flex justify-center gap-2">
                  {Array.from({ length: products.last_page }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={products.current_page === page ? "default" : "outline"}
                      onClick={() => router.get(route('organizations.products', organization.id), { page })}
                      className="min-w-[40px]"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </OrganizationProfileLayout>
    </FrontendLayout>
  )
}

