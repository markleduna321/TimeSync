<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserDocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'type'         => $this->type,
            'name'         => $this->name,
            'file_size'    => $this->file_size,
            'mime_type'    => $this->mime_type,
            'created_at'   => $this->created_at?->toISOString(),
            // Streams through auth middleware — file_path is NEVER exposed
            'download_url' => route('documents.download', $this->id),
        ];
    }
}
