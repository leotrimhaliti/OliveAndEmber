<?php

namespace App\Http\Controllers;

use App\Models\AdminInvitation;
use App\Services\AdminInvitations;
use Illuminate\Http\Request;

class AdminInvitationController extends Controller
{
    public function index()
    {
        return AdminInvitation::with('creator:id,name,email', 'user:id,name,email')
            ->latest('id')
            ->paginate(25);
    }

    public function store(Request $request, AdminInvitations $invitations)
    {
        $data = $request->validate([
            'email' => ['nullable', 'email', 'max:255'],
            'expires_in_hours' => ['required', 'integer', 'min:1', 'max:168'],
        ]);
        $issued = $invitations->issue($request->user(), $data['email'] ?? null, $data['expires_in_hours']);

        return response()->json([
            'data' => $issued['invitation'],
            'code' => $issued['code'],
        ], 201);
    }

    public function destroy(AdminInvitation $invitation)
    {
        abort_if($invitation->used_at, 409, 'A used invitation cannot be revoked.');
        $invitation->delete();

        return response()->noContent();
    }
}
