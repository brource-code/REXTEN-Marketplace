<?php

namespace App\Jobs;

use App\Models\Advertisement;
use App\Services\ModerationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class AutoApproveAdvertisement implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $advertisementId;

    public $tries = 3;
    public $timeout = 30;

    public function __construct($advertisementId)
    {
        $this->advertisementId = $advertisementId;
    }

    public function handle(ModerationService $moderationService): void
    {
        \Log::info("AutoApproveAdvertisement: Starting for ID: " . $this->advertisementId);
        
        $advertisement = Advertisement::find($this->advertisementId);
        
        if (!$advertisement) {
            \Log::warning("AutoApproveAdvertisement: Not found: " . $this->advertisementId);
            return;
        }
        
        if ($advertisement->status !== "pending") {
            \Log::info("AutoApproveAdvertisement: Not pending: " . $advertisement->status);
            return;
        }

        $textToModerate = $this->prepareTextForModeration($advertisement);
        
        \Log::info("AutoApproveAdvertisement: Moderating", ["id" => $this->advertisementId]);

        $moderationResult = $moderationService->moderate($textToModerate);

        if ($moderationResult["flagged"]) {
            $advertisement->update([
                "status" => "rejected",
                "is_active" => false,
                "moderation_reason" => $moderationResult["reason"],
                "moderation_categories" => $moderationResult["categories"],
                "moderated_at" => now(),
            ]);
            \Log::info("AutoApproveAdvertisement: REJECTED", ["id" => $this->advertisementId]);
        } else {
            $advertisement->update([
                "status" => "approved",
                "is_active" => true,
                "moderation_reason" => null,
                "moderation_categories" => null,
                "moderated_at" => now(),
            ]);
            \Log::info("AutoApproveAdvertisement: APPROVED", ["id" => $this->advertisementId]);
        }
    }

    private function prepareTextForModeration(Advertisement $advertisement): string
    {
        $parts = [];
        if (!empty($advertisement->title)) {
            $parts[] = "Название: " . $advertisement->title;
        }
        if (!empty($advertisement->description)) {
            $parts[] = "Описание: " . $advertisement->description;
        }
        if (!empty($advertisement->services) && is_array($advertisement->services)) {
            $serviceNames = [];
            foreach ($advertisement->services as $service) {
                if (isset($service["name"])) $serviceNames[] = $service["name"];
                if (isset($service["description"])) $serviceNames[] = $service["description"];
            }
            if (!empty($serviceNames)) {
                $parts[] = "Услуги: " . implode(", ", $serviceNames);
            }
        }
        return implode("\n", $parts);
    }

    public function failed(\Throwable $exception): void
    {
        \Log::error("AutoApproveAdvertisement: Failed", ["id" => $this->advertisementId, "error" => $exception->getMessage()]);
        
        $advertisement = Advertisement::find($this->advertisementId);
        if ($advertisement && $advertisement->status === "pending") {
            $advertisement->update([
                "status" => "approved",
                "is_active" => true,
                "moderation_reason" => "Модерация временно недоступна",
                "moderated_at" => now(),
            ]);
        }
    }
}
