<?php

namespace Database\Seeders;

use App\Models\DeductionType;
use Illuminate\Database\Seeder;

class DeductionTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            // Government-mandated, auto-computed
            ['code' => 'SSS',              'name' => 'SSS Contribution',         'is_government' => true,  'is_auto_computed' => true,  'is_assignable' => false],
            ['code' => 'PHILHEALTH',       'name' => 'PhilHealth Contribution',  'is_government' => true,  'is_auto_computed' => true,  'is_assignable' => false],
            ['code' => 'PAGIBIG',          'name' => 'Pag-IBIG Contribution',    'is_government' => true,  'is_auto_computed' => true,  'is_assignable' => false],
            ['code' => 'WITHHOLDING_TAX',  'name' => 'Withholding Tax (TRAIN)',  'is_government' => true,  'is_auto_computed' => true,  'is_assignable' => false],
            // Manually assignable
            ['code' => 'SSS_LOAN',         'name' => 'SSS Loan',                 'is_government' => false, 'is_auto_computed' => false, 'is_assignable' => true],
            ['code' => 'PAGIBIG_LOAN',     'name' => 'Pag-IBIG Loan',           'is_government' => false, 'is_auto_computed' => false, 'is_assignable' => true],
            ['code' => 'CASH_ADVANCE',     'name' => 'Cash Advance',             'is_government' => false, 'is_auto_computed' => false, 'is_assignable' => true],
            ['code' => 'OTHER',            'name' => 'Other Deduction',          'is_government' => false, 'is_auto_computed' => false, 'is_assignable' => true],
        ];

        foreach ($types as $type) {
            DeductionType::updateOrCreate(
                ['code' => $type['code']],
                array_merge($type, ['is_active' => true])
            );
        }
    }
}
