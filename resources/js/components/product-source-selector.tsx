'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Check, ExternalLink, ShoppingBag, Circle, Store } from 'lucide-react';

interface ProductSourceSelectorProps {
  selected: 'printify' | 'manual';
  onSelect: (source: 'printify' | 'manual') => void;
  /** Organization: nested under "My Source Product" — own vs merchant hub */
  showManualSubSource?: boolean;
  manualSubSource?: 'own' | 'merchant_hub';
  onManualSubSourceChange?: (source: 'own' | 'merchant_hub') => void;
}

export function ManualProductSourceTypeRow({
  value,
  onChange,
}: {
  value: 'own' | 'merchant_hub';
  onChange: (source: 'own' | 'merchant_hub') => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Product source type</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange('own')}
          className={`flex flex-col rounded-xl border-2 p-4 text-left transition-all ${
            value === 'own'
              ? 'border-emerald-500 bg-emerald-50/80 shadow-md dark:border-emerald-400 dark:bg-emerald-950/40'
              : 'border-gray-200 bg-white hover:border-emerald-300 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-emerald-700'
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-gray-900 dark:text-gray-100">Own product sell</span>
            {value === 'own' ? (
              <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Circle className="h-4 w-4 text-gray-400" />
            )}
          </div>
          <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
            Create and price your listing manually, same as before.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onChange('merchant_hub')}
          className={`flex flex-col rounded-xl border-2 p-4 text-left transition-all ${
            value === 'merchant_hub'
              ? 'border-amber-500 bg-amber-50/80 shadow-md dark:border-amber-400 dark:bg-amber-950/40'
              : 'border-gray-200 bg-white hover:border-amber-300 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-amber-700'
          }`}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
              <Store className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
              Merchant Hub product sell
            </span>
            {value === 'merchant_hub' ? (
              <Check className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            ) : (
              <Circle className="h-4 w-4 text-gray-400" />
            )}
          </div>
          <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
            Pick a merchant, choose one of their hub products, and ship from the merchant&apos;s address.
          </p>
        </button>
      </div>
    </div>
  );
}

export function ProductSourceSelector({
  selected,
  onSelect,
  showManualSubSource = false,
  manualSubSource = 'own',
  onManualSubSourceChange,
}: ProductSourceSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        {/* Printify Sourced Product */}
        <Card
          onClick={() => onSelect('printify')}
          className={`group relative cursor-pointer overflow-hidden border-2 p-6 transition-all duration-300 md:p-8 ${
            selected === 'printify'
              ? 'scale-[1.02] border-blue-500 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 shadow-lg shadow-blue-500/20 dark:border-blue-400 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-blue-900/30 dark:shadow-blue-500/10'
              : 'border-gray-200 bg-white hover:scale-[1.01] hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-xl hover:shadow-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500 dark:hover:bg-blue-950/20 dark:hover:shadow-blue-500/10'
          }`}
        >
          {/* Selection Indicator */}
          {selected === 'printify' ? (
            <div className="absolute top-4 right-4 flex h-7 w-7 animate-in items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg duration-200 zoom-in dark:from-blue-400 dark:to-indigo-500">
              <Check className="h-4 w-4 text-white" />
            </div>
          ) : (
            <div className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full border-2 border-gray-300 transition-all duration-200 group-hover:border-blue-400 group-hover:bg-blue-50 dark:border-gray-600 dark:group-hover:border-blue-500 dark:group-hover:bg-blue-900/20">
              <Circle className="h-3 w-3 text-gray-400 transition-colors group-hover:text-blue-500 dark:text-gray-500 dark:group-hover:text-blue-400" fill="currentColor" />
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div
                className={`rounded-xl p-3 transition-all duration-300 md:p-4 ${
                  selected === 'printify'
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 dark:from-blue-400 dark:to-indigo-500'
                    : 'bg-gray-100 group-hover:bg-blue-50 dark:bg-gray-700 dark:group-hover:bg-blue-900/20'
                }`}
              >
                <ExternalLink
                  className={`h-6 w-6 transition-colors md:h-7 md:w-7 ${
                    selected === 'printify' ? 'text-white' : 'text-gray-600 group-hover:text-blue-600 dark:text-gray-300 dark:group-hover:text-blue-400'
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <h3
                    className={`text-lg font-bold transition-colors md:text-xl ${
                      selected === 'printify'
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-gray-900 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400'
                    }`}
                  >
                    Printify Sourced Product
                  </h3>
                </div>
                <p
                  className={`text-sm leading-relaxed transition-colors md:text-base ${
                    selected === 'printify'
                      ? 'text-blue-800 dark:text-blue-200'
                      : 'text-gray-600 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300'
                  }`}
                >
                  Create print-on-demand products through Printify. Design and sell custom products without managing inventory.
                </p>
              </div>
            </div>

            <div className="mt-2 space-y-2.5">
              <div
                className={`flex items-start gap-2.5 text-sm transition-colors ${
                  selected === 'printify' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Check
                  className={`mt-0.5 h-4 w-4 flex-shrink-0 transition-colors ${
                    selected === 'printify' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                  }`}
                />
                <span>Automatic inventory management</span>
              </div>
              <div
                className={`flex items-start gap-2.5 text-sm transition-colors ${
                  selected === 'printify' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Check
                  className={`mt-0.5 h-4 w-4 flex-shrink-0 transition-colors ${
                    selected === 'printify' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                  }`}
                />
                <span>Printify handles fulfillment</span>
              </div>
              <div
                className={`flex items-start gap-2.5 text-sm transition-colors ${
                  selected === 'printify' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Check
                  className={`mt-0.5 h-4 w-4 flex-shrink-0 transition-colors ${
                    selected === 'printify' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                  }`}
                />
                <span>Multiple product options & variants</span>
              </div>
            </div>
          </div>
        </Card>

        {/* My Source Product */}
        <Card
          onClick={() => onSelect('manual')}
          className={`group relative cursor-pointer overflow-hidden border-2 p-6 transition-all duration-300 md:p-8 ${
            selected === 'manual'
              ? 'scale-[1.02] border-green-500 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 shadow-lg shadow-green-500/20 dark:border-green-400 dark:from-green-950/40 dark:via-emerald-950/40 dark:to-green-900/30 dark:shadow-green-500/10'
              : 'border-gray-200 bg-white hover:scale-[1.01] hover:border-green-400 hover:bg-green-50/50 hover:shadow-xl hover:shadow-green-500/20 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-green-500 dark:hover:bg-green-950/20 dark:hover:shadow-green-500/10'
          }`}
        >
          {selected === 'manual' ? (
            <div className="absolute top-4 right-4 flex h-7 w-7 animate-in items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg duration-200 zoom-in dark:from-green-400 dark:to-emerald-500">
              <Check className="h-4 w-4 text-white" />
            </div>
          ) : (
            <div className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full border-2 border-gray-300 transition-all duration-200 group-hover:border-green-400 group-hover:bg-green-50 dark:border-gray-600 dark:group-hover:border-green-500 dark:group-hover:bg-green-900/20">
              <Circle className="h-3 w-3 text-gray-400 transition-colors group-hover:text-green-500 dark:text-gray-500 dark:group-hover:text-green-400" fill="currentColor" />
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div
                className={`rounded-xl p-3 transition-all duration-300 md:p-4 ${
                  selected === 'manual'
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30 dark:from-green-400 dark:to-emerald-500'
                    : 'bg-gray-100 group-hover:bg-green-50 dark:bg-gray-700 dark:group-hover:bg-green-900/20'
                }`}
              >
                <ShoppingBag
                  className={`h-6 w-6 transition-colors md:h-7 md:w-7 ${
                    selected === 'manual' ? 'text-white' : 'text-gray-600 group-hover:text-green-600 dark:text-gray-300 dark:group-hover:text-green-400'
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <h3
                    className={`text-lg font-bold transition-colors md:text-xl ${
                      selected === 'manual'
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-gray-900 group-hover:text-green-600 dark:text-gray-100 dark:group-hover:text-green-400'
                    }`}
                  >
                    My Source Product
                  </h3>
                </div>
                <p
                  className={`text-sm leading-relaxed transition-colors md:text-base ${
                    selected === 'manual'
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-gray-600 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300'
                  }`}
                >
                  Add your own products with custom pricing. Shipping is quoted at checkout via Shippo; you manage inventory and fulfillment.
                </p>
              </div>
            </div>

            <div className="mt-2 space-y-2.5">
              <div
                className={`flex items-start gap-2.5 text-sm transition-colors ${
                  selected === 'manual' ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Check
                  className={`mt-0.5 h-4 w-4 flex-shrink-0 transition-colors ${
                    selected === 'manual' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                  }`}
                />
                <span>Full control over pricing</span>
              </div>
              <div
                className={`flex items-start gap-2.5 text-sm transition-colors ${
                  selected === 'manual' ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Check
                  className={`mt-0.5 h-4 w-4 flex-shrink-0 transition-colors ${
                    selected === 'manual' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                  }`}
                />
                <span>Upload custom product images</span>
              </div>
              <div
                className={`flex items-start gap-2.5 text-sm transition-colors ${
                  selected === 'manual' ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Check
                  className={`mt-0.5 h-4 w-4 flex-shrink-0 transition-colors ${
                    selected === 'manual' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                  }`}
                />
                <span>Manage your inventory</span>
              </div>
            </div>

            {showManualSubSource && selected === 'manual' && onManualSubSourceChange && (
              <div
                className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700"
                onClick={(e) => e.stopPropagation()}
              >
                <ManualProductSourceTypeRow value={manualSubSource} onChange={onManualSubSourceChange} />
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
