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

        $serviceName = self::resolveServiceName($booking);
        $companyName = $booking->company?->name ?? 'Компания';
        $bookingTime = (string) ($booking->booking_time ?? '');

        $locale = NotificationLocale::forClientRecipient($booking->user_id);

        $bookingDate = '';
        if ($booking->booking_date) {
            $date = $booking->booking_date instanceof Carbon
                ? $booking->booking_date
                : Carbon::parse($booking->booking_date);
            $bookingDate = ($locale === 'en' || $locale === 'es-mx' || $locale === 'hy-am' || $locale === 'uk-ua')
                ? $date->format('M d, Y')
                : $date->format('d.m.Y');
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
            $reason = $booking->cancellation_reason ?? self::defaultCancellationReason($locale);
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

    private static function resolveServiceName(Booking $booking): string
    {
        $serviceName = 'Услуга';

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

        if ($serviceName === 'Услуга' && $booking->service) {
            $serviceName = $booking->service->name;
        }

        return $serviceName;
    }

    private static function defaultCancellationReason(string $locale): string
    {
        return match ($locale) {
            'ru' => 'Отменено администратором',
            'es-mx' => 'Cancelado por el administrador',
            'hy-am' => 'Չեղարկել է ադմինիստրատորը',
            'uk-ua' => 'Скасовано адміністратором',
            default => 'Cancelled by administrator',
        };
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
