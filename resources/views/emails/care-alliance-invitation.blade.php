<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Care Alliance invitation — {{ $allianceName }}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(to bottom, #4f46e5, #7c3aed); padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">Care Alliance invitation</h1>
    </div>

    <div style="background-color: #f8f9fa; padding: 28px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-bottom: 16px;">Hello,</p>

        <p style="font-size: 16px; margin-bottom: 16px;">
            <strong>{{ $inviterName }}</strong> has invited <strong>{{ $organizationName }}</strong> to join the Care Alliance
            <strong>{{ $allianceName }}</strong> on {{ $appName }}.
        </p>

        <p style="font-size: 15px; color: #555; margin-bottom: 12px;">
            Sign in with your <strong>organization account</strong>, then open <strong>Alliance Membership</strong> in the sidebar (or use the button below).
        </p>
        <p style="font-size: 15px; color: #555; margin-bottom: 24px;">
            On that page you can <strong>Accept</strong> or <strong>Decline</strong> the invitation and see your Care Alliance membership status.
        </p>

        <div style="text-align: center; margin: 28px 0;">
            <a href="{{ $dashboardUrl }}" style="display: inline-block; background: #7c3aed; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
                Open Alliance Membership
            </a>
        </div>

        <p style="font-size: 13px; color: #888;">
            If the button does not work, copy and paste this link into your browser:<br>
            <span style="word-break: break-all;">{{ $dashboardUrl }}</span>
        </p>
    </div>
</body>
</html>
