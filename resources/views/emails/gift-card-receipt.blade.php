<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gift Card Purchase Receipt</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .receipt-box {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .receipt-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .receipt-item:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: bold;
            color: #6b7280;
        }
        .value {
            color: #111827;
        }
        .card-number {
            font-family: monospace;
            font-size: 18px;
            font-weight: bold;
            color: #667eea;
            letter-spacing: 2px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎁 Gift Card Purchase Receipt</h1>
        <p>Thank you for your purchase!</p>
    </div>

    <div class="content">
        <p>Dear {{ $giftCard->user->name ?? 'Valued Customer' }},</p>

        <p>Your gift card purchase has been confirmed. Please find the details below:</p>

        <div class="receipt-box">
            <h2 style="margin-top: 0;">Receipt Details</h2>

            <div class="receipt-item">
                <span class="label">Gift Card:</span>
                <span class="value">{{ $giftCard->brand_name }}</span>
            </div>

            <div class="receipt-item">
                <span class="label">Card Number:</span>
                <span class="value card-number">{{ $giftCard->card_number ?? 'N/A' }}</span>
            </div>

            <div class="receipt-item">
                <span class="label">Amount:</span>
                <span class="value"><strong>{{ number_format($giftCard->amount, 2) }} {{ $giftCard->currency ?? 'USD' }}</strong></span>
            </div>

            @if($giftCard->expires_at)
            <div class="receipt-item">
                <span class="label">Expires:</span>
                <span class="value">{{ $giftCard->expires_at->format('F j, Y') }}</span>
            </div>
            @endif

            <div class="receipt-item">
                <span class="label">Purchase Date:</span>
                <span class="value">{{ $giftCard->purchased_at->format('F j, Y g:i A') }}</span>
            </div>

            @if($giftCard->organization)
            <div class="receipt-item">
                <span class="label">From Organization:</span>
                <span class="value">{{ $giftCard->organization->name }}</span>
            </div>
            @endif

            <div class="receipt-item">
                <span class="label">Receipt Number:</span>
                <span class="value">GC-{{ $giftCard->id }}-{{ substr($giftCard->card_number ?? uniqid(), 0, 8) }}</span>
            </div>
        </div>

        <p><strong>Important:</strong> Your gift card receipt is attached to this email as a PDF. Please keep it for your records.</p>

        <p>If you have any questions, please don't hesitate to contact us.</p>

        <p>Best regards,<br>{{ config('app.name') }}</p>
    </div>

    <div class="footer">
        <p>This is an automated email. Please do not reply to this message.</p>
        <p>&copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.</p>
    </div>
</body>
</html>

