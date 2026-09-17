<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderWorkflow;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('Demo seeding is restricted to local and testing environments.');
        }
        foreach (['admin' => 'Alex Morgan', 'customer' => 'Jamie Taylor'] as $role => $name) {
            $user = User::firstOrNew(['email' => "$role@example.com"]);
            $user->fill(['name' => $name, 'password' => 'DemoFood2026!']);
            $user->role = $role;
            $user->email_verified_at = now();
            $user->save();
        }
        $menu = [
            ['Burgers', 'The Ember Burger', 'Flame-grilled beef, aged cheddar, crisp lettuce, and our smoky house sauce on a toasted brioche bun.', 1490, 'photo-1568901346375-23c9450c58cd'],
            ['Burgers', 'Crispy Chicken Burger', 'Buttermilk chicken, tangy slaw, pickles, and a little kick of chipotle mayo.', 1390, 'photo-1606755962773-d324e0a13086'],
            ['Pizza', 'Burrata Margherita', 'Slow-fermented dough, San Marzano tomatoes, creamy burrata, and fresh garden basil.', 1690, 'photo-1574071318508-1cdbab80d002'],
            ['Pizza', 'Spicy Pepperoni', 'Wood-fired crust, mozzarella, pepperoni, and a drizzle of hot honey.', 1790, 'photo-1628840042765-356cda07504e'],
            ['Bowls & Salads', 'Green Goddess Bowl', 'Roasted chickpeas, avocado, quinoa, crunchy greens, and lemon-tahini dressing.', 1290, 'photo-1512621776951-a57141f2eefd'],
            ['Bowls & Salads', 'Mediterranean Salad', 'Sweet tomatoes, cucumber, Kalamata olives, feta, and extra virgin olive oil.', 1190, 'photo-1540189549336-e6e99c3679fe'],
            ['Sides', 'Rosemary Fries', 'Golden, twice-cooked potatoes tossed with flaky sea salt and fresh rosemary.', 490, 'photo-1573080496219-bb080dd4f877'],
            ['Sides', 'Crispy Onion Rings', 'Sweet onions in a light, crunchy batter, served with smoky house dip.', 590, 'photo-1639024471283-03518883512d'],
            ['Desserts', 'Chocolate Brownie', 'A rich, fudgy chocolate brownie with dark chocolate chunks. Baked in-house.', 690, 'photo-1606313564200-e75d5e30476c'],
            ['Desserts', 'Berry Cheesecake', 'Vanilla cheesecake on a buttery biscuit base with a bright berry compote.', 790, 'photo-1533134242443-d4fd215305ad'],
            ['Drinks', 'Fresh Lemonade', 'Freshly squeezed lemons, a touch of cane sugar, and sparkling water.', 390, 'photo-1623084921164-4a8c5c37a912'],
            ['Drinks', 'Cold Brew Coffee', 'Our house blend, slow-steeped for 16 hours. Smooth, bold, and served over ice.', 450, 'photo-1461023058943-07fcbe16d735'],
        ];
        foreach ($menu as [$category, $name, $description, $price, $photo]) {
            $category = Category::firstOrCreate(['name' => $category]);
            Product::firstOrCreate(['name' => $name], [
                'category_id' => $category->id, 'description' => $description,
                'price_cents' => $price, 'is_available' => $name !== 'Berry Cheesecake',
                'image_url' => "https://images.unsplash.com/$photo?auto=format&fit=crop&w=900&q=85",
            ]);
        }
        $customer = User::where('email', 'customer@example.com')->firstOrFail();
        $admin = User::where('email', 'admin@example.com')->firstOrFail();
        if (! Order::where('user_id', $customer->id)->exists()) {
            $workflow = app(OrderWorkflow::class);
            $order = $workflow->placeOrder($customer, [
                'customer_name' => $customer->name, 'phone' => '+1 202 555 0148',
                'address' => '42 Garden Street, Apartment 3, Springfield', 'notes' => 'Please ring the doorbell.',
                'items' => [['product_id' => Product::first()->id, 'quantity' => 2]],
            ], 'demo-seed-order')->order;
            foreach (['preparing', 'out_for_delivery', 'completed'] as $status) {
                $order = $workflow->transitionOrder($order, $status, $admin, 'Demo order progression');
            }
        }
    }
}
