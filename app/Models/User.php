<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'first_name',
        'middle_name',
        'last_name',
        'email',
        'avatar',
        'password',
        'must_change_password',
        'monthly_salary',
        'department_id',
        'account_id',
    ];

    /**
     * Virtual full-name accessor so all existing code using $user->name keeps working.
     */
    public function getNameAttribute(): string
    {
        return trim(implode(' ', array_filter([
            $this->first_name,
            $this->middle_name,
            $this->last_name,
        ])));
    }

    /* ── Relationships ─────────────────────────────────── */

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class)->withTimestamps();
    }

    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class)->withTimestamps();
    }

    /** Teams where this user is the assigned leader. */
    public function ledTeams(): HasMany
    {
        return $this->hasMany(Team::class, 'leader_id');
    }

    /** Teams where this user is the assigned manager. */
    public function managedTeams(): HasMany
    {
        return $this->hasMany(Team::class, 'manager_id');
    }
    public function schedule(): HasOne
    {
        return $this->hasOne(Schedule::class);
    }

    public function breakConfig(): HasOne
    {
        return $this->hasOne(UserBreakConfig::class);
    }

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }

    public function userDeductions(): HasMany
    {
        return $this->hasMany(UserDeduction::class);
    }

    public function userAllowances(): HasMany
    {
        return $this->hasMany(UserAllowance::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function leaveApplications(): HasMany
    {
        return $this->hasMany(LeaveApplication::class);
    }

    public function leaveCredits(): HasMany
    {
        return $this->hasMany(LeaveCredit::class);
    }

    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class);
    }

    public function experiences(): HasMany
    {
        return $this->hasMany(UserExperience::class)->orderByDesc('start_date');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(UserDocument::class)->orderByDesc('created_at');
    }

    /* ── Role helpers ──────────────────────────────────── */

    public function hasRole(string $slug): bool
    {
        return $this->roles->contains('slug', $slug);
    }

    public function hasAnyRole(array $slugs): bool
    {
        return $this->roles->whereIn('slug', $slugs)->isNotEmpty();
    }

    /* ── Hidden / Cast ─────────────────────────────────── */

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'    => 'datetime',
            'password'             => 'hashed',
            'monthly_salary'       => 'decimal:2',
            'must_change_password' => 'boolean',
        ];
    }
}
