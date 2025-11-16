<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complete Your Form 1023 Application Payment</title>
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
        .highlight-box {
            background-color: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
        }
        .highlight-box h3 {
            margin: 0 0 10px 0;
            color: #1a1a1a;
            font-size: 18px;
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 40px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 30px 0;
            box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
        }
        .button-container {
            text-align: center;
            margin: 40px 0;
        }
        .urgency-note {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 6px;
            padding: 15px;
            margin: 25px 0;
        }
        .urgency-note p {
            margin: 0;
            color: #856404;
            font-size: 14px;
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
            color: #667eea;
            text-decoration: none;
        }
        .divider {
            height: 1px;
            background-color: #e5e5e5;
            margin: 30px 0;
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
            <h1>🔔 Payment Reminder</h1>
        </div>

        <!-- Body -->
        <div class="email-body">
            <div class="greeting">
                Dear {{ $organization->name ?? 'Valued Organization' }},
            </div>

            <div class="message">
                We hope this message finds you well. We noticed that your Form 1023 application is still pending payment completion. To proceed with the certification process and get your organization certified, please complete the payment as soon as possible.
            </div>

            <div class="highlight-box">
                <h3>📋 Application Details</h3>
                <div class="info-row">
                    <span class="info-label">Application Number:</span>
                    <span class="info-value"><strong>{{ $application->application_number }}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Application Fee:</span>
                    <span class="info-value"><strong>${{ number_format($applicationFee, 2) }}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="info-value">Payment Pending</span>
                </div>
                @if($application->submitted_at)
                <div class="info-row">
                    <span class="info-label">Submitted:</span>
                    <span class="info-value">{{ $application->submitted_at->format('F j, Y') }}</span>
                </div>
                @endif
            </div>

            <div class="urgency-note">
                <p>
                    <strong>⏰ Important:</strong> Your application cannot be reviewed until payment is completed. Complete your payment today to avoid any delays in the certification process.
                </p>
            </div>

            <div class="message">
                Once payment is received, your application will be immediately moved to the review queue, and our team will begin processing your certification request.
            </div>

            <div class="button-container">
                <a href="{{ $paymentUrl }}" class="cta-button">
                    Complete Payment Now
                </a>
            </div>

            <div class="divider"></div>

            <div class="message" style="font-size: 14px; color: #666666;">
                <strong>Need Help?</strong><br>
                If you have any questions or need assistance with the payment process, please don't hesitate to contact our support team. We're here to help you complete your certification successfully.
            </div>

            <div class="button-container" style="margin-top: 20px;">
                <a href="{{ $applicationUrl }}" style="color: #667eea; text-decoration: none; font-size: 14px;">
                    View Application Details →
                </a>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>{{ config('app.name') }}</strong></p>
            <p>This is an automated reminder. Please do not reply to this email.</p>
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


