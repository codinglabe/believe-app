<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Board of Directors Listing — {{ $organizationName }}</title>
    <style>
        @page { margin: 48px 54px 60px; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 10px;
            color: #111827;
            line-height: 1.45;
        }
        .header {
            border-bottom: 2px solid #1e3a5f;
            padding-bottom: 10px;
            margin-bottom: 14px;
        }
        .form-label {
            font-size: 8px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #475569;
            margin: 0 0 2px;
        }
        h1 {
            font-size: 15px;
            margin: 0 0 4px;
            color: #1e3a5f;
        }
        h2 {
            font-size: 11px;
            margin: 0;
            font-weight: normal;
            color: #334155;
        }
        .org-block {
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            padding: 10px 12px;
            margin-bottom: 14px;
        }
        .org-grid {
            width: 100%;
            border-collapse: collapse;
        }
        .org-grid td {
            padding: 3px 8px 3px 0;
            vertical-align: top;
        }
        .org-grid .label {
            width: 120px;
            font-weight: bold;
            color: #475569;
        }
        .section-title {
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #1e3a5f;
            border-bottom: 1px solid #94a3b8;
            padding-bottom: 4px;
            margin: 16px 0 8px;
        }
        .instructions {
            font-size: 9px;
            color: #475569;
            margin-bottom: 10px;
        }
        table.members {
            width: 100%;
            border-collapse: collapse;
        }
        table.members th,
        table.members td {
            border: 1px solid #94a3b8;
            padding: 6px 7px;
            text-align: left;
            vertical-align: top;
        }
        table.members th {
            background: #e2e8f0;
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #1e293b;
        }
        table.members td {
            font-size: 9px;
        }
        .num { text-align: center; width: 24px; }
        .cert {
            margin-top: 18px;
            border: 1px solid #cbd5e1;
            padding: 10px 12px;
            font-size: 9px;
        }
        .sig-grid {
            width: 100%;
            margin-top: 22px;
            border-collapse: collapse;
        }
        .sig-grid td {
            padding: 8px 12px 0 0;
            vertical-align: bottom;
            width: 50%;
        }
        .sig-line {
            border-bottom: 1px solid #111827;
            height: 28px;
            margin-bottom: 4px;
        }
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            font-size: 8px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
        }
        .empty {
            font-style: italic;
            color: #64748b;
            padding: 12px;
            border: 1px dashed #cbd5e1;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <p class="form-label">Supporting schedule — IRS Form 1023</p>
        <h1>Board of Directors &amp; Officers Listing</h1>
        <h2>Application for Recognition of Exemption Under Section 501(c)(3) of the Internal Revenue Code</h2>
    </div>

    <div class="org-block">
        <table class="org-grid">
            <tr>
                <td class="label">Organization name</td>
                <td>{{ $organizationName }}</td>
            </tr>
            @if($organizationEin)
                <tr>
                    <td class="label">Employer ID (EIN)</td>
                    <td>{{ $organizationEin }}</td>
                </tr>
            @endif
            @if($organizationAddress)
                <tr>
                    <td class="label">Mailing address</td>
                    <td>{{ $organizationAddress }}</td>
                </tr>
            @endif
            @if($organizationPhone)
                <tr>
                    <td class="label">Phone</td>
                    <td>{{ $organizationPhone }}</td>
                </tr>
            @endif
            @if($organizationEmail)
                <tr>
                    <td class="label">Email</td>
                    <td>{{ $organizationEmail }}</td>
                </tr>
            @endif
            <tr>
                <td class="label">Date prepared</td>
                <td>{{ $generatedAt }}</td>
            </tr>
        </table>
    </div>

    <div class="section-title">Part VI — Officers, Directors, Trustees, and Key Employees</div>
    <p class="instructions">
        List all current {{ $activeOnly ? 'active ' : '' }}officers, directors, and trustees.
        Attach this schedule to Form 1023 or Form 1023-EZ as supporting documentation for governance and board composition.
    </p>

    @if(count($members) > 0)
        <table class="members">
            <thead>
                <tr>
                    <th class="num">#</th>
                    <th>Name</th>
                    <th>Title / position</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Date appointed</th>
                    <th>Compensation</th>
                    <th>Hours / week</th>
                </tr>
            </thead>
            <tbody>
                @foreach($members as $index => $member)
                    <tr>
                        <td class="num">{{ $index + 1 }}</td>
                        <td>{{ $member['name'] }}</td>
                        <td>{{ $member['title'] }}</td>
                        <td>{{ $member['email'] }}</td>
                        <td>{{ $member['status'] }}</td>
                        <td>{{ $member['appointed_on'] }}</td>
                        <td>{{ $member['compensation'] }}</td>
                        <td>{{ $member['hours_per_week'] }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @else
        <div class="empty">No {{ $activeOnly ? 'active ' : '' }}board members on file. Add board members before generating this filing document.</div>
    @endif

    <div class="cert">
        <strong>Certification.</strong>
        Under penalties of perjury, I declare that I have examined this listing and, to the best of my knowledge and belief,
        it is true, correct, and complete. This document reflects the current board of directors and officers of the organization
        named above as of {{ $generatedAt }}.
    </div>

    <table class="sig-grid">
        <tr>
            <td>
                <div class="sig-line">
                    @if($authorizedSignerName)
                        {{ $authorizedSignerName }}
                    @endif
                </div>
                <div>Signature of authorized officer</div>
            </td>
            <td>
                <div class="sig-line">{{ $generatedAt }}</div>
                <div>Date</div>
            </td>
        </tr>
        <tr>
            <td>
                <div class="sig-line" style="margin-top: 14px;">
                    @if($authorizedSignerTitle)
                        {{ $authorizedSignerTitle }}
                    @endif
                </div>
                <div>Title</div>
            </td>
            <td></td>
        </tr>
    </table>

    <div class="footer">
        Generated by Believe In Unity · Board governance filing schedule · {{ $organizationName }}
        @if($organizationEin) · EIN {{ $organizationEin }} @endif
    </div>
</body>
</html>
