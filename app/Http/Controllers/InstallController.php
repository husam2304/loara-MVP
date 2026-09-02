<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\View;
use Illuminate\View\View as ViewContract;

class InstallController extends Controller
{
    /**
     * PHP extensions and writable paths the application needs to run.
     *
     * @var array<int, string>
     */
    private array $requiredExtensions = [
        'pdo', 'mbstring', 'openssl', 'tokenizer', 'xml', 'ctype', 'json', 'bcmath', 'fileinfo', 'curl',
    ];

    public function requirements(): ViewContract
    {
        $extensions = collect($this->requiredExtensions)->mapWithKeys(
            fn (string $ext) => [$ext => extension_loaded($ext)],
        );

        $paths = [
            'storage/' => is_writable(storage_path()),
            'bootstrap/cache/' => is_writable(base_path('bootstrap/cache')),
            '.env' => is_writable(base_path('.env')) || is_writable(base_path()),
        ];

        $phpOk = version_compare(PHP_VERSION, '8.2.0', '>=');
        $passed = $phpOk && ! in_array(false, $extensions->all(), true) && ! in_array(false, $paths, true);

        return View::make('install.requirements', [
            'phpVersion' => PHP_VERSION,
            'phpOk' => $phpOk,
            'extensions' => $extensions,
            'paths' => $paths,
            'passed' => $passed,
        ]);
    }

    public function database(): ViewContract
    {
        return View::make('install.database', ['old' => session('install.db', [])]);
    }

    public function saveDatabase(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'app_name' => ['required', 'string', 'max:100'],
            'app_url' => ['required', 'url'],
            'db_host' => ['required', 'string'],
            'db_port' => ['required', 'numeric'],
            'db_database' => ['required', 'string'],
            'db_username' => ['required', 'string'],
            'db_password' => ['nullable', 'string'],
        ]);

        // Verify the connection before persisting anything.
        try {
            Config::set('database.connections.install_test', [
                'driver' => 'mysql',
                'host' => $data['db_host'],
                'port' => $data['db_port'],
                'database' => $data['db_database'],
                'username' => $data['db_username'],
                'password' => $data['db_password'] ?? '',
            ]);
            DB::connection('install_test')->getPdo();
        } catch (\Throwable $e) {
            return back()->withInput()->withErrors(['db_host' => 'Could not connect to the database: '.$e->getMessage()]);
        }

        $this->writeEnv([
            'APP_NAME' => '"'.$data['app_name'].'"',
            'APP_URL' => $data['app_url'],
            'APP_ENV' => 'production',
            'APP_DEBUG' => 'false',
            'DB_CONNECTION' => 'mysql',
            'DB_HOST' => $data['db_host'],
            'DB_PORT' => $data['db_port'],
            'DB_DATABASE' => $data['db_database'],
            'DB_USERNAME' => $data['db_username'],
            'DB_PASSWORD' => $data['db_password'] ?? '',
        ]);

        if (empty(config('app.key'))) {
            Artisan::call('key:generate', ['--force' => true]);
        }

        $request->session()->put('install.db', $data);

        return redirect()->route('install.admin');
    }

    public function admin(): ViewContract
    {
        return View::make('install.admin');
    }

    public function saveAdmin(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'seed_demo' => ['nullable', 'boolean'],
        ]);

        try {
            Artisan::call('migrate', ['--force' => true]);

            if ($request->boolean('seed_demo')) {
                Artisan::call('db:seed', ['--force' => true]);
            }

            User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => Hash::make($data['password']),
                    'role' => UserRole::SuperAdmin,
                    'is_active' => true,
                    'email_verified_at' => now(),
                ],
            );
        } catch (\Throwable $e) {
            return back()->withInput()->withErrors(['name' => 'Installation failed: '.$e->getMessage()]);
        }

        // Lock the installer so it cannot run again.
        file_put_contents(storage_path('installed'), 'installed at '.now()->toIso8601String().PHP_EOL);

        $request->session()->forget('install');

        return redirect()->route('install.complete');
    }

    public function complete(): ViewContract
    {
        return View::make('install.complete');
    }

    /**
     * Update or append keys in the project .env file.
     *
     * @param  array<string, string>  $values
     */
    private function writeEnv(array $values): void
    {
        $path = base_path('.env');

        if (! file_exists($path)) {
            copy(base_path('.env.example'), $path);
        }

        $content = file_get_contents($path);

        foreach ($values as $key => $value) {
            $line = $key.'='.$value;
            if (preg_match("/^{$key}=.*$/m", $content)) {
                $content = preg_replace("/^{$key}=.*$/m", $line, $content);
            } else {
                $content .= PHP_EOL.$line;
            }
        }

        file_put_contents($path, $content);
    }
}
