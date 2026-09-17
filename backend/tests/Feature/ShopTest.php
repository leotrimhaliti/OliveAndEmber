<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShopTest extends TestCase
{
    use RefreshDatabase;

    private function product(array $overrides = []): Product
    {
        return Product::create(array_merge([
            'category_id' => Category::firstOrCreate(['name' => 'Pizza'])->id,
            'name' => 'Margherita', 'description' => 'Tomato and basil.',
            'price_cents' => 1299, 'image_url' => 'https://example.com/pizza.jpg', 'is_available' => true,
        ], $overrides));
    }

    private function checkout(Product $product, array $overrides = []): array
    {
        return array_merge([
            'customer_name' => 'Jamie', 'phone' => '2025550148', 'address' => '42 Garden Street',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ], $overrides);
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->role = 'admin';
        $user->save();

        return $user;
    }

    private function registration(array $overrides = []): array
    {
        return array_merge(['name' => 'Jamie', 'email' => 'new@example.com', 'password' => 'StrongPassword!', 'password_confirmation' => 'StrongPassword!'], $overrides);
    }

    public function test_registration_login_and_logout_use_sessions(): void
    {
        $this->withHeader('Origin', 'http://localhost:5173');
        $this->postJson('/api/register', $this->registration())->assertCreated()->assertJsonPath('data.role', 'customer')->assertJsonMissingPath('data.password');
        $this->getJson('/api/user')->assertOk();
        $this->postJson('/api/logout')->assertNoContent();
        $this->assertGuest('web');
        $this->postJson('/api/login', ['email' => 'new@example.com', 'password' => 'wrong'])->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->postJson('/api/login', ['email' => 'new@example.com', 'password' => 'StrongPassword!'])->assertOk();
        $this->assertAuthenticated('web');
    }

    public function test_admin_registration_requires_valid_invitation_and_rejects_role(): void
    {
        $this->withHeader('Origin', 'http://localhost:5173');
        config(['shop.admin_invitation_code' => 'private-test-invitation']);
        $this->postJson('/api/register', $this->registration(['role' => 'admin']))->assertUnprocessable();
        $this->postJson('/api/register', $this->registration(['invitation_code' => 'wrong']))->assertUnprocessable();
        $this->postJson('/api/register', $this->registration(['invitation_code' => 'private-test-invitation']))->assertCreated()->assertJsonPath('data.role', 'admin');
    }

    public function test_empty_config_disables_admin_registration(): void
    {
        config(['shop.admin_invitation_code' => '']);
        $this->postJson('/api/register', $this->registration(['invitation_code' => 'anything']))->assertUnprocessable();
        $this->assertDatabaseCount('users', 0);
    }

    public function test_registration_validates_password_confirmation_and_bcrypt_byte_limit(): void
    {
        foreach (['short', str_repeat('a', 73), str_repeat('é', 37)] as $password) {
            $this->postJson('/api/register', $this->registration([
                'password' => $password, 'password_confirmation' => $password,
            ]))->assertUnprocessable()->assertJsonValidationErrors('password');
        }
        $this->postJson('/api/register', $this->registration(['password_confirmation' => 'mismatch']))
            ->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->assertDatabaseCount('users', 0);
    }

    public function test_guests_and_customers_cannot_use_admin_endpoints(): void
    {
        $product = $this->product();
        $this->getJson('/api/admin/orders')->assertUnauthorized()->assertJsonStructure(['message', 'errors']);
        $this->getJson('/api/orders')->assertUnauthorized();
        $this->actingAs(User::factory()->create());
        $this->getJson('/api/admin/orders')->assertForbidden();
        $this->postJson('/api/admin/products', [])->assertForbidden();
        $this->putJson("/api/admin/products/$product->id", [])->assertForbidden();
        $this->deleteJson("/api/admin/products/$product->id")->assertForbidden();
    }

    public function test_catalog_filters_by_category(): void
    {
        $pizza = $this->product();
        $other = Category::create(['name' => 'Drinks']);
        $this->product(['category_id' => $other->id]);
        $this->getJson('/api/products?category_id='.$pizza->category_id)->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_admin_can_manage_products_and_validation_is_enforced(): void
    {
        $this->actingAs($this->admin());
        $product = $this->product();
        $valid = $product->only(['name', 'description', 'price_cents', 'image_url', 'category_id', 'is_available']);
        $this->postJson('/api/admin/products', array_merge($valid, ['price_cents' => -1, 'category_id' => 999, 'image_url' => 'javascript:alert(1)']))
            ->assertUnprocessable()->assertJsonValidationErrors(['price_cents', 'category_id', 'image_url']);
        $this->postJson('/api/admin/products', $valid)->assertCreated();
        $this->putJson("/api/admin/products/$product->id", array_merge($valid, ['is_available' => false]))->assertOk()->assertJsonPath('data.is_available', false);
        $this->deleteJson("/api/admin/products/$product->id")->assertNoContent();
        $this->assertSoftDeleted($product);
    }

    public function test_checkout_uses_database_prices_and_keeps_historical_snapshots(): void
    {
        $this->actingAs(User::factory()->create());
        $product = $this->product();
        $payload = $this->checkout($product, ['total_cents' => 1, 'status' => 'completed', 'user_id' => 99]);
        $payload['items'][0]['unit_price_cents'] = 1;
        $response = $this->postJson('/api/orders', $payload)->assertCreated()->assertJsonPath('data.total_cents', 2598)->assertJsonPath('data.status', 'pending');
        $product->update(['name' => 'Changed', 'price_cents' => 9999]);
        $product->delete();
        $this->getJson('/api/orders/'.$response->json('data.id'))->assertOk()
            ->assertJsonPath('data.items.0.product_name', 'Margherita')->assertJsonPath('data.items.0.unit_price_cents', 1299);
    }

    public function test_customers_only_see_their_own_orders(): void
    {
        $this->actingAs(User::factory()->create());
        $id = $this->postJson('/api/orders', $this->checkout($this->product()))->json('data.id');
        $this->actingAs(User::factory()->create());
        $this->getJson("/api/orders/$id")->assertNotFound();
        $this->getJson('/api/orders')->assertOk()->assertJsonCount(0, 'data');
        $this->patchJson("/api/admin/orders/$id/status", ['status' => 'completed'])->assertForbidden();
    }

    public function test_checkout_rejects_bad_quantities_duplicates_and_empty_carts(): void
    {
        $this->actingAs(User::factory()->create());
        $product = $this->product();
        foreach ([0, -1, 21, 1.5, 'abc'] as $quantity) {
            $this->postJson('/api/orders', $this->checkout($product, ['items' => [['product_id' => $product->id, 'quantity' => $quantity]]]))->assertUnprocessable();
        }
        $this->postJson('/api/orders', $this->checkout($product, ['items' => []]))->assertUnprocessable();
        $item = ['product_id' => $product->id, 'quantity' => 1];
        $this->postJson('/api/orders', $this->checkout($product, ['items' => [$item, $item]]))->assertUnprocessable();
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_unavailable_or_missing_product_leaves_no_partial_order(): void
    {
        $this->actingAs(User::factory()->create());
        $good = $this->product();
        $bad = $this->product(['is_available' => false]);
        foreach ([$bad->id, 9999] as $id) {
            $this->postJson('/api/orders', $this->checkout($good, ['items' => [
                ['product_id' => $good->id, 'quantity' => 1], ['product_id' => $id, 'quantity' => 1],
            ]]))->assertUnprocessable();
        }
        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('order_items', 0);
    }

    public function test_admin_can_view_orders_and_update_all_supported_statuses(): void
    {
        $this->actingAs(User::factory()->create());
        $id = $this->postJson('/api/orders', $this->checkout($this->product()))->json('data.id');
        $this->actingAs($this->admin());
        $this->getJson('/api/admin/orders')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/orders/$id")->assertOk();
        foreach (Order::STATUSES as $status) {
            $this->patchJson("/api/admin/orders/$id/status", ['status' => $status])->assertOk()->assertJsonPath('data.status', $status);
        }
        $this->patchJson("/api/admin/orders/$id/status", ['status' => 'invalid'])->assertUnprocessable();
    }
}
