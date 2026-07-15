<?php

namespace App\Services;

use App\Models\PushSubscription;
use App\Models\UnitChecklist;
use App\Models\User;
use App\Support\SystemRoles;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class PushNotificationService
{
    public function isConfigured(): bool
    {
        return filled(config('webpush.vapid.public_key'))
            && filled(config('webpush.vapid.private_key'));
    }

    public function notifyCoordinatorsConsolidationObserved(
        UnitChecklist $checklist,
        ?User $except = null,
    ): void {
        $checklist->loadMissing('unit');

        $query = User::role(SystemRoles::COORDINADOR);

        if ($checklist->unit?->coordinator_id) {
            $query->where('id', $checklist->unit->coordinator_id);
        }

        $recipients = $query->get();

        if ($except !== null) {
            $recipients = $recipients->reject(
                fn (User $user): bool => $user->id === $except->id,
            );
        }

        $this->sendToUsers($recipients, [
            'title' => 'Consolidado observado',
            'body' => "Placa {$checklist->plate_number}: tienes un consolidado pendiente de plan de acción.",
            'url' => "/consolidados/{$checklist->id}",
            'tag' => "consolidation-observed-{$checklist->id}",
        ]);
    }

    public function notifyInspectorsConsolidationReviewed(
        UnitChecklist $checklist,
        ?User $except = null,
    ): void {
        $recipients = User::role(SystemRoles::INSPECTOR)->get();

        if ($checklist->created_by) {
            $creator = User::query()->find($checklist->created_by);
            if ($creator) {
                $recipients = $recipients->push($creator)->unique('id');
            }
        }

        if ($except !== null) {
            $recipients = $recipients->reject(
                fn (User $user): bool => $user->id === $except->id,
            );
        }

        $this->sendToUsers($recipients, [
            'title' => 'Consolidado revisado',
            'body' => "Placa {$checklist->plate_number}: el coordinador respondió. Ya puedes continuar con la 2da inspección.",
            'url' => "/inspecciones/{$checklist->id}/editar",
            'tag' => "consolidation-reviewed-{$checklist->id}",
        ]);
    }

    /**
     * @param  Collection<int, User>  $users
     * @param  array{title: string, body: string, url: string, tag: string}  $payload
     */
    public function sendToUsers(Collection $users, array $payload): void
    {
        if (! $this->isConfigured() || $users->isEmpty()) {
            return;
        }

        $subscriptions = PushSubscription::query()
            ->whereIn('user_id', $users->pluck('id')->all())
            ->get();

        if ($subscriptions->isEmpty()) {
            return;
        }

        $webPush = new WebPush([
            'VAPID' => [
                'subject' => (string) config('webpush.vapid.subject'),
                'publicKey' => (string) config('webpush.vapid.public_key'),
                'privateKey' => (string) config('webpush.vapid.private_key'),
            ],
        ]);

        $json = json_encode($payload, JSON_THROW_ON_ERROR);

        foreach ($subscriptions as $subscription) {
            $webPush->queueNotification(
                Subscription::create([
                    'endpoint' => $subscription->endpoint,
                    'publicKey' => $subscription->public_key,
                    'authToken' => $subscription->auth_token,
                    'contentEncoding' => $subscription->content_encoding,
                ]),
                $json,
            );
        }

        foreach ($webPush->flush() as $report) {
            if ($report->isSuccess()) {
                continue;
            }

            $endpoint = $report->getRequest()->getUri()->__toString();

            if ($report->isSubscriptionExpired()) {
                PushSubscription::query()
                    ->where('endpoint', $endpoint)
                    ->delete();
            }

            Log::warning('Web push delivery failed', [
                'endpoint' => $endpoint,
                'reason' => $report->getReason(),
            ]);
        }
    }
}
