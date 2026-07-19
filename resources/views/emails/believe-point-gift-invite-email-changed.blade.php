<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gift invitation email updated</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #7c3aed, #2563eb); padding: 28px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">Invitation email updated</h1>
    </div>
    <div style="background-color: #f8f9fa; padding: 28px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px;">
            Your pending gift of <strong>{{ $amountLabel }} BP</strong> was updated.
        </p>
        <p style="font-size: 15px; color: #555;">
            Previous email: <strong>{{ $previousEmail }}</strong><br>
            New email: <strong>{{ $newEmail }}</strong>
        </p>
        <p style="font-size: 15px; color: #555;">
            Holding BP is unchanged. A fresh invitation was sent to the new address
            (still expires {{ $expiresAt }}). The previous address was notified that the gift was cancelled for them.
        </p>
        <p style="text-align: center; margin: 24px 0;">
            <a href="{{ $manageUrl }}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;">
                View Gift BP
            </a>
        </p>
    </div>
</body>
</html>
