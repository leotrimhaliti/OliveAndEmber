<?php

use App\Http\Middleware\RequireAdmin;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $configuredProxies = env('TRUSTED_PROXIES');
        if ($configuredProxies) {
            $middleware->trustProxies(
                at: $configuredProxies === '*'
                    ? '*'
                    : array_values(array_filter(array_map('trim', explode(',', $configuredProxies)))),
            );
        }

        $middleware->statefulApi();
        $middleware->alias(['admin' => RequireAdmin::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
        $exceptions->respond(function (Response $response) {
            if (request()->is('api/*') && $response->getStatusCode() >= 400) {
                $body = json_decode($response->getContent(), true) ?: [];

                return response()->json([
                    'message' => $response->getStatusCode() >= 500 ? 'Something went wrong. Please try again.' : ($body['message'] ?? 'Request failed.'),
                    'errors' => $body['errors'] ?? (object) [],
                ], $response->getStatusCode(), $response->headers->all());
            }

            return $response;
        });
    })->create();
