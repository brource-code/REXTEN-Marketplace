<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class KnowledgeMediaController extends Controller
{
    /**
     * Загрузка изображения, видео или файла для статей базы знаний (public disk).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:51200',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $file = $request->file('file');
        $mime = $file->getMimeType() ?: '';
        $ext = strtolower($file->getClientOriginalExtension() ?: '');

        $allowedMimes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'video/quicktime',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
        ];

        $allowedExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov', 'pdf', 'doc', 'docx', 'txt'];

        if (! in_array($mime, $allowedMimes, true) && ! in_array($ext, $allowedExt, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Unsupported file type',
            ], 422);
        }

        $subdir = 'knowledge/' . date('Y/m');
        $path = $file->store($subdir, 'public');

        if (! $path) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to store file',
            ], 500);
        }

        $relativeUrl = Storage::disk('public')->url($path);
        $baseUrl = rtrim(config('app.url'), '/');
        if (str_starts_with($relativeUrl, 'http://') || str_starts_with($relativeUrl, 'https://')) {
            $url = $relativeUrl;
        } else {
            $url = $baseUrl . $relativeUrl;
        }

        $kind = str_starts_with($mime, 'image/') ? 'image' : (str_starts_with($mime, 'video/') ? 'video' : 'file');

        return response()->json([
            'success' => true,
            'data' => [
                'url' => $url,
                'path' => $path,
                'mime' => $mime,
                'original_name' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
                'kind' => $kind,
            ],
        ], 201);
    }
}
