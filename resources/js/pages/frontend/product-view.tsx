import { Head, Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import FrontendLayout from "@/layouts/frontend/frontend-layout";
import axios from 'axios';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import { Star, ShoppingCart, Heart, Share2, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface PrintifyVariant {
  id: number;
  sku: string;
  name: string;
  cost: number;
  price: number;
  is_available: boolean;
  grams: number;
  attributes: Record<string, string>;
  images: Array<{
    src: string;
    position: string;
    is_default: boolean;
  }>;
  primary_image: string | null;
}

interface Product {
  id: number;
  name: string;
  description: string;
  unit_price: number;
  image: string;
  quantity_available: number;
  organization: {
    id: number;
    name: string;
  };
  printify_product_id?: string;
  printify_blueprint_id?: number;
  printify_provider_id?: number;
}

interface PrintifyProduct {
  id: string;
  title: string;
  description: string;
  tags: string[];
  options: Array<{
    name: string;
    type: string;
    values: Array<{
      id: number;
      title: string;
    }>;
  }>;
  variants: PrintifyVariant[];
  images: Array<{
    src: string;
    variant_ids: number[];
    position: string;
    is_default: boolean;
  }>;
}

interface ProductViewProps {
  product: Product;
  printifyProduct?: PrintifyProduct;
  variants: PrintifyVariant[];
  firstVariant?: PrintifyVariant;
  relatedProducts: Product[];
}

interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  printify_variant_id: string;
    variant_options: Record<string, string>;
    variant_image?: string;
}

interface CartData {
  items: CartItem[];
  subtotal: number;
  item_count: number;
}

export default function ProductView({
  product,
  printifyProduct,
  variants,
  firstVariant,
  relatedProducts
}: ProductViewProps) {
  const [selectedVariant, setSelectedVariant] = useState<PrintifyVariant | null>(firstVariant || null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [allProductImages, setAllProductImages] = useState<string[]>([]);
  const [quantityError, setQuantityError] = useState<string>('');
  const [cartData, setCartData] = useState<CartData | null>(null);
  const [isCartLoading, setIsCartLoading] = useState(false);

  // Fetch cart data on component mount
  useEffect(() => {
    fetchCartData();
  }, []);

  const fetchCartData = async () => {
    try {
      setIsCartLoading(true);
      const response = await axios.get(route('cart.data'));
        if (response.data) {
          console.log('Cart data fetched:', response.data.cartData);
          setCartData(response.data.cartData);

      }
    } catch (error) {
      console.error('Error fetching cart data:', error);
    } finally {
      setIsCartLoading(false);
    }
  };

     const getVariantPrimaryImage = (variant: PrintifyVariant): string => {
    if (variant.primary_image) {
      return variant.primary_image;
    }

    if (variant.images && variant.images.length > 0) {
      return variant.images[0].src;
    }

    // Fallback to product image
    return product.image;
  };

  // Check if current product variant is in cart
  const isProductInCart = (): boolean => {
    if (!cartData || !selectedVariant) return false;

    return cartData.items?.some(item =>
      item.product_id === product.id &&
      item.printify_variant_id === selectedVariant.id.toString()
    );
  };

  // Get cart item for current product variant
  const getCartItem = (): CartItem | undefined => {
    if (!cartData || !selectedVariant) return undefined;

    return cartData.items?.find(item =>
      item.product_id === product.id &&
      item.printify_variant_id === selectedVariant.id.toString()
    );
  };

  useEffect(() => {
    if (variants.length > 0 && !selectedVariant) {
      setSelectedVariant(variants[0]);
    }

      console.log('Selected variant changed:', selectedVariant);

    // Collect all unique product images from variants
    const allImages = new Set<string>();
    variants.forEach(variant => {
      variant.images.forEach(img => {
        allImages.add(img.src);
      });
    });

    // If no variant images, use product image
    if (allImages.size === 0 && product.image) {
      allImages.add(product.image);
    }

    setAllProductImages(Array.from(allImages));
  }, [variants,selectedVariant, product.image]);

  // Validate quantity whenever it changes
  useEffect(() => {
    validateQuantity(quantity);
  }, [quantity, product.quantity_available]);

  const validateQuantity = (qty: number) => {
    if (qty > product.quantity_available) {
      setQuantityError(`Only ${product.quantity_available} items available`);
    } else {
      setQuantityError('');
    }
  };

  // Get current variant price or fallback to product price
  const currentPrice = selectedVariant
    ? selectedVariant.price
    : product.unit_price;

  // Get current variant cost for display
  const currentCost = selectedVariant
    ? selectedVariant.cost
    : product.unit_price;

  // Get images for selected variant or all product images
  const currentVariantImages = selectedVariant?.images && selectedVariant.images.length > 0
    ? selectedVariant.images.map(img => img.src)
    : allProductImages;

  const handleQuantityChange = (newQuantity: number) => {
    const validQuantity = Math.max(1, newQuantity);
    setQuantity(validQuantity);
  };

  const handleAddToCart = async () => {
    if (!selectedVariant && variants.length > 0) {
      showErrorToast('Please select a variant');
      return;
    }

    if (quantity > product.quantity_available) {
      showErrorToast(`Only ${product.quantity_available} items available`);
      return;
    }

    if (quantityError) {
      showErrorToast(quantityError);
      return;
    }

    setIsLoading(true);
      try {
        const variantImage = selectedVariant ? getVariantPrimaryImage(selectedVariant) : product.image;
      const cartPayload = {
        product_id: product.id,
        quantity: quantity,
        printify_variant_id: selectedVariant?.id?.toString() || '',
        printify_blueprint_id: product.printify_blueprint_id || 0,
        printify_print_provider_id: product.printify_provider_id || 0,
        variant_options: selectedVariant?.attributes || {},
          variant_price_modifier: selectedVariant ? selectedVariant.price - product.unit_price : 0,
        variant_image: variantImage,
      };

      const response = await axios.post(route('cart.add'), cartPayload);

      if (response.data.success) {
        // Refresh cart data after adding
        await fetchCartData();
        showSuccessToast('Product added to cart!');
        setQuantity(1);
      } else {
        showErrorToast(response.data.message);
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        showErrorToast(error.response.data.error);
      } else if (error.response?.data?.message) {
        showErrorToast(error.response.data.message);
      } else {
        showErrorToast('Failed to add product to cart');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCart = () => {
    router.visit(route('cart.index'));
  };

  const handleBuyNow = async () => {
    if (!selectedVariant && variants.length > 0) {
      showErrorToast('Please select a variant');
      return;
    }

    if (quantity > product.quantity_available) {
      showErrorToast(`Only ${product.quantity_available} items available`);
      return;
    }

    if (quantityError) {
      showErrorToast(quantityError);
      return;
    }

    setIsLoading(true);
      try {
        const variantImage = selectedVariant ? getVariantPrimaryImage(selectedVariant) : product.image;
      const cartPayload = {
        product_id: product.id,
        quantity: quantity,
        printify_variant_id: selectedVariant?.id?.toString() || '',
        printify_blueprint_id: product.printify_blueprint_id || 0,
        printify_print_provider_id: product.printify_provider_id || 0,
        variant_options: selectedVariant?.attributes || {},
          variant_price_modifier: selectedVariant ? selectedVariant.price - product.unit_price : 0,
        variant_image: variantImage,
      };

      await axios.post(route('cart.add'), cartPayload);
      window.location.href = route('checkout.show');
    } catch (error: any) {
      if (error.response?.data?.error) {
        showErrorToast(error.response.data.error);
      } else if (error.response?.data?.message) {
        showErrorToast(error.response.data.message);
      } else {
        showErrorToast('Failed to add product to cart');
      }
      setIsLoading(false);
    }
  };

  // Group variants by attributes for selection
  const getVariantsByAttribute = (attribute: string): PrintifyVariant[] => {
    const seen = new Set();
    return variants.filter(v => {
      if (!v.attributes?.[attribute]) return false;
      const key = v.attributes[attribute];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const getAttributeKeys = (): string[] => {
    if (variants.length === 0) return [];
    return Object.keys(variants[0].attributes || {});
  };

  // Navigate through images
  const nextImage = () => {
    setSelectedImageIndex((prev) =>
      prev === currentVariantImages.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) =>
      prev === 0 ? currentVariantImages.length - 1 : prev - 1
    );
  };

  // Check if action buttons should be disabled
  const isActionDisabled = isLoading ||
    product.quantity_available <= 0 ||
    (variants.length > 0 && !selectedVariant) ||
    quantity > product.quantity_available ||
    !!quantityError;

  const cartItem = getCartItem();
  const productInCart = isProductInCart();

    console.log('product in cart:', productInCart);
  return (
    <FrontendLayout>
      <Head title={product.name} />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-8 text-sm">
            <Link href={route('marketplace.index')} className="text-blue-600 dark:text-blue-400 hover:underline">
              Marketplace
            </Link>
            <span className="text-gray-400 dark:text-gray-600">/</span>
            <span className="text-gray-600 dark:text-gray-400">{product.name}</span>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Images Section */}
            <div className="space-y-4">
              {/* Main Image with Navigation */}
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg">
                {currentVariantImages.length > 0 ? (
                  <>
                    <img
                      src={currentVariantImages[selectedImageIndex] || "/placeholder.svg?height=600&width=600"}
                      alt={product.name}
                      className="w-full h-96 sm:h-[500px] object-cover"
                    />

                    {/* Image Navigation Arrows */}
                    {currentVariantImages.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                        >
                          <ChevronLeft size={24} />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                        >
                          <ChevronRight size={24} />
                        </button>
                      </>
                    )}

                    {/* Image Counter */}
                    {currentVariantImages.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                        {selectedImageIndex + 1} / {currentVariantImages.length}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-96 sm:h-[500px] flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                    <span className="text-gray-500 dark:text-gray-400">No image available</span>
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {currentVariantImages.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {currentVariantImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg border-2 transition-all overflow-hidden ${
                        selectedImageIndex === index
                          ? 'border-blue-600 dark:border-blue-400 shadow-lg'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} view ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Variant Thumbnails */}
              {variants.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Available Variants
                  </h4>
                  <div className="flex gap-3 overflow-x-auto">
                    {variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => {
                          setSelectedVariant(variant);
                          setSelectedImageIndex(0);
                        }}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 transition-all ${
                          selectedVariant?.id === variant.id
                            ? 'border-blue-600 dark:border-blue-400 shadow-lg'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                        } ${!variant.is_available ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!variant.is_available}
                        title={variant.is_available ? variant.name : 'Out of stock'}
                      >
                        {variant.primary_image ? (
                          <img
                            src={variant.primary_image}
                            alt={variant.name}
                            className="w-full h-full object-cover rounded-md"
                          />
                        ) : (
                          <span className="flex items-center justify-center h-full text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md">
                            {variant.name.split(' ')[0]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Product Details Section */}
            <div className="space-y-6">
              {/* Header */}
              <div>
                <div className="inline-block text-sm font-medium text-blue-600 dark:text-blue-400 mb-3">
                  {product.organization.name}
                </div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 text-balance">
                  {product.name}
                </h1>
              </div>

              {/* Price */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Price</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                    ${currentPrice.toFixed(2)}
                  </span>
                  {product.quantity_available <= 5 && product.quantity_available > 0 && (
                    <span className="text-sm font-medium text-red-600 dark:text-red-400 ml-auto">
                      Only {product.quantity_available} left!
                    </span>
                  )}
                  {product.quantity_available === 0 && (
                    <span className="text-sm font-medium text-red-600 dark:text-red-400 ml-auto">
                      Out of Stock
                    </span>
                  )}
                </div>
              </div>

              {/* Cart Status Indicator */}
              {productInCart && cartItem && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Check size={20} className="text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-green-800 dark:text-green-400 font-medium">
                        This item is in your cart
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Quantity: {cartItem.quantity} • ${(cartItem.quantity * currentPrice).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Variant Info */}
              {selectedVariant && !productInCart && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-400">
                    <strong>Selected:</strong> {selectedVariant.name}
                  </p>
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">About this product</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Variants Section */}
              {variants.length > 0 && getAttributeKeys().map((attributeKey) => (
                <div key={attributeKey}>
                  <label className="text-sm font-semibold text-gray-900 dark:text-white capitalize mb-3 block">
                    Select {attributeKey}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {getVariantsByAttribute(attributeKey).map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => {
                          setSelectedVariant(variant);
                          setSelectedImageIndex(0);
                        }}
                        disabled={!variant.is_available}
                        className={`p-3 rounded-lg border-2 font-medium transition-all text-sm ${
                          selectedVariant?.id === variant.id
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                            : variant.is_available
                            ? 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        {variant.attributes?.[attributeKey]}
                        {!variant.is_available && (
                          <span className="block text-xs mt-1 text-red-500">Out of Stock</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Quantity Selector */}
              <div>
                <label className="text-sm font-semibold text-gray-900 dark:text-white mb-3 block">Quantity</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleQuantityChange(quantity - 1)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    min="1"
                    max={product.quantity_available}
                    className="w-16 h-10 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= product.quantity_available}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400 ml-auto">
                    {product.quantity_available} available
                  </span>
                </div>

                {/* Quantity Error Message */}
                {quantityError && (
                  <div className="mt-2 text-sm text-red-600 dark:text-red-400 font-medium">
                    {quantityError}
                  </div>
                )}
              </div>

              {/* CTA Buttons */}
               <div className="flex flex-col sm:flex-row gap-4 pt-4">
                {productInCart ? (
                  <>
                    <button
                      onClick={handleViewCart}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <ShoppingCart size={20} />
                      View Cart ({cartItem?.quantity})
                                      </button>
                                      <Link href={route('checkout.show')}  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed">
                    <button
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Loading...
                        </>
                      ) : (
                        'Buy Now'
                      )}
                    </button>
                                      </Link>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleBuyNow}
                      disabled={isActionDisabled}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Loading...
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={20} />
                          Buy Now
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleAddToCart}
                      disabled={isActionDisabled}
                      className="flex-1 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-4 px-6 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add to Cart
                    </button>
                  </>
                )}
              </div>

              {/* Product Tags */}
              {printifyProduct?.tags && printifyProduct.tags.length > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {printifyProduct.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  );
}
