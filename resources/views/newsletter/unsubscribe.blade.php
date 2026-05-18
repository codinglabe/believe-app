<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unsubscribe - Newsletter</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background-color: #ffffff;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .success {
            color: #28a745;
        }
        .error {
            color: #dc3545;
        }
        .icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        h1 {
            margin-bottom: 20px;
        }
        p {
            margin-bottom: 20px;
            font-size: 16px;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
        }
        .btn:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="container">
        @if($success)
            <div class="icon success">✓</div>
            <h1 class="success">Successfully Unsubscribed</h1>
            <p>{{ $message }}</p>
            @if(isset($recipient))
                <p>Email: {{ $recipient->email }}</p>
                <p>Organization: {{ $recipient->organization->name }}</p>
            @endif
        @else
            <div class="icon error">✗</div>
            <h1 class="error">Unsubscribe Failed</h1>
            <p>{{ $message }}</p>
        @endif
        
        <a href="/" class="btn">Return to Home</a>
    </div>
</body>
</html>

