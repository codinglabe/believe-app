<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms Accepted</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        .checkmark {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: white;
            color: #10b981;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1rem;
            font-size: 2.5rem;
            animation: scaleIn 0.3s ease-out;
        }
        @keyframes scaleIn {
            from {
                transform: scale(0);
            }
            to {
                transform: scale(1);
            }
        }
        h1 {
            margin: 0 0 0.5rem;
            font-size: 1.5rem;
        }
        p {
            margin: 0;
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="checkmark">✓</div>
        <h1>Terms Accepted!</h1>
        <p>You can close this window now.</p>
    </div>

    <script>
        // Notify parent window (works for both popup and iframe)
        const message = {
            signedAgreementId: '{{ $signedAgreementId ?? '' }}',
            success: {{ isset($success) && $success ? 'true' : 'false' }},
            @if(isset($error))
            error: '{{ $error }}',
            @endif
        };

        // Function to hide the success screen aggressively
        function hideSuccessScreen() {
            // Multiple methods to ensure it hides
            document.body.style.opacity = '0';
            document.body.style.visibility = 'hidden';
            document.body.style.display = 'none';
            document.body.style.transition = 'opacity 0.3s ease-out, visibility 0.3s ease-out';
            
            // Also hide the container
            const container = document.querySelector('.container');
            if (container) {
                container.style.opacity = '0';
                container.style.visibility = 'hidden';
                container.style.display = 'none';
            }
        }

        // Send message to parent window (iframe) or opener (popup)
        if (window.parent && window.parent !== window) {
            // We're in an iframe
            window.parent.postMessage(message, '*');
            console.log('TOS callback: Sent postMessage to parent', message);
            
            // Show success screen for 2 seconds, then hide aggressively
            setTimeout(() => {
                // Hide immediately
                hideSuccessScreen();
                
                // Send message to parent to check status after hiding
                setTimeout(() => {
                    window.parent.postMessage({ 
                        ...message, 
                        action: 'checkStatus',
                        hideSuccess: true 
                    }, '*');
                    
                    // Also send close action
                    window.parent.postMessage({ ...message, action: 'close' }, '*');
                    
                    // Reload the parent page after successful TOS acceptance
                    if (message.success) {
                        setTimeout(() => {
                            window.parent.location.reload();
                        }, 500);
                    }
                }, 300);
            }, 2000); // Show success for 2 seconds (reduced from 3)
        } else if (window.opener) {
            // We're in a popup
            window.opener.postMessage(message, '*');
            console.log('TOS callback: Sent postMessage to opener', message);
            
            // Show success screen for 2 seconds, then hide aggressively
            setTimeout(() => {
                // Hide immediately
                hideSuccessScreen();
                
                setTimeout(() => {
                    // Send message to opener to check status after hiding
                    window.opener.postMessage({ 
                        ...message, 
                        action: 'checkStatus',
                        hideSuccess: true 
                    }, '*');
                    
                    // Reload the opener page after successful TOS acceptance
                    if (message.success) {
                        setTimeout(() => {
                            window.opener.location.reload();
                        }, 500);
                    }
                    
                    // Close the popup
                    try {
                        window.close();
                    } catch (e) {
                        console.log('Cannot close popup (may be blocked)');
                    }
                }, 300);
            }, 2000); // Show success for 2 seconds (reduced from 3)
        } else {
            // If not in popup or iframe, auto-hide and redirect to wallet
            console.log('TOS callback: Not in iframe or popup, redirecting to wallet');
            setTimeout(() => {
                hideSuccessScreen();
                setTimeout(() => {
                    // Reload the page after successful TOS acceptance
                    if (message.success) {
                        window.location.reload();
                    } else {
                        window.location.href = '/wallet';
                    }
                }, 300);
            }, 2000); // Show success for 2 seconds (reduced from 3)
        }
        
        // Fallback: Force hide after 5 seconds no matter what
        setTimeout(() => {
            hideSuccessScreen();
        }, 5000);
    </script>
</body>
</html>

