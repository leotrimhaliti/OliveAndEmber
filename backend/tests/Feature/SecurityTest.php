<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderWorkflow;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Laravel\Fortify\Fortify;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    private function product(): Product
    {
        return Product::create([
            'category_id' => Category::create(['name' => 'Mains'])->id,
            'name' => 'Dinner',
            'description' => 'A complete dinner.',
            'price_cents' => 1500,
            'image_url' => 'https://example.com/dinner.jpg',
            'is_available' => true,
        ]);
    }

    private function order(Product $product): TestResponse
    {
        return $this->withHeader('Idempotency-Key', (string) Str::uuid())->postJson('/api/orders', [
            'customer_name' => 'Jamie',
            'phone' => '2025550148',
            'address' => '42 Garden Street',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ]);
    }

    public function test_unverified_customer_can_verify_email_and_cannot_checkout_beforehand(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create();
        $this->actingAs($user);
        $this->order($this->product())->assertForbidden();

        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(30), [
            'id' => $user->id,
            'hash' => sha1($user->email),
        ]);
        $this->getJson($url)->assertNoContent();
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
        $this->order(Product::firstOrFail())->assertCreated();
    }

    public function test_password_reset_changes_the_password_without_revealing_account_existence(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'jamie@example.com']);

        $this->postJson('/api/forgot-password', ['email' => 'missing@example.com'])->assertOk();
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$token) {
            $token = $notification->token;

            return true;
        });

        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'A brand new password!',
            'password_confirmation' => 'A brand new password!',
        ])->assertOk();
        $this->assertTrue(Hash::check('A brand new password!', $user->fresh()->password));
    }

    public function test_administrator_must_configure_two_factor_and_can_complete_a_challenge(): void
    {
        $customer = User::factory()->create();
        $orderId = app(OrderWorkflow::class)->placeOrder($customer, [
            'customer_name' => 'Jamie',
            'phone' => '2025550148',
            'address' => '42 Garden Street',
            'items' => [['product_id' => $this->product()->id, 'quantity' => 1]],
        ], (string) Str::uuid())->order->id;

        $admin = User::factory()->create(['password' => 'StrongPassword!']);
        $admin->role = 'admin';
        $admin->save();
        $this->actingAs($admin);

        $this->getJson('/api/admin/products')->assertForbidden();
        $this->getJson("/api/orders/$orderId")->assertNotFound();
        $this->postJson('/api/user/confirm-password', ['password' => 'StrongPassword!'])->assertCreated();
        $this->postJson('/api/user/two-factor-authentication')->assertOk();
        $secret = $this->getJson('/api/user/two-factor-secret-key')->assertOk()->json('secretKey');
        $code = (new Google2FA)->getCurrentOtp($secret);
        $this->postJson('/api/user/confirmed-two-factor-authentication', ['code' => $code])->assertOk();
        $recoveryCode = $this->getJson('/api/user/two-factor-recovery-codes')->assertOk()->json('0');
        $this->assertTrue($admin->fresh()->hasEnabledTwoFactorAuthentication());
        $this->getJson('/api/admin/products')->assertOk();
        $this->getJson("/api/orders/$orderId")->assertOk();

        $this->postJson('/api/logout')->assertNoContent();
        $this->postJson('/api/login', ['email' => $admin->email, 'password' => 'StrongPassword!'])
            ->assertOk()->assertJsonPath('two_factor', true);
        $this->assertGuest('web');
        $this->postJson('/api/two-factor-challenge', ['recovery_code' => $recoveryCode])->assertNoContent();
        $this->assertAuthenticatedAs($admin, 'web');
    }

    public function test_secured_admin_can_issue_track_and_revoke_one_time_invitations(): void
    {
        $admin = User::factory()->create();
        $admin->forceFill([
            'role' => 'admin',
            'two_factor_secret' => Fortify::currentEncrypter()->encrypt('test-secret'),
            'two_factor_recovery_codes' => Fortify::currentEncrypter()->encrypt('[]'),
            'two_factor_confirmed_at' => now(),
        ])->save();
        $this->actingAs($admin);

        $created = $this->postJson('/api/admin/invitations', [
            'email' => 'new-admin@example.com',
            'expires_in_hours' => 24,
        ])->assertCreated()->assertJsonMissingPath('data.token_hash');
        $this->assertSame(48, strlen($created->json('code')));
        $id = $created->json('data.id');
        $this->getJson('/api/admin/invitations')->assertOk()->assertJsonPath('data.0.id', $id);
        $this->deleteJson("/api/admin/invitations/$id")->assertNoContent();
        $this->assertDatabaseMissing('admin_invitations', ['id' => $id]);
    }
}
