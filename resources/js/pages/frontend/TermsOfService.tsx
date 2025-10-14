// resources/js/Pages/TermsOfService.tsx
import React from 'react';
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Head } from '@inertiajs/react';

const TermsOfService = () => {
    return (
        <FrontendLayout>
            <Head title="Terms of Service - 501c3ers" />
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Terms of Service
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-300">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                        {/* Agreement */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                Agreement to Terms
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                By accessing and using 501c3ers services, you accept and agree to be bound
                                by the terms and provision of this agreement.
                            </p>
                        </section>

                        {/* Use of Service */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                Use of Service
                            </h2>
                            <div className="space-y-4 text-gray-600 dark:text-gray-300">
                                <p>
                                    You may use our services only as permitted by these terms and applicable laws.
                                </p>
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                                        You agree not to:
                                    </h3>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>Misuse or abuse our services</li>
                                        <li>Attempt to access areas you're not authorized to</li>
                                        <li>Use the service for any illegal purpose</li>
                                        <li>Interfere with the proper functioning of the service</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* Phone Verification */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                Phone Verification
                            </h2>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                                <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">
                                    OTP Verification Process
                                </h3>
                                <p className="text-blue-700 dark:text-blue-400 mb-4">
                                    By providing your phone number and clicking "Send Verification Code"
                                    or "Verify Phone", you consent to:
                                </p>
                                <ul className="list-disc list-inside space-y-2 text-blue-700 dark:text-blue-400">
                                    <li>Receiving automated SMS messages containing verification codes</li>
                                    <li>The collection and processing of your phone number for verification purposes</li>
                                    <li>Our Privacy Policy regarding data handling and protection</li>
                                </ul>
                                <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded-lg">
                                    <p className="text-gray-600 dark:text-gray-300 font-semibold">
                                        How do end-users consent to providing their phone number for verification?
                                    </p>
                                    <p className="text-gray-900 dark:text-white mt-2">
                                        Users provide explicit consent by clicking the "Send Verification Code"
                                        or "Verify Phone" button on our verification form, acknowledging they
                                        have read and agree to our Privacy Policy and Terms of Service.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Intellectual Property */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                Intellectual Property
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300">
                                The Service and its original content, features, and functionality are and
                                will remain the exclusive property of 501c3ers and its licensors.
                            </p>
                        </section>

                        {/* Termination */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                Termination
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300">
                                We may terminate or suspend your access to our Service immediately,
                                without prior notice or liability, for any reason whatsoever.
                            </p>
                        </section>

                        {/* Changes to Terms */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                Changes to Terms
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300">
                                We reserve the right to modify or replace these Terms at any time.
                                We will provide notice of any changes by posting the new Terms on this page.
                            </p>
                        </section>

                        {/* Contact */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                Contact Us
                            </h2>
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                                <p className="text-gray-600 dark:text-gray-300">
                                    If you have any questions about these Terms, please contact us at:
                                </p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-2">
                                    legal@501c3ers.com
                                </p>
                            </div>
                        </section>
                    </div>

                    {/* Footer Links */}
                    <div className="mt-8 text-center">
                        <div className="flex justify-center space-x-6">
                            <a
                                href="/terms-of-service"
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors font-semibold"
                            >
                                Terms of Service
                            </a>
                            <a
                                href="/privacy-policy"
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                            >
                                Privacy Policy
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </FrontendLayout>
    );
};

export default TermsOfService;
