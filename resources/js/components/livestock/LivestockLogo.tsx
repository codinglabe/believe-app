import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"

interface LivestockLogoProps {
    className?: string
    showText?: boolean
    size?: "sm" | "md" | "lg"
    href?: string
}

export default function LivestockLogo({ 
    className = "", 
    showText = true, 
    size = "md",
    href 
}: LivestockLogoProps) {
    const sizeClasses = {
        sm: "h-6 w-6",
        md: "h-8 w-8",
        lg: "h-12 w-12"
    }

    const textSizeClasses = {
        sm: "text-base sm:text-lg",
        md: "text-lg sm:text-xl",
        lg: "text-xl sm:text-2xl lg:text-3xl"
    }

    const logoContent = (
        <motion.div 
            className={`flex items-center gap-2 sm:gap-3 ${className}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
        >
            <motion.div 
                className={`${sizeClasses[size]} flex items-center justify-center relative`}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
                <img 
                    src="/livestock/logo.png" 
                    alt="Bida Livestock Logo" 
                    className={`${sizeClasses[size]} object-contain`}
                />
            </motion.div>
            {showText && (
                <motion.span 
                    className={`${textSizeClasses[size]} font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 bg-clip-text text-transparent tracking-tight`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <span className="hidden sm:inline">Bida </span>Livestock
                </motion.span>
            )}
        </motion.div>
    )

    if (href) {
        return (
            <Link href={href} className="inline-block">
                {logoContent}
            </Link>
        )
    }

    return logoContent
}
