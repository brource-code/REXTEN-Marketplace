<?php

namespace App\Services\AI;

use App\Services\Routing\RouteOrchestrator;
use JsonException;
use function json_decode;
use function json_last_error;
use const JSON_ERROR_NONE;

class RouteAssistantTools
{
    public function __construct(
        protected RouteOrchestrator $orchestrator,
        protected RouteAssistantContext $context,
    ) {
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function openaiToolDefinitions(): array
    {
        return [
            $this->fn('get_route_snapshot', 'Get the current day snapshot: specialist, stops, issues, unassigned bookings, and other_specialists (same company, same date) for handoff ideas. Call when you need the latest ground truth.', [
                'type' => 'object',
                'properties' => (object) [],
            ]),
            $this->fn('simulate_route', 'Simulate metrics for a set of included booking IDs and return-leg flag. Does not write to the database.', [
                'type' => 'object',
                'required' => ['include_return_leg'],
                'properties' => [
                    'included_booking_ids' => [
                        'anyOf' => [
                            ['type' => 'null'],
                            ['type' => 'array', 'items' => ['type' => 'integer']],
                        ],
                    ],
                    'include_return_leg' => ['type' => 'boolean'],
                ],
            ]),
            $this->fn('list_unassigned_for_day', 'Bookings on this day with no assigned specialist (for assignment hints).', [
                'type' => 'object',
                'properties' => (object) [],
            ]),
        ];
    }

    /**
     * @return string|array<string, mixed> JSON-строка для tool output (объект сериализуется в json_encode в клиенте)
     */
    public function execute(
        int $companyId,
        int $specialistId,
        string $date,
        string $name,
        ?string $arguments,
        string $localeHint
    ): string {
        $args = $this->decodeArgs($arguments);

        $payload = match ($name) {
            'get_route_snapshot' => $this->context->buildSnapshot($companyId, $specialistId, $date, $localeHint),
            'simulate_route' => $this->orchestrator->assistantSimulateRoute(
                $specialistId,
                $date,
                $companyId,
                $args['included_booking_ids'] ?? null,
                (bool) ($args['include_return_leg'] ?? true),
            ),
            'list_unassigned_for_day' => $this->orchestrator->assistantListUnassignedForDay($specialistId, $date, $companyId),
            default => ['error' => 'unknown_tool', 'name' => $name],
        };

        return (string) json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }

    /**
     * @param  ?array<string, mixed>  $paramSchema
     * @return array<string, mixed>
     */
    protected function fn(string $name, string $description, ?array $paramSchema): array
    {
        $schema = is_array($paramSchema) && isset($paramSchema['type']) ? $paramSchema : [
            'type' => 'object',
            'properties' => (object) [],
        ];

        return [
            'type' => 'function',
            'function' => [
                'name' => $name,
                'description' => $description,
                'parameters' => $schema,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function decodeArgs(?string $json): array
    {
        if ($json === null || trim($json) === '') {
            return [];
        }
        try {
            $a = json_decode($json, true, 16, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return [];
        }

        return is_array($a) ? $a : [];
    }
}
