<?php

namespace App\Actions\Fortify;

use Illuminate\Contracts\Validation\Rule;
use Illuminate\Validation\Rules\Password;

trait PasswordValidationRules
{
    /**
     * Get the validation rules used to validate passwords.
     *
     * @return array<int, Rule|array<mixed>|string>
     */
    protected function passwordRules(): array
    {
        return [
            'required',
            'string',
            Password::min(10),
            'max:72',
            'confirmed',
            function ($attribute, $value, $fail) {
                if (is_string($value) && strlen($value) > 72) {
                    $fail('The password must be no longer than 72 bytes.');
                }
            },
        ];
    }
}
