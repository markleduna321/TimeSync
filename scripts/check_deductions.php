<?php
// Quick diagnostic — run with: php scripts/check_deductions.php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$emp = App\Models\User::where('email', 'nightdemo@demo.com')->first();
$ps  = App\Models\Payslip::where('user_id', $emp->id)->latest()->first();

echo "Payslip: {$ps->period_start} → {$ps->period_end}\n";
echo "Deductions:\n";
foreach (App\Models\PayslipLine::where('payslip_id', $ps->id)->where('category', 'deduction')->get() as $l) {
    echo "  {$l->code}: ₱{$l->amount}\n";
}
echo "Earnings:\n";
foreach (App\Models\PayslipLine::where('payslip_id', $ps->id)->where('category', 'earning')->get() as $l) {
    echo "  {$l->code}: ₱{$l->amount}\n";
}
echo "\nGovt deduction settings:\n";
foreach (\Illuminate\Support\Facades\DB::table('user_government_deduction_settings')->where('user_id', $emp->id)->get() as $r) {
    echo "  {$r->code}: is_enabled={$r->is_enabled}\n";
}
