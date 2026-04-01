<?php

namespace App\Http\Controllers\FamilyBudget;

use App\Http\Controllers\Controller;
use App\Models\FamilyBudgetEvent;
use App\Models\FamilyBudgetSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FamilyBudgetApiController extends Controller
{
    /**
     * Получить все данные бюджета (настройки + события)
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        
        $settings = FamilyBudgetSettings::firstOrCreate(
            ['user_id' => $user->id],
            [
                'period' => date('Y-m'),
                'start_day' => 1,
                'start_balance' => 0,
                'safe_min_balance' => 300,
            ]
        );

        $events = FamilyBudgetEvent::forUser($user->id)
            ->orderBy('date')
            ->get();

        return response()->json([
            'success' => true,
            'settings' => $settings,
            'events' => $events,
        ]);
    }

    /**
     * Обновить настройки бюджета
     */
    public function updateSettings(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'period' => 'sometimes|string|regex:/^\d{4}-\d{2}$/',
            'start_day' => 'sometimes|integer|min:1|max:31',
            'start_balance' => 'sometimes|numeric',
            'safe_min_balance' => 'sometimes|numeric',
        ]);

        $settings = FamilyBudgetSettings::updateOrCreate(
            ['user_id' => $user->id],
            $validated
        );

        return response()->json([
            'success' => true,
            'settings' => $settings,
        ]);
    }

    /**
     * Получить все события
     */
    public function getEvents(Request $request)
    {
        $user = Auth::user();
        $period = $request->query('period');

        $query = FamilyBudgetEvent::forUser($user->id);
        
        if ($period) {
            $query->forPeriod($period);
        }

        $events = $query->orderBy('date')->get();

        return response()->json([
            'success' => true,
            'events' => $events,
        ]);
    }

    /**
     * Создать событие
     */
    public function storeEvent(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'type' => 'required|in:income,expense',
            'date' => 'required|date',
            'recurrence' => 'sometimes|in:once,weekly,biweekly,monthly,quarterly,yearly',
            'is_flexible' => 'sometimes|boolean',
            'category' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:1000',
        ]);

        $validated['user_id'] = $user->id;

        $event = FamilyBudgetEvent::create($validated);

        return response()->json([
            'success' => true,
            'event' => $event,
        ], 201);
    }

    /**
     * Обновить событие
     */
    public function updateEvent(Request $request, $id)
    {
        $user = Auth::user();

        $event = FamilyBudgetEvent::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'amount' => 'sometimes|numeric|min:0',
            'type' => 'sometimes|in:income,expense',
            'date' => 'sometimes|date',
            'recurrence' => 'sometimes|in:once,weekly,biweekly,monthly,quarterly,yearly',
            'is_flexible' => 'sometimes|boolean',
            'category' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:1000',
        ]);

        $event->update($validated);

        return response()->json([
            'success' => true,
            'event' => $event,
        ]);
    }

    /**
     * Удалить событие
     */
    public function destroyEvent($id)
    {
        $user = Auth::user();

        $event = FamilyBudgetEvent::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $event->delete();

        return response()->json([
            'success' => true,
            'message' => 'Event deleted successfully',
        ]);
    }

    /**
     * Массовое сохранение событий (для синхронизации)
     */
    public function syncEvents(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'events' => 'required|array',
            'events.*.id' => 'nullable|integer',
            'events.*.name' => 'required|string|max:255',
            'events.*.amount' => 'required|numeric|min:0',
            'events.*.type' => 'required|in:income,expense',
            'events.*.date' => 'required|date',
            'events.*.recurrence' => 'sometimes|in:once,weekly,biweekly,monthly,quarterly,yearly',
            'events.*.is_flexible' => 'sometimes|boolean',
            'events.*.category' => 'nullable|string|max:100',
            'events.*.notes' => 'nullable|string|max:1000',
        ]);

        // Удаляем все существующие события пользователя
        FamilyBudgetEvent::where('user_id', $user->id)->delete();

        // Создаём новые события
        $events = [];
        foreach ($validated['events'] as $eventData) {
            unset($eventData['id']); // Убираем старый ID
            $eventData['user_id'] = $user->id;
            $events[] = FamilyBudgetEvent::create($eventData);
        }

        return response()->json([
            'success' => true,
            'events' => $events,
            'message' => 'Events synced successfully',
        ]);
    }

    /**
     * Очистить все данные бюджета
     */
    public function clearAll()
    {
        $user = Auth::user();

        FamilyBudgetEvent::where('user_id', $user->id)->delete();
        
        FamilyBudgetSettings::where('user_id', $user->id)->update([
            'period' => date('Y-m'),
            'start_day' => 1,
            'start_balance' => 0,
            'safe_min_balance' => 300,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'All budget data cleared',
        ]);
    }
}
