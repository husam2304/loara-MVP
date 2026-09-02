<!DOCTYPE html>
<html dir="{{ app()->getLocale() === 'ar' ? 'rtl' : 'ltr' }}" lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
        @php
            $user = auth()->user();
            $clinic = $user?->clinic;
            if (! $clinic && $user?->isSuperAdmin()) {
                $clinicId = session('admin_selected_clinic_id');
                $clinic = $clinicId ? \App\Models\Clinic::find($clinicId) : \App\Models\Clinic::first();
            }
            $faviconUrl = $clinic?->favicon_url;
            $faviconHref = $faviconUrl
                ? asset('storage/' . $faviconUrl) . '?v=' . ($clinic->updated_at?->timestamp ?? 0)
                : asset('favicon.ico');
        @endphp
        <link rel="icon" href="{{ $faviconHref }}" />
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
        @inertiaHead
    </head>
    <body class="h-full antialiased">
        @inertia
    </body>
</html>
