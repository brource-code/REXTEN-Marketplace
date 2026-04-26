<?php

namespace App\Services;

use App\Models\ManualTestReport;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

/**
 * Письмо со сводкой ручного тестирования (/manual-test) после нажатия «Завершить тестирование».
 * Язык письма — русский; шаблон как у остальных писем REXTEN (mail.rexten.*).
 */
class ManualTestWizardReportMailer
{
    public const WIZARD_SCOPE = 'wizard_v3';

    private const RECIPIENT_DEFAULT = 'brource@gmail.com';

    /** Порядок шагов как на фронте (simpleConfig WIZARD_STEPS). */
    private const STEP_ORDER = [
        'welcome',
        'business_registration',
        'business_profile',
        'services',
        'team',
        'subscription',
        'dashboard',
        'schedule',
        'bookings',
        'routes',
        'reports',
        'finish',
    ];

    /**
     * @param  mixed  $previousChecklist  Сырое значение из users.manual_test_checklist до сохранения.
     */
    public static function sendOnFinishTransition(User $user, array $newPayload, mixed $previousChecklist): void
    {
        if (($newPayload['v'] ?? null) !== 3) {
            return;
        }

        $prev = self::normalizeChecklistArray($previousChecklist);
        $wasFinish = ! empty($prev['completed_steps']['finish']);
        $nowFinish = ! empty($newPayload['completed_steps']['finish']);
        if (! $nowFinish || $wasFinish) {
            return;
        }

        self::send($user, $newPayload);
    }

    private static function normalizeChecklistArray(mixed $raw): array
    {
        if (is_array($raw)) {
            return $raw;
        }
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);

            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    public static function send(User $user, array $checklist): void
    {
        $locale = 'ru';
        $appName = (string) config('app.name', 'REXTEN');
        $recipient = (string) config('mail.manual_test_report_to', self::RECIPIENT_DEFAULT);
        if ($recipient === '') {
            $recipient = self::RECIPIENT_DEFAULT;
        }

        $emailTitle = __('mail.manual_test_report.subject', ['app' => $appName], $locale);
        $intro = __('mail.manual_test_report.intro', [], $locale);

        $base = rtrim((string) config('app.frontend_url'), '/');
        $actionPath = '/manual-test';
        $actionUrl = $base === '' ? $actionPath : $base.$actionPath;
        $actionLabel = __('mail.manual_test_report.open_manual_test', [], $locale);

        $fields = self::buildFieldRows($user, $checklist, $locale);

        try {
            Mail::send(
                ['html' => 'mail.rexten.manual-test-report', 'text' => 'mail.rexten.manual-test-report-text'],
                [
                    'appName' => $appName,
                    'locale' => $locale,
                    'emailTitle' => $emailTitle,
                    'intro' => $intro,
                    'fields' => $fields,
                    'actionLabel' => $actionLabel,
                    'actionUrl' => $actionUrl,
                ],
                function ($message) use ($recipient, $user, $emailTitle) {
                    $message
                        ->to($recipient)
                        ->subject($emailTitle);
                    if ($user->email) {
                        $message->replyTo($user->email);
                    }
                }
            );
        } catch (\Throwable $e) {
            Log::error('ManualTestWizardReportMailer: failed to send', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @return array<int, array{label: string, value: string}>
     */
    private static function buildFieldRows(User $user, array $checklist, string $locale): array
    {
        $rows = [];

        $push = function (string $labelKey, string $value) use (&$rows, $locale) {
            $value = trim($value);
            if ($value === '') {
                $value = '—';
            }
            $rows[] = [
                'label' => __($labelKey, [], $locale),
                'value' => $value,
            ];
        };

        $pushRow = function (string $label, string $value) use (&$rows) {
            $value = trim($value);
            if ($value === '') {
                $value = '—';
            }
            $rows[] = ['label' => $label, 'value' => $value];
        };

        $push('mail.manual_test_report.fields.user_id', (string) $user->id);
        $push('mail.manual_test_report.fields.user_email', (string) ($user->email ?? ''));
        $push('mail.manual_test_report.fields.current_step', (string) ($checklist['current_step'] ?? ''));
        $push('mail.manual_test_report.fields.submitted_at', now()->timezone(config('app.timezone', 'UTC'))->format('Y-m-d H:i:s'));

        $answers = is_array($checklist['answers'] ?? null) ? $checklist['answers'] : [];
        $skipped = is_array($checklist['skipped_steps'] ?? null) ? $checklist['skipped_steps'] : [];
        $completed = is_array($checklist['completed_steps'] ?? null) ? $checklist['completed_steps'] : [];
        $final = is_array($checklist['final'] ?? null) ? $checklist['final'] : [];

        foreach (self::STEP_ORDER as $stepId) {
            $title = __('mail.manual_test_report.steps.'.$stepId, [], $locale);
            $label = __('mail.manual_test_report.fields.step_block', ['step' => $title], $locale);

            $lines = [];
            $isSkipped = ! empty($skipped[$stepId]);
            $isDone = ! empty($completed[$stepId]);
            $lines[] = __('mail.manual_test_report.lines.skipped', ['v' => $isSkipped ? __('mail.manual_test_report.bool_yes', [], $locale) : __('mail.manual_test_report.bool_no', [], $locale)], $locale);
            $lines[] = __('mail.manual_test_report.lines.marked_done', ['v' => $isDone ? __('mail.manual_test_report.bool_yes', [], $locale) : __('mail.manual_test_report.bool_no', [], $locale)], $locale);

            if ($stepId === 'finish') {
                $lines[] = __('mail.manual_test_report.lines.final_rating', ['v' => self::fmtScalar($final['rating'] ?? null)], $locale);
                $lines[] = __('mail.manual_test_report.lines.final_would', ['v' => self::fmtWould($final['would'] ?? null, $locale)], $locale);
                $comment = isset($final['comment']) ? (string) $final['comment'] : '';
                $lines[] = __('mail.manual_test_report.lines.final_comment', ['v' => $comment !== '' ? $comment : '—'], $locale);

                $tasks = is_array($answers['finish']['tasks'] ?? null) ? $answers['finish']['tasks'] : [];
                $lines[] = self::formatTasks('finish', $tasks, $locale);
            } else {
                $block = is_array($answers[$stepId] ?? null) ? $answers[$stepId] : [];
                $lines[] = __('mail.manual_test_report.lines.sentiment', ['v' => self::fmtSentiment($block['sentiment'] ?? null, $locale)], $locale);
                $lines[] = __('mail.manual_test_report.lines.scenario', ['v' => self::fmtScenario($block['scenario'] ?? null, $locale)], $locale);
                $lines[] = __('mail.manual_test_report.lines.rating', ['v' => self::fmtScalar($block['rating'] ?? null)], $locale);
                $lines[] = __('mail.manual_test_report.lines.would', ['v' => self::fmtWould($block['would'] ?? null, $locale)], $locale);
                $comment = isset($block['comment']) ? (string) $block['comment'] : '';
                $lines[] = __('mail.manual_test_report.lines.comment', ['v' => $comment !== '' ? $comment : '—'], $locale);

                $tasks = is_array($block['tasks'] ?? null) ? $block['tasks'] : [];
                $lines[] = self::formatTasks($stepId, $tasks, $locale);
            }

            $body = implode("\n", array_filter($lines, fn ($l) => is_string($l) && $l !== ''));
            $pushRow($label, $body);
        }

        $reportsBlock = self::formatReportsBlock($user->id, $locale);
        $push('mail.manual_test_report.fields.reports_block', $reportsBlock);

        return $rows;
    }

    /**
     * @param  array<string, bool>  $tasks
     */
    private static function formatTasks(string $stepId, array $tasks, string $locale): string
    {
        if ($tasks === []) {
            return __('mail.manual_test_report.lines.tasks_empty', [], $locale);
        }
        $lines = [__('mail.manual_test_report.lines.tasks_header', [], $locale)];
        foreach ($tasks as $tid => $done) {
            $human = __('mail.manual_test_report.task_labels.'.$stepId.'.'.$tid, [], $locale);
            if ($human === 'mail.manual_test_report.task_labels.'.$stepId.'.'.$tid) {
                $human = (string) $tid;
            }
            $yesNo = $done ? __('mail.manual_test_report.bool_yes', [], $locale) : __('mail.manual_test_report.bool_no', [], $locale);
            $lines[] = '• '.$human.': '.$yesNo;
        }

        return implode("\n", $lines);
    }

    private static function formatReportsBlock(int $userId, string $locale): string
    {
        $reports = ManualTestReport::query()
            ->where('user_id', $userId)
            ->where('scope', self::WIZARD_SCOPE)
            ->orderBy('id')
            ->get();

        if ($reports->isEmpty()) {
            return __('mail.manual_test_report.reports_none', [], $locale);
        }

        $parts = [];
        foreach ($reports as $i => $r) {
            $paths = $r->screenshot_paths;
            if (! is_array($paths) || $paths === []) {
                $paths = $r->screenshot_path ? [$r->screenshot_path] : [];
            }
            $urls = [];
            foreach (array_filter($paths) as $p) {
                if (is_string($p) && $p !== '') {
                    $urls[] = Storage::disk('public')->url($p);
                }
            }
            $comment = trim((string) ($r->comment ?? ''));
            $block = ($i + 1).'. '.__('mail.manual_test_report.report_line_step', ['key' => (string) ($r->item_key ?? '—')], $locale)."\n";
            $block .= __('mail.manual_test_report.report_line_comment', ['text' => $comment !== '' ? $comment : '—'], $locale)."\n";
            if ($urls !== []) {
                $block .= __('mail.manual_test_report.report_line_screens', ['urls' => implode("\n", $urls)], $locale);
            }
            $parts[] = $block;
        }

        return implode("\n\n", $parts);
    }

    private static function fmtScalar(mixed $v): string
    {
        if ($v === null || $v === '') {
            return '—';
        }

        return is_numeric($v) ? (string) $v : (string) $v;
    }

    private static function fmtSentiment(?string $v, string $locale): string
    {
        return match ($v) {
            'like' => __('mail.manual_test_report.sentiment.like', [], $locale),
            'neutral' => __('mail.manual_test_report.sentiment.neutral', [], $locale),
            'bad' => __('mail.manual_test_report.sentiment.bad', [], $locale),
            default => '—',
        };
    }

    private static function fmtScenario(?string $v, string $locale): string
    {
        return match ($v) {
            'ok' => __('mail.manual_test_report.scenario.ok', [], $locale),
            'problem' => __('mail.manual_test_report.scenario.problem', [], $locale),
            default => '—',
        };
    }

    private static function fmtWould(?string $v, string $locale): string
    {
        return match ($v) {
            'yes' => __('mail.manual_test_report.would.yes', [], $locale),
            'no' => __('mail.manual_test_report.would.no', [], $locale),
            'unsure' => __('mail.manual_test_report.would.unsure', [], $locale),
            default => '—',
        };
    }
}
