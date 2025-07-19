<?php

namespace App\Http\Controllers;

use App\Models\NodeBoss;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Inertia\Inertia;

class NodeBossController extends Controller
{
    public function index(Request $request)
    {
        $query = NodeBoss::query();

        // Search functionality
        if ($request->has('search') && $request->search) {
            $query->where('name', 'like', '%' . $request->search . '%')
                ->orWhere('description', 'like', '%' . $request->search . '%');
        }

        // Status filter
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Sort functionality
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $nodeBosses = $query->paginate(12)->withQueryString();

        return Inertia::render('admin/node-boss/index', [
            'nodeBosses' => $nodeBosses,
            'filters' => $request->only(['search', 'status', 'sort_by', 'sort_order']),
        ]);
    }

    public function create()
    {
        return Inertia::render('admin/node-boss/create');
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'suggested_amounts' => 'required|array|min:1',
            'suggested_amounts.*' => 'numeric|min:1',
            'is_closed' => 'boolean',
            'status' => 'required|in:active,inactive,draft',
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:10240', // 10MB max
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $data = $request->all();

        // Handle image upload
        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $imageName = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            $imagePath = $image->storeAs('node-boss-images', $imageName, 'public');
            $data['image'] = $imagePath;
        }

        // Convert suggested amounts to JSON
        $data['suggested_amounts'] = json_encode($request->suggested_amounts);
        $data['created_by'] = auth()->id(); // Assuming you want to track who created the NodeBoss
        $data['slug'] = Str::slug($data['name'], '-');
        $data['user_id'] = auth()->id(); // Set the user ID to the currently authenticated user
        NodeBoss::create($data);

        return redirect()->route('node-boss.index')->with('success', 'NodeBoss created successfully!');
    }

    public function show($id)
    {
        $nodeBoss = NodeBoss::findOrFail($id);

        return Inertia::render('admin/node-boss/Show', [
            'nodeBoss' => $nodeBoss,
        ]);
    }

    public function edit($id)
    {
        $nodeBoss = NodeBoss::findOrFail($id);

        return Inertia::render('NodeBoss/Edit', [
            'nodeBoss' => $nodeBoss,
        ]);
    }

    public function update(Request $request, $id)
    {
        $nodeBoss = NodeBoss::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'suggested_amounts' => 'required|array|min:1',
            'suggested_amounts.*' => 'numeric|min:1',
            'is_closed' => 'boolean',
            'status' => 'required|in:active,inactive,draft',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:10240',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $data = $request->all();

        // Handle image upload
        if ($request->hasFile('image')) {
            // Delete old image
            if ($nodeBoss->image && Storage::disk('public')->exists($nodeBoss->image)) {
                Storage::disk('public')->delete($nodeBoss->image);
            }

            $image = $request->file('image');
            $imageName = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            $imagePath = $image->storeAs('node-boss-images', $imageName, 'public');
            $data['image'] = $imagePath;
        }

        // Convert suggested amounts to JSON
        $data['suggested_amounts'] = json_encode($request->suggested_amounts);

        $nodeBoss->update($data);

        return redirect()->route('node-boss.index')->with('success', 'NodeBoss updated successfully!');
    }

    public function destroy($id)
    {
        $nodeBoss = NodeBoss::findOrFail($id);

        // Delete image file
        if ($nodeBoss->image && Storage::disk('public')->exists($nodeBoss->image)) {
            Storage::disk('public')->delete($nodeBoss->image);
        }

        $nodeBoss->delete();

        return redirect()->route('node-boss.index')->with('success', 'NodeBoss deleted successfully!');
    }
}
