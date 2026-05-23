<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (
            $user &&
            $user->must_change_password &&
            ! $user->hasRole('super_admin') &&
            ! $request->routeIs('password.change') &&
            ! $request->routeIs('logout')
        ) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Password change required.', 'must_change_password' => true], 403);
            }

            return redirect()->route('password.change');
        }

        return $next($request);
    }
}
