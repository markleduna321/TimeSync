<?php

namespace Database\Seeders;

use App\Models\AllowanceType;
use Illuminate\Database\Seeder;

class AllowanceTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            // BIR de minimis — non-taxable up to monthly limit
            [
                'name'                    => 'Rice Subsidy',
                'code'                    => 'RICE',
                'is_taxable'              => false,
                'monthly_de_minimis_limit' => 2000.00,
                'description'             => 'BIR de minimis — non-taxable up to ₱2,000/month.',
            ],
            [
                'name'                    => 'Clothing / Uniform Allowance',
                'code'                    => 'CLOTHING',
                'is_taxable'              => false,
                'monthly_de_minimis_limit' => 500.00,
                'description'             => 'BIR de minimis — non-taxable up to ₱6,000/year (₱500/month).',
            ],
            [
                'name'                    => 'Medical / Dental Allowance',
                'code'                    => 'MEDICAL',
                'is_taxable'              => false,
                'monthly_de_minimis_limit' => 833.33,
                'description'             => 'BIR de minimis — non-taxable up to ₱10,000/year (₱833.33/month).',
            ],
            [
                'name'                    => 'Laundry Allowance',
                'code'                    => 'LAUNDRY',
                'is_taxable'              => false,
                'monthly_de_minimis_limit' => 300.00,
                'description'             => 'BIR de minimis — non-taxable up to ₱300/month.',
            ],
            // Taxable allowances
            [
                'name'                    => 'Transportation Allowance',
                'code'                    => 'TRANSPORTATION',
                'is_taxable'              => true,
                'monthly_de_minimis_limit' => null,
                'description'             => 'Taxable transportation allowance.',
            ],
            [
                'name'                    => 'Meal Allowance',
                'code'                    => 'MEAL',
                'is_taxable'              => true,
                'monthly_de_minimis_limit' => null,
                'description'             => 'Taxable meal allowance.',
            ],
            [
                'name'                    => 'Communication Allowance',
                'code'                    => 'COMMUNICATION',
                'is_taxable'              => true,
                'monthly_de_minimis_limit' => null,
                'description'             => 'Taxable communication / mobile allowance.',
            ],
            [
                'name'                    => 'Performance Incentive',
                'code'                    => 'PERFORMANCE_BONUS',
                'is_taxable'              => true,
                'monthly_de_minimis_limit' => null,
                'description'             => 'Taxable performance-based incentive or commission.',
            ],
        ];

        foreach ($types as $data) {
            AllowanceType::firstOrCreate(['code' => $data['code']], $data);
        }
    }
}
