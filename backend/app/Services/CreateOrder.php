<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateOrder
{
    public function handle(User $user, array $data): Order
    {
        return DB::transaction(function () use ($user, $data) {
            // Lock in a consistent order, so prices/availability cannot change mid-checkout.
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
            ]);
            $order->items()->createMany($items);

            return $order->load('items');
        }, 3);
    }
}
