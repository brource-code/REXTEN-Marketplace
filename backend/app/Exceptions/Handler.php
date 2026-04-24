<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;
use Illuminate\Http\Request;

class Handler extends ExceptionHandler
{
    protected $dontReport = [
        //
    ];

    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * Render an exception into an HTTP response.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Throwable  $e
     * @return \Symfony\Component\HttpFoundation\Response
     *
     * @throws \Throwable
     */
    public function render($request, Throwable $e)
    {
        // Для API запросов всегда возвращаем JSON
        if ($request->is('api/*') || $request->expectsJson()) {
            return $this->handleApiException($request, $e);
        }

        return parent::render($request, $e);
    }

    /**
     * Handle API exceptions and return JSON response.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Throwable  $e
     * @return \Illuminate\Http\JsonResponse
     */
    protected function handleApiException($request, Throwable $e)
    {
        $statusCode = 500;
        $message = 'Internal Server Error';

        // Обработка QueryException (SQL ошибки)
        if ($e instanceof \Illuminate\Database\QueryException) {
            $statusCode = 422; // Validation error для SQL constraint violations
            $errorCode = $e->getCode();
            
            // Проверяем тип ошибки
            if (strpos($e->getMessage(), 'NOT NULL constraint') !== false) {
                $message = 'Обязательное поле не заполнено';
            } elseif (strpos($e->getMessage(), 'Integrity constraint violation') !== false) {
                $message = 'Нарушение ограничений базы данных';
            } elseif (strpos($e->getMessage(), 'Duplicate entry') !== false) {
                $message = 'Запись с такими данными уже существует';
            } else {
                $message = 'Ошибка базы данных: ' . $e->getMessage();
            }
            
            return response()->json([
                'success' => false,
                'message' => $message,
            ], $statusCode);
        }

        if ($e instanceof AiQuotaExceededException) {
            return response()->json([
                'success' => false,
                'error' => 'ai_quota_exceeded',
                'message' => 'AI limit reached for this month.',
                'usage' => $e->usage,
                'period_end' => $e->periodEndIso,
            ], 429);
        }

        // Обработка ValidationException
        if ($e instanceof \Illuminate\Validation\ValidationException) {
            $errors = $e->errors();
            // Формируем общее сообщение из первой ошибки
            $firstError = collect($errors)->flatten()->first();
            $message = $firstError ?: 'Ошибка валидации';
            
            return response()->json([
                'success' => false,
                'message' => $message,
                'errors' => $errors,
            ], 422);
        }

        if ($e instanceof \Illuminate\Auth\AuthenticationException) {
            return response()->json([
                'error' => 'unauthenticated',
                'message' => 'Unauthenticated',
            ], 401);
        }

        if (method_exists($e, 'getStatusCode')) {
            $statusCode = $e->getStatusCode();
        } elseif (method_exists($e, 'getCode') && $e->getCode() !== 0 && $e->getCode() < 600) {
            // Проверяем, что код ошибки валидный HTTP статус код (100-599)
            $statusCode = $e->getCode();
        }

        if (method_exists($e, 'getMessage') && $e->getMessage()) {
            $message = $e->getMessage();
        }

        // Для 404 ошибок
        if ($statusCode === 404) {
            $message = 'Resource not found';
        }

        // Для 401 ошибок
        if ($statusCode === 401) {
            $message = 'Unauthorized';
        }

        // Для 403 ошибок
        if ($statusCode === 403) {
            $message = 'Forbidden';
        }

        return response()->json([
            'success' => false,
            'message' => $message,
        ], $statusCode);
    }
}

