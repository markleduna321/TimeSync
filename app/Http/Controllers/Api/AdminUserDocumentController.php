<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserDocumentResource;
use App\Models\User;
use App\Models\UserDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class AdminUserDocumentController extends Controller
{
    /** List all documents for a specific user (admin only). */
    public function index(User $user): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', UserDocument::class);

        $documents = UserDocument::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->get();

        return UserDocumentResource::collection($documents);
    }

    /** Upload a document for a specific user (admin only). */
    public function store(Request $request, User $user): UserDocumentResource
    {
        Gate::authorize('create', UserDocument::class);

        $request->validate([
            'file' => [
                'required',
                'file',
                'max:10240',
                'mimes:pdf,jpg,jpeg,png,gif,webp,doc,docx,xls,xlsx',
            ],
            'type' => [
                'required',
                'in:resume,nbi_clearance,police_clearance,barangay_clearance,application_letter,sss,pagibig,philhealth,tin,birth_certificate,diploma,medical_certificate,employment_contract,other',
            ],
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $file = $request->file('file');
        $path = $file->store("user-documents/{$user->id}", 'local');

        $document = UserDocument::create([
            'user_id'   => $user->id,
            'type'      => $request->type,
            'name'      => $request->name ?? $file->getClientOriginalName(),
            'file_path' => $path,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
        ]);

        return new UserDocumentResource($document);
    }

    /** Delete a document for any user (admin only). */
    public function destroy(User $user, UserDocument $document): JsonResponse
    {
        Gate::authorize('forceDelete', $document);

        Storage::disk('local')->delete($document->file_path);
        $document->delete();

        return response()->json(null, 204);
    }
}
