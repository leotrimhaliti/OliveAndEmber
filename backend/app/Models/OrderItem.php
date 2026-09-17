<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    protected $fillable = ['product_id', 'product_name', 'unit_price_cents', 'quantity'];

    protected function casts(): array
    {
        return ['unit_price_cents' => 'integer', 'quantity' => 'integer'];
    }
}
