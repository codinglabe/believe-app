import { motion } from 'framer-motion'
import { Wallet, RefreshCw, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConnectWalletProps {
    isLoading: boolean
    organizationName?: string
    onConnect: () => void
}

export function ConnectWallet({
    isLoading,
    organizationName,
    onConnect
}: ConnectWalletProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 relative z-10"
        >
            <div className="text-center space-y-4 w-full">
                <div className="mx-auto w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <Wallet className="h-10 w-10 text-white" />
                </div>
                <div>
                    <h3 className="text-xl font-bold mb-2">Connect Your Wallet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        Connect your wallet to Bridge to start managing your funds, making transactions, and accessing all wallet features.
                    </p>
                </div>
                {organizationName && (
                    <div className="p-4 bg-muted rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                            <Building2 className="h-5 w-5 text-primary" />
                            <div className="text-left">
                                <p className="text-xs text-muted-foreground mb-1">Organization</p>
                                <p className="text-sm font-medium">{organizationName}</p>
                            </div>
                        </div>
                    </div>
                )}
                <Button
                    onClick={onConnect}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    size="lg"
                >
                    {isLoading ? (
                        <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Connecting...
                        </>
                    ) : (
                        <>
                            <Wallet className="h-4 w-4 mr-2" />
                            Connect Wallet
                        </>
                    )}
                </Button>
                <p className="text-xs text-muted-foreground">
                    Your organization information will be used to create your Bridge account
                </p>
            </div>
        </motion.div>
    )
}

