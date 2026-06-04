<?php

namespace Tests\Unit\Services;

use App\Models\User;
use App\Services\TimezoneService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class TimezoneServiceTest extends TestCase
{
    public function test_format_utc_for_timezone_converts_instant_correctly(): void
    {
        $formatted = TimezoneService::formatUtcForTimezone(
            '2025-06-05 16:00:00',
            'America/Chicago',
            'Y-m-d H:i',
        );

        $this->assertSame('2025-06-05 11:00', $formatted);
    }

    public function test_request_timezone_prefers_browser_header(): void
    {
        $request = Request::create('/', 'GET');
        $request->headers->set('X-Timezone', 'Asia/Dhaka');

        $this->assertSame('Asia/Dhaka', TimezoneService::requestTimezone($request));
    }

    public function test_for_user_uses_stored_profile_timezone(): void
    {
        $user = new User(['timezone' => 'America/Los_Angeles']);

        $this->assertSame('America/Los_Angeles', TimezoneService::forUser($user));
    }

    public function test_for_user_falls_back_when_missing(): void
    {
        $this->assertSame('America/Chicago', TimezoneService::forUser(new User));
    }

    public function test_request_timezone_uses_web_user_when_header_missing(): void
    {
        $user = User::factory()->make(['timezone' => 'Asia/Dhaka']);
        Auth::guard('web')->setUser($user);

        $request = Request::create('/', 'GET');

        $this->assertSame('Asia/Dhaka', TimezoneService::requestTimezone($request));
    }
}
