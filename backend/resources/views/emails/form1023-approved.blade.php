<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Form 1023 Application Approved</title>
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
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
        .success-box {
            background-color: #d1fae5;
            border-left: 4px solid #10b981;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
        }
        .success-box h3 {
            margin: 0 0 10px 0;
            color: #065f46;
            font-size: 18px;
        }
        .success-box p {
            margin: 0;
            color: #047857;
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
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 40px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 30px 0;
            box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(16, 185, 129, 0.4);
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
            color: #10b981;
            text-decoration: none;
        }
        .divider {
            height: 1px;
            background-color: #e5e5e5;
            margin: 30px 0;
        }
        .admin-message {
            background-color: #f0f9ff;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 25px 0;
            border-radius: 4px;
        }
        .admin-message p {
            margin: 0;
            color: #1e40af;
            font-style: italic;
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
            <h1>🎉 Congratulations!</h1>
        </div>

        <!-- Body -->
        <div class="email-body">
            <div class="greeting">
                Dear {{ $organization->name ?? 'Valued Organization' }},
            </div>

            <div class="success-box">
                <h3>✅ Application Approved</h3>
                <p>We are pleased to inform you that your Form 1023 application has been <strong>approved</strong>!</p>
            </div>

            <div class="message">
                Your organization's application for recognition of exemption under section 501(c)(3) has been successfully reviewed and approved by our team. This is a significant milestone, and we congratulate you on this achievement.
            </div>

            <div class="highlight-box" style="background-color: #f8f9fa; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 4px;">
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
                    <span class="info-value" style="color: #10b981; font-weight: 600;">Approved</span>
                </div>
                @if($application->reviewed_at)
                <div class="info-row">
                    <span class="info-label">Approved Date:</span>
                    <span class="info-value">{{ $application->reviewed_at->format('F j, Y') }}</span>
                </div>
                @endif
            </div>

            @if(isset($reviewMessage) && $reviewMessage)
            <div class="admin-message">
                <p><strong>Message from Review Team:</strong></p>
                <p>{{ $reviewMessage }}</p>
            </div>
            @endif

            <div class="message">
                <strong>What's Next?</strong><br>
                Your organization is now recognized as a tax-exempt organization under section 501(c)(3). You can now proceed with your charitable activities and begin accepting tax-deductible donations.
            </div>

            <div class="button-container">
                <a href="{{ $applicationUrl }}" class="cta-button">
                    View Application Details
                </a>
            </div>

            <div class="divider"></div>

            <div class="message" style="font-size: 14px; color: #666666;">
                <strong>Important Notes:</strong><br>
                • Keep a copy of this approval for your records<br>
                • You may need to provide this documentation to donors and grantors<br>
                • Ensure you maintain compliance with IRS requirements for tax-exempt organizations<br>
                • If you have any questions, please don't hesitate to contact our support team
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

