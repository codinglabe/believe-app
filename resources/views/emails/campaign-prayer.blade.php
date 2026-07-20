@extends('emails.layout')

@section('title', $title)
@section('header-title', $title)

@section('content')
    <div class="greeting">
        Hello{{ $recipientName !== '' ? ' '.$recipientName : '' }},
    </div>

    <div class="content">
        @if($organizationName !== '')
            A Newsletter from <strong>{{ $organizationName }}</strong>.
        @else
            Here's today's Newsletter:
        @endif
    </div>

    <div class="highlight-box">
        <div class="content" style="margin-bottom: 0; white-space: pre-wrap;">{{ $bodyText }}</div>
        @if(filled($scriptureRef))
            <p style="margin: 16px 0 0 0; font-size: 14px; color: #667eea;">
                <strong>📖 {{ $scriptureRef }}</strong>
            </p>
        @endif
    </div>

    <div class="button-container">
        <a href="{{ $contentUrl }}" class="cta-button">
            Open Newsletter
        </a>
    </div>
@endsection
