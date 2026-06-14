<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Supporter Ledger — {{ $organizationName }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #1e293b; }
        h1 { font-size: 16px; margin: 0 0 4px; }
        .meta { font-size: 9px; color: #64748b; margin-bottom: 14px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #cbd5e1; padding: 4px 5px; text-align: left; vertical-align: top; }
        th { background: #f1f5f9; font-size: 8px; text-transform: uppercase; }
        td { font-size: 8px; }
        .num { text-align: right; }
    </style>
</head>
<body>
    <h1>Supporter Ledger</h1>
    <p class="meta">
        {{ $organizationName }}
        @if($organizationEin)
            · EIN {{ $organizationEin }}
        @endif
        · Generated {{ $generatedAt }}
        · {{ count($rows) }} supporter(s)
    </p>
    <table>
        <thead>
            <tr>
                @foreach($headers as $header)
                    <th>{{ $header }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $row)
                <tr>
                    @foreach($row as $cell)
                        <td>{{ $cell }}</td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td colspan="{{ count($headers) }}">No supporters match the selected filters.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
