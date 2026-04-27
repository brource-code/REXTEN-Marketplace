<?php

namespace App\Services;

use App\Models\Booking;
use App\Support\NotificationLocale;
use Carbon\Carbon;

/**
 * Тексты in-app уведомлений клиенту о статусе бронирования — одна точка правды и локаль из профиля.
 */
class ClientBookingNotificationTexts
{
    /**
     * @return array{title: string, message: string, link: string, serviceName: string, companyName: string, bookingDate: string, bookingTime: string}|null
     */
    public static function forBookingStatusChange(Booking $booking, string $newStatus): ?array
    {
        if (! in_array($newStatus, ['confirmed', 'cancelled', 'completed'], true)) {
            return null;
        }

        $locale = NotificationLocale::forClientRecipient($booking->user_id);

        $serviceName = self::resolveServiceName($booking, $locale);
        $companyName = $booking->company?->name ?? self::defaultCompanyLabel($locale);
        $bookingTime = (string) ($booking->booking_time ?? '');

        $bookingDate = '';
        if ($booking->booking_date) {
            $date = $booking->getTimeWindow()['start'];
            $bookingDate = self::formatBookingDateLocalized($date, $locale);
        }

        $translations = self::translationsTemplate($serviceName, $companyName, $bookingDate, $bookingTime);
        $bucket = $translations[$locale] ?? $translations['en'];

        $title = '';
        $message = '';

        if ($newStatus === 'confirmed') {
            $title = $bucket['confirmed']['title'];
            $message = $bucket['confirmed']['message'];
        } elseif ($newStatus === 'cancelled') {
            $title = $bucket['cancelled']['title'];
            $reason = self::localizedCancellationReason($booking->cancellation_reason, $locale);
            $message = str_replace('%reason%', $reason, $bucket['cancelled']['message']);
        } else {
            $title = $bucket['completed']['title'];
            $message = $bucket['completed']['message'];
        }

        return [
            'title' => $title,
            'message' => $message,
            'link' => '/booking',
            'serviceName' => $serviceName,
            'companyName' => $companyName,
            'bookingDate' => $bookingDate,
            'bookingTime' => $bookingTime,
        ];
    }

    /**
     * Снимок даты/времени/длительности/специалиста до сохранения (для сравнения после update/save).
     *
     * @return array{booking_date: ?\Carbon\Carbon, booking_time: ?string, duration_minutes: int, specialist_id: int|string|null}
     */
    public static function captureBookingScheduleSnapshot(Booking $booking): array
    {
        $bd = $booking->booking_date;
        $bdCopy = $bd instanceof \DateTimeInterface ? Carbon::instance($bd)->copy() : null;

        return [
            'booking_date' => $bdCopy,
            'booking_time' => $booking->booking_time,
            'duration_minutes' => (int) ($booking->duration_minutes ?? 60),
            'specialist_id' => $booking->specialist_id,
        ];
    }

    public static function bookingScheduleDiffersFromSnapshot(Booking $booking, array $before): bool
    {
        $oldDate = $before['booking_date'] ?? null;
        $newDate = $booking->booking_date;
        $dateChanged = ($oldDate instanceof \DateTimeInterface ? $oldDate->format('Y-m-d') : '') !== ($newDate ? $newDate->format('Y-m-d') : '');

        $timeChanged = self::normalizeBookingTime((string) ($before['booking_time'] ?? ''))
            !== self::normalizeBookingTime((string) ($booking->booking_time ?? ''));

        $durChanged = (int) ($before['duration_minutes'] ?? 0) !== (int) ($booking->duration_minutes ?? 0);

        $oldSpec = $before['specialist_id'] ?? null;
        $newSpec = $booking->specialist_id;
        $specChanged = (string) ($oldSpec ?? '') !== (string) ($newSpec ?? '');

        return $dateChanged || $timeChanged || $durChanged || $specChanged;
    }

    /**
     * @param  array{booking_date: ?\Carbon\Carbon, booking_time: ?string, duration_minutes: int, specialist_id: mixed}  $before
     * @return array{title: string, message: string, link: string, serviceName: string, companyName: string, bookingDate: string, bookingTime: string}|null
     */
    public static function forBookingRescheduled(Booking $booking, array $before): ?array
    {
        if (! self::bookingScheduleDiffersFromSnapshot($booking, $before)) {
            return null;
        }

        if (! $booking->user_id) {
            return null;
        }

        $locale = NotificationLocale::forClientRecipient($booking->user_id);
        $serviceName = self::resolveServiceName($booking, $locale);
        $companyName = $booking->company?->name ?? self::defaultCompanyLabel($locale);

        $oldDateStr = '';
        $oldTimeStr = self::normalizeBookingTime((string) ($before['booking_time'] ?? ''));
        if (! empty($before['booking_date']) && $before['booking_date'] instanceof \DateTimeInterface) {
            $oldStart = Carbon::instance($before['booking_date'])->copy();
            if ($oldTimeStr !== '') {
                $parts = explode(':', $oldTimeStr);
                $h = (int) ($parts[0] ?? 0);
                $m = (int) ($parts[1] ?? 0);
                $oldStart->setTime($h, $m, 0);
            }
            $oldDateStr = self::formatBookingDateLocalized($oldStart, $locale);
        }

        $newWindow = $booking->getTimeWindow();
        $newStart = $newWindow['start'] ?? null;
        $newDateStr = $newStart ? self::formatBookingDateLocalized($newStart, $locale) : '';
        $newTimeStr = self::normalizeBookingTime((string) ($booking->booking_time ?? ''));

        $oldDur = (int) ($before['duration_minutes'] ?? 0);
        $newDur = (int) ($booking->duration_minutes ?? 0);
        $durLine = '';
        if ($oldDur !== $newDur) {
            $durLine = self::rescheduleDurationLine($locale, $oldDur, $newDur);
        }

        $translations = self::rescheduleTranslationsTemplate(
            $serviceName,
            $companyName,
            $oldDateStr,
            $oldTimeStr,
            $newDateStr,
            $newTimeStr,
            $durLine
        );
        $bucket = $translations[$locale] ?? $translations['en'];

        return [
            'title' => $bucket['title'],
            'message' => $bucket['message'],
            'link' => '/booking',
            'serviceName' => $serviceName,
            'companyName' => $companyName,
            'bookingDate' => $newDateStr,
            'bookingTime' => $newTimeStr,
        ];
    }

    private static function normalizeBookingTime(string $t): string
    {
        $t = trim($t);
        if (strlen($t) === 8 && substr($t, -3) === ':00') {
            return substr($t, 0, 5);
        }

        return $t;
    }

    private static function rescheduleDurationLine(string $locale, int $oldMin, int $newMin): string
    {
        return match ($locale) {
            'ru' => " Длительность: было {$oldMin} мин, стало {$newMin} мин.",
            'es-mx' => " Duración: antes {$oldMin} min, ahora {$newMin} min.",
            'hy-am' => " Տևողություն՝ նախկինում {$oldMin} ր, հիմա {$newMin} ր։",
            'uk-ua' => " Тривалість: було {$oldMin} хв, стало {$newMin} хв.",
            default => " Duration: was {$oldMin} min, now {$newMin} min.",
        };
    }

    /**
     * @return array<string, array{title: string, message: string}>
     */
    private static function rescheduleTranslationsTemplate(
        string $serviceName,
        string $companyName,
        string $oldDateStr,
        string $oldTimeStr,
        string $newDateStr,
        string $newTimeStr,
        string $durLine
    ): array {
        return [
            'ru' => [
                'title' => 'Бронирование перенесено',
                'message' => "Запись «{$serviceName}» в {$companyName} обновлена: было {$oldDateStr} в {$oldTimeStr}, стало {$newDateStr} в {$newTimeStr}.{$durLine}",
            ],
            'en' => [
                'title' => 'Booking rescheduled',
                'message' => "Your booking «{$serviceName}» at {$companyName} was updated: previously {$oldDateStr} at {$oldTimeStr}, now {$newDateStr} at {$newTimeStr}.{$durLine}",
            ],
            'es-mx' => [
                'title' => 'Reserva reprogramada',
                'message' => "Tu reserva «{$serviceName}» en {$companyName} se actualizó: antes el {$oldDateStr} a las {$oldTimeStr}, ahora el {$newDateStr} a las {$newTimeStr}.{$durLine}",
            ],
            'hy-am' => [
                'title' => 'Ամրագրումը տեղափոխվել է',
                'message' => "«{$serviceName}» ամրագրումը {$companyName}-ում թարմացվել է․ նախկինում՝ {$oldDateStr}, ժամը {$oldTimeStr}, հիմա՝ {$newDateStr}, ժամը {$newTimeStr}։{$durLine}",
            ],
            'uk-ua' => [
                'title' => 'Бронювання перенесено',
                'message' => "Запис «{$serviceName}» у {$companyName} оновлено: було {$oldDateStr} о {$oldTimeStr}, стало {$newDateStr} о {$newTimeStr}.{$durLine}",
            ],
        ];
    }

    /**
     * Дата в теле уведомления: ru — 14.04.2026; en — Apr 14, 2026; остальные — через ICU (месяц на языке локали).
     */
    private static function formatBookingDateLocalized(Carbon $date, string $locale): string
    {
        if ($locale === 'ru') {
            return $date->format('d.m.Y');
        }

        if ($locale === 'en') {
            return $date->format('M j, Y');
        }

        if (class_exists(\IntlDateFormatter::class)) {
            $intlLocale = match ($locale) {
                'es-mx' => 'es_MX',
                'uk-ua' => 'uk_UA',
                'hy-am' => 'hy_AM',
                default => 'en_US',
            };

            $formatter = new \IntlDateFormatter(
                $intlLocale,
                \IntlDateFormatter::LONG,
                \IntlDateFormatter::NONE,
                $date->getTimezone()->getName(),
                \IntlDateFormatter::GREGORIAN
            );

            $out = $formatter->format($date->getTimestamp());
            if ($out !== false && $out !== '') {
                return $out;
            }
        }

        return self::formatBookingDateCarbonFallback($date, $locale);
    }

    /**
     * Запасной формат без ext-intl: локализованные названия месяцев через Carbon (если есть переводы).
     */
    private static function formatBookingDateCarbonFallback(Carbon $date, string $locale): string
    {
        $carbonLocale = match ($locale) {
            'es-mx' => 'es',
            'uk-ua' => 'uk',
            'hy-am' => 'hy_AM',
            default => 'en',
        };

        $d = $date->copy()->locale($carbonLocale);

        return $d->translatedFormat('j F Y');
    }

    private static function defaultCompanyLabel(string $locale): string
    {
        return match ($locale) {
            'ru' => 'Компания',
            'es-mx' => 'Empresa',
            'uk-ua' => 'Компанія',
            'hy-am' => 'Ընկերություն',
            default => 'Company',
        };
    }

    private static function defaultServiceLabel(string $locale): string
    {
        return match ($locale) {
            'ru' => 'Услуга',
            'es-mx' => 'Servicio',
            'uk-ua' => 'Послуга',
            'hy-am' => 'Ծառայություն',
            default => 'Service',
        };
    }

    private static function resolveServiceName(Booking $booking, string $locale): string
    {
        $defaultLabel = self::defaultServiceLabel($locale);
        $serviceName = $defaultLabel;

        if ($booking->advertisement_id) {
            $advertisement = \App\Models\Advertisement::find($booking->advertisement_id);
            if ($advertisement) {
                $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                $serviceData = collect($services)->first(function ($s) use ($booking) {
                    return isset($s['id']) && (string) $s['id'] === (string) $booking->service_id;
                });
                if ($serviceData && isset($serviceData['name'])) {
                    $serviceName = $serviceData['name'];
                }
            }
        }

        if ($serviceName === $defaultLabel && $booking->service) {
            $serviceName = $booking->service->name;
        }

        return $serviceName;
    }

    /**
     * Причина отмены для клиента: системные строки из БД (часто на русском) переводим по locale;
     * произвольный текст бизнеса оставляем как введён.
     */
    private static function localizedCancellationReason(?string $stored, string $locale): string
    {
        $stored = trim((string) $stored);
        if ($stored === '') {
            return self::cancellationReasonLabel('by_admin', $locale);
        }

        $key = self::canonicalCancellationReasonKey($stored);
        if ($key !== null) {
            return self::cancellationReasonLabel($key, $locale);
        }

        return $stored;
    }

    private static function canonicalCancellationReasonKey(string $stored): ?string
    {
        $map = [
            'Отменено клиентом' => 'by_client',
            'Отменено администратором' => 'by_admin',
            'Отменено бизнесом' => 'by_business',
            'Payment not received within 30 minutes' => 'unpaid_timeout',
        ];

        return $map[$stored] ?? null;
    }

    private static function cancellationReasonLabel(string $key, string $locale): string
    {
        $labels = [
            'by_client' => [
                'en' => 'Cancelled by you',
                'ru' => 'Отменено клиентом',
                'es-mx' => 'Cancelada por ti',
                'hy-am' => 'Չեղարկել եք դուք',
                'uk-ua' => 'Скасовано вами',
            ],
            'by_admin' => [
                'en' => 'Cancelled by the administrator',
                'ru' => 'Отменено администратором',
                'es-mx' => 'Cancelada por el administrador',
                'hy-am' => 'Չեղարկել է ադմինիստրատորը',
                'uk-ua' => 'Скасовано адміністратором',
            ],
            'by_business' => [
                'en' => 'Cancelled by the business',
                'ru' => 'Отменено бизнесом',
                'es-mx' => 'Cancelada por el negocio',
                'hy-am' => 'Չեղարկել է բիզնեսը',
                'uk-ua' => 'Скасовано бізнесом',
            ],
            'unpaid_timeout' => [
                'en' => 'Payment was not received within 30 minutes',
                'ru' => 'Оплата не поступила в течение 30 минут',
                'es-mx' => 'No se recibió el pago en 30 minutos',
                'hy-am' => 'Վճարումը չի ստացվել 30 րոպեի ընթացքում',
                'uk-ua' => 'Оплату не отримано протягом 30 хвилин',
            ],
        ];

        $bucket = $labels[$key] ?? null;
        if (! $bucket) {
            return '';
        }

        return $bucket[$locale] ?? $bucket['en'];
    }

    /**
     * @return array<string, array<string, array{title: string, message: string}>>
     */
    private static function translationsTemplate(
        string $serviceName,
        string $companyName,
        string $bookingDate,
        string $bookingTime
    ): array {
        return [
            'ru' => [
                'confirmed' => [
                    'title' => 'Бронирование подтверждено',
                    'message' => "Ваше бронирование «{$serviceName}» в {$companyName} на {$bookingDate} в {$bookingTime} подтверждено.",
                ],
                'cancelled' => [
                    'title' => 'Бронирование отменено',
                    'message' => "Ваше бронирование «{$serviceName}» в {$companyName} на {$bookingDate} в {$bookingTime} отменено. Причина: %reason%",
                ],
                'completed' => [
                    'title' => 'Бронирование завершено',
                    'message' => "Ваше бронирование «{$serviceName}» в {$companyName} на {$bookingDate} в {$bookingTime} успешно завершено. Спасибо, что выбрали нас!",
                ],
            ],
            'en' => [
                'confirmed' => [
                    'title' => 'Booking confirmed',
                    'message' => "Your booking «{$serviceName}» at {$companyName} on {$bookingDate} at {$bookingTime} has been confirmed.",
                ],
                'cancelled' => [
                    'title' => 'Booking cancelled',
                    'message' => "Your booking «{$serviceName}» at {$companyName} on {$bookingDate} at {$bookingTime} has been cancelled. Reason: %reason%",
                ],
                'completed' => [
                    'title' => 'Booking completed',
                    'message' => "Your booking «{$serviceName}» at {$companyName} on {$bookingDate} at {$bookingTime} has been successfully completed. Thank you for choosing us!",
                ],
            ],
            'es-mx' => [
                'confirmed' => [
                    'title' => 'Reserva confirmada',
                    'message' => "Tu reserva de «{$serviceName}» en {$companyName} el {$bookingDate} a las {$bookingTime} fue confirmada.",
                ],
                'cancelled' => [
                    'title' => 'Reserva cancelada',
                    'message' => "Tu reserva de «{$serviceName}» en {$companyName} el {$bookingDate} a las {$bookingTime} fue cancelada. Motivo: %reason%",
                ],
                'completed' => [
                    'title' => 'Reserva completada',
                    'message' => "Tu reserva de «{$serviceName}» en {$companyName} el {$bookingDate} a las {$bookingTime} se completó correctamente. ¡Gracias por elegirnos!",
                ],
            ],
            'hy-am' => [
                'confirmed' => [
                    'title' => 'Ամրագրումը հաստատված է',
                    'message' => "Ձեր «{$serviceName}» ամրագրումը {$companyName}-ում՝ {$bookingDate}, ժամը {$bookingTime}, հաստատված է։",
                ],
                'cancelled' => [
                    'title' => 'Ամրագրումը չեղարկված է',
                    'message' => "Ձեր «{$serviceName}» ամրագրումը {$companyName}-ում՝ {$bookingDate}, ժամը {$bookingTime}, չեղարկվել է։ Պատճառ՝ %reason%",
                ],
                'completed' => [
                    'title' => 'Ամրագրումը ավարտված է',
                    'message' => "Ձեր «{$serviceName}» ամրագրումը {$companyName}-ում՝ {$bookingDate}, ժամը {$bookingTime}, հաջողությամբ ավարտվել է։ Շնորհակալություն, որ մեզ ընտրեցիք։",
                ],
            ],
            'uk-ua' => [
                'confirmed' => [
                    'title' => 'Бронювання підтверджено',
                    'message' => "Ваше бронювання «{$serviceName}» у {$companyName} на {$bookingDate} о {$bookingTime} підтверджено.",
                ],
                'cancelled' => [
                    'title' => 'Бронювання скасовано',
                    'message' => "Ваше бронювання «{$serviceName}» у {$companyName} на {$bookingDate} о {$bookingTime} скасовано. Причина: %reason%",
                ],
                'completed' => [
                    'title' => 'Бронювання завершено',
                    'message' => "Ваше бронювання «{$serviceName}» у {$companyName} на {$bookingDate} о {$bookingTime} успішно завершено. Дякуємо, що обрали нас!",
                ],
            ],
        ];
    }
}
