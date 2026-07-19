<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gift Invitation Cancelled</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #0f766e, #2563eb); padding: 28px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">Gift Invitation Cancelled</h1>
    </div>
    <div style="background-color: #f8f9fa; padding: 28px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px;">Hello,</p>
        <p style="font-size: 16px;">
            A Believe Points (BP) gift that was intended for this email address
            (<strong>{{ $recipientEmail }}</strong>) has been cancelled by
            <strong>{{ $senderName }}</strong>.
            @if ($reason === 'email_changed')
                This usually happens when the sender updates the invitation to a different email address before the gift is claimed.
            @else
                This usually happens when the sender realizes the wrong email address was entered before the gift is claimed.
            @endif
        </p>
        <p style="font-size: 15px; color: #555;">
            No action is required on your part, and no Believe Points have been transferred to this email address.
        </p>
        <div style="background:#fff;border-left:4px solid #0f766e;padding:16px;margin:20px 0;border-radius:4px;">
            <p style="margin:0 0 8px;font-size:15px;color:#334155;">
                As a thank you for your understanding, if you choose to create a free Believe In Unity account using this email address, we’ll automatically credit your account with
                <strong>{{ $brpLabel }} Believe Reward Points (BRP)</strong>.
            </p>
            <p style="margin:0;font-size:14px;color:#64748b;">
                Believe Reward Points can be redeemed with participating merchants in the Believe In Unity Marketplace.
            </p>
        </div>
        <p style="text-align: center; margin: 28px 0;">
            <a href="{{ $registerUrl }}" style="display:inline-block;background:linear-gradient(135deg,#0f766e,#2563eb);color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:16px;">
                Create Your Free Account
            </a>
        </p>
        <p style="font-size: 15px; color: #555;">
            Thank you for your understanding, and we hope to welcome you to the Believe In Unity community.
        </p>
        <p style="font-size: 14px; color: #64748b; margin-top: 24px;">
            The Believe In Unity Team
        </p>
    </div>
</body>
</html>
