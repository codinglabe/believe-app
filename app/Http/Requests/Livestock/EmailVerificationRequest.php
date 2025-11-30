<?php

namespace App\Http\Requests\Livestock;

use Illuminate\Foundation\Auth\EmailVerificationRequest as BaseEmailVerificationRequest;

class EmailVerificationRequest extends BaseEmailVerificationRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user('livestock');
        
        if (!$user) {
            return false;
        }

        if (! hash_equals((string) $this->route('id'), (string) $user->getKey())) {
            return false;
        }

        if (! hash_equals((string) $this->route('hash'), sha1($user->getEmailForVerification()))) {
            return false;
        }

        return true;
    }

    /**
     * Get the user that should be verified.
     */
    public function user($guard = null)
    {
        if ($guard === null) {
            $guard = 'livestock';
        }
        return parent::user($guard);
    }
}

