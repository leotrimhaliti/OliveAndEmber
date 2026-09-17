<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['name' => 'Olive & Ember API', 'status' => 'ok']);
});

Route::get('/ready', function () {
    try {
        DB::select('select 1');

        return response()->json(['status' => 'ready']);
    } catch (Throwable $exception) {
        report($exception);

        return response()->json(['status' => 'unavailable'], 503);
    }
});
