<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['name' => 'Olive & Ember API', 'frontend' => 'http://127.0.0.1:5173']);
});
