<?php

namespace App\Console\Commands;

use App\Services\LeaveMonetizationService;
use Illuminate\Console\Command;

class MonetizeYearEndLeaveCredits extends Command
{
    protected $signature = 'leave:monetize
                            {year? : The closing year to monetize (defaults to previous year)}
                            {--force : Allow monetizing the current year}';

    protected $description = 'Convert unused monetizable leave credits to cash payout records at year-end.';

    public function __construct(
        private LeaveMonetizationService $service,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $year  = (int) ($this->argument('year') ?? now()->year - 1);
        $force = (bool) $this->option('force');

        if ($year >= now()->year && ! $force) {
            $this->error("Cannot monetize year {$year} (current or future). Use --force to override.");
            return self::FAILURE;
        }

        $this->info("Running year-end leave monetization for {$year}...");

        $result = $this->service->run($year, 1 /* system user */, $force);

        $this->info("Created  : {$result['created']} record(s)");
        $this->info("Skipped  : {$result['skipped']} (already processed or no salary)");

        if (! empty($result['errors'])) {
            foreach ($result['errors'] as $err) {
                $this->warn($err);
            }
        }

        $this->info("Done.");
        return self::SUCCESS;
    }
}
