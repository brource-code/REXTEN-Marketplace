<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\EnterpriseLead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

/**
 * Приём Enterprise-заявок с лендинга.
 * Сохраняет лид и отправляет уведомление продавцам на ENTERPRISE_LEAD_EMAIL
 * (фолбэк brource@gmail.com) от support@rexten (или MAIL_FROM_ADDRESS).
 */
class EnterpriseLeadController extends Controller
{
    private const ALLOWED_TEAM_SIZES = ['1-10', '11-50', '51-200', '200+'];

    private const RECIPIENT_FALLBACK = 'brource@gmail.com';

    private const FROM_ADDRESS_FALLBACK = 'support@rexten.live';

    public function store(Request $request): JsonResponse
    {
        if ($request->filled('website')) {
            return response()->json(['success' => true]);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:150',
            'email' => 'required|email|max:190',
            'phone' => 'nullable|string|max:50',
            'company' => 'nullable|string|max:190',
            'team_size' => 'nullable|string|in:'.implode(',', self::ALLOWED_TEAM_SIZES),
            'message' => 'required|string|min:10|max:2000',
            'consent' => 'accepted',
            'locale' => 'nullable|string|max:8',
            'source' => 'nullable|string|max:64',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        $lead = EnterpriseLead::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'company' => $data['company'] ?? null,
            'team_size' => $data['team_size'] ?? null,
            'message' => $data['message'],
            'locale' => $data['locale'] ?? null,
            'source' => $data['source'] ?? 'landing_pricing_enterprise',
            'ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 500),
            'status' => 'new',
        ]);

        $this->sendNotification($lead);

        return response()->json([
            'success' => true,
            'message' => 'Lead received',
        ]);
    }

    private function sendNotification(EnterpriseLead $lead): void
    {
        $appName = (string) config('app.name', 'Rexten');
        // Заявки приходят только на русском — внутренний канал продаж.
        $mailLang = 'ru';

        $recipient = (string) (config('mail.enterprise_lead_to') ?: env('ENTERPRISE_LEAD_EMAIL', self::RECIPIENT_FALLBACK));
        $fromAddress = (string) (env('ENTERPRISE_LEAD_FROM', config('mail.from.address') ?: self::FROM_ADDRESS_FALLBACK));
        $fromName = (string) (env('ENTERPRISE_LEAD_FROM_NAME', config('mail.from.name') ?: $appName));

        $emailTitle = __('mail.enterprise_lead.subject', ['app' => $appName], $mailLang);
        $intro = __('mail.enterprise_lead.intro', [], $mailLang);
        $actionLabel = __('mail.enterprise_lead.reply_button', [], $mailLang);
        $actionUrl = 'mailto:'.$lead->email
            .'?subject='.rawurlencode('Re: '.$emailTitle);

        $fields = $this->buildFields($lead, $mailLang);

        try {
            Mail::send(
                ['html' => 'mail.rexten.enterprise-lead', 'text' => 'mail.rexten.enterprise-lead-text'],
                [
                    'appName' => $appName,
                    'locale' => $mailLang,
                    'emailTitle' => $emailTitle,
                    'intro' => $intro,
                    'fields' => $fields,
                    'actionLabel' => $actionLabel,
                    'actionUrl' => $actionUrl,
                ],
                function ($message) use ($recipient, $fromAddress, $fromName, $emailTitle, $lead) {
                    $message
                        ->from($fromAddress, $fromName)
                        ->to($recipient)
                        ->replyTo($lead->email, $lead->name)
                        ->subject($emailTitle);
                }
            );
        } catch (\Throwable $e) {
            Log::error('EnterpriseLead: failed to send notification email', [
                'lead_id' => $lead->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @param  string  $mailLang  Язык письма (фиксирован: 'ru').
     * @return array<int,array{label:string,value:string}>
     */
    private function buildFields(EnterpriseLead $lead, string $mailLang): array
    {
        $rows = [];

        $push = function (string $key, ?string $value) use (&$rows, $mailLang) {
            $value = trim((string) $value);
            if ($value === '') {
                return;
            }
            $rows[] = [
                'label' => __('mail.enterprise_lead.fields.'.$key, [], $mailLang),
                'value' => $value,
            ];
        };

        $push('name', $lead->name);
        $push('email', $lead->email);
        $push('phone', $lead->phone);
        $push('company', $lead->company);
        $push('team_size', $lead->team_size);
        $push('message', $lead->message);
        $push('locale', $lead->locale);
        $push('source', $lead->source);

        $createdAt = $lead->created_at ? $lead->created_at->format('Y-m-d H:i') : null;
        $push('submitted_at', $createdAt);

        return $rows;
    }
}
