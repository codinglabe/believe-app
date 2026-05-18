<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FractionalAsset;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FractionalAssetController extends Controller
{
    public function index()
    {
        $assets = FractionalAsset::orderBy('created_at', 'desc')->paginate(20);

        return Inertia::render('admin/fractional/AssetIndex', [
            'assets' => $assets,
        ]);
    }

    public function create()
    {
        return Inertia::render('admin/fractional/AssetCreate', [
            'defaults' => [
                'type' => 'gold',
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:255'],
            'symbol' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'media' => ['nullable', 'array'],
            'meta' => ['nullable', 'array'],
        ]);

        $asset = FractionalAsset::create($validated);

        return redirect()->route('admin.fractional.assets.index')->with('success', 'Asset created successfully.');
    }

    public function edit(FractionalAsset $asset)
    {
        return Inertia::render('admin/fractional/AssetEdit', [
            'asset' => $asset,
        ]);
    }

    public function update(Request $request, FractionalAsset $asset)
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:255'],
            'symbol' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'media' => ['nullable', 'array'],
            'meta' => ['nullable', 'array'],
        ]);

        $asset->update($validated);

        return redirect()->route('admin.fractional.assets.index')->with('success', 'Asset updated successfully.');
    }

    public function destroy(FractionalAsset $asset)
    {
        // Check if asset has any offerings
        if ($asset->offerings()->exists()) {
            return redirect()->back()->with('error', 'Cannot delete asset with existing offerings.');
        }

        $asset->delete();

        return redirect()->route('admin.fractional.assets.index')->with('success', 'Asset deleted successfully.');
    }
}


