<?php

namespace App\Policies;

use App\Models\User;
use App\Models\UserDocument;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserDocumentPolicy
{
    use HandlesAuthorization;

    /** Employees can only delete their own. Admins bypass via Gate::before(). */
    public function delete(User $authUser, UserDocument $document): bool
    {
        return $authUser->id === $document->user_id;
    }

    /** Admins can delete any document (used by AdminUserDocumentController). */
    public function forceDelete(User $authUser, UserDocument $document): bool
    {
        return in_array($authUser->role?->slug ?? '', ['super_admin', 'admin']);
    }
}
