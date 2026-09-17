<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductRequest;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function categories()
    {
        return response()->json(['data' => Category::orderBy('id')->get()]);
    }

    public function index(Request $request)
    {
        $data = $request->validate(['category_id' => ['nullable', 'integer', 'exists:categories,id']]);
        $products = Product::with('category')
            ->when($data['category_id'] ?? null, fn ($query, $id) => $query->where('category_id', $id))
            ->orderBy('id')->get();

        return response()->json(['data' => $products]);
    }

    public function store(ProductRequest $request)
    {
        return response()->json(['data' => Product::create($request->validated())->load('category')], 201);
    }

    public function update(ProductRequest $request, Product $product)
    {
        $product->update($request->validated());

        return response()->json(['data' => $product->load('category')]);
    }

    public function destroy(Product $product)
    {
        // Soft deletion preserves the foreign key and historical order items.
        $product->delete();

        return response()->noContent();
    }
}
