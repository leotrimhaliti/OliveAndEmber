<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_invitations', function (Blueprint $table) {
            $table->id();
            $table->string('token_hash', 64)->unique();
            $table->string('email')->nullable()->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('expires_at')->index();
            $table->timestamp('used_at')->nullable();
            $table->foreignId('used_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('idempotency_key', 64)->nullable();
            $table->string('idempotency_fingerprint', 64)->nullable();
            $table->unique(['user_id', 'idempotency_key']);
        });
        if (Schema::hasIndex('orders', 'orders_user_id_rollback_index')) {
            Schema::table('orders', fn (Blueprint $table) => $table->dropIndex('orders_user_id_rollback_index'));
        }

        Schema::create('order_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('from_status')->nullable();
            $table->string('to_status');
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('note', 500)->nullable();
            $table->timestamps();
            $table->index(['order_id', 'created_at']);
        });

        DB::table('orders')->orderBy('id')->chunkById(500, function ($orders) {
            $now = now();
            DB::table('order_status_histories')->insert($orders->map(fn ($order) => [
                'order_id' => $order->id,
                'from_status' => null,
                'to_status' => $order->status,
                'changed_by' => $order->user_id,
                'note' => 'Existing order imported into status history',
                'created_at' => $order->created_at ?? $now,
                'updated_at' => $now,
            ])->all());
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_status_histories');
        Schema::table('orders', function (Blueprint $table) {
            $table->index('user_id', 'orders_user_id_rollback_index');
            $table->dropUnique(['user_id', 'idempotency_key']);
            $table->dropColumn(['idempotency_key', 'idempotency_fingerprint']);
        });
        Schema::dropIfExists('admin_invitations');
    }
};
