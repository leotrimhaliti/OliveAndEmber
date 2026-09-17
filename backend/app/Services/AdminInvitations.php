<?php

namespace App\Services;

use App\Models\AdminInvitation;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AdminInvitations
{
    public function issue(?User $creator, ?string $email, int $hours): array
    {
        $token = Str::random(48);
        $invitation = AdminInvitation::create([
            'token_hash' => hash('sha256', $token),
            'email' => $email ? Str::lower($email) : null,
            'created_by' => $creator?->id,
            'expires_at' => now()->addHours($hours),
        ]);

        return ['invitation' => $invitation, 'code' => $token];
    }

    public function claim(string $code, string $email): AdminInvitation
    {
        $invitation = AdminInvitation::where('token_hash', hash('sha256', $code))
            ->lockForUpdate()
            ->first();

        if (! $invitation || $invitation->used_at || $invitation->expires_at->isPast()) {
            throw ValidationException::withMessages(['invitation_code' => ['This invitation is invalid, expired, or already used.']]);
        }

        if ($invitation->email && ! hash_equals($invitation->email, Str::lower($email))) {
            throw ValidationException::withMessages(['invitation_code' => ['This invitation was issued for a different email address.']]);
        }

        return $invitation;
    }
}
