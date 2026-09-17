<?php

namespace App\Http\Controllers;

use App\Actions\Fortify\CreateNewUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function register(Request $request, CreateNewUser $createNewUser)
    {
        $user = $createNewUser->create($request->all());
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return response()->json(['data' => $user], 201);
    }
}
