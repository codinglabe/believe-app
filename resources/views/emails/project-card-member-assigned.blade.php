<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Added to a project card</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #9333ea, #2563eb); padding: 28px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">You're on a project card</h1>
    </div>

    <div style="background-color: #f8f9fa; padding: 28px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-bottom: 16px;">
            Hello{{ $recipientName ? ', '.$recipientName : '' }},
        </p>

        <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>{{ $assignedByName }}</strong> added you to a card in
            <strong>{{ $boardName }}</strong>.
        </p>

        <div style="background-color: #fff; padding: 20px; border-left: 4px solid #9333ea; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 15px;"><strong>Card:</strong> {{ $cardTitle }}</p>
            <p style="margin: 8px 0 0 0; font-size: 15px;"><strong>Board:</strong> {{ $boardName }}</p>
        </div>

        <p style="text-align: center; margin: 28px 0;">
            <a href="{{ $cardUrl }}" style="display: inline-block; background: linear-gradient(135deg, #9333ea, #2563eb); color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Open card
            </a>
        </p>

        <p style="font-size: 14px; color: #666; margin-bottom: 8px;">
            Or copy this link into your browser:
        </p>
        <p style="font-size: 13px; word-break: break-all; color: #555;">
            <a href="{{ $cardUrl }}" style="color: #2563eb;">{{ $cardUrl }}</a>
        </p>

        <p style="font-size: 12px; color: #999; margin-top: 28px; text-align: center;">
            Believe In Unity — Project Management
        </p>
    </div>
</body>
</html>
