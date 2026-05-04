<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $definitions = [
            ['name' => 'Super Admin', 'slug' => 'super_admin', 'description' => 'Full system access',               'level' => 5],
            ['name' => 'Admin',       'slug' => 'admin',       'description' => 'Payroll and user management',       'level' => 4],
            ['name' => 'Manager',     'slug' => 'manager',     'description' => 'Team and schedule management',      'level' => 3],
            ['name' => 'Team Lead',   'slug' => 'team_lead',   'description' => 'Leads a team of employees',         'level' => 2],
            ['name' => 'Employee',    'slug' => 'employee',    'description' => 'Standard employee access',          'level' => 1],
        ];

        foreach ($definitions as $def) {
            Role::updateOrCreate(['slug' => $def['slug']], $def);
        }

        // Assign super_admin role to the seeded admin account.
        $admin = User::where('email', 'admin@gmail.com')->first();
        if ($admin) {
            $superAdmin = Role::where('slug', 'super_admin')->first();
            if ($superAdmin) {
                $admin->roles()->syncWithoutDetaching([$superAdmin->id]);
            }
        }
    }
}
