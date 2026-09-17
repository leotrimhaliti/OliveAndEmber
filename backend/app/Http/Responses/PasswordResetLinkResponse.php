<?php

namespace App\Http\Responses;

use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse;
use Laravel\Fortify\Contracts\SuccessfulPasswordResetLinkRequestResponse;

class PasswordResetLinkResponse implements FailedPasswordResetLinkRequestResponse, SuccessfulPasswordResetLinkRequestResponse
{
    public function __construct(private readonly string $status) {}

    public function toResponse($request)
    {
        return response()->json([
            'message' => 'If an account matches that email address, a password reset link has been sent.',
        ]);
    }
}
