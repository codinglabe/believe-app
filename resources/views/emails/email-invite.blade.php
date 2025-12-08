<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Join {{ $organization->name }}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #2c3e50; margin-top: 0;">You're Invited!</h1>
        
        <p>Hello{{ $contact->name ? ' ' . $contact->name : '' }},</p>
        
        <p><strong>{{ $organization->name }}</strong> has invited you to join our platform!</p>
        
        @if($customMessage)
        <div style="background-color: #fff; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0;">
            <p style="margin: 0; font-style: italic;">{{ $customMessage }}</p>
        </div>
        @endif
        
        <p>{{ $organization->name }} is a registered nonprofit organization that's part of our community. By joining, you'll be able to:</p>
        
        <ul style="margin: 20px 0; padding-left: 20px;">
            <li>Support their mission and causes</li>
            <li>Stay updated on their activities and events</li>
            <li>Make donations and contribute to their work</li>
            <li>Connect with like-minded individuals</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ $joinUrl }}" 
               style="display: inline-block; background-color: #3498db; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Join Now
            </a>
        </div>
        
        <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
            If you have any questions, feel free to reach out to {{ $organization->name }} at 
            <a href="mailto:{{ $organization->email }}" style="color: #3498db;">{{ $organization->email }}</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="color: #95a5a6; font-size: 12px; text-align: center;">
            This invitation was sent to {{ $contact->email }}. 
            If you didn't expect this email, you can safely ignore it.
        </p>
    </div>
</body>
</html>






