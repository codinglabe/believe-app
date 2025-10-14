// resources/js/Pages/PrivacyPolicy.tsx
import React from 'react';
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Head } from '@inertiajs/react';

const PrivacyPolicy = () => {
    return (
        <FrontendLayout>
            <Head title="Privacy Policy - 501c3ers" />
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Privacy Policy
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-300">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                        {/* Introduction */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                Introduction
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                At 501c3ers, we are committed to protecting your privacy and ensuring
                                the security of your personal information. This Privacy Policy explains
                                how we collect, use, store, and protect your data when you use our services.
                            </p>
                        </section>

                        {/* Data Collection */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                What Data We Collect
                            </h2>
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                                    <li>Phone numbers for verification purposes</li>
                                    <li>Email addresses for communication</li>
                                    <li>Name and contact information</li>
                                    <li>Organization details (if applicable)</li>
                                    <li>IP addresses and browser information</li>
                                    <li>Usage data and analytics</li>
                                </ul>
                            </div>
                        </section>

                        {/* Why We Collect Data */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                Why We Collect Your Data
                            </h2>
                            <div className="space-y-4">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mt-1">
                                        <span className="text-blue-600 dark:text-blue-300 text-sm font-bold">1</span>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                            Phone Verification (OTP)
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-300 mt-1">
                                            We collect phone numbers to send One-Time Passwords (OTP) for
                                            account verification and security purposes.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mt-1">
                                        <span className="text-blue-600 dark:text-blue-300 text-sm font-bold">2</span>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                            Service Provision
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-300 mt-1">
                                            To provide and maintain our services, communicate with you,
                                            and improve user experience.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mt-1">
                                        <span className="text-blue-600 dark:text-blue-300 text-sm font-bold">3</span>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                            Security & Compliance
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-300 mt-1">
                                            To protect against fraud, ensure platform security, and
                                            comply with legal obligations.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Data Storage & Protection */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                How We Store and Protect Your Data
                            </h2>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                                    <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                                        🔒 Encryption
                                    </h3>
                                    <p className="text-green-700 dark:text-green-400 text-sm">
                                        All sensitive data is encrypted both in transit (SSL/TLS) and at rest.
                                    </p>
                                </div>

                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                                    <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                                        🛡️ Secure Servers
                                    </h3>
                                    <p className="text-green-700 dark:text-green-400 text-sm">
                                        Data is stored on secure, monitored servers with regular security updates.
                                    </p>
                                </div>

                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                                    <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                                        📊 Access Controls
                                    </h3>
                                    <p className="text-green-700 dark:text-green-400 text-sm">
                                        Strict access controls ensure only authorized personnel can access your data.
                                    </p>
                                </div>

                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                                    <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                                        🔄 Regular Audits
                                    </h3>
                                    <p className="text-green-700 dark:text-green-400 text-sm">
                                        Regular security audits and vulnerability assessments are conducted.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* User Rights */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                Your Rights & Data Control
                            </h2>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                                <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">
                                    Request Data Deletion or Exercise Your Rights
                                </h3>
                                <p className="text-blue-700 dark:text-blue-400 mb-4">
                                    You have the right to:
                                </p>
                                <ul className="list-disc list-inside space-y-2 text-blue-700 dark:text-blue-400">
                                    <li>Request deletion of your personal data</li>
                                    <li>Access the data we hold about you</li>
                                    <li>Correct inaccurate data</li>
                                    <li>Object to data processing</li>
                                    <li>Request data portability</li>
                                </ul>
                                <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded-lg">
                                    <p className="text-gray-600 dark:text-gray-300">
                                        To exercise any of these rights, please contact us at:
                                    </p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white mt-2">
                                        privacy@501c3ers.com
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Contact Information */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                Contact Information
                            </h2>
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                                <div className="space-y-3">
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                            Privacy Team
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-300">
                                            Email: privacy@501c3ers.com
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                            General Support
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-300">
                                            Email: support@501c3ers.com
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                            Response Time
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-300">
                                            We typically respond to privacy-related inquiries within 48 hours.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Consent Notice */}
                        <section className="mt-12 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                                Consent & Agreement
                            </h3>
                            <p className="text-yellow-700 dark:text-yellow-400">
                                By using our services and providing your phone number for verification,
                                you consent to the collection and use of your information as described
                                in this Privacy Policy.
                            </p>
                        </section>
                    </div>

                    {/* Footer Links */}
                    <div className="mt-8 text-center">
                        <div className="flex justify-center space-x-6">
                            <a
                                href="/terms-of-service"
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                            >
                                Terms of Service
                            </a>
                            <a
                                href="/privacy-policy"
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors font-semibold"
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

export default PrivacyPolicy;
