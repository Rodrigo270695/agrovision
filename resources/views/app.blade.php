<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">
        <meta name="theme-color" content="#1a2b4c">
        <meta name="application-name" content="Agrovisión">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <meta name="apple-mobile-web-app-title" content="Agrovisión">
        <meta name="msapplication-TileColor" content="#1a2b4c">
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png?v=7">
        <link rel="manifest" href="/manifest.webmanifest?v=7">

        <link rel="icon" href="/favicon-32x32.png?v=7" type="image/png" sizes="32x32">
        <link rel="icon" href="/favicon-16x16.png?v=7" type="image/png" sizes="16x16">
        <link rel="icon" href="/icon-round.png?v=7" type="image/png" sizes="any">
        <link rel="shortcut icon" href="/favicon.ico?v=7">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=7">
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png?v=7">
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png?v=7">
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png?v=7">

        <script>
            (function () {
                document.documentElement.classList.remove('dark');
                document.documentElement.style.colorScheme = 'light';
                try {
                    localStorage.setItem('appearance', 'light');
                } catch (e) {}
            })();

            if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                    navigator.serviceWorker.register('/sw.js').then(function (registration) {
                        registration.update();
                    }).catch(function () {});
                });
            }
        </script>

        <style>
            html {
                background-color: oklch(1 0 0);
                color-scheme: light;
            }
        </style>

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Laravel') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
