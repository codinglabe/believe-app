<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Google\Service\AndroidEnterprise\Permission;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // User::factory()->create([
        //     'name' => 'Test User',
        //     'email' => 'test@example.com',
        // ]);

        // Run seeders sequentially (serialized) in the correct order

        // Step 1: Seed code tables first (foundation data)
        $this->call(ActivityCodesTableSeeder::class);
        $this->call(AffiliationCodesTableSeeder::class);
        $this->call(ClassificationCodesTableSeeder::class);
        $this->call(DeductibilityCodesTableSeeder::class);
        $this->call(FoundationTypesTableSeeder::class);
        $this->call(GroupCodesTableSeeder::class);
        $this->call(NteeCodesTableSeeder::class);
        $this->call(OrganizationStructuresTableSeeder::class);
        $this->call(StatusCodesTableSeeder::class);
        $this->call(SubsectionCodesTableSeeder::class);

        // Step 2: Seed roles and permissions
        $this->call(RoleSeeder::class);
        $this->call(AdminPermissionsSeeder::class);
        $this->call(permissionsSeeder::class);
        $this->call(ComprehensivePermissionsSeeder::class);
        $this->call(ComplianceReviewPermissionSeeder::class);
        $this->call(JobPostsPermisstionSeeder::class);
        $this->call(LivestockPermissionsSeeder::class);
        $this->call(assignRole::class);

        // Step 3: Seed users and assign roles/permissions
        $this->call(AssignRolePermissionToUsersSeeder::class);
        $this->call(UsernameSeeder::class);
        $this->call(OrganizationPendingRoleSeeder::class);
        $this->call(testUserSeeder::class);

        // Step 6: Seed fractional ownership test data
        $this->call(FractionalOwnershipSeeder::class);

        // Step 4: Seed categories and other content
        $this->call(CategorySeeder::class);
        $this->call(PositionCategoriesAndJobPositionsSeeder::class);
        $this->call(EventTypesTableSeeder::class);
        $this->call(ChatRoomsSeeder::class);
        $this->call(PlanSeeder::class);
        $this->call(ContactPageContentSeeder::class);
        $this->call(PromotionalBannerSeeder::class);

        // Step 5: Seed organization-related data
        $this->call(OrganizationBoardMembersSeeder::class);
        $this->call(OrganizationRoleSeeder::class);

        // Step 6: Seed additional data and utilities
        $this->call(RegenerateStripeCustomerIdSeeder::class);
        $this->call(ExistingUserReferralGenerate::class);

        $this->call(SupporterPositionsTableSeeder::class);
    }
}
