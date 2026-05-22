import React from 'react';
import FrontendLayout from '@/layouts/frontend/frontend-layout';
import { PageHead } from '@/components/frontend/PageHead';
import { Link } from '@inertiajs/react';

const SUPPORT_EMAIL = 'wendhi@stuttiegroup.com';

export default function DataDeletion() {
    return (
        <FrontendLayout>
            <PageHead
                title="Data Deletion Instructions"
                description="How to request deletion of your data from Believe In Unity (501c3ers), including Facebook Page connection data."
            />
            <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-gray-900">
                <div className="mx-auto max-w-4xl">
                    <div className="mb-10 text-center">
                        <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white">
                            Data Deletion Instructions
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-300">
                            Believe In Unity (501c3ers) — how to delete your data from our app
                        </p>
                    </div>

                    <div className="space-y-8 rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
                        <section>
                            <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                                If you use our app or connect a Facebook Page, you can request deletion of
                                your personal data at any time. This page explains how to remove data yourself
                                in the app and how to contact us if you need help.
                            </p>
                        </section>

                        <section>
                            <h2 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-white">
                                1. Delete Facebook Page data (in the app)
                            </h2>
                            <p className="mb-4 text-gray-600 dark:text-gray-300">
                                If you connected a Facebook Page, disconnecting removes stored Page tokens,
                                Page names, scheduled posts, and engagement data we hold for that connection.
                            </p>
                            <ol className="list-decimal space-y-3 pl-6 text-gray-600 dark:text-gray-300">
                                <li>
                                    Log in to your organization account at our website.
                                </li>
                                <li>
                                    Go to{' '}
                                    <strong>Facebook Integration</strong> (
                                    <code className="rounded bg-gray-100 px-1 text-sm dark:bg-gray-700">
                                        /facebook/connect
                                    </code>
                                    ).
                                </li>
                                <li>
                                    For each connected Page, click <strong>Disconnect</strong>.
                                </li>
                                <li>
                                    We delete the connection from our database and stop accessing that Page.
                                </li>
                            </ol>
                            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                You can also remove our app&apos;s access in Facebook: Settings → Apps and
                                Websites ΓåÆ remove this app.
                            </p>
                        </section>

                        <section>
                            <h2 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-white">
                                2. Delete your account and other personal data
                            </h2>
                            <p className="mb-4 text-gray-600 dark:text-gray-300">
                                To delete your user account, profile, organization data, or other information
                                we store about you:
                            </p>
                            <ol className="list-decimal space-y-3 pl-6 text-gray-600 dark:text-gray-300">
                                <li>
                                    Email us at{' '}
                                    <a
                                        href={`mailto:${SUPPORT_EMAIL}?subject=Data%20deletion%20request`}
                                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                                    >
                                        {SUPPORT_EMAIL}
                                    </a>{' '}
                                    with the subject line <strong>Data deletion request</strong>.
                                </li>
                                <li>
                                    Include the email address associated with your account and, if applicable,
                                    your organization name.
                                </li>
                                <li>
                                    We will confirm your identity and process the request within{' '}
                                    <strong>30 days</strong> (usually sooner).
                                </li>
                            </ol>
                        </section>

                        <section>
                            <h2 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-white">
                                3. What we delete
                            </h2>
                            <ul className="list-disc space-y-2 pl-6 text-gray-600 dark:text-gray-300">
                                <li>Account profile information (name, email, phone where stored)</li>
                                <li>Facebook Page connection tokens and Page metadata</li>
                                <li>Posts created or scheduled through our app for connected Pages</li>
                                <li>Engagement metrics we cached from Facebook for your Pages</li>
                                <li>Other data linked to your account, unless we must retain it for legal obligations</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-white">
                                4. Contact
                            </h2>
                            <div className="rounded-lg bg-blue-50 p-6 dark:bg-blue-900/20">
                                <p className="text-gray-700 dark:text-gray-300">
                                    Privacy / data deletion requests:{' '}
                                    <a
                                        href={`mailto:${SUPPORT_EMAIL}`}
                                        className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                                    >
                                        {SUPPORT_EMAIL}
                                    </a>
                                </p>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                    We typically respond within 48 hours.
                                </p>
                            </div>
                        </section>

                        <section className="border-t border-gray-200 pt-6 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                See also our{' '}
                                <Link href="/privacy-policy" className="text-blue-600 hover:underline dark:text-blue-400">
                                    Privacy Policy
                                </Link>{' '}
                                for how we collect and use data.
                            </p>
                        </section>
                    </div>

                    <div className="mt-8 text-center">
                        <Link
                            href="/privacy-policy"
                            className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                            Privacy Policy
                        </Link>
                    </div>
                </div>
            </div>
        </FrontendLayout>
    );
}
