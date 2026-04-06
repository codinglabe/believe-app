<?php

return [
    'pay-bills' => [
        ['key' => 'link_provider', 'label' => 'Link Utility Providers', 'description' => 'Connect your utility accounts in one place', 'icon' => 'link'],
        ['key' => 'pay_bill', 'label' => 'Pay Bill', 'description' => 'Launch your provider portal to pay', 'icon' => 'external', 'use_redirect_url' => true],
        ['key' => 'set_reminder', 'label' => 'Set Reminders', 'description' => 'Get reminded to pay on time', 'icon' => 'bell'],
        ['key' => 'confirm_payment', 'label' => 'Payment Confirmation', 'description' => 'Mark payment as complete', 'icon' => 'check'],
        ['key' => 'help', 'label' => 'Help / Assistance Programs', 'description' => 'Find bill assistance and support', 'icon' => 'help'],
    ],
    'healthcare' => [
        ['key' => 'link_provider', 'label' => 'Link Provider / Insurance', 'description' => 'Connect your insurance or provider', 'icon' => 'link'],
        ['key' => 'book_appointment', 'label' => 'Book Appointment', 'description' => 'Schedule a visit', 'icon' => 'calendar'],
        ['key' => 'access_portal', 'label' => 'Access Portal', 'description' => 'Open your health portal', 'icon' => 'external', 'use_redirect_url' => true],
        ['key' => 'telehealth', 'label' => 'Telehealth Entry', 'description' => 'Start a virtual visit', 'icon' => 'video'],
        ['key' => 'help', 'label' => 'Get Help', 'description' => 'Low-cost or free care options', 'icon' => 'help'],
    ],
    'government' => [
        ['key' => 'find_services', 'label' => 'Find Local Services', 'description' => 'Discover services in your area', 'icon' => 'map'],
        ['key' => 'apply', 'label' => 'Apply', 'description' => 'Launch application system', 'icon' => 'external', 'use_redirect_url' => true],
        ['key' => 'upload_docs', 'label' => 'Upload Documents', 'description' => 'Submit required documents', 'icon' => 'upload'],
        ['key' => 'track_case', 'label' => 'Track Case', 'description' => 'Check your case status', 'icon' => 'search'],
        ['key' => 'help', 'label' => 'Get Help Navigating', 'description' => 'Guidance through the process', 'icon' => 'help'],
    ],
    'find-a-job' => [
        ['key' => 'browse', 'label' => 'Browse Opportunities', 'description' => 'Find local job listings', 'icon' => 'search', 'use_redirect_url' => true],
        ['key' => 'apply', 'label' => 'Apply for Job', 'description' => 'Submit your application', 'icon' => 'file'],
        ['key' => 'resources', 'label' => 'Career Resources', 'description' => 'Resume and interview help', 'icon' => 'book'],
        ['key' => 'help', 'label' => 'Get Help', 'description' => 'Job search assistance', 'icon' => 'help'],
    ],
    'financial' => [
        ['key' => 'link_account', 'label' => 'Link Account', 'description' => 'Connect your financial account', 'icon' => 'link'],
        ['key' => 'send_receive', 'label' => 'Send / Receive Money', 'description' => 'Open your financial app', 'icon' => 'external', 'use_redirect_url' => true],
        ['key' => 'alerts', 'label' => 'Notifications / Alerts', 'description' => 'Manage your alerts', 'icon' => 'bell'],
        ['key' => 'assistance', 'label' => 'Get Assistance', 'description' => 'Credit help and financial counseling', 'icon' => 'help'],
    ],
    'community-help' => [
        ['key' => 'find', 'label' => 'Find Support', 'description' => 'Connect with family, seniors, nonprofits', 'icon' => 'users', 'use_redirect_url' => true],
        ['key' => 'volunteer', 'label' => 'Volunteer', 'description' => 'Give back in your community', 'icon' => 'heart'],
        ['key' => 'help', 'label' => 'Get Help', 'description' => 'Find local assistance', 'icon' => 'help'],
    ],
    'housing-assistance' => [
        ['key' => 'find', 'label' => 'Find Housing Help', 'description' => 'Rent, vouchers, homebuyer programs', 'icon' => 'home', 'use_redirect_url' => true],
        ['key' => 'apply', 'label' => 'Apply', 'description' => 'Start an application', 'icon' => 'file'],
        ['key' => 'help', 'label' => 'Get Help', 'description' => 'Housing counseling and support', 'icon' => 'help'],
    ],
    'education' => [
        ['key' => 'training', 'label' => 'Training & Classes', 'description' => 'Find courses and programs', 'icon' => 'graduation-cap', 'use_redirect_url' => true],
        ['key' => 'resources', 'label' => 'Student Resources', 'description' => 'Support for students', 'icon' => 'book'],
        ['key' => 'help', 'label' => 'Get Help', 'description' => 'Education assistance', 'icon' => 'help'],
    ],
    'veteran-services' => [
        ['key' => 'va', 'label' => 'VA Services', 'description' => 'Access VA benefits and services', 'icon' => 'external', 'use_redirect_url' => true],
        ['key' => 'disability', 'label' => 'Disability', 'description' => 'Disability benefits and support', 'icon' => 'file'],
        ['key' => 'jobs', 'label' => 'Veteran Jobs', 'description' => 'Employment for veterans', 'icon' => 'briefcase'],
        ['key' => 'help', 'label' => 'Get Help', 'description' => 'Veteran assistance', 'icon' => 'help'],
    ],
    'food-and-family' => [
        ['key' => 'food', 'label' => 'Food Assistance', 'description' => 'SNAP, food banks, and more', 'icon' => 'utensils', 'use_redirect_url' => true],
        ['key' => 'childcare', 'label' => 'Childcare', 'description' => 'Childcare benefits and options', 'icon' => 'users'],
        ['key' => 'benefits', 'label' => 'Benefits', 'description' => 'Family benefit programs', 'icon' => 'gift'],
        ['key' => 'help', 'label' => 'Get Help', 'description' => 'Food and family support', 'icon' => 'help'],
    ],
    'transportation' => [
        ['key' => 'bus', 'label' => 'Bus & Transit', 'description' => 'Schedules and passes', 'icon' => 'bus', 'use_redirect_url' => true],
        ['key' => 'medical_rides', 'label' => 'Medical Rides', 'description' => 'Rides to appointments', 'icon' => 'car'],
        ['key' => 'help', 'label' => 'Get Help', 'description' => 'Transportation assistance', 'icon' => 'help'],
    ],
    'disaster-and-legal' => [
        ['key' => 'relief', 'label' => 'Disaster Relief', 'description' => 'Relief and claims', 'icon' => 'alert-circle', 'use_redirect_url' => true],
        ['key' => 'claims', 'label' => 'File a Claim', 'description' => 'Submit your claim', 'icon' => 'file'],
        ['key' => 'legal_aid', 'label' => 'Legal Aid', 'description' => 'Free or low-cost legal help', 'icon' => 'scale'],
        ['key' => 'help', 'label' => 'Get Help', 'description' => 'Disaster and legal support', 'icon' => 'help'],
    ],
];
