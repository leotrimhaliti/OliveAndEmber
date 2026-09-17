<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:10', 'max:72', 'confirmed', function ($attribute, $value, $fail) {
                // Bcrypt accepts at most 72 bytes, which is fewer than 72 characters for some Unicode text.
                if (is_string($value) && strlen($value) > 72) {
                    $fail('The password must be no longer than 72 bytes.');
                }
            }],
            'invitation_code' => ['nullable', 'string', 'max:255'],
            'role' => ['prohibited'],
        ]);
        $role = 'customer';
        if (! empty($data['invitation_code'])) {
            $expected = (string) config('shop.admin_invitation_code');
            if ($expected === '' || ! hash_equals($expected, $data['invitation_code'])) {
                throw ValidationException::withMessages(['invitation_code' => ['The invitation code is invalid.']]);
            }
            $role = 'admin';
        }
        $user = new User(collect($data)->only(['name', 'email', 'password'])->all());
        $user->role = $role;
        $user->save();
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return response()->json(['data' => $user], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        if (! Auth::guard('web')->attempt($data)) {
            throw ValidationException::withMessages(['email' => ['These credentials do not match our records.']]);
        }
        $request->session()->regenerate();

        return response()->json(['data' => Auth::guard('web')->user()]);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }
}
