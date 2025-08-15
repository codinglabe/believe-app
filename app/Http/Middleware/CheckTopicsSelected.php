<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckTopicsSelected
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    // CheckTopicsSelected.php
    public function handle(Request $request, Closure $next): Response
    {
        $excludedRoutes = ['topics.select', 'topics.store', 'logout'];

        if (in_array($request->route()->getName(), $excludedRoutes)) {
            return $next($request);
        }

        // if ($request->user() && !$request->user()->interestedTopics()->exists()) {
        //     if($request->user()->hasRole("organization")){
        //         return redirect()->route('auth.topics.select');
        //     }elseif($request->user()->hasRole("user")){
        //         return redirect()->route('user.topics.select');
        //     }

        //     return $next($request);
        // }

        return $next($request);
    }
}
