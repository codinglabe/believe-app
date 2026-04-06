<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $newsletter->subject }}</title>
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
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #ffffff;
            padding: 30px;
            border: 1px solid #e9ecef;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-radius: 0 0 8px 8px;
            font-size: 12px;
            color: #6c757d;
        }
        .unsubscribe {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
        }
        .unsubscribe a {
            color: #6c757d;
            text-decoration: none;
        }
        .unsubscribe a:hover {
            text-decoration: underline;
        }
        h1, h2, h3 {
            color: #2c3e50;
        }
        a {
            color: #007bff;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $newsletter->organization->name }}</h1>
        <p>Newsletter</p>
    </div>
    
    <div class="content">
        @if($html_content)
            {!! $html_content !!}
        @else
            <div style="white-space: pre-line;">{{ $content }}</div>
        @endif
    </div>
    
    <div class="footer">
        <p>This email was sent to {{ $recipient->email }} from {{ $newsletter->organization->name }}</p>
        
        <div class="unsubscribe">
            <p>
                <a href="{{ $unsubscribe_link }}">Unsubscribe</a> from this newsletter
            </p>
        </div>
    </div>
</body>
</html>

