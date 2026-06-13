@extends('emails.layout')

@section('title', 'Primary Organization Changed')
@section('header-title', 'Primary organization update')

@section('content')
    <div class="greeting">
        Hello {{ $organization->contact_name ?: $organization->name }},
    </div>

    <div class="content">
        A supporter has changed their primary organization away from <strong>{{ $organization->name }}</strong> on {{ config('app.name') }}.
    </div>

    <div class="highlight-box">
        <div class="info-row">
            <span class="info-label">Supporter:</span>
            <span class="info-value"><strong>{{ $supporter->name }}</strong></span>
        </div>
        <div class="info-row">
            <span class="info-label">New primary organization:</span>
            <span class="info-value">{{ $newOrganizationName }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Date:</span>
            <span class="info-value">{{ $change->created_at?->format('F j, Y g:i A') }}</span>
        </div>
    </div>

    <div class="content">
        <strong>Reason provided:</strong><br>
        <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #7c3aed; border-radius: 4px; margin-top: 10px;">
            {{ $change->reason }}
        </div>
    </div>

    <div class="content">
        This is an informational notice. No approval is required — the change has already been applied.
    </div>

    <div class="button-container">
        <a href="{{ $dashboardUrl }}" class="cta-button">
            View Supporters Dashboard
        </a>
    </div>
@endsection
