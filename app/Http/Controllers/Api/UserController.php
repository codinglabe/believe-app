<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    /**
     * Get user profile
     */
    public function getProfile(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'contact_number' => $user->contact_number,
                'dob' => $user->dob,
                'image' => $user->image,
                'cover_img' => $user->cover_img,
                'balance' => $user->balance ?? 0,
                'reward_points' => $user->reward_points ?? 0,
                'believe_points' => $user->believe_points ?? 0,
                'created_at' => $user->created_at,
            ]
        ]);
    }

    /**
     * Update user profile
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'contact_number' => 'sometimes|string|max:20',
            'dob' => 'sometimes|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $user->update($request->only(['name', 'contact_number', 'dob']));

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'contact_number' => $user->contact_number,
                'dob' => $user->dob,
            ]
        ]);
    }

    /**
     * Get user balance
     */
    public function getBalance(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'balance' => $user->balance ?? 0,
                'currency' => 'USD',
            ]
        ]);
    }

    /**
     * Get user points
     */
    public function getPoints(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'reward_points' => $user->reward_points ?? 0,
                'believe_points' => $user->believe_points ?? 0,
            ]
        ]);
    }
}
