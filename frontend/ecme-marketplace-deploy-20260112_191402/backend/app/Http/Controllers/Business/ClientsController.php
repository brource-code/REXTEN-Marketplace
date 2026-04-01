<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Order;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class ClientsController extends Controller
{
    /**
     * Create a new client.
     */
    public function store(Request $request)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        try {
            $request->validate([
                'name' => 'required|string|max:255',
                'email' => [
                    'nullable', // Email необязателен
                    'email',
                    'max:255',
                    // Убираем проверку уникальности - клиенты разделяются по тенантам
                ],
                'phone' => 'nullable|string|max:20',
                'status' => 'sometimes|in:regular,permanent,vip',
            ], [
                'name.required' => 'Имя обязательно для заполнения',
            ]);
        } catch (ValidationException $e) {
            Log::error('ClientsController: Validation error', [
                'errors' => $e->errors(),
                'request' => $request->all(),
            ]);
            throw $e;
        }

        try {
            // Создаем клиента с любыми данными (конфиденциальность)
            // Если email уже существует, генерируем уникальный вариант для User
            // Оригинальный email будет использоваться в бронированиях через client_email
            
            $requestedEmail = $request->email;
            $email = $requestedEmail;
            
            // Если email указан, проверяем, не занят ли он
            if (!empty($email)) {
                // Проверяем существование email (включая удаленных, так как unique индекс работает для всех)
                $emailExists = User::where('email', $email)->exists();
                
                Log::info('ClientsController: Checking email existence', [
                    'requested_email' => $requestedEmail,
                    'email_exists' => $emailExists,
                ]);
                
                if ($emailExists) {
                    // Если email уже занят, генерируем уникальный вариант
                    // Оригинальный email будет использоваться в бронированиях через client_email
                    Log::info('ClientsController: Email exists, generating unique variant', [
                        'original_email' => $requestedEmail,
                    ]);
                    
                    do {
                        $email = 'client_' . $companyId . '_' . time() . '_' . uniqid() . '@local.local';
                        $exists = User::where('email', $email)->exists();
                    } while ($exists);
                    
                    Log::info('ClientsController: Generated unique email', [
                        'new_email' => $email,
                    ]);
                }
            } else {
                // Если email не указан, генерируем уникальный placeholder
                do {
                    $email = 'client_' . $companyId . '_' . time() . '_' . uniqid() . '@local.local';
                    $exists = User::where('email', $email)->exists();
                } while ($exists);
            }
            
            // Создаем нового пользователя (клиента) с уникальным email
            Log::info('ClientsController: Creating user', [
                'email' => $email,
                'requested_email' => $requestedEmail,
            ]);
            
            $user = User::create([
                'email' => $email, // Используем уникальный email
                'password' => Hash::make(uniqid()), // Генерируем случайный пароль
                'role' => 'CLIENT', // Роль должна быть в верхнем регистре
                'is_active' => true,
                'client_status' => $request->status ?? 'regular',
            ]);

            // Разбиваем имя на имя и фамилию
            $nameParts = explode(' ', trim($request->name), 2);

            // Создаем профиль пользователя
            $user->profile()->create([
                'first_name' => $nameParts[0] ?? 'Клиент',
                'last_name' => $nameParts[1] ?? '', // Если фамилии нет, оставляем пустым
                'phone' => $request->phone ?? null,
                'address' => $request->address ?? null,
            ]);

            // Связываем клиента с компанией
            DB::table('company_clients')->insertOrIgnore([
                'company_id' => $companyId,
                'user_id' => $user->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            $user->refresh();
            $user->load('profile');
        } catch (\Exception $e) {
            Log::error('ClientsController: Database error when creating client', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Нарушение ограничений базы данных',
                'error' => $e->getMessage(),
            ], 422);
        }

        // Формируем полное имя, убирая лишние пробелы
        $fullName = $user->profile 
            ? trim($user->profile->first_name . ' ' . ($user->profile->last_name ?? ''))
            : 'N/A';
        
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $fullName,
                'email' => strpos($user->email, '@local.local') !== false ? null : $user->email, // Не показываем placeholder email
                'phone' => $user->profile->phone ?? null,
                'address' => $user->profile->address ?? null,
                'status' => $user->client_status ?? 'regular',
            ],
        ], 201);
    }

    /**
     * Get business clients.
     */
    public function index(Request $request)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        // Получаем клиентов компании из таблицы company_clients или через bookings
        $clientIdsFromTable = DB::table('company_clients')
            ->where('company_id', $companyId)
            ->pluck('user_id');
        
        $clientIdsFromBookings = Booking::where('company_id', $companyId)
            ->whereNotNull('user_id')
            ->distinct()
            ->pluck('user_id');
        
        // Объединяем оба списка и убираем дубликаты
        $clientIds = $clientIdsFromTable->merge($clientIdsFromBookings)->unique();

        $query = User::whereIn('id', $clientIds)
            ->where('role', 'CLIENT')
            ->with('profile');

        // Поиск по имени, телефону или email (исключаем placeholder email)
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where(function ($emailQuery) use ($search) {
                    $emailQuery->where('email', 'like', "%{$search}%")
                        ->where('email', 'not like', '%@local.local');
                })
                    ->orWhereHas('profile', function ($profileQuery) use ($search) {
                        $profileQuery->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    });
            });
        }

        // Получаем общее количество для пагинации
        $total = $query->count();

        // Пагинация
        $page = (int) $request->get('page', 1);
        $pageSize = (int) $request->get('pageSize', 10);
        $skip = ($page - 1) * $pageSize;

        $clients = $query->skip($skip)->take($pageSize)->get();

        $data = $clients->map(function ($client) use ($companyId) {
            $totalBookings = Booking::where('company_id', $companyId)
                ->where('user_id', $client->id)
                ->count();

            // Считаем потраченную сумму из завершенных бронирований (как на странице просмотра)
            $bookings = Booking::where('company_id', $companyId)
                ->where('user_id', $client->id)
                ->where('status', 'completed')
                ->get();
            
            $totalSpentFromBookings = $bookings->sum(function ($booking) {
                return (float) ($booking->total_price ?? $booking->price ?? 0);
            });

            // Также учитываем оплаченные заказы
            $totalSpentFromOrders = Order::where('company_id', $companyId)
                ->where('user_id', $client->id)
                ->where('payment_status', 'paid')
                ->sum('total');

            $totalSpent = (float) $totalSpentFromBookings + (float) $totalSpentFromOrders;

            $lastVisitBooking = Booking::where('company_id', $companyId)
                ->where('user_id', $client->id)
                ->latest('created_at')
                ->first();
            
            $lastVisit = $lastVisitBooking ? $lastVisitBooking->created_at : null;

            return [
                'id' => $client->id,
                'name' => $client->profile ? trim($client->profile->first_name . ' ' . ($client->profile->last_name ?? '')) : 'N/A',
                'email' => strpos($client->email ?? '', '@local.local') !== false ? null : ($client->email ?? null),
                'phone' => $client->profile->phone ?? null,
                'address' => $client->profile->address ?? null,
                'img' => $client->profile->avatar ?? null,
                'totalBookings' => $totalBookings,
                'totalSpent' => $totalSpent,
                'lastVisit' => $lastVisit ? $lastVisit->toISOString() : null,
                'status' => $client->client_status ?? 'regular',
            ];
        });

        return response()->json([
            'data' => $data,
            'total' => $total,
        ]);
    }

    /**
     * Get client details.
     */
    public function show(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $client = User::with('profile')->findOrFail($id);

        // Verify client has bookings with this company
        $hasBookings = Booking::where('company_id', $companyId)
            ->where('user_id', $id)
            ->exists();

        if (!$hasBookings) {
            return response()->json([
                'message' => 'Client not found',
            ], 404);
        }

        $bookings = Booking::where('company_id', $companyId)
            ->where('user_id', $id)
            ->with(['service', 'specialist', 'additionalServices'])
            ->orderBy('booking_date', 'desc')
            ->get();

        // Получаем заметки клиента
        $notes = [];
        if (Schema::hasTable('client_notes')) {
            $notes = DB::table('client_notes')
                ->where('client_id', $id)
                ->where('company_id', $companyId)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($note) {
                    return [
                        'id' => $note->id,
                        'note' => $note->note,
                        'createdAt' => $note->created_at,
                    ];
                })
                ->toArray();
        }

        return response()->json([
            'client' => [
                'id' => $client->id,
                'name' => $client->profile ? trim($client->profile->first_name . ' ' . ($client->profile->last_name ?? '')) : 'N/A',
                'email' => strpos($client->email ?? '', '@local.local') !== false ? null : ($client->email ?? null),
                'phone' => $client->profile->phone ?? null,
                'address' => $client->profile->address ?? null,
                'avatar' => $client->profile->avatar ?? null,
                'status' => $client->client_status ?? 'regular',
            ],
            'bookings' => $bookings,
            'notes' => $notes,
        ]);
    }

    /**
     * Update client status.
     */
    public function updateStatus(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $request->validate([
            'status' => 'required|in:regular,permanent,vip',
        ]);

        $client = User::findOrFail($id);

        // Verify client belongs to this company
        $belongsToCompany = DB::table('company_clients')
            ->where('company_id', $companyId)
            ->where('user_id', $id)
            ->exists();
        
        if (!$belongsToCompany) {
            $hasBookings = Booking::where('company_id', $companyId)
                ->where('user_id', $id)
                ->exists();
            
            if (!$hasBookings) {
                return response()->json([
                    'message' => 'Client not found',
                ], 404);
            }
        }

        $client->client_status = $request->status;
        $client->save();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $client->id,
                'status' => $client->client_status,
            ],
        ]);
    }

    /**
     * Update client data.
     */
    public function update(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255',
            'phone' => 'sometimes|string|max:20',
        ]);

        $client = User::with('profile')->findOrFail($id);

        // Verify client belongs to this company
        $belongsToCompany = DB::table('company_clients')
            ->where('company_id', $companyId)
            ->where('user_id', $id)
            ->exists();
        
        if (!$belongsToCompany) {
            $hasBookings = Booking::where('company_id', $companyId)
                ->where('user_id', $id)
                ->exists();
            
            if (!$hasBookings) {
                return response()->json([
                    'message' => 'Client not found',
                ], 404);
            }
        }

        // Update email if provided (только если это не placeholder)
        if ($request->has('email') && !empty($request->email)) {
            $client->email = $request->email;
        }

        // Update status if provided
        if ($request->has('status')) {
            $client->client_status = $request->status;
        }

        $client->save();

        // Update profile data if provided
        if ($client->profile) {
            if ($request->has('name')) {
                $nameParts = explode(' ', $request->name, 2);
                $client->profile->first_name = $nameParts[0] ?? '';
                $client->profile->last_name = $nameParts[1] ?? '';
            }
            if ($request->has('phone')) {
                $client->profile->phone = $request->phone;
            }
            if ($request->has('address')) {
                $client->profile->address = $request->address;
            }
            $client->profile->save();
        } else {
            // Create profile if it doesn't exist
            if ($request->has('name') || $request->has('phone') || $request->has('address')) {
                $nameParts = explode(' ', $request->name ?? '', 2);
                $client->profile()->create([
                    'first_name' => $nameParts[0] ?? '',
                    'last_name' => $nameParts[1] ?? '',
                    'phone' => $request->phone ?? null,
                    'address' => $request->address ?? null,
                ]);
            }
        }

        $client->refresh();
        $client->load('profile');

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $client->id,
                'name' => $client->profile ? trim($client->profile->first_name . ' ' . ($client->profile->last_name ?? '')) : 'N/A',
                'email' => strpos($client->email ?? '', '@local.local') !== false ? null : ($client->email ?? null),
                'phone' => $client->profile->phone ?? null,
                'address' => $client->profile->address ?? null,
            ],
        ]);
    }

    /**
     * Add note to client.
     */
    public function addNote(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $request->validate([
            'note' => 'required|string|max:1000',
        ]);

        $client = User::findOrFail($id);

        // Verify client belongs to this company
        $belongsToCompany = DB::table('company_clients')
            ->where('company_id', $companyId)
            ->where('user_id', $id)
            ->exists();
        
        if (!$belongsToCompany) {
            $hasBookings = Booking::where('company_id', $companyId)
                ->where('user_id', $id)
                ->exists();
            
            if (!$hasBookings) {
                return response()->json([
                    'message' => 'Client not found',
                ], 404);
            }
        }

        // Проверяем существование таблицы client_notes
        if (!Schema::hasTable('client_notes')) {
            return response()->json([
                'success' => false,
                'message' => 'Notes table not found. Please run migrations.',
            ], 500);
        }

        $noteId = DB::table('client_notes')->insertGetId([
            'client_id' => $id,
            'company_id' => $companyId,
            'note' => $request->note,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $note = DB::table('client_notes')->where('id', $noteId)->first();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $note->id,
                'note' => $note->note,
                'createdAt' => $note->created_at,
            ],
        ]);
    }
}

