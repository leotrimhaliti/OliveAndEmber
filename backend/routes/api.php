<?php

use App\Http\Controllers\AdminInvitationController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:public-api')->group(function () {
    Route::get('/categories', [ProductController::class, 'categories']);
    Route::get('/products', [ProductController::class, 'index']);
});
Route::middleware('throttle:registration')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
});
Route::middleware(['auth:sanctum', 'throttle:api-user'])->group(function () {
    Route::get('/user', fn (Request $request) => response()->json(['data' => $request->user()]));
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::post('/orders', [OrderController::class, 'store'])->middleware(['verified', 'throttle:10,1']);
    Route::prefix('admin')->middleware(['verified', 'admin'])->group(function () {
        Route::get('/invitations', [AdminInvitationController::class, 'index']);
        Route::post('/invitations', [AdminInvitationController::class, 'store'])->middleware('throttle:10,1');
        Route::delete('/invitations/{invitation}', [AdminInvitationController::class, 'destroy']);
        Route::get('/products', [ProductController::class, 'index']);
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);
        Route::get('/orders', [OrderController::class, 'adminIndex']);
        Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    });
});
