<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claim your Believe Points gift</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #7c3aed, #2563eb); padding: 28px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">You received a Believe Points gift</h1>
    </div>
    <div style="background-color: #f8f9fa; padding: 28px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px;">Hello,</p>
        <p style="font-size: 16px;">
            <strong>{{ $senderName }}</strong> sent you <strong>{{ $amountLabel }} Believe Points (BP)</strong>
            @if ($occasion) for <strong>{{ $occasion }}</strong>@endif.
        </p>
        @if ($messageText)
            <div style="background:#fff;border-left:4px solid #7c3aed;padding:16px;margin:20px 0;border-radius:4px;">
                <p style="margin:0;font-size:15px;color:#555;">“{{ $messageText }}”</p>
            </div>
        @endif
        <p style="font-size: 15px; color: #555;">
            Create a free supporter account with this email to claim your gift. Points stay holding for
            <strong>{{ $holdDays }} days</strong> (until {{ $expiresAt }}). After that they return to the sender.
        </p>
        <p style="text-align: center; margin: 28px 0;">
            <a href="{{ $registerUrl }}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:16px;">
                Claim gift &amp; register
            </a>
        </p>
        <p style="font-size: 13px; color: #888;">This invitation was sent to {{ $invite->recipient_email }}.</p>
    </div>
</body>
</html>
