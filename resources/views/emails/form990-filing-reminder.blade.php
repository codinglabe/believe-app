<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Form 990 Filing Reminder</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1e40af;
            margin: 0;
            font-size: 24px;
        }
        .alert {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .alert-danger {
            background-color: #fee2e2;
            border-left-color: #ef4444;
        }
        .info-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            font-weight: 600;
            color: #64748b;
        }
        .info-value {
            color: #1e293b;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2563eb;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 14px;
        }
        .urgent {
            color: #dc2626;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Form 990 Filing Reminder</h1>
        </div>

        <p>Dear {{ $organization->contact_name ?? $organization->name }},</p>

        <p>This is a reminder regarding your organization's Form 990 filing requirement.</p>

        @if($filing->isOverdue())
            <div class="alert alert-danger">
                <strong>⚠️ URGENT:</strong> Your Form 990 filing is <span class="urgent">OVERDUE</span>. Please file immediately to avoid penalties.
            </div>
        @else
            <div class="alert">
                <strong>Reminder:</strong> Your Form 990 filing is due soon. Please ensure timely filing to maintain compliance.
            </div>
        @endif

        <div class="info-box">
            <div class="info-row">
                <span class="info-label">Organization:</span>
                <span class="info-value">{{ $organization->name }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">EIN:</span>
                <span class="info-value">{{ $organization->ein }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Tax Year:</span>
                <span class="info-value">{{ $filing->tax_year }}</span>
            </div>
            @if($filing->due_date)
                <div class="info-row">
                    <span class="info-label">Due Date:</span>
                    <span class="info-value {{ $filing->isOverdue() ? 'urgent' : '' }}">
                        {{ $filing->due_date->format('F d, Y') }}
                        @if($filing->isOverdue())
                            ({{ abs($filing->daysUntilDue()) }} days overdue)
                        @else
                            ({{ $filing->daysUntilDue() }} days remaining)
                        @endif
                    </span>
                </div>
            @endif
            @if($filing->extended_due_date)
                <div class="info-row">
                    <span class="info-label">Extended Due Date:</span>
                    <span class="info-value">{{ $filing->extended_due_date->format('F d, Y') }}</span>
                </div>
            @endif
        </div>

        <p><strong>What you need to do:</strong></p>
        <ul>
            <li>File your Form 990 (or Form 990-EZ/990-PF if applicable) with the IRS</li>
            <li>Ensure all required information is complete and accurate</li>
            <li>File electronically through the IRS website or mail a paper return</li>
        </ul>

        <p><strong>Important Resources:</strong></p>
        <ul>
            <li><a href="https://www.irs.gov/charities-non-profits/form-990-series-due-dates" target="_blank">IRS Form 990 Due Dates</a></li>
            <li><a href="https://www.irs.gov/charities-non-profits/electronic-filing-options-for-form-990" target="_blank">Electronic Filing Options</a></li>
            <li><a href="https://www.irs.gov/charities-non-profits/annual-filing-and-notification-requirements-for-tax-exempt-organizations" target="_blank">Annual Filing Requirements</a></li>
        </ul>

        <a href="{{ route('dashboard') }}" class="button">View Dashboard</a>

        <div class="footer">
            <p>This is an automated reminder from your organization management system.</p>
            <p>If you have already filed your Form 990, please contact support to update your records.</p>
            <p>For questions or assistance, please contact your administrator.</p>
        </div>
    </div>
</body>
</html>


