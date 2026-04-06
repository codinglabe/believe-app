<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Form 1023 Application - Additional Information Required</title>
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
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
        .info-required-box {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
        }
        .info-required-box h3 {
            margin: 0 0 10px 0;
            color: #92400e;
            font-size: 18px;
        }
        .info-required-box p {
            margin: 0;
            color: #92400e;
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
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 40px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 30px 0;
            box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(245, 158, 11, 0.4);
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
            color: #f59e0b;
            text-decoration: none;
        }
        .divider {
            height: 1px;
            background-color: #e5e5e5;
            margin: 30px 0;
        }
        .admin-message {
            background-color: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 20px;
            margin: 25px 0;
            border-radius: 4px;
        }
        .admin-message p {
            margin: 0;
            color: #92400e;
        }
        .action-box {
            background-color: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 25px 0;
            border-radius: 4px;
        }
        .action-box p {
            margin: 0;
            color: #1e40af;
        }
        .urgency-note {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 15px;
            margin: 25px 0;
        }
        .urgency-note p {
            margin: 0;
            color: #92400e;
            font-size: 14px;
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
            <h1>📝 Additional Information Required</h1>
        </div>

        <!-- Body -->
        <div class="email-body">
            <div class="greeting">
                Dear {{ $organization->name ?? 'Valued Organization' }},
            </div>

            <div class="info-required-box">
                <h3>📋 Action Required</h3>
                <p>We need additional information to complete the review of your Form 1023 application.</p>
            </div>

            <div class="message">
                Thank you for submitting your Form 1023 application. Our review team has examined your submission and requires additional information or clarification before we can proceed with the approval process.
            </div>

            <div class="highlight-box" style="background-color: #f8f9fa; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 4px;">
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
                    <span class="info-value" style="color: #f59e0b; font-weight: 600;">Needs More Info</span>
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
                <p><strong>Information Requested:</strong></p>
                <p>{{ $reviewMessage }}</p>
            </div>
            @endif

            <div class="action-box">
                <p>
                    <strong>✅ What You Need to Do:</strong><br>
                    Please review the information requested above and provide the necessary documents or clarifications through your application portal. Once you submit the additional information, our team will continue the review process.
                </p>
            </div>

            <div class="urgency-note">
                <p>
                    <strong>⏰ Important:</strong> Please provide the requested information as soon as possible to avoid delays in processing your application. The review process will resume once we receive the additional information.
                </p>
            </div>

            <div class="button-container">
                <a href="{{ $applicationUrl }}" class="cta-button">
                    Update Application & Submit Information
                </a>
            </div>

            <div class="divider"></div>

            <div class="message" style="font-size: 14px; color: #666666;">
                <strong>Need Help?</strong><br>
                If you have any questions about the information requested or need assistance with your application, please don't hesitate to contact our support team. We're here to help you complete your application successfully.
            </div>

            <div class="message" style="font-size: 14px; color: #666666; margin-top: 20px;">
                <strong>What Happens Next?</strong><br>
                Once you submit the requested information, our review team will continue processing your application. You will receive another notification once the review is complete.
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

