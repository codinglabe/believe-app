<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\PlanFeature;
use App\Support\PlanPricingPageDefaults;
use Illuminate\Database\Seeder;

class PlanPricingPageSeeder extends Seeder
{
    /**
     * Seed /pricing marketing data from the Unity Membership artwork onto the featured plan.
     */
    public function run(): void
    {
        $plan = Plan::query()
            ->where('is_active', true)
            ->where('is_popular', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->first()
            ?? Plan::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->first();

        if (! $plan) {
            $this->command?->warn('PlanPricingPageSeeder: no active plan found — skipping.');

            return;
        }

        $fields = is_array($plan->custom_fields) ? $plan->custom_fields : [];

        foreach (PlanPricingPageDefaults::pricingCustomFields() as $field) {
            $this->upsertCustomField(
                $fields,
                $field['key'],
                $field['label'],
                $field['value'],
                $field['type'],
                $field['icon'] ?? '',
                $field['description'] ?? null,
            );
        }

        $plan->update([
            ...PlanPricingPageDefaults::featuredPlanAttributes(),
            'custom_fields' => $fields,
        ]);

        $this->syncPlanFeaturesFromArtwork($plan);

        $this->command?->info(sprintf(
            'PlanPricingPageSeeder: seeded Unity Membership artwork on plan #%d (%s) at $%s/mo.',
            $plan->id,
            $plan->name,
            number_format(PlanPricingPageDefaults::INTRO_PRICE, 2),
        ));
    }

    /**
     * @param  list<array<string, mixed>>  $fields
     */
    private function upsertCustomField(
        array &$fields,
        string $key,
        string $label,
        string $value,
        string $type = 'text',
        string $icon = '',
        ?string $description = null,
    ): void {
        foreach ($fields as &$field) {
            if (($field['key'] ?? '') === $key) {
                $field['label'] = $label;
                $field['value'] = $value;
                $field['type'] = $type;
                $field['icon'] = $icon;
                $field['description'] = $description;

                return;
            }
        }

        $fields[] = [
            'key' => $key,
            'label' => $label,
            'value' => $value,
            'type' => $type,
            'icon' => $icon,
            'description' => $description,
        ];
    }

    /** Replace plan features so admin “Plan Features” matches the artwork included list. */
    private function syncPlanFeaturesFromArtwork(Plan $plan): void
    {
        $plan->features()->delete();

        foreach (PlanPricingPageDefaults::everythingIncludedItems() as $index => $name) {
            PlanFeature::create([
                'plan_id' => $plan->id,
                'name' => $name,
                'description' => null,
                'icon' => null,
                'is_unlimited' => true,
                'sort_order' => $index,
            ]);
        }
    }
}
