<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('code') — {{ config('app.name', 'Loara') }}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <style>
        :root { color-scheme: light dark; }
        * { box-sizing: border-box; }
        body {
            margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
            background: #0a0a0b; color: #e5e5e7; font-family: 'Inter', system-ui, sans-serif; padding: 24px;
        }
        .card { max-width: 460px; text-align: center; }
        .code { font-family: 'JetBrains Mono', monospace; font-size: 72px; font-weight: 700; color: #22d3ee; line-height: 1; margin: 0; }
        .title { font-size: 20px; font-weight: 600; margin: 16px 0 8px; }
        .message { font-size: 14px; color: #a1a1aa; margin: 0 0 28px; line-height: 1.6; }
        .btn {
            display: inline-block; padding: 10px 20px; border-radius: 10px; background: #22d3ee; color: #0a0a0b;
            font-size: 13px; font-weight: 600; text-decoration: none; transition: opacity .2s;
        }
        .btn:hover { opacity: .9; }
    </style>
</head>
<body>
    <div class="card">
        <p class="code">@yield('code')</p>
        <h1 class="title">@yield('title')</h1>
        <p class="message">@yield('message')</p>
        <a class="btn" href="{{ url('/') }}">Back to safety</a>
    </div>
</body>
</html>
