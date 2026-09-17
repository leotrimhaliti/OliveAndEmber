<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOrderRequest;
use App\Models\Order;
use App\Services\OrderWorkflow;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        return Order::where('user_id', $request->user()->id)->with('items')->latest('id')->paginate(15);
    }

    public function show(Request $request, Order $order)
    {
        $user = $request->user();
        $isSecuredAdmin = $user->role === 'admin'
            && $user->hasVerifiedEmail()
            && $user->two_factor_enabled;
        abort_unless($order->user_id === $user->id || $isSecuredAdmin, 404);

        return response()->json(['data' => $order->load('items', 'statusHistory.actor:id,name')]);
    }

    public function store(StoreOrderRequest $request, OrderWorkflow $workflow)
    {
        $data = $request->validated();
        $placement = $workflow->placeOrder($request->user(), $data, $data['idempotency_key']);

        return response()
            ->json(['data' => $placement->order], $placement->replayed ? 200 : 201)
            ->header('Idempotent-Replayed', $placement->replayed ? 'true' : 'false');
    }

    public function adminIndex(Request $request)
    {
        $data = $request->validate(['status' => ['nullable', Rule::in(Order::STATUSES)]]);

        return Order::with('items', 'user:id,name,email')
            ->when($data['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->latest('id')->paginate(15);
    }

    public function updateStatus(Request $request, Order $order, OrderWorkflow $workflow)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(Order::STATUSES)],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        return response()->json([
            'data' => $workflow->transitionOrder($order, $data['status'], $request->user(), $data['note'] ?? null),
        ]);
    }
}
