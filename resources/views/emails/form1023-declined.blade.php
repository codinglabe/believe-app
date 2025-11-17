<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Form 1023 Application Status Update</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .email-header {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .email-header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .email-body {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 20px;
        }
        .message {
            font-size: 16px;
            color: #4a4a4a;
            margin-bottom: 25px;
            line-height: 1.8;
        }
        .declined-box {
            background-color: #fee2e2;
            border-left: 4px solid #ef4444;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
        }
        .declined-box h3 {
            margin: 0 0 10px 0;
            color: #991b1b;
            font-size: 18px;
        }
        .declined-box p {
            margin: 0;
            color: #991b1b;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #e5e5e5;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            font-weight: 600;
            color: #666666;
        }
        .info-value {
            color: #1a1a1a;
            text-align: right;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 40px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 30px 0;
            box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(59, 130, 246, 0.4);
        }
        .button-container {
            text-align: center;
            margin: 40px 0;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e5e5;
        }
        .footer p {
            margin: 5px 0;
            color: #666666;
            font-size: 14px;
        }
        .footer a {
            color: #3b82f6;
            text-decoration: none;
        }
        .divider {
            height: 1px;
            background-color: #e5e5e5;
            margin: 30px 0;
        }
        .admin-message {
            background-color: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 20px;
            margin: 25px 0;
            border-radius: 4px;
        }
        .admin-message p {
            margin: 0;
            color: #991b1b;
        }
        .help-box {
            background-color: #f0f9ff;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 25px 0;
            border-radius: 4px;
        }
        .help-box p {
            margin: 0;
            color: #1e40af;
        }
        @media only screen and (max-width: 600px) {
            .email-body {
                padding: 30px 20px;
            }
            .email-header {
                padding: 30px 20px;
            }
            .email-header h1 {
                font-size: 24px;
            }
            .cta-button {
                padding: 14px 30px;
                font-size: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="email-header">
            <h1>📋 Application Status Update</h1>
        </div>

        <!-- Body -->
        <div class="email-body">
            <div class="greeting">
                Dear {{ $organization->name ?? 'Valued Organization' }},
            </div>

            <div class="declined-box">
                <h3>⚠️ Application Declined</h3>
                <p>We regret to inform you that your Form 1023 application has been <strong>declined</strong>.</p>
            </div>

            <div class="message">
                After careful review of your application, we have determined that it does not meet the requirements for approval at this time. We understand this may be disappointing, and we want to help you understand the reasons for this decision.
            </div>

            <div class="highlight-box" style="background-color: #f8f9fa; border-left: 4px solid #ef4444; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 18px;">📋 Application Details</h3>
                <div class="info-row">
                    <span class="info-label">Application Number:</span>
                    <span class="info-value"><strong>{{ $application->application_number }}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Organization Name:</span>
                    <span class="info-value"><strong>{{ $organization->name }}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">EIN:</span>
                    <span class="info-value">{{ $organization->ein }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="info-value" style="color: #ef4444; font-weight: 600;">Declined</span>
                </div>
                @if($application->reviewed_at)
                <div class="info-row">
                    <span class="info-label">Reviewed Date:</span>
                    <span class="info-value">{{ $application->reviewed_at->format('F j, Y') }}</span>
                </div>
                @endif
            </div>

            @if(isset($reviewMessage) && $reviewMessage)
            <div class="admin-message">
                <p><strong>Reason for Decline:</strong></p>
                <p>{{ $reviewMessage }}</p>
            </div>
            @endif

            <div class="help-box">
                <p>
                    <strong>💡 What Can You Do?</strong><br>
                    If you believe there has been an error or if you have additional information that may affect this decision, please contact our support team. We're here to help you understand the requirements and guide you through the process.
                </p>
            </div>

            <div class="button-container">
                <a href="{{ $applicationUrl }}" class="cta-button">
                    View Application Details
                </a>
            </div>

            <div class="divider"></div>

            <div class="message" style="font-size: 14px; color: #666666;">
                <strong>Next Steps:</strong><br>
                • Review the feedback provided above<br>
                • Address any issues or concerns mentioned<br>
                • Contact our support team if you have questions<br>
                • You may be able to submit a new application after addressing the concerns
            </div>

            <div class="message" style="font-size: 14px; color: #666666; margin-top: 20px;">
                <strong>Need Help?</strong><br>
                Our support team is available to assist you. Please don't hesitate to reach out if you need clarification or guidance on how to proceed.
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>{{ config('app.name') }}</strong></p>
            <p>This is an automated notification. Please do not reply to this email.</p>
            <p>
                <a href="{{ config('app.url') }}">Visit our website</a> | 
                <a href="{{ config('app.url') }}/contact">Contact Support</a>
            </p>
            <p style="margin-top: 20px; font-size: 12px; color: #999999;">
                © {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>

