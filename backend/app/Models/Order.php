<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    public const STATUSES = ['pending', 'preparing', 'out_for_delivery', 'completed', 'cancelled'];

    protected $fillable = ['user_id', 'status', 'customer_name', 'phone', 'address', 'notes', 'total_cents'];

    protected function casts(): array
    {
        return ['total_cents' => 'integer'];
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
