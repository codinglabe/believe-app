<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('merchant_shipping_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained('merchants')->cascadeOnDelete();
            $table->string('label')->nullable();
            $table->string('contact_name')->nullable();
            $table->string('address_line1');
            $table->string('address_line2')->nullable();
            $table->string('city');
            $table->string('state')->nullable();
            $table->string('zip', 32);
            $table->string('country', 255)->default('US');
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index(['merchant_id', 'is_default']);
        });

        if (Schema::hasColumn('merchants', 'shipping_address')) {
            $rows = DB::table('merchants')
                ->select([
                    'id',
                    'shipping_contact_name',
                    'shipping_address',
                    'shipping_city',
                    'shipping_state',
                    'shipping_zip',
                    'shipping_country',
                ])
                ->get();

            foreach ($rows as $m) {
                $line1 = trim((string) ($m->shipping_address ?? ''));
                $city = trim((string) ($m->shipping_city ?? ''));
                $zip = trim((string) ($m->shipping_zip ?? ''));
                if ($line1 === '' && $city === '' && $zip === '') {
                    continue;
                }

                DB::table('merchant_shipping_addresses')->insert([
                    'merchant_id' => $m->id,
                    'label' => null,
                    'contact_name' => $m->shipping_contact_name,
                    'address_line1' => $line1 !== '' ? $line1 : '—',
                    'address_line2' => null,
                    'city' => $city !== '' ? $city : '—',
                    'state' => $m->shipping_state,
                    'zip' => $zip !== '' ? $zip : '00000',
                    'country' => trim((string) ($m->shipping_country ?? '')) ?: 'US',
                    'is_default' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            Schema::table('merchants', function (Blueprint $table) {
                $table->dropColumn([
                    'shipping_contact_name',
                    'shipping_address',
                    'shipping_city',
                    'shipping_state',
                    'shipping_zip',
                    'shipping_country',
                ]);
            });
        }
    }

    public function down(): void
    {
        Schema::table('merchants', function (Blueprint $table) {
            $table->string('shipping_contact_name')->nullable()->after('country');
            $table->string('shipping_address')->nullable()->after('shipping_contact_name');
            $table->string('shipping_city')->nullable()->after('shipping_address');
            $table->string('shipping_state')->nullable()->after('shipping_city');
            $table->string('shipping_zip', 32)->nullable()->after('shipping_state');
            $table->string('shipping_country', 255)->nullable()->after('shipping_zip');
        });

        $addresses = DB::table('merchant_shipping_addresses')
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->get()
            ->unique('merchant_id');

        foreach ($addresses as $a) {
            DB::table('merchants')->where('id', $a->merchant_id)->update([
                'shipping_contact_name' => $a->contact_name,
                'shipping_address' => $a->address_line1,
                'shipping_city' => $a->city,
                'shipping_state' => $a->state,
                'shipping_zip' => $a->zip,
                'shipping_country' => $a->country,
            ]);
        }

        Schema::dropIfExists('merchant_shipping_addresses');
    }
};
