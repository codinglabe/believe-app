import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SellerSuspended({ suspension_reason, suspended_at }) {
    return (
        <>
            <Head title="Account Suspended" />
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-red-200 bg-red-50">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <AlertTriangle className="h-16 w-16 text-red-500" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-red-700">
                            Account Suspended
                        </CardTitle>
                        <CardDescription className="text-red-600 mt-2">
                            Your seller account has been suspended by the administrator.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-white p-4 rounded-lg border border-red-200">
                            <p className="text-sm text-gray-700 mb-2">
                                <strong>Suspended on:</strong> {new Date(suspended_at).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-700">
                                <strong>Reason:</strong> {suspension_reason || 'No reason provided.'}
                            </p>
                        </div>

                        <div className="text-sm text-gray-600 space-y-2">
                            <p>• All your services have been hidden from the marketplace</p>
                            <p>• You cannot receive new orders</p>
                            <p>• Existing orders will continue normally</p>
                            <p>• You can contact support if you believe this is an error</p>
                        </div>

                        <div className="pt-4 flex flex-col gap-3">
                            <Button asChild variant="outline">
                                <Link href="/contact">Contact Support</Link>
                            </Button>
                            <Button asChild className="flex items-center justify-center gap-2">
                                <Link href={route('service-hub.index')}>
                                    <ArrowLeft className="h-4 w-4" />
                                    Go Back
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
