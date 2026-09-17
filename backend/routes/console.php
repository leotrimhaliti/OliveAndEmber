<?php

use App\Services\AdminInvitations;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('admin:invite {email?} {--expires=48}', function (AdminInvitations $invitations) {
    $hours = (int) $this->option('expires');
    if ($hours < 1 || $hours > 168) {
        $this->error('The expiration must be between 1 and 168 hours.');

        return 1;
    }

    $email = $this->argument('email');
    if ($email && ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $this->error('The email address is invalid.');

        return 1;
    }

    $issued = $invitations->issue(null, $email, $hours);
    $this->info('One-time administrator invitation:');
    $this->line($issued['code']);
    $this->line('Expires: '.$issued['invitation']->expires_at->toIso8601String());

    return 0;
})->purpose('Create a one-time administrator registration invitation');
