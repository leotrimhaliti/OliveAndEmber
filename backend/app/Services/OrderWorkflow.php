<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderWorkflow
{
    public function placeOrder(User $user, array $data, string $idempotencyKey): OrderPlacement
    {
        $fingerprint = $this->fingerprint($data);

        return DB::transaction(function () use ($user, $data, $idempotencyKey, $fingerprint) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $existing = Order::where('user_id', $user->id)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing) {
                abort_unless(
                    hash_equals((string) $existing->idempotency_fingerprint, $fingerprint),
                    409,
                    'This checkout key was already used for different order details.',
                );

                return new OrderPlacement($existing->load('items', 'statusHistory.actor:id,name'), true);
            }

            $products = Product::whereIn('id', array_column($data['items'], 'product_id'))
                ->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $items = [];
            $total = 0;
            foreach ($data['items'] as $index => $item) {
                $product = $products->get($item['product_id']);
                if (! $product || ! $product->is_available) {
                    throw ValidationException::withMessages([
                        "items.$index.product_id" => ['This product is no longer available. Please update your cart.'],
                    ]);
                }
                $items[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'unit_price_cents' => $product->price_cents,
                    'quantity' => $item['quantity'],
                ];
                $total += $product->price_cents * $item['quantity'];
            }

            $order = Order::create([
                'user_id' => $user->id,
                'customer_name' => $data['customer_name'],
                'phone' => $data['phone'],
                'address' => $data['address'],
                'notes' => $data['notes'] ?? null,
                'total_cents' => $total,
                'status' => 'pending',
                'idempotency_key' => $idempotencyKey,
                'idempotency_fingerprint' => $fingerprint,
            ]);
            $order->items()->createMany($items);
            $order->statusHistory()->create([
                'to_status' => 'pending',
                'changed_by' => $user->id,
                'note' => 'Order placed',
            ]);

            return new OrderPlacement($order->load('items', 'statusHistory.actor:id,name'), false);
        }, 3);
    }

    public function transitionOrder(Order $order, string $newStatus, User $actor, ?string $note = null): Order
    {
        return DB::transaction(function () use ($order, $newStatus, $actor, $note) {
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();
            if ($order->status === $newStatus) {
                return $order->load('items', 'statusHistory.actor:id,name');
            }

            if (! in_array($newStatus, $order->availableTransitions(), true)) {
                throw ValidationException::withMessages([
                    'status' => ["An order cannot move from {$order->status} to $newStatus."],
                ]);
            }

            $previous = $order->status;
            $order->update(['status' => $newStatus]);
            $order->statusHistory()->create([
                'from_status' => $previous,
                'to_status' => $newStatus,
                'changed_by' => $actor->id,
                'note' => $note,
            ]);

            return $order->load('items', 'statusHistory.actor:id,name');
        }, 3);
    }

    private function fingerprint(array $data): string
    {
        $items = $data['items'];
        usort($items, fn (array $left, array $right) => $left['product_id'] <=> $right['product_id']);

        return hash('sha256', json_encode([
            'customer_name' => $data['customer_name'],
            'phone' => $data['phone'],
            'address' => $data['address'],
            'notes' => $data['notes'] ?? null,
            'items' => $items,
        ], JSON_THROW_ON_ERROR));
    }
}
