<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ManualPaymentMethodSettingsValidator
{
    /**
     * Validate manual payment method credentials when toggles are enabled.
     *
     * @throws ValidationException
     */
    public static function validate(Request $request, ?string $existingCashappQrImage = null): void
    {
        $validator = Validator::make($request->all(), [
            'venmo_manual_enabled' => 'sometimes|boolean',
            'venmo_username' => 'nullable|string|max:100',
            'cashapp_manual_enabled' => 'sometimes|boolean',
            'cashapp_cashtag' => 'nullable|string|max:100',
            'cashapp_qr_image' => 'nullable|image|max:5120',
            'zelle_enabled' => 'sometimes|boolean',
            'zelle_email' => 'nullable|email|max:255',
            'zelle_phone' => 'nullable|string|max:30',
        ]);

        $validator->after(function ($v) use ($request, $existingCashappQrImage) {
            if ($request->boolean('venmo_manual_enabled') && ! filled(trim((string) $request->input('venmo_username')))) {
                $v->errors()->add(
                    'venmo_username',
                    'Venmo username is required when Venmo (Manual) is enabled.'
                );
            }

            if ($request->boolean('zelle_enabled')) {
                if (! filled(trim((string) $request->input('zelle_email')))) {
                    $v->errors()->add(
                        'zelle_email',
                        'Zelle email is required when Zelle is enabled.'
                    );
                }
                if (! filled(trim((string) $request->input('zelle_phone')))) {
                    $v->errors()->add(
                        'zelle_phone',
                        'Zelle phone is required when Zelle is enabled.'
                    );
                }
            }

            if ($request->boolean('cashapp_manual_enabled')) {
                $hasCashtag = filled(trim((string) $request->input('cashapp_cashtag')));
                $hasQr = $request->hasFile('cashapp_qr_image') || filled($existingCashappQrImage);

                if (! $hasCashtag && ! $hasQr) {
                    $v->errors()->add(
                        'cashapp_cashtag',
                        'Cash App cashtag or QR code image is required when Cash App (Manual) is enabled.'
                    );
                }
            }
        });

        $validator->validate();
    }
}
