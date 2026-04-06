import React, { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { XCircle, AlertTriangle, ArrowLeft, RefreshCw, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import FrontendLayout from '@/layouts/frontend/frontend-layout';

interface CancelPageProps {
    auth: {
        user: {
            name: string;
            email: string;
        };
    };
}

export default function RaffleCancelPage({ auth }: CancelPageProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [showShake, setShowShake] = useState(false);

    useEffect(() => {
        // Trigger animations on mount
        setIsVisible(true);
        
        // Trigger shake animation after a short delay
        const shakeTimer = setTimeout(() => setShowShake(true), 500);
        return () => clearTimeout(shakeTimer);
    }, []);

    return (
        <FrontendLayout>
            <Head title="Payment Cancelled" />
            
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    {/* Cancel Header */}
                    <div className={`text-center mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <div className={`inline-flex items-center justify-center w-24 h-24 bg-red-100 dark:bg-red-900 rounded-full mb-6 ${showShake ? 'animate-bounce' : ''}`}>
                            <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            😔 Payment Cancelled
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                            Your raffle ticket purchase was cancelled
                        </p>
                        
                        {/* Warning Badge */}
                        <Badge className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-lg px-6 py-3 mb-8">
                            <AlertTriangle className="w-5 h-5 mr-2" />
                            Payment Cancelled
                        </Badge>
                    </div>

                    {/* Information Card */}
                    <Card className={`mb-8 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}>
                        <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
                            <CardTitle className="flex items-center text-2xl">
                                <AlertTriangle className="w-6 h-6 mr-3" />
                                What Happened?
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <p className="text-gray-700 dark:text-gray-300 text-lg">
                                    Your payment was cancelled before completion. This could happen for several reasons:
                                </p>
                                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                                    <li>You clicked the "Cancel" button during checkout</li>
                                    <li>There was an issue with your payment method</li>
                                    <li>You closed the browser window during payment</li>
                                    <li>There was a technical issue with the payment processor</li>
                                </ul>
                                <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mt-6">
                                    <p className="text-blue-800 dark:text-blue-200 font-semibold">
                                        💡 Don't worry! No charges were made to your account.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Next Steps */}
                    <Card className={`mb-8 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}>
                        <CardHeader>
                            <CardTitle className="text-2xl text-gray-900 dark:text-white">What's Next?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4 mx-auto">
                                        <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        Try Again
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                                        You can attempt to purchase the raffle tickets again
                                    </p>
                                </div>
                                
                                <div className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4 mx-auto">
                                        <Ticket className="w-8 h-8 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        Browse Raffles
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                                        Explore other exciting raffles available
                                    </p>
                                </div>
                                
                                <div className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4 mx-auto">
                                        <ArrowLeft className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        Go Back
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                                        Return to the previous page or dashboard
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Help Section */}
                    <Card className={`mb-8 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}>
                        <CardHeader>
                            <CardTitle className="text-2xl text-gray-900 dark:text-white">Need Help?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 rounded-lg p-6">
                                <p className="text-gray-700 dark:text-gray-300 mb-4">
                                    If you're experiencing issues with payments, here are some things to try:
                                </p>
                                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                                    <li>Check that your payment method is valid and has sufficient funds</li>
                                    <li>Try using a different payment method</li>
                                    <li>Clear your browser cache and cookies</li>
                                    <li>Disable any ad blockers or browser extensions temporarily</li>
                                    <li>Contact support if the problem persists</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className={`text-center transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button 
                                onClick={() => window.history.back()}
                                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 text-lg"
                            >
                                <ArrowLeft className="w-5 h-5 mr-2" />
                                Try Again
                            </Button>
                            <Link href="/frontend/raffles">
                                <Button variant="outline" className="px-8 py-3 text-lg border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <Ticket className="w-5 h-5 mr-2" />
                                    Browse Raffles
                                </Button>
                            </Link>
                            <Link href="/dashboard">
                                <Button variant="outline" className="px-8 py-3 text-lg border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    Go to Dashboard
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </FrontendLayout>
    );
}
