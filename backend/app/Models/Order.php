<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    public const STATUSES = ['pending', 'preparing', 'out_for_delivery', 'completed', 'cancelled'];

    public const TRANSITIONS = [
        'pending' => ['preparing', 'cancelled'],
        'preparing' => ['out_for_delivery', 'cancelled'],
        'out_for_delivery' => ['completed'],
        'completed' => [],
        'cancelled' => [],
    ];

    protected $fillable = [
        'user_id', 'status', 'customer_name', 'phone', 'address', 'notes', 'total_cents',
        'idempotency_key', 'idempotency_fingerprint',
    ];

    protected $hidden = ['idempotency_key', 'idempotency_fingerprint'];

    protected $appends = ['allowed_transitions'];

    protected function casts(): array
    {
        return ['total_cents' => 'integer'];
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class)->oldest('id');
    }

    public function availableTransitions(): array
    {
        return self::TRANSITIONS[$this->status] ?? [];
    }

    protected function allowedTransitions(): Attribute
    {
        return Attribute::get(fn () => $this->availableTransitions());
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
