<?php

namespace App\Traits;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

trait LogsActivity
{
    /**
     * Записать действие в лог активности
     */
    protected static function logActivity(
        string $action,
        $entity = null,
        array $oldValues = [],
        array $newValues = [],
        string $description = null
    ): void {
        $user = Auth::user();
        
        ActivityLog::create([
            'user_id' => $user?->id,
            'action' => $action,
            'entity_type' => $entity ? get_class($entity) : static::class,
            'entity_id' => $entity?->id,
            'entity_name' => $entity ? static::getEntityName($entity) : null,
            'old_values' => !empty($oldValues) ? $oldValues : null,
            'new_values' => !empty($newValues) ? $newValues : null,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'description' => $description ?? static::generateDescription($action, $entity),
        ]);
    }

    /**
     * Получить название сущности для лога
     */
    protected static function getEntityName($entity): string
    {
        if (method_exists($entity, 'getName')) {
            return $entity->getName();
        }
        
        if (isset($entity->name)) {
            return $entity->name;
        }
        
        if (isset($entity->title)) {
            return $entity->title;
        }
        
        if (isset($entity->email)) {
            return $entity->email;
        }
        
        return class_basename($entity) . ' #' . $entity->id;
    }

    /**
     * Сгенерировать описание действия
     */
    protected static function generateDescription(string $action, $entity = null): string
    {
        $entityName = $entity ? static::getEntityName($entity) : class_basename(static::class);
        $userName = Auth::user()?->name ?? 'System';
        
        $actionLabels = [
            'create' => 'создал',
            'update' => 'обновил',
            'delete' => 'удалил',
            'approve' => 'одобрил',
            'reject' => 'отклонил',
            'block' => 'заблокировал',
            'unblock' => 'разблокировал',
            'login' => 'вошел в систему',
            'logout' => 'вышел из системы',
        ];
        
        $actionLabel = $actionLabels[$action] ?? $action;
        
        return "{$userName} {$actionLabel} {$entityName}";
    }

    /**
     * Boot trait - автоматическое логирование событий модели
     * Laravel автоматически вызывает boot{TraitName} методы
     */
    public static function bootLogsActivity(): void
    {
        static::created(function ($model) {
            static::logActivity('create', $model);
        });

        static::updated(function ($model) {
            $oldValues = [];
            $newValues = [];
            
            foreach ($model->getDirty() as $key => $value) {
                $oldValues[$key] = $model->getOriginal($key);
                $newValues[$key] = $value;
            }
            
            if (!empty($newValues)) {
                static::logActivity('update', $model, $oldValues, $newValues);
            }
        });

        static::deleted(function ($model) {
            static::logActivity('delete', $model);
        });
    }
}
