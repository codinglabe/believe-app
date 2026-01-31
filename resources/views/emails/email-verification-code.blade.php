<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - {{ config('app.name') }}</title>
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
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
        }
        .email-wrapper {
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
        .content {
            font-size: 16px;
            color: #4a4a4a;
            margin-bottom: 25px;
            line-height: 1.8;
        }
        .verification-code-box {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border: 2px dashed #667eea;
            border-radius: 12px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
        }
        .code-label {
            font-size: 14px;
            color: #666666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
            font-weight: 600;
        }
        .verification-code {
            font-size: 42px;
            font-weight: 700;
            color: #667eea;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
            text-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
        }
        .expiry-notice {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 25px 0;
            border-radius: 4px;
            font-size: 14px;
            color: #856404;
        }
        .expiry-notice strong {
            display: block;
            margin-bottom: 5px;
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
        .security-note {
            background-color: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 25px 0;
            border-radius: 4px;
            font-size: 14px;
            color: #0c5460;
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
            .verification-code {
                font-size: 32px;
                letter-spacing: 6px;
            }
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <!-- Header -->
        <div class="email-header">
            <h1>{{ config('app.name') }}</h1>
        </div>

        <!-- Body -->
        <div class="email-body">
            <div class="greeting">
                Hello {{ $user->name }},
            </div>

            <div class="content">
                <p>Thank you for registering with {{ config('app.name') }}! To complete your registration and secure your account, please verify your email address using the verification code below.</p>
            </div>

            <!-- Verification Code Box -->
            <div class="verification-code-box">
                <div class="code-label">Your Verification Code</div>
                <div class="verification-code">{{ $code }}</div>
            </div>

            <!-- Expiry Notice -->
            <div class="expiry-notice">
                <strong>⏰ Code Expiry</strong>
                This verification code will expire in <strong>5 minutes</strong> for security reasons. Please use it soon!
            </div>

            <!-- Security Note -->
            <div class="security-note">
                <strong>🔒 Security Tip</strong>
                <p style="margin: 5px 0 0 0;">If you didn't request this verification code, please ignore this email or contact our support team immediately.</p>
            </div>

            <div class="content" style="margin-top: 30px;">
                <p style="color: #666666; font-size: 14px;">
                    Simply enter this code in the verification form to complete your email verification process.
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>{{ config('app.name') }}</strong></p>
            <p>This is an automated notification. Please do not reply to this email.</p>
            <p>
                <a href="{{ config('app.url') }}" style="color: #667eea; text-decoration: none;">Visit our website</a> |
                <a href="{{ config('app.url') }}/contact" style="color: #667eea; text-decoration: none;">Contact Support</a>
            </p>
            <p style="margin-top: 20px; font-size: 12px; color: #999999;">
                © {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
