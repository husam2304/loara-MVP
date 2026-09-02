<!DOCTYPE html>
<html dir="<?php echo e(app()->getLocale() === 'ar' ? 'rtl' : 'ltr'); ?>" lang="<?php echo e(str_replace('_', '-', app()->getLocale())); ?>" class="h-full">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
        <?php
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
        ?>
        <link rel="icon" href="<?php echo e($faviconHref); ?>" />
        <?php echo app('Illuminate\Foundation\Vite')->reactRefresh(); ?>
        <?php echo app('Illuminate\Foundation\Vite')(['resources/css/app.css', 'resources/js/app.tsx']); ?>
        <?php if (!isset($__inertiaSsrDispatched)) { $__inertiaSsrDispatched = true; $__inertiaSsrResponse = app(\Inertia\Ssr\Gateway::class)->dispatch($page); }  if ($__inertiaSsrResponse) { echo $__inertiaSsrResponse->head; } ?>
    </head>
    <body class="h-full antialiased">
        <?php if (!isset($__inertiaSsrDispatched)) { $__inertiaSsrDispatched = true; $__inertiaSsrResponse = app(\Inertia\Ssr\Gateway::class)->dispatch($page); }  if ($__inertiaSsrResponse) { echo $__inertiaSsrResponse->body; } elseif (config('inertia.use_script_element_for_initial_page')) { ?><script data-page="app" type="application/json"><?php echo json_encode($page); ?></script><div id="app"></div><?php } else { ?><div id="app" data-page="<?php echo e(json_encode($page)); ?>"></div><?php } ?>
    </body>
</html>
<?php /**PATH C:\Projects\loara\new\Loara\Loara\resources\views/app.blade.php ENDPATH**/ ?>