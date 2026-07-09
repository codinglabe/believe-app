@extends('emails.layout')

@section('title', 'New campaign from '.$organizationName)
@section('header-title', 'New Campaign')

@section('content')
    <div class="greeting">
        Hello{{ $recipientName !== '' ? ' '.$recipientName : '' }},
    </div>

    <div class="content">
        <strong>{{ $organizationName }}</strong> created a new campaign and included you as a recipient.
    </div>

    <div class="highlight-box">
        <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px;">Campaign details</h3>
        <div class="info-row">
            <span class="info-label">Organization:</span>
            <span class="info-value"><strong>{{ $organizationName }}</strong></span>
        </div>
        <div class="info-row">
            <span class="info-label">Campaign:</span>
            <span class="info-value"><strong>{{ $campaignName }}</strong></span>
        </div>
        <div class="info-row">
            <span class="info-label">Starts:</span>
            <span class="info-value">{{ $startDateFormatted }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Ends:</span>
            <span class="info-value">{{ $endDateFormatted }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Daily send time:</span>
            <span class="info-value">{{ $sendTimeLocal }}</span>
        </div>
    </div>

    <div class="content">
        You will receive campaign messages through the delivery channels selected for this campaign.
    </div>

    <div class="button-container">
        <a href="{{ $campaignUrl }}" class="cta-button">
                Open notifications
        </a>
    </div>
@endsection
