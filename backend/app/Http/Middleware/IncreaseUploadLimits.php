<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IncreaseUploadLimits
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Increase memory limit
        ini_set('memory_limit', '6048M');

        // Increase execution time
        ini_set('max_execution_time', 3600);

        // Increase PHP upload limits (5MB per file, 20MB total)
        ini_set('upload_max_filesize', '5M');
        ini_set('post_max_size', '20M');
        ini_set('max_file_uploads', '10');

        return $next($request);
    }
}
