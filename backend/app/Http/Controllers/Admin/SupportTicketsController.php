<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\SupportTicket;
use App\Models\SupportTicketAttachment;
use App\Support\NotificationLocale;
use App\Support\SupportTicketNotificationCopy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class SupportTicketsController extends Controller
{
    public function index(Request $request)
    {
        $q = SupportTicket::query()
            ->with([
                'company:id,name,slug,email,phone,status,timezone,city,state,owner_id',
                'user:id,email,role,locale',
            ])
            ->orderByDesc('created_at');

        if ($request->filled('status') && $request->get('status') !== 'all') {
            $q->where('status', $request->get('status'));
        }
        if ($request->filled('company_id')) {
            $q->where('company_id', (int) $request->get('company_id'));
        }
        if ($request->filled('search')) {
            $s = '%' . $request->get('search') . '%';
            $q->where(function ($qq) use ($s) {
                $qq->where('subject', 'ilike', $s)
                    ->orWhere('body', 'ilike', $s);
            });
        }

        $pageSize = min(50, max(5, (int) $request->get('pageSize', 20)));
        $paginator = $q->paginate($pageSize);

        $data = collect($paginator->items())->map(function (SupportTicket $t) {
            return [
                'id' => $t->id,
                'subject' => $t->subject,
                'category' => $t->category,
                'status' => $t->status,
                'company' => $t->company ? [
                    'id' => $t->company->id,
                    'name' => $t->company->name,
                    'slug' => $t->company->slug,
                    'email' => $t->company->email,
                ] : null,
                'submitterEmail' => $t->user?->email,
                'createdAt' => $t->created_at?->toIso8601String(),
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

    public function show(int $id)
    {
        $ticket = SupportTicket::query()
            ->with([
                'attachments',
                'user.profile',
                'company.owner.profile',
            ])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $this->serializeTicketDetail($ticket),
        ]);
    }

    public function update(Request $request, int $id)
    {
        $ticket = SupportTicket::query()->with('user')->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'status' => 'sometimes|in:open,in_progress,waiting_customer,resolved,closed',
            'admin_internal_note' => 'nullable|string|max:10000',
            'adminInternalNote' => 'nullable|string|max:10000',
            'public_reply' => 'nullable|string|max:20000',
            'publicReply' => 'nullable|string|max:20000',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $oldStatus = $ticket->status;
        $oldPublicReply = $ticket->admin_public_reply;

        if ($request->has('status')) {
            $ticket->status = $request->input('status');
            if (in_array($ticket->status, ['resolved', 'closed'], true)) {
                $ticket->resolved_at = now();
            }
        }

        if ($request->has('admin_internal_note') || $request->has('adminInternalNote')) {
            $ticket->admin_internal_note = $request->input('admin_internal_note') ?? $request->input('adminInternalNote');
        }

        if ($request->has('public_reply') || $request->has('publicReply')) {
            $raw = $request->input('public_reply') ?? $request->input('publicReply');
            $ticket->admin_public_reply = ($raw !== null && trim((string) $raw) !== '') ? $raw : null;
        }

        $ticket->save();

        $ticket->load('user');

        $statusChanged = $request->has('status') && $oldStatus !== $ticket->status;
        $hadPublic = trim((string) $oldPublicReply) !== '';
        $hasPublic = trim((string) $ticket->admin_public_reply) !== '';
        $publicInRequest = $request->has('public_reply') || $request->has('publicReply');
        $firstPublicReply = $publicInRequest && ! $hadPublic && $hasPublic;

        if ($statusChanged) {
            $this->notifySubmitterStatusChanged($ticket);
        } elseif ($firstPublicReply) {
            $this->notifySubmitterFirstPublicReply($ticket);
        }

        return response()->json([
            'success' => true,
            'data' => $this->serializeTicketDetail($ticket->fresh([
                'attachments',
                'user.profile',
                'company.owner.profile',
            ])),
        ]);
    }

    private function notifySubmitterStatusChanged(SupportTicket $ticket): void
    {
        $user = $ticket->user;
        if (! $user) {
            return;
        }

        $locale = NotificationLocale::forUser($user);
        $reply = $ticket->admin_public_reply ? trim($ticket->admin_public_reply) : null;
        $copy = SupportTicketNotificationCopy::submitterStatusChanged(
            $locale,
            $ticket->id,
            $ticket->subject,
            $ticket->status,
            $reply
        );

        Notification::create([
            'user_id' => $ticket->user_id,
            'company_id' => $ticket->company_id,
            'type' => 'system',
            'title' => $copy['title'],
            'message' => $copy['message'],
            'link' => '/business/support?ticket=' . $ticket->id,
            'read' => false,
        ]);
    }

    private function notifySubmitterFirstPublicReply(SupportTicket $ticket): void
    {
        $user = $ticket->user;
        if (! $user || ! trim((string) $ticket->admin_public_reply)) {
            return;
        }

        $locale = NotificationLocale::forUser($user);
        $copy = SupportTicketNotificationCopy::submitterFirstPublicReply(
            $locale,
            $ticket->id,
            $ticket->subject,
            $ticket->admin_public_reply
        );

        Notification::create([
            'user_id' => $ticket->user_id,
            'company_id' => $ticket->company_id,
            'type' => 'system',
            'title' => $copy['title'],
            'message' => $copy['message'],
            'link' => '/business/support?ticket=' . $ticket->id,
            'read' => false,
        ]);
    }

    private function serializeTicketDetail(SupportTicket $ticket): array
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

        $company = $ticket->company;
        $owner = $company?->owner;
        $user = $ticket->user;
        $profile = $user?->profile;

        return [
            'id' => $ticket->id,
            'subject' => $ticket->subject,
            'category' => $ticket->category,
            'status' => $ticket->status,
            'areaSection' => $ticket->area_section,
            'pagePath' => $ticket->page_path,
            'body' => $ticket->body,
            'clientMeta' => $ticket->client_meta,
            'adminInternalNote' => $ticket->admin_internal_note,
            'adminPublicReply' => $ticket->admin_public_reply,
            'createdAt' => $ticket->created_at?->toIso8601String(),
            'updatedAt' => $ticket->updated_at?->toIso8601String(),
            'resolvedAt' => $ticket->resolved_at?->toIso8601String(),
            'attachments' => $attachments,
            'company' => $company ? [
                'id' => $company->id,
                'name' => $company->name,
                'slug' => $company->slug,
                'email' => $company->email,
                'phone' => $company->phone,
                'status' => $company->status,
                'timezone' => $company->timezone,
                'city' => $company->city,
                'state' => $company->state,
                'ownerId' => $company->owner_id,
            ] : null,
            'companyOwner' => $owner ? [
                'id' => $owner->id,
                'email' => $owner->email,
                'locale' => $owner->locale,
                'name' => $owner->profile?->full_name ?? trim(($owner->profile?->first_name ?? '') . ' ' . ($owner->profile?->last_name ?? '')),
            ] : null,
            'submitter' => $user ? [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                'locale' => $user->locale,
                'lastLoginAt' => $user->last_login_at?->toIso8601String(),
                'isActive' => $user->is_active,
                'isBlocked' => $user->is_blocked,
                'emailVerifiedAt' => $user->email_verified_at?->toIso8601String(),
                'profile' => $profile ? [
                    'firstName' => $profile->first_name,
                    'lastName' => $profile->last_name,
                    'phone' => $profile->phone,
                    'fullName' => $profile->full_name,
                ] : null,
            ] : null,
        ];
    }
}
