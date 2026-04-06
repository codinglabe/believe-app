<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - {{ $appName ?? config('app.name') }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f5f7fa;
            margin: 0;
            padding: 20px;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .email-body {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .content {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 25px;
            line-height: 1.8;
        }
        .email-box {
            background-color: #f0fdf4;
            border: 1px solid #86efac;
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
            display: table;
            width: 100%;
        }
        .email-box-row {
            display: table-row;
        }
        .email-icon-cell {
            display: table-cell;
            vertical-align: top;
            padding-right: 15px;
        }
        .email-info-cell {
            display: table-cell;
            vertical-align: top;
        }
        .email-icon {
            width: 56px;
            height: 56px;
            background-color: #10b981;
            border-radius: 50%;
            text-align: center;
            line-height: 56px;
            margin: 0 auto;
            position: relative;
        }
        .email-icon-inner {
            font-size: 24px;
            color: #ffffff;
            display: inline-block;
            vertical-align: middle;
            line-height: 1;
            font-weight: normal;
            font-family: Arial, Helvetica, sans-serif;
        }
        /* CSS-based envelope icon for better compatibility */
        .envelope-icon {
            display: inline-block;
            width: 24px;
            height: 18px;
            border: 2px solid #ffffff;
            border-radius: 2px;
            position: relative;
            vertical-align: middle;
        }
        .envelope-icon:after {
            content: '';
            position: absolute;
            top: -2px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 12px solid transparent;
            border-right: 12px solid transparent;
            border-top: 8px solid #ffffff;
        }
        .email-info {
            flex: 1;
        }
        .email-info p {
            margin: 0;
            font-size: 15px;
            color: #000000;
            line-height: 1.7;
        }
        .email-address {
            font-weight: 500;
            color: #2563eb;
            text-decoration: underline;
            font-size: 15px;
        }
        .button-container {
            text-align: center;
            margin: 40px 0;
        }
        .verify-button {
            display: inline-block;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 18px 50px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 17px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            transition: all 0.3s ease;
        }
        .verify-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.5);
        }
        .info-box {
            background-color: #f9fafb;
            border-left: 4px solid #10b981;
            padding: 20px;
            margin: 30px 0;
            border-radius: 6px;
        }
        .info-box p {
            margin: 0;
            font-size: 14px;
            color: #6b7280;
            line-height: 1.7;
        }
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            margin: 8px 0;
            color: #6b7280;
            font-size: 14px;
        }
        .footer a {
            color: #10b981;
            text-decoration: none;
            font-weight: 500;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #e5e7eb, transparent);
            margin: 30px 0;
        }
        .expiry-notice {
            background-color: #fef3c7;
            border: 1px solid #fbbf24;
            border-radius: 8px;
            padding: 15px;
            margin: 25px 0;
        }
        .expiry-notice p {
            margin: 0;
            font-size: 13px;
            color: #92400e;
            line-height: 1.6;
        }
        @media only screen and (max-width: 600px) {
            body {
                padding: 10px;
            }
            .email-body {
                padding: 30px 20px;
            }
            .email-header {
                padding: 30px 20px;
            }
            .email-header h1 {
                font-size: 24px;
            }
            .verify-button {
                padding: 16px 40px;
                font-size: 16px;
            }
            .email-box {
                display: block;
            }
            .email-icon-cell,
            .email-info-cell {
                display: block;
                width: 100% !important;
            }
            .email-icon-cell {
                text-align: center;
                padding-bottom: 15px;
                padding-right: 0;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Body -->
        <div class="email-body">
            <div class="greeting">
                Hello!
            </div>

            <div class="content">
                <p>Thank you for registering with <strong>{{ $appName ?? config('app.name') }}</strong>! We're excited to have you join our community.</p>
            </div>

            <!-- Email Confirmation Box -->
            <table class="email-box" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                    <td class="email-icon-cell" width="56" valign="top">
                        <div class="email-icon">
                            <span class="email-icon-inner">
                                <span style="font-size: 28px; line-height: 1;">✉</span>
                            </span>
                        </div>
                    </td>
                    <td class="email-info-cell" valign="top">
                        <div class="email-info">
                            <p>
                                We've sent this verification link to <span class="email-address">{{ $notifiable->email ?? 'your email address' }}</span>. 
                                Please click the button below to verify your account and activate all features.
                            </p>
                        </div>
                    </td>
                </tr>
            </table>

            <!-- Verify Button -->
            <div class="button-container">
                <a href="{{ $verificationUrl }}" class="verify-button">
                    Verify Email Address
                </a>
            </div>

            <!-- Expiry Notice -->
            <div class="expiry-notice">
                <p>
                    <strong>⏰ Important:</strong> This verification link will expire in 60 minutes. If you didn't request this email, you can safely ignore it.
                </p>
            </div>

            <!-- Info Box -->
            <div class="info-box">
                <p>
                    <strong>Having trouble clicking the button?</strong><br>
                    Copy and paste the following URL into your web browser:
                </p>
                <p style="margin-top: 10px; word-break: break-all; font-family: monospace; font-size: 12px; color: #10b981;">
                    {{ $verificationUrl }}
                </p>
            </div>

            <div class="divider"></div>

            <div class="content">
                <p style="font-size: 15px; color: #6b7280;">
                    If you have any questions or need assistance, our support team is here to help. 
                    Just reply to this email or visit our support center.
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>{{ $appName ?? config('app.name') }}</strong></p>
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>
                <a href="{{ config('app.url') }}">Visit our website</a> |
                <a href="{{ config('app.url') }}/help">Get Help</a> |
                <a href="{{ config('app.url') }}/contact">Contact Support</a>
            </p>
            <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                © {{ date('Y') }} {{ $appName ?? config('app.name') }}. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
