<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Order Cancelled</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <style>
        .cancel-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #F87171;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem auto;
            animation: pop 0.4s ease-out forwards;
        }

        .cancel-icon {
            width: 30px;
            height: 30px;
            stroke: white;
            stroke-width: 3;
            fill: none;
            stroke-dasharray: 50;
            stroke-dashoffset: 50;
            animation: draw 0.6s ease forwards 0.2s;
        }

        @keyframes pop {
            0% { transform: scale(0); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }

        @keyframes draw {
            to { stroke-dashoffset: 0; }
        }
    </style>
</head>
<body class="bg-gradient-to-r from-red-50 to-red-100 flex items-center justify-center min-h-screen">

    <div class="bg-white p-10 rounded-2xl shadow-xl max-w-md text-center">
        <div class="cancel-circle">
            <svg class="cancel-icon" viewBox="0 0 52 52">
                <line x1="16" y1="16" x2="36" y2="36"/>
                <line x1="36" y1="16" x2="16" y2="36"/>
            </svg>
        </div>
        <h1 class="text-3xl font-extrabold text-red-600 mb-2">Order Cancelled</h1>
        <p class="text-gray-600 mb-6">Your order was cancelled or payment was not completed. You can try again or contact support for help.</p>
        <a href="/" class="inline-block bg-red-600 text-white px-6 py-3 rounded-full text-sm font-semibold transition hover:bg-red-700 shadow-md">
            Return to Homepage
        </a>
    </div>

</body>
</html>
