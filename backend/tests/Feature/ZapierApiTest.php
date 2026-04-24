<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Company;
use App\Models\Service;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ZapierApiTest extends TestCase
{
    use RefreshDatabase;

    private function zapierToken(User $user, int $companyId, array $abilities = ['read', 'zapier:read', 'zapier:write']): string
    {
        $t = $user->createToken('zapier-test', $abilities);
        $t->accessToken->forceFill([
            'company_id' => $companyId,
            'token_prefix' => 'rxt_abcdef12',
        ])->save();

        return $t->plainTextToken;
    }

    private function makeOwner(string $email): User
    {
        return User::query()->create([
            'email' => $email,
            'password' => Hash::make('password'),
            'role' => 'BUSINESS_OWNER',
            'is_active' => true,
        ]);
    }

    private function makeCompany(User $owner, string $slug, string $status = 'active'): Company
    {
        return Company::query()->create([
            'owner_id' => $owner->id,
            'name' => 'Test '.$slug,
            'slug' => $slug,
            'status' => $status,
        ]);
    }

    private function makeService(Company $company, string $name = 'Test Service'): Service
    {
        return Service::query()->create([
            'company_id' => $company->id,
            'name' => $name,
            'slug' => str_replace(' ', '-', strtolower($name)).'-'.$company->id,
            'price' => 50.00,
            'duration_minutes' => 60,
            'is_active' => true,
        ]);
    }

    /**
     * Trial subscription is auto-created in {@see \App\Observers\CompanyObserver} — remove it for deterministic plan.
     */
    private function withSubscription(Company $company, string $planSlug): void
    {
        Subscription::query()->where('company_id', $company->id)->delete();
        Subscription::createForCompany($company->id, $planSlug);
    }

    public function test_me_requires_valid_token(): void
    {
        $this->getJson('/api/zapier/me')->assertStatus(401);
    }

    public function test_me_returns_403_without_api_access_feature(): void
    {
        $owner = $this->makeOwner('a1-'.uniqid().'@test.com');
        $company = $this->makeCompany($owner, 'co-'.uniqid());
        $this->withSubscription($company, 'free');

        $token = $this->zapierToken($owner, $company->id);
        $this->withToken($token)
            ->getJson('/api/zapier/me')
            ->assertStatus(403)
            ->assertJsonPath('error', 'subscription_feature_required');
    }

    public function test_me_403_when_token_lacks_zapier_read_ability(): void
    {
        $owner = $this->makeOwner('a2-'.uniqid().'@test.com');
        $company = $this->makeCompany($owner, 'co-'.uniqid());
        $this->withSubscription($company, 'enterprise');

        $token = $this->zapierToken($owner, $company->id, ['read']);
        $this->withToken($token)
            ->getJson('/api/zapier/me')
            ->assertStatus(403)
            ->assertJsonPath('error', 'missing_ability');
    }

    public function test_me_ok_with_enterprise_and_zapier_abilities(): void
    {
        $owner = $this->makeOwner('a3-'.uniqid().'@test.com');
        $company = $this->makeCompany($owner, 'co-'.uniqid());
        $this->withSubscription($company, 'enterprise');

        $token = $this->zapierToken($owner, $company->id);
        $r = $this->withToken($token)->getJson('/api/zapier/me');
        $r->assertOk();
        $r->assertJsonPath('company.id', $company->id);
        $r->assertJsonPath('user.id', $owner->id);
        $this->assertNotEmpty($r->json('features.api_access'));
    }

    public function test_bookings_list_does_not_include_other_company(): void
    {
        $ownerA = $this->makeOwner('a4-'.uniqid().'@test.com');
        $ownerB = $this->makeOwner('a5-'.uniqid().'@test.com');
        $companyA = $this->makeCompany($ownerA, 'co-a-'.uniqid());
        $companyB = $this->makeCompany($ownerB, 'co-b-'.uniqid());
        $this->withSubscription($companyA, 'enterprise');
        $this->withSubscription($companyB, 'enterprise');

        $svcA = $this->makeService($companyA, 'S A');
        $svcB = $this->makeService($companyB, 'S B');
        $clientA = User::query()->create([
            'email' => 'c-a-'.uniqid().'@test.com',
            'password' => Hash::make('p'),
            'role' => 'CLIENT',
        ]);
        $clientA->profile()->create(['first_name' => 'A', 'last_name' => 'C']);

        $bA = Booking::query()->create([
            'company_id' => $companyA->id,
            'user_id' => $clientA->id,
            'service_id' => $svcA->id,
            'event_type' => 'booking',
            'booking_date' => '2030-06-01 00:00:00',
            'booking_time' => '10:00:00',
            'duration_minutes' => 60,
            'price' => 10,
            'status' => 'confirmed',
        ]);

        $bB = Booking::query()->create([
            'company_id' => $companyB->id,
            'user_id' => null,
            'service_id' => $svcB->id,
            'event_type' => 'booking',
            'client_name' => 'Guest B',
            'client_email' => 'g@b.test',
            'booking_date' => '2030-06-02 00:00:00',
            'booking_time' => '11:00:00',
            'duration_minutes' => 60,
            'price' => 20,
            'status' => 'confirmed',
        ]);

        $tokenA = $this->zapierToken($ownerA, $companyA->id);
        $list = $this->withToken($tokenA)->getJson('/api/zapier/bookings');
        $list->assertOk();
        $ids = collect($list->json())->pluck('id')->all();
        $this->assertContains($bA->id, $ids);
        $this->assertNotContains($bB->id, $ids);
    }

    public function test_create_client_persists_for_company(): void
    {
        $owner = $this->makeOwner('a6-'.uniqid().'@test.com');
        $company = $this->makeCompany($owner, 'co-'.uniqid());
        $this->withSubscription($company, 'enterprise');

        $token = $this->zapierToken($owner, $company->id);
        $r = $this->withToken($token)->postJson('/api/zapier/clients', [
            'first_name' => 'Zap',
            'last_name' => 'Ier',
            'email' => 'z-'.uniqid().'@client.com',
            'phone' => '+1 555 010 0202',
        ]);
        $r->assertStatus(201);
        $id = (int) $r->json('id');
        $u = User::query()->findOrFail($id);
        $this->assertTrue(
            \Illuminate\Support\Facades\DB::table('company_clients')
                ->where('company_id', $company->id)
                ->where('user_id', $u->id)
                ->exists()
        );
    }

    public function test_create_client_validation_error(): void
    {
        $owner = $this->makeOwner('a7-'.uniqid().'@test.com');
        $company = $this->makeCompany($owner, 'co-'.uniqid());
        $this->withSubscription($company, 'enterprise');
        $token = $this->zapierToken($owner, $company->id);

        $this->withToken($token)
            ->postJson('/api/zapier/clients', [])
            ->assertStatus(422);
    }

    public function test_company_suspended_rejected(): void
    {
        $owner = $this->makeOwner('a8-'.uniqid().'@test.com');
        $company = $this->makeCompany($owner, 'co-'.uniqid(), 'suspended');
        $this->withSubscription($company, 'enterprise');
        $token = $this->zapierToken($owner, $company->id);
        $this->withToken($token)
            ->getJson('/api/zapier/me')
            ->assertStatus(403)
            ->assertJsonPath('error', 'company_inactive');
    }
}
