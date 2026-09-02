<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Install Loara — @yield('step')</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; min-height: 100vh; background: #0a0a0b; color: #e5e5e7; font-family: 'Inter', system-ui, sans-serif; display: flex; align-items: flex-start; justify-content: center; padding: 48px 16px; }
        .wrap { width: 100%; max-width: 560px; }
        .brand { text-align: center; margin-bottom: 24px; }
        .brand h1 { font-family: 'JetBrains Mono', monospace; font-size: 22px; margin: 0; }
        .brand p { color: #a1a1aa; font-size: 13px; margin: 6px 0 0; }
        .steps { display: flex; gap: 8px; justify-content: center; margin-bottom: 24px; }
        .steps span { width: 28px; height: 4px; border-radius: 2px; background: #27272a; }
        .steps span.active { background: #22d3ee; }
        .card { background: #131316; border: 1px solid #27272a; border-radius: 14px; padding: 24px; }
        h2 { font-size: 17px; margin: 0 0 16px; }
        label { display: block; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #a1a1aa; margin-bottom: 6px; }
        input[type=text], input[type=url], input[type=email], input[type=password], input[type=number] {
            width: 100%; height: 40px; border-radius: 9px; border: 1px solid #27272a; background: #1c1c20; color: #e5e5e7; padding: 0 12px; font-size: 13px; outline: none; margin-bottom: 14px;
        }
        input:focus { border-color: #22d3ee; }
        .row { display: flex; gap: 12px; }
        .row > div { flex: 1; }
        .check { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1c1c20; font-size: 13px; }
        .ok { color: #4ade80; } .bad { color: #f87171; }
        .btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 11px; border: 0; border-radius: 10px; background: #22d3ee; color: #0a0a0b; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; }
        .btn[disabled] { opacity: .5; cursor: not-allowed; }
        .errors { background: #2a1215; border: 1px solid #7f1d1d; color: #fca5a5; border-radius: 9px; padding: 10px 12px; font-size: 12px; margin-bottom: 14px; }
        .muted { color: #a1a1aa; font-size: 13px; line-height: 1.6; }
        .checkbox { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 14px; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="brand">
            <h1>Loara</h1>
            <p>AI-Powered Front Desk — Installation</p>
        </div>
        <div class="steps">
            <span class="{{ in_array($current ?? 1, [1,2,3,4]) ? 'active' : '' }}"></span>
            <span class="{{ ($current ?? 1) >= 2 ? 'active' : '' }}"></span>
            <span class="{{ ($current ?? 1) >= 3 ? 'active' : '' }}"></span>
            <span class="{{ ($current ?? 1) >= 4 ? 'active' : '' }}"></span>
        </div>
        <div class="card">
            @if ($errors->any())
                <div class="errors">
                    @foreach ($errors->all() as $error)<div>{{ $error }}</div>@endforeach
                </div>
            @endif
            @yield('content')
        </div>
    </div>
</body>
</html>
