<?php

namespace App\Services;

use App\Models\AdminSetting;
use App\Models\Form1023Application;

class Form1023FeeService
{
    public const FORM_1023 = '1023';

    public const FORM_1023_EZ = '1023-ez';

    /**
     * @return list<string>
     */
    public static function formTypes(): array
    {
        return [self::FORM_1023, self::FORM_1023_EZ];
    }

    public static function normalizeFormType(?string $formType): string
    {
        $formType = strtolower(trim((string) $formType));

        return $formType === self::FORM_1023_EZ ? self::FORM_1023_EZ : self::FORM_1023;
    }

    /**
     * @return array{
     *     form_1023_application_fee: float,
     *     form_1023_ez_application_fee: float,
     *     form_1023_processing_filing_fee: float,
     *     form_1023_ez_processing_filing_fee: float,
     *     compliance_application_fee: float
     * }
     */
    public static function schedule(): array
    {
        return [
            'form_1023_application_fee' => self::applicationFee(self::FORM_1023),
            'form_1023_ez_application_fee' => self::applicationFee(self::FORM_1023_EZ),
            'form_1023_processing_filing_fee' => self::processingFilingFee(self::FORM_1023),
            'form_1023_ez_processing_filing_fee' => self::processingFilingFee(self::FORM_1023_EZ),
            'compliance_application_fee' => (float) AdminSetting::get('compliance_application_fee', 399.00),
        ];
    }

    public static function applicationFee(string $formType): float
    {
        $formType = self::normalizeFormType($formType);

        if ($formType === self::FORM_1023_EZ) {
            return (float) AdminSetting::get('form_1023_ez_application_fee', 275.00);
        }

        return (float) AdminSetting::get('form_1023_application_fee', 600.00);
    }

    public static function processingFilingFee(string $formType): float
    {
        $formType = self::normalizeFormType($formType);

        if ($formType === self::FORM_1023_EZ) {
            return (float) AdminSetting::get('form_1023_ez_processing_filing_fee', 150.00);
        }

        return (float) AdminSetting::get('form_1023_processing_filing_fee', 300.00);
    }

    public static function totalForFormType(string $formType): float
    {
        return round(self::applicationFee($formType) + self::processingFilingFee($formType), 2);
    }

    /**
     * @return array{
     *     form_type: string,
     *     application_fee: float,
     *     processing_filing_fee: float,
     *     total: float,
     *     label: string
     * }
     */
    public static function breakdownForFormType(string $formType): array
    {
        $formType = self::normalizeFormType($formType);

        return [
            'form_type' => $formType,
            'application_fee' => self::applicationFee($formType),
            'processing_filing_fee' => self::processingFilingFee($formType),
            'total' => self::totalForFormType($formType),
            'label' => $formType === self::FORM_1023_EZ ? 'Form 1023-EZ' : 'Form 1023',
        ];
    }

    public static function totalForApplication(Form1023Application $application): float
    {
        if ($application->amount !== null && (float) $application->amount > 0) {
            return (float) $application->amount;
        }

        return self::totalForFormType($application->form_type ?? self::FORM_1023);
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public static function persistSchedule(array $input): void
    {
        $keys = [
            'form_1023_application_fee' => 'float',
            'form_1023_ez_application_fee' => 'float',
            'form_1023_processing_filing_fee' => 'float',
            'form_1023_ez_processing_filing_fee' => 'float',
            'compliance_application_fee' => 'float',
        ];

        foreach ($keys as $key => $type) {
            AdminSetting::set($key, $input[$key], $type);
        }
    }
}
