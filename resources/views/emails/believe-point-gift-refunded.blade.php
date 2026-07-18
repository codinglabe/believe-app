<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gift invite expired</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #b45309, #7c3aed); padding: 28px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">Gift invite expired</h1>
    </div>
    <div style="background-color: #f8f9fa; padding: 28px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px;">
            <strong>{{ $recipientEmail }}</strong> did not register in time.
            <strong>{{ $amountLabel }} BP</strong> has been returned to your Available balance.
        </p>
        <p style="text-align: center; margin: 24px 0;">
            <a href="{{ $bpUrl }}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;">
                View Believe Points
            </a>
        </p>
    </div>
</body>
</html>
