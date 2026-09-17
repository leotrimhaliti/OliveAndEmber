<?php

namespace App\Actions\Fortify;

use App\Models\User;
use App\Services\AdminInvitations;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    public function __construct(private readonly AdminInvitations $invitations) {}

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     *
     * @throws ValidationException
     */
    public function create(array $input): User
    {
        $data = Validator::make($input, [
            'name' => ['required', 'string', 'max:150'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique(User::class),
            ],
            'password' => $this->passwordRules(),
            'invitation_code' => ['nullable', 'string', 'max:255'],
            'role' => ['prohibited'],
        ])->validate();

        return DB::transaction(function () use ($data) {
            $invitation = empty($data['invitation_code'])
                ? null
                : $this->invitations->claim($data['invitation_code'], $data['email']);
            $user = User::create([
                'name' => $data['name'],
                'email' => Str::lower($data['email']),
                'password' => Hash::make($data['password']),
            ]);
            $user->role = $invitation ? 'admin' : 'customer';
            $user->save();

            if ($invitation) {
                $invitation->update(['used_at' => now(), 'used_by' => $user->id]);
            }

            event(new Registered($user));

            return $user;
        });
    }
}
