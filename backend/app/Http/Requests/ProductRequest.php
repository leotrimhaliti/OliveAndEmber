<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'description' => ['required', 'string', 'max:2000'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'price_cents' => ['required', 'integer', 'min:1', 'max:100000'],
            'image_url' => ['required', 'url:http,https', 'max:2048'],
            'is_available' => ['required', 'boolean'],
        ];
    }
}
