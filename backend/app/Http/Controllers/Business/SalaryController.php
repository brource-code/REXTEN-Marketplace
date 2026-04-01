<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\SalaryCalculation;
use App\Models\SalarySetting;
use App\Models\TeamMember;
use App\Services\SalaryCalculationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class SalaryController extends Controller
{
    protected $salaryService;

    public function __construct(SalaryCalculationService $salaryService)
    {
        $this->salaryService = $salaryService;
    }

    /**
     * Test method to verify routing works
     */
    public function testRoute(Request $request)
    {
        Log::info('SalaryController: testRoute called', [
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'path' => $request->path(),
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Route works!',
            'method' => $request->method(),
            'url' => $request->fullUrl(),
        ]);
    }

    /**
     * Get list of salary calculations with filters.
     */
    public function index(Request $request)
    {
        try {
            $companyId = $request->get('current_company_id');
            
            if (!$companyId) {
                $user = auth('api')->user();
                if ($user && $user->isBusinessOwner()) {
                    $company = $user->ownedCompanies()->first();
                    if ($company) {
                        $companyId = $company->id;
                    }
                }
            }
            
            if (!$companyId) {
                Log::error('Salary Index: Company ID not found', [
                    'user_id' => auth('api')->id(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found',
                ], 404);
            }

            $filters = $this->getFilters($request);
            
            $query = SalaryCalculation::where('company_id', $companyId)
                ->with(['specialist']);

            // Фильтр по периоду
            if ($filters['date_from']) {
                $query->where('period_start', '>=', $filters['date_from']);
            }
            if ($filters['date_to']) {
                $query->where('period_end', '<=', $filters['date_to']);
            }

            // Фильтр по специалисту
            if ($filters['specialist_id']) {
                $query->where('specialist_id', $filters['specialist_id']);
            }

            // Пагинация
            $page = $request->input('page', 1);
            $pageSize = $request->input('pageSize', 20);
            
            $total = $query->count();
            $calculations = $query->orderBy('period_start', 'desc')
                ->orderBy('created_at', 'desc')
                ->skip(($page - 1) * $pageSize)
                ->take($pageSize)
                ->get()
                ->map(function ($calculation) {
                    return [
                        'id' => $calculation->id,
                        'specialist_id' => $calculation->specialist_id,
                        'specialist_name' => $calculation->specialist->name ?? 'Неизвестно',
                        'period_start' => $calculation->period_start->format('Y-m-d'),
                        'period_end' => $calculation->period_end->format('Y-m-d'),
                        'total_bookings' => $calculation->total_bookings,
                        'total_hours' => (float) $calculation->total_hours,
                        'base_amount' => (float) $calculation->base_amount,
                        'percent_amount' => (float) $calculation->percent_amount,
                        'total_salary' => (float) $calculation->total_salary,
                        'created_at' => $calculation->created_at->format('Y-m-d H:i:s'),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $calculations,
                'total' => $total,
                'page' => $page,
                'pageSize' => $pageSize,
            ]);
        } catch (\Exception $e) {
            Log::error('Salary Index Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch salary calculations',
            ], 500);
        }
    }

    /**
     * Calculate salary for a period.
     */
    public function calculate(Request $request)
    {
        try {
            $companyId = $request->get('current_company_id');
            
            if (!$companyId) {
                $user = auth('api')->user();
                if ($user && $user->isBusinessOwner()) {
                    $company = $user->ownedCompanies()->first();
                    if ($company) {
                        $companyId = $company->id;
                    }
                }
            }
            
            if (!$companyId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found',
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'period_start' => 'required|date',
                'period_end' => 'required|date|after_or_equal:period_start',
                'specialist_id' => 'nullable|exists:team_members,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $periodStart = $request->input('period_start');
            $periodEnd = $request->input('period_end');
            $specialistId = $request->input('specialist_id');

            // Проверяем, не был ли уже рассчитан ЗП за этот период
            $existingQuery = SalaryCalculation::where('company_id', $companyId)
                ->where('period_start', $periodStart)
                ->where('period_end', $periodEnd);

            if ($specialistId) {
                $existingQuery->where('specialist_id', $specialistId);
            }

            $existing = $existingQuery->get();

            if ($existing->isNotEmpty() && !$request->input('force', false)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Salary already calculated for this period',
                    'existing_calculations' => $existing->map(function ($calc) {
                        return [
                            'id' => $calc->id,
                            'specialist_id' => $calc->specialist_id,
                            'total_salary' => (float) $calc->total_salary,
                        ];
                    }),
                ], 409);
            }

            // Рассчитываем ЗП
            $calculations = $this->salaryService->calculateForPeriod(
                $companyId,
                $periodStart,
                $periodEnd,
                $specialistId
            );

            if (empty($calculations)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No salary calculations created. Check if team members have active salary settings and completed bookings.',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Salary calculated successfully',
                'data' => array_map(function ($calc) {
                    return [
                        'id' => $calc->id,
                        'specialist_id' => $calc->specialist_id,
                        'specialist_name' => $calc->specialist->name ?? 'Неизвестно',
                        'total_salary' => (float) $calc->total_salary,
                        'total_bookings' => $calc->total_bookings,
                    ];
                }, $calculations),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Salary Calculate Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to calculate salary: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get salary settings for a specialist.
     */
    public function getSettings(Request $request, $specialistId)
    {
        try {
            $companyId = $request->get('current_company_id');
            
            if (!$companyId) {
                $user = auth('api')->user();
                if ($user && $user->isBusinessOwner()) {
                    $company = $user->ownedCompanies()->first();
                    if ($company) {
                        $companyId = $company->id;
                    }
                }
            }
            
            if (!$companyId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found',
                ], 404);
            }

            $specialist = TeamMember::where('id', $specialistId)
                ->where('company_id', $companyId)
                ->first();

            // Специалист должен быть создан заранее, не создаем автоматически
            if (!$specialist) {
                $existsAnywhere = TeamMember::where('id', $specialistId)->exists();
                $existsInCompany = TeamMember::where('company_id', $companyId)->exists();
                Log::warning('SalaryController getSettings: Specialist not found', [
                    'specialistId' => $specialistId,
                    'companyId' => $companyId,
                    'exists_in_db' => $existsAnywhere,
                    'company_has_members' => $existsInCompany,
                    'all_specialists' => TeamMember::where('company_id', $companyId)->pluck('id')->toArray(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Specialist not found for this company',
                    'specialist_id' => $specialistId,
                    'company_id' => $companyId,
                ], 404);
            }

            $settings = SalarySetting::where('specialist_id', $specialistId)
                ->orderBy('effective_from', 'desc')
                ->get()
                ->map(function ($setting) {
                    return [
                        'id' => $setting->id,
                        'payment_type' => $setting->payment_type,
                        'percent_rate' => $setting->percent_rate ? (float) $setting->percent_rate : null,
                        'fixed_amount' => $setting->fixed_amount ? (float) $setting->fixed_amount : null,
                        'hourly_rate' => $setting->hourly_rate ? (float) $setting->hourly_rate : null,
                        'is_active' => $setting->is_active,
                        'effective_from' => $setting->effective_from->format('Y-m-d'),
                        'effective_to' => $setting->effective_to ? $setting->effective_to->format('Y-m-d') : null,
                        'created_at' => $setting->created_at->format('Y-m-d H:i:s'),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $settings,
            ]);
        } catch (\Exception $e) {
            Log::error('Salary Get Settings Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch salary settings',
            ], 500);
        }
    }

    /**
     * Update or create salary settings for a specialist.
     */
    public function updateSettings(Request $request, $specialistId)
    {
        // Логируем ВСЕ детали запроса для отладки
        Log::info('SalaryController: updateSettings CALLED', [
            'specialistId' => $specialistId,
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'path' => $request->path(),
            'route' => $request->route() ? $request->route()->getName() : 'no route',
            'request_data' => $request->all(),
            'headers' => $request->headers->all(),
        ]);
        
        try {
            $companyId = $request->get('current_company_id');
            
            if (!$companyId) {
                $user = auth('api')->user();
                if ($user && $user->isBusinessOwner()) {
                    $company = $user->ownedCompanies()->first();
                    if ($company) {
                        $companyId = $company->id;
                    }
                }
            }
            
            if (!$companyId) {
                Log::warning('SalaryController updateSettings: Company not found', [
                    'specialistId' => $specialistId,
                    'user_id' => auth('api')->id(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found',
                ], 404);
            }

            Log::info('SalaryController updateSettings: Looking for specialist', [
                'specialistId' => $specialistId,
                'companyId' => $companyId,
            ]);

            $specialist = TeamMember::where('id', $specialistId)
                ->where('company_id', $companyId)
                ->first();

            // Специалист должен быть создан заранее, не создаем автоматически
            if (!$specialist) {
                Log::warning('SalaryController updateSettings: Specialist not found', [
                    'specialistId' => $specialistId,
                    'companyId' => $companyId,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Specialist not found. Please create specialist first.',
                ], 404);
            }

            Log::info('SalaryController updateSettings: Specialist found, proceeding with validation', [
                'specialistId' => $specialist->id,
                'specialistName' => $specialist->name,
            ]);

            $validator = Validator::make($request->all(), [
                'payment_type' => 'required|in:percent,fixed,fixed_plus_percent,hourly',
                'percent_rate' => 'nullable|numeric|min:0|max:100',
                'fixed_amount' => 'nullable|numeric|min:0',
                'hourly_rate' => 'nullable|numeric|min:0',
                'is_active' => 'boolean',
                'effective_from' => 'required|date',
                'effective_to' => 'nullable|date|after:effective_from',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Валидация в зависимости от типа оплаты
            $paymentType = $request->input('payment_type');
            if ($paymentType === 'percent' && !$request->has('percent_rate')) {
                return response()->json([
                    'success' => false,
                    'errors' => ['percent_rate' => ['Percent rate is required for percent payment type']],
                ], 422);
            }
            if ($paymentType === 'fixed' && !$request->has('fixed_amount')) {
                return response()->json([
                    'success' => false,
                    'errors' => ['fixed_amount' => ['Fixed amount is required for fixed payment type']],
                ], 422);
            }
            if ($paymentType === 'fixed_plus_percent') {
                if (!$request->has('fixed_amount') || !$request->has('percent_rate')) {
                    return response()->json([
                        'success' => false,
                        'errors' => [
                            'fixed_amount' => ['Fixed amount is required for fixed_plus_percent payment type'],
                            'percent_rate' => ['Percent rate is required for fixed_plus_percent payment type'],
                        ],
                    ], 422);
                }
            }
            if ($paymentType === 'hourly' && !$request->has('hourly_rate')) {
                return response()->json([
                    'success' => false,
                    'errors' => ['hourly_rate' => ['Hourly rate is required for hourly payment type']],
                ], 422);
            }

            $setting = SalarySetting::create([
                'specialist_id' => $specialist->id,
                'company_id' => $companyId,
                'payment_type' => $paymentType,
                'percent_rate' => $request->input('percent_rate'),
                'fixed_amount' => $request->input('fixed_amount'),
                'hourly_rate' => $request->input('hourly_rate'),
                'is_active' => $request->input('is_active', true),
                'effective_from' => $request->input('effective_from'),
                'effective_to' => $request->input('effective_to'),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Salary setting created successfully',
                'data' => [
                    'id' => $setting->id,
                    'payment_type' => $setting->payment_type,
                    'percent_rate' => $setting->percent_rate ? (float) $setting->percent_rate : null,
                    'fixed_amount' => $setting->fixed_amount ? (float) $setting->fixed_amount : null,
                    'hourly_rate' => $setting->hourly_rate ? (float) $setting->hourly_rate : null,
                    'is_active' => $setting->is_active,
                    'effective_from' => $setting->effective_from->format('Y-m-d'),
                    'effective_to' => $setting->effective_to ? $setting->effective_to->format('Y-m-d') : null,
                ],
            ], 201);
        } catch (\Exception $e) {
            Log::error('Salary Update Settings Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to update salary settings',
            ], 500);
        }
    }

    /**
     * Get details of a salary calculation.
     */
    public function getDetails(Request $request, $id)
    {
        try {
            $companyId = $request->get('current_company_id');
            
            if (!$companyId) {
                $user = auth('api')->user();
                if ($user && $user->isBusinessOwner()) {
                    $company = $user->ownedCompanies()->first();
                    if ($company) {
                        $companyId = $company->id;
                    }
                }
            }
            
            if (!$companyId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found',
                ], 404);
            }

            $calculation = SalaryCalculation::where('id', $id)
                ->where('company_id', $companyId)
                ->with(['specialist'])
                ->first();

            if (!$calculation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Salary calculation not found',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $calculation->id,
                    'specialist_id' => $calculation->specialist_id,
                    'specialist_name' => $calculation->specialist->name ?? 'Неизвестно',
                    'period_start' => $calculation->period_start->format('Y-m-d'),
                    'period_end' => $calculation->period_end->format('Y-m-d'),
                    'total_bookings' => $calculation->total_bookings,
                    'total_hours' => (float) $calculation->total_hours,
                    'base_amount' => (float) $calculation->base_amount,
                    'percent_amount' => (float) $calculation->percent_amount,
                    'total_salary' => (float) $calculation->total_salary,
                    'calculation_details' => $calculation->calculation_details ?? [],
                    'created_at' => $calculation->created_at->format('Y-m-d H:i:s'),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Salary Get Details Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch salary calculation details',
            ], 500);
        }
    }

    /**
     * Export salary report.
     */
    public function export(Request $request, $type)
    {
        try {
            $companyId = $request->get('current_company_id');
            
            if (!$companyId) {
                $user = auth('api')->user();
                if ($user && $user->isBusinessOwner()) {
                    $company = $user->ownedCompanies()->first();
                    if ($company) {
                        $companyId = $company->id;
                    }
                }
            }
            
            if (!$companyId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found',
                ], 404);
            }

            $filters = $this->getFilters($request);
            
            $query = SalaryCalculation::where('company_id', $companyId)
                ->with(['specialist']);

            if ($filters['date_from']) {
                $query->where('period_start', '>=', $filters['date_from']);
            }
            if ($filters['date_to']) {
                $query->where('period_end', '<=', $filters['date_to']);
            }
            if ($filters['specialist_id']) {
                $query->where('specialist_id', $filters['specialist_id']);
            }

            $calculations = $query->orderBy('period_start', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            if ($type === 'csv') {
                $csv = "Период начало,Период конец,Сотрудник,Бронирований,Часов,Базовая сумма,Процентная сумма,Итого ЗП\n";
                
                foreach ($calculations as $calc) {
                    $csv .= sprintf(
                        "%s,%s,%s,%d,%.2f,%.2f,%.2f,%.2f\n",
                        $calc->period_start->format('Y-m-d'),
                        $calc->period_end->format('Y-m-d'),
                        $calc->specialist->name ?? 'Неизвестно',
                        $calc->total_bookings,
                        $calc->total_hours,
                        $calc->base_amount,
                        $calc->percent_amount,
                        $calc->total_salary
                    );
                }

                return response($csv)
                    ->header('Content-Type', 'text/csv; charset=UTF-8')
                    ->header('Content-Disposition', 'attachment; filename="salary_report_' . date('Y-m-d') . '.csv"');
            }

            return response()->json([
                'success' => false,
                'message' => 'Unsupported export type',
            ], 400);
        } catch (\Exception $e) {
            Log::error('Salary Export Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to export salary report',
            ], 500);
        }
    }

    /**
     * Get filters from request.
     */
    private function getFilters(Request $request)
    {
        return [
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
            'specialist_id' => $request->input('specialist_id') ?? $request->input('team_member_id'), // Поддержка старого параметра для обратной совместимости
        ];
    }
}
