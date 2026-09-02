/**
 * PM2 process definitions for Loara (Laravel).
 *
 * This file is `.cjs` on purpose: package.json sets `"type": "module"`, so a
 * plain `.js` PM2 config would be parsed as ESM and fail. PM2 needs CommonJS.
 *
 * Runs the two long-lived processes a production deploy needs:
 *   1. queue worker   — sends queued work (e.g. appointment reminder emails)
 *   2. schedule worker — fires scheduled commands every minute without system cron
 *                        (this is what triggers `appointments:send-reminders`)
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save            # persist process list across reboots
 *   pm2 startup         # generate the boot script (run the command it prints)
 *   pm2 logs loara-queue
 *   pm2 reload ecosystem.config.cjs   # zero-downtime reload after a deploy
 *
 * Point at a specific PHP binary if `php` is not the right one on PATH:
 *   PHP_BIN=/usr/bin/php8.4 pm2 start ecosystem.config.cjs
 */

const path = require('path');

const php = process.env.PHP_BIN || 'php';
const artisan = path.join(__dirname, 'artisan');
const logDir = path.join(__dirname, 'storage', 'logs');

/** Shared options for every Artisan-backed process. */
const base = {
    interpreter: php,
    cwd: __dirname,
    autorestart: true,
    watch: false,
    // Restart the process if it ever exits in a tight loop instead of hammering.
    exp_backoff_restart_delay: 1000,
    time: true,
};

module.exports = {
    apps: [
        {
            ...base,
            name: 'loara-queue',
            script: artisan,
            // queue:work (not listen) for production throughput.
            //   --max-time   recycle the worker hourly so it picks up new code and sheds memory
            //   --max-jobs   also recycle after N jobs as a leak guard
            //   --tries      retry a failing job before it lands in failed_jobs
            //   --backoff    seconds to wait before retrying a failed job
            //   --timeout    kill a single job that runs longer than this
            //   --sleep      seconds to idle when the queue is empty
            args: 'queue:work --queue=default --tries=3 --backoff=10 --timeout=90 --sleep=3 --max-time=3600 --max-jobs=1000',
            max_memory_restart: '256M',
            // Wait for the current job to finish before PM2 kills the worker on stop/reload.
            kill_timeout: 95000,
            out_file: path.join(logDir, 'pm2-queue-out.log'),
            error_file: path.join(logDir, 'pm2-queue-error.log'),
        },
        {
            ...base,
            name: 'loara-scheduler',
            script: artisan,
            // Long-running scheduler: invokes `schedule:run` every minute in-process,
            // replacing the need for a `* * * * * php artisan schedule:run` crontab entry.
            args: 'schedule:work',
            max_memory_restart: '192M',
            out_file: path.join(logDir, 'pm2-scheduler-out.log'),
            error_file: path.join(logDir, 'pm2-scheduler-error.log'),
        },
    ],
};
