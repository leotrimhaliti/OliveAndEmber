<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOrderRequest;
use App\Models\Order;
use App\Services\CreateOrder;
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
        abort_unless($order->user_id === $request->user()->id || $request->user()->role === 'admin', 404);

        return response()->json(['data' => $order->load('items')]);
    }

    public function store(StoreOrderRequest $request, CreateOrder $createOrder)
    {
        return response()->json(['data' => $createOrder->handle($request->user(), $request->validated())], 201);
    }

    public function adminIndex(Request $request)
    {
        $data = $request->validate(['status' => ['nullable', Rule::in(Order::STATUSES)]]);

        return Order::with('items', 'user:id,name,email')
            ->when($data['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->latest('id')->paginate(15);
    }

    public function updateStatus(Request $request, Order $order)
    {
        $data = $request->validate(['status' => ['required', Rule::in(Order::STATUSES)]]);
        // Administrators may correct a previous status; this is deliberately not a state machine.
        $order->update($data);

        return response()->json(['data' => $order->load('items')]);
    }
}
