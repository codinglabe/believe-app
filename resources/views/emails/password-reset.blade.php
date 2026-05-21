<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Reset Your Password — {{ $appName }}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #374151;
            background-color: #f3f4f6;
            margin: 0;
            padding: 24px 16px;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(79, 70, 229, 0.12);
        }
        .email-header {
            background: linear-gradient(135deg, #9333ea 0%, #2563eb 50%, #7c3aed 100%);
            padding: 36px 32px 32px;
            text-align: center;
        }
        .logo-wrap {
            display: inline-block;
            background: #ffffff;
            border-radius: 14px;
            padding: 12px;
            margin-bottom: 20px;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
        }
        .logo-wrap img {
            display: block;
            width: 64px;
            height: 64px;
            object-fit: contain;
        }
        .email-header h1 {
            color: #ffffff;
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 8px;
            letter-spacing: -0.02em;
        }
        .email-header p {
            color: rgba(255, 255, 255, 0.92);
            font-size: 15px;
            margin: 0;
        }
        .email-body {
            padding: 36px 32px;
        }
        .greeting {
            font-size: 17px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
        }
        .content {
            font-size: 15px;
            color: #4b5563;
            margin-bottom: 24px;
            line-height: 1.75;
        }
        .button-container {
            text-align: center;
            margin: 32px 0;
        }
        .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 40px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 16px;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
        }
        .expiry-notice {
            background: linear-gradient(135deg, #faf5ff 0%, #eff6ff 100%);
            border: 1px solid #c4b5fd;
            border-radius: 10px;
            padding: 16px 18px;
            margin: 24px 0;
        }
        .expiry-notice p {
            margin: 0;
            font-size: 13px;
            color: #5b21b6;
            line-height: 1.6;
        }
        .link-fallback {
            background-color: #f9fafb;
            border-left: 4px solid #2563eb;
            padding: 16px 18px;
            border-radius: 0 8px 8px 0;
            margin: 24px 0;
        }
        .link-fallback p {
            margin: 0 0 10px;
            font-size: 13px;
            color: #6b7280;
        }
        .link-fallback a {
            font-size: 12px;
            color: #2563eb;
            word-break: break-all;
        }
        .security-note {
            font-size: 13px;
            color: #9ca3af;
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            line-height: 1.65;
        }
        .footer {
            background-color: #f9fafb;
            padding: 28px 32px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            margin: 6px 0;
            color: #6b7280;
            font-size: 13px;
        }
        .footer a {
            color: #2563eb;
            text-decoration: none;
            font-weight: 500;
        }
        @media only screen and (max-width: 600px) {
            body { padding: 12px 8px; }
            .email-header, .email-body, .footer { padding-left: 20px; padding-right: 20px; }
            .reset-button { padding: 14px 28px; font-size: 15px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="logo-wrap">
                <img src="{{ $logoUrl }}" alt="{{ $appName }} logo" width="64" height="64">
            </div>
            <h1>Reset your password</h1>
            <p>{{ $appName }}</p>
        </div>

        <div class="email-body">
            <p class="greeting">
                @if(!empty($userName))
                    Hello, {{ $userName }}!
                @else
                    Hello!
                @endif
            </p>

            <p class="content">
                We received a request to reset the password for your account. Click the button below to choose a new password. If you did not request this, you can safely ignore this email — your password will stay the same.
            </p>

            <div class="button-container">
                <a href="{{ $resetUrl }}" class="reset-button">Reset password</a>
            </div>

            <div class="expiry-notice">
                <p>
                    <strong>This link expires in {{ $expireMinutes }} minutes.</strong>
                    For your security, it can only be used once.
                </p>
            </div>

            <div class="link-fallback">
                <p><strong>Button not working?</strong> Copy and paste this link into your browser:</p>
                <a href="{{ $resetUrl }}">{{ $resetUrl }}</a>
            </div>

            <p class="security-note">
                Never share this link with anyone. {{ $appName }} will never ask for your password by email.
            </p>
        </div>

        <div class="footer">
            <p><strong>{{ $appName }}</strong></p>
            <p>
                <a href="{{ $appUrl }}">Visit website</a>
                &nbsp;·&nbsp;
                <a href="{{ $appUrl }}/login">Sign in</a>
            </p>
            <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
                © {{ date('Y') }} {{ $appName }}. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
