<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\SupportTicket;
use App\Models\SupportTicketAttachment;
use App\Models\User;
use App\Support\NotificationLocale;
use App\Support\SupportTicketNotificationCopy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class SupportTicketsController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->get('current_company_id');
        if (! $companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }

        $pageSize = min(50, max(5, (int) $request->get('pageSize', 20)));

        $paginator = SupportTicket::query()
            ->where('company_id', $companyId)
            ->withCount('attachments')
            ->orderByDesc('created_at')
            ->paginate($pageSize);

        $data = collect($paginator->items())->map(function (SupportTicket $t) {
            return [
                'id' => $t->id,
                'subject' => $t->subject,
                'category' => $t->category,
                'status' => $t->status,
                'areaSection' => $t->area_section,
                'pagePath' => $t->page_path,
                'attachmentCount' => $t->attachments_count,
                'createdAt' => $t->created_at?->toIso8601String(),
                'updatedAt' => $t->updated_at?->toIso8601String(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => $data,
            'total' => $paginator->total(),
            'page' => $paginator->currentPage(),
            'pageSize' => $paginator->perPage(),
        ]);
    }

    public function show(Request $request, int $id)
    {
        $companyId = $request->get('current_company_id');
        if (! $companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }

        $ticket = SupportTicket::query()
            ->where('company_id', $companyId)
            ->with(['attachments'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $this->serializeTicketForBusiness($ticket),
        ]);
    }

    public function store(Request $request)
    {
        $companyId = $request->get('current_company_id');
        if (! $companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'subject' => 'required|string|max:255',
            'category' => 'required|in:bug,question,feature,billing,other',
            'area_section' => 'nullable|string|max:255',
            'page_path' => 'nullable|string|max:1024',
            'body' => 'required|string|max:20000',
            'client_meta' => 'nullable',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $files = $request->file('attachments', []);
        if ($files && ! is_array($files)) {
            $files = [$files];
        }
        $files = array_values(array_filter($files ?: []));
        if (count($files) > 5) {
            return response()->json(['success' => false, 'message' => 'Too many files (max 5)'], 422);
        }

        foreach ($files as $file) {
            if (! $file->isValid()) {
                return response()->json(['success' => false, 'message' => 'Invalid upload'], 422);
            }
            try {
                $this->validateAttachmentFile($file);
            } catch (\InvalidArgumentException $e) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
            }
        }

        $clientMeta = $request->input('client_meta');
        if (is_string($clientMeta)) {
            $decoded = json_decode($clientMeta, true);
            $clientMeta = is_array($decoded) ? $decoded : [];
        }
        if (! is_array($clientMeta)) {
            $clientMeta = [];
        }

        $user = auth('api')->user();

        $meta = array_merge($clientMeta, [
            'server_ip' => $request->ip(),
            'server_user_agent' => $request->userAgent(),
            'accept_language' => $request->header('Accept-Language'),
        ]);

        $ticket = null;

        try {
            DB::transaction(function () use ($request, $companyId, $user, $meta, $files, &$ticket) {
                $ticket = SupportTicket::create([
                    'company_id' => $companyId,
                    'user_id' => $user->id,
                    'subject' => $request->input('subject'),
                    'category' => $request->input('category'),
                    'area_section' => $request->input('area_section'),
                    'page_path' => $request->input('page_path'),
                    'body' => $request->input('body'),
                    'client_meta' => $meta,
                    'status' => 'open',
                ]);

                foreach ($files as $file) {
                    $this->storeAttachment($ticket, $file);
                }
            });
        } catch (\Throwable $e) {
            \Log::error('SupportTicketsController::store failed', ['e' => $e->getMessage()]);

            return response()->json(['success' => false, 'message' => 'Failed to create ticket'], 500);
        }

        $ticket->load(['attachments']);
        $this->notifySuperadminsNewTicket($ticket);

        return response()->json([
            'success' => true,
            'data' => $this->serializeTicketForBusiness($ticket),
            'message' => 'Ticket created',
        ], 201);
    }

    private function validateAttachmentFile($file): void
    {
        $mime = $file->getMimeType() ?: '';
        $ext = strtolower($file->getClientOriginalExtension() ?: '');

        $allowedMimes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
        ];
        $allowedExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'txt'];

        if (! in_array($mime, $allowedMimes, true) && ! in_array($ext, $allowedExt, true)) {
            throw new \InvalidArgumentException('Unsupported file type');
        }

        if ($file->getSize() > 10 * 1024 * 1024) {
            throw new \InvalidArgumentException('File exceeds 10 MB');
        }
    }

    private function storeAttachment(SupportTicket $ticket, $file): void
    {
        $mime = $file->getMimeType() ?: '';
        $subdir = 'support/' . $ticket->company_id . '/' . $ticket->id;
        $path = $file->store($subdir, 'public');

        SupportTicketAttachment::create([
            'support_ticket_id' => $ticket->id,
            'path' => $path,
            'original_name' => $file->getClientOriginalName() ?: 'file',
            'mime' => $mime,
            'size' => $file->getSize(),
        ]);
    }

    private function serializeTicketForBusiness(SupportTicket $ticket): array
    {
        $baseUrl = rtrim(config('app.url'), '/');

        $attachments = $ticket->attachments->map(function (SupportTicketAttachment $a) use ($baseUrl) {
            $rel = Storage::disk('public')->url($a->path);

            return [
                'id' => $a->id,
                'originalName' => $a->original_name,
                'mime' => $a->mime,
                'size' => $a->size,
                'url' => str_starts_with($rel, 'http') ? $rel : $baseUrl . $rel,
            ];
        });

        return [
            'id' => $ticket->id,
            'subject' => $ticket->subject,
            'category' => $ticket->category,
            'status' => $ticket->status,
            'areaSection' => $ticket->area_section,
            'pagePath' => $ticket->page_path,
            'body' => $ticket->body,
            'createdAt' => $ticket->created_at?->toIso8601String(),
            'updatedAt' => $ticket->updated_at?->toIso8601String(),
            'resolvedAt' => $ticket->resolved_at?->toIso8601String(),
            'adminPublicReply' => $ticket->admin_public_reply,
            'attachments' => $attachments,
        ];
    }

    private function notifySuperadminsNewTicket(SupportTicket $ticket): void
    {
        $admins = User::query()
            ->where('role', 'SUPERADMIN')
            ->where('is_active', true)
            ->where('is_blocked', false)
            ->get();

        $link = '/superadmin/support/' . $ticket->id;

        foreach ($admins as $admin) {
            $locale = NotificationLocale::forUser($admin);
            $copy = SupportTicketNotificationCopy::superadminNewTicket($locale, $ticket->id, $ticket->subject);
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'system',
                'title' => $copy['title'],
                'message' => $copy['message'],
                'link' => $link,
                'read' => false,
            ]);
        }
    }
}
