<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->role === 'admin', 403, 'Administrator access required.');
        abort_unless($request->user()->hasVerifiedEmail(), 403, 'Verify your email before using administrator tools.');
        abort_unless($request->user()->hasEnabledTwoFactorAuthentication(), 403, 'Enable two-factor authentication before using administrator tools.');

        return $next($request);
    }
}
