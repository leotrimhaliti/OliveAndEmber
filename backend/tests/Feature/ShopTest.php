<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Services\AdminInvitations;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class ShopTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
    }

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
        $user->two_factor_secret = 'encrypted-test-secret';
        $user->two_factor_recovery_codes = 'encrypted-test-recovery-codes';
        $user->two_factor_confirmed_at = now();
        $user->save();

        return $user;
    }

    private function registration(array $overrides = []): array
    {
        return array_merge(['name' => 'Jamie', 'email' => 'new@example.com', 'password' => 'StrongPassword!', 'password_confirmation' => 'StrongPassword!'], $overrides);
    }

    private function postOrder(array $payload, ?string $key = null): TestResponse
    {
        return $this->withHeader('Idempotency-Key', $key ?? (string) Str::uuid())
            ->postJson('/api/orders', $payload);
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
        $this->postJson('/api/register', $this->registration(['role' => 'admin']))->assertUnprocessable();
        $this->postJson('/api/register', $this->registration(['invitation_code' => 'wrong']))->assertUnprocessable();
        $issued = app(AdminInvitations::class)->issue(null, null, 48);
        $this->postJson('/api/register', $this->registration(['invitation_code' => $issued['code']]))
            ->assertCreated()->assertJsonPath('data.role', 'admin');
        $admin = User::where('email', 'new@example.com')->firstOrFail();
        $this->assertDatabaseHas('admin_invitations', ['id' => $issued['invitation']->id, 'used_by' => $admin->id]);
        $this->postJson('/api/logout')->assertNoContent();
        $this->postJson('/api/register', $this->registration([
            'email' => 'second@example.com',
            'invitation_code' => $issued['code'],
        ]))->assertUnprocessable()->assertJsonValidationErrors('invitation_code');
    }

    public function test_expired_or_email_mismatched_admin_invitation_is_rejected(): void
    {
        $issued = app(AdminInvitations::class)->issue(null, 'invited@example.com', 1);
        $this->postJson('/api/register', $this->registration(['invitation_code' => $issued['code']]))
            ->assertUnprocessable()->assertJsonValidationErrors('invitation_code');
        $issued['invitation']->update(['email' => null, 'expires_at' => now()->subMinute()]);
        $this->postJson('/api/register', $this->registration(['invitation_code' => $issued['code']]))
            ->assertUnprocessable()->assertJsonValidationErrors('invitation_code');
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
        $response = $this->postOrder($payload)->assertCreated()->assertJsonPath('data.total_cents', 2598)->assertJsonPath('data.status', 'pending');
        $product->update(['name' => 'Changed', 'price_cents' => 9999]);
        $product->delete();
        $this->getJson('/api/orders/'.$response->json('data.id'))->assertOk()
            ->assertJsonPath('data.items.0.product_name', 'Margherita')->assertJsonPath('data.items.0.unit_price_cents', 1299);
    }

    public function test_customers_only_see_their_own_orders(): void
    {
        $this->actingAs(User::factory()->create());
        $id = $this->postOrder($this->checkout($this->product()))->json('data.id');
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
            $this->postOrder($this->checkout($product, ['items' => [['product_id' => $product->id, 'quantity' => $quantity]]]))->assertUnprocessable();
        }
        $this->postOrder($this->checkout($product, ['items' => []]))->assertUnprocessable();
        $item = ['product_id' => $product->id, 'quantity' => 1];
        $this->postOrder($this->checkout($product, ['items' => [$item, $item]]))->assertUnprocessable();
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_unavailable_or_missing_product_leaves_no_partial_order(): void
    {
        $this->actingAs(User::factory()->create());
        $good = $this->product();
        $bad = $this->product(['is_available' => false]);
        foreach ([$bad->id, 9999] as $id) {
            $this->postOrder($this->checkout($good, ['items' => [
                ['product_id' => $good->id, 'quantity' => 1], ['product_id' => $id, 'quantity' => 1],
            ]]))->assertUnprocessable();
        }
        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('order_items', 0);
    }

    public function test_admin_order_transitions_are_enforced_and_audited(): void
    {
        $customer = User::factory()->create();
        $this->actingAs($customer);
        $id = $this->postOrder($this->checkout($this->product()))->json('data.id');
        $admin = $this->admin();
        $this->actingAs($admin);
        $this->getJson('/api/admin/orders')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/orders/$id")->assertOk();
        $this->patchJson("/api/admin/orders/$id/status", ['status' => 'completed'])->assertUnprocessable();
        $this->patchJson("/api/admin/orders/$id/status", ['status' => 'preparing', 'note' => 'Started by Alex'])
            ->assertOk()
            ->assertJsonPath('data.status', 'preparing')
            ->assertJsonPath('data.status_history.1.note', 'Started by Alex')
            ->assertJsonMissingPath('data.status_history.1.actor.email');
        $this->patchJson("/api/admin/orders/$id/status", ['status' => 'out_for_delivery'])->assertOk();
        $this->patchJson("/api/admin/orders/$id/status", ['status' => 'completed'])->assertOk();
        $this->patchJson("/api/admin/orders/$id/status", ['status' => 'cancelled'])->assertUnprocessable();
        $this->patchJson("/api/admin/orders/$id/status", ['status' => 'invalid'])->assertUnprocessable();
        $this->assertDatabaseCount('order_status_histories', 4);
        $this->assertDatabaseHas('order_status_histories', ['order_id' => $id, 'changed_by' => $customer->id, 'to_status' => 'pending']);
        $this->assertDatabaseHas('order_status_histories', ['order_id' => $id, 'changed_by' => $admin->id, 'to_status' => 'completed']);
    }

    public function test_checkout_idempotency_replays_the_same_order_and_rejects_key_reuse(): void
    {
        $this->actingAs(User::factory()->create());
        $payload = $this->checkout($this->product());
        $key = (string) Str::uuid();
        $first = $this->postOrder($payload, $key)->assertCreated()->assertHeader('Idempotent-Replayed', 'false');
        $this->postOrder($payload, $key)->assertOk()
            ->assertHeader('Idempotent-Replayed', 'true')
            ->assertJsonPath('data.id', $first->json('data.id'));
        $this->postOrder(array_merge($payload, ['address' => 'A different address']), $key)->assertConflict();
        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseCount('order_items', 1);
    }
}
