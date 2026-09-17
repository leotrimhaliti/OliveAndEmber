<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderStatusHistory extends Model
{
    protected $fillable = ['order_id', 'from_status', 'to_status', 'changed_by', 'note'];

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
