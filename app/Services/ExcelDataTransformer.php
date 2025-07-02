<?php
namespace App\Services;

use App\Models\NteeCode;
use App\Models\GroupCode;
use App\Models\StatusCode;
use App\Models\ActivityCode;
use App\Models\FoundationCode;
use App\Models\SubsectionCode;
use App\Models\AffiliationCode;
use App\Models\DeductibilityCode;
use App\Models\ClassificationCode;
use App\Models\OrganizationTypeCode;

class ExcelDataTransformer
{
    public static function transform(array $row): array
    {

        // dd($row);

        $columnMap = [
            'GROUP'          => 7,
            'SUBSECTION'     => 8,
            'AFFILIATION'    => 9,
            'CLASSIFICATION' => 10,
            'DEDUCTIBILITY'  => 12,
            'FOUNDATION'     => 13,
            'ACTIVITY'       => 14,
            'ORGANIZATION'   => 15,
            'STATUS'   => 16,
            'NTEE_CD'   => 26,
        ];

        /* GROUP */
        if (isset($row[$columnMap['GROUP']])) {
            $code                     = $row[$columnMap['GROUP']];
            $description              = GroupCode::where('group_code', $code)->value('description');
            $row[$columnMap['GROUP']] = $code . " - " . $description ?? $code;
        }

        /* SUBSECTION */
        if (isset($row[$columnMap['SUBSECTION']])) {
            $code                          = $row[$columnMap['SUBSECTION']];
            $description                   = SubsectionCode::where('subsection_codes', $code)->value('description');
            $row[$columnMap['SUBSECTION']] = $code . " - " . $description ?? $code;
        }

        /* AFFILIATION */
        if (isset($row[$columnMap['AFFILIATION']])) {
            $code                           = $row[$columnMap['AFFILIATION']];
            $description                    = AffiliationCode::where('affiliation_codes', $code)->value('description');
            $row[$columnMap['AFFILIATION']] = $code . " - " . $description ?? $code;
        }

        /* CLASSIFICATION */
        if (isset($row[$columnMap['CLASSIFICATION']])) {
            $code                              = $row[$columnMap['CLASSIFICATION']];
            $description                       = ClassificationCode::where('classification_code', $code)->value('description');
            $row[$columnMap['CLASSIFICATION']] = $code . " - " . $description ?? $code;
        }

        /* DEDUCTIBILITY */
        if (isset($row[$columnMap['DEDUCTIBILITY']])) {
            $code                             = $row[$columnMap['DEDUCTIBILITY']];
            $description                      = DeductibilityCode::where('deductibility_code', $code)->value('description');
            $row[$columnMap['DEDUCTIBILITY']] = $code . " - " . $description ?? $code;
        }

        /* FOUNDATION */
        if (isset($row[$columnMap['FOUNDATION']])) {
            $code                          = $row[$columnMap['FOUNDATION']];
            $description                   = FoundationCode::where('foundation_codes', $code)->value('description');
            $row[$columnMap['FOUNDATION']] = $code . " - " . $description ?? $code;
        }

        /* ACTIVITY */
        if (isset($row[$columnMap['ACTIVITY']])) {
            $code                        = $row[$columnMap['ACTIVITY']];
            $description                 = ActivityCode::where('activity_codes', $code)->value('description');
            $row[$columnMap['ACTIVITY']] = $code . " - " . $description ?? $code;
        }

        /* ORGANIZATION */
        if (isset($row[$columnMap['ORGANIZATION']])) {
            $code                            = $row[$columnMap['ORGANIZATION']];
            $description                     = OrganizationTypeCode::where('organization_code', $code)->value('description');
            $row[$columnMap['ORGANIZATION']] = $code . " - " . $description ?? $code;
        }

         /* STATUS */
        if (isset($row[$columnMap['STATUS']])) {
            $code                            = $row[$columnMap['STATUS']];
            $description                     = StatusCode::where('status_code', $code)->value('description');
            $row[$columnMap['STATUS']] = $code . " - " . $description ?? $code;
        }


        /* NTEE_CD */
        if (isset($row[$columnMap['NTEE_CD']])) {
            $code                            = $row[$columnMap['NTEE_CD']];
            $description                     = NteeCode::where('ntee_codes', $code)->value('description');
            $row[$columnMap['NTEE_CD']] = $code . " - " . $description ?? $code;
        }

        return $row;
    }
}
