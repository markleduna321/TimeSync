<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserDocumentRequest;
use App\Http\Resources\UserDocumentResource;
use App\Models\UserDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UserDocumentController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $documents = UserDocument::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return UserDocumentResource::collection($documents);
    }

    public function store(StoreUserDocumentRequest $request): UserDocumentResource
    {
        $user = $request->user();
        $file = $request->file('file');

        // Store in a private disk path — never publicly accessible
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

    public function destroy(UserDocument $document): JsonResponse
    {
        $this->authorize('delete', $document);

        // Delete the physical file first
        Storage::disk('local')->delete($document->file_path);

        $document->delete();

        return response()->json(null, 204);
    }

    /**
     * Stream a document file via an authenticated web route.
     * Route: GET /documents/{document}/download  (auth middleware applied in web.php)
     */
    public function download(Request $request, UserDocument $document): StreamedResponse
    {
        // Owner, or admin/manager/super_admin may download
        $user = $request->user();
        abort_unless(
            $document->user_id === $user->id
                || in_array($user->role?->slug ?? '', ['super_admin', 'admin', 'manager']),
            403
        );

        abort_unless(Storage::disk('local')->exists($document->file_path), 404);

        return Storage::disk('local')->download($document->file_path, $document->name);
    }
}
