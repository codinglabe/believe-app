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
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Increase memory limit
        ini_set('memory_limit', '6048M');

        // Increase execution time
        ini_set('max_execution_time', 3600);

        // Challenge Hub covers and similar uploads (max ~5120 KB ≈ 5 MB per Laravel rule).
        // Nginx must also allow the body; see client_max_body_size (413 if too low).
        ini_set('upload_max_filesize', '12M');
        ini_set('post_max_size', '25M');
        ini_set('max_file_uploads', '10');

        return $next($request);
    }
}
