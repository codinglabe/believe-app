'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Check, ExternalLink, ShoppingBag, Circle } from 'lucide-react';

interface ProductSourceSelectorProps {
  selected: 'printify' | 'manual';
  onSelect: (source: 'printify' | 'manual') => void;
}

export function ProductSourceSelector({ selected, onSelect }: ProductSourceSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Printify Sourced Product */}
        <Card
          onClick={() => onSelect('printify')}
          className={`group relative p-6 md:p-8 cursor-pointer transition-all duration-300 border-2 overflow-hidden ${
            selected === 'printify'
              ? 'border-blue-500 dark:border-blue-400 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-blue-900/30 shadow-lg shadow-blue-500/20 dark:shadow-blue-500/10 scale-[1.02]'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/20 dark:hover:shadow-blue-500/10 hover:scale-[1.01] hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
          }`}
        >
          {/* Selection Indicator */}
          {selected === 'printify' ? (
            <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
              <Check className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className="absolute top-4 right-4 w-7 h-7 rounded-full border-2 border-gray-300 dark:border-gray-600 group-hover:border-blue-400 dark:group-hover:border-blue-500 flex items-center justify-center transition-all duration-200 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20">
              <Circle className="w-3 h-3 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" fill="currentColor" />
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 md:p-4 rounded-xl transition-all duration-300 ${
                selected === 'printify'
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 shadow-lg shadow-blue-500/30'
                  : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20'
              }`}>
                <ExternalLink className={`w-6 h-6 md:w-7 md:h-7 transition-colors ${
                  selected === 'printify'
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className={`font-bold text-lg md:text-xl transition-colors ${
                    selected === 'printify'
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                  }`}>
                    Printify Sourced Product
                  </h3>
                  {!selected && (
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      Click to select
                    </span>
                  )}
                </div>
                <p className={`text-sm md:text-base leading-relaxed transition-colors ${
                  selected === 'printify'
                    ? 'text-blue-800 dark:text-blue-200'
                    : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                }`}>
                  Create print-on-demand products through Printify. Design and sell custom products without managing inventory.
                </p>
              </div>
            </div>

            <div className="mt-2 space-y-2.5">
              <div className={`flex items-start gap-2.5 text-sm transition-colors ${
                selected === 'printify'
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 transition-colors ${
                  selected === 'printify'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`} />
                <span>Automatic inventory management</span>
              </div>
              <div className={`flex items-start gap-2.5 text-sm transition-colors ${
                selected === 'printify'
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 transition-colors ${
                  selected === 'printify'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`} />
                <span>Printify handles fulfillment</span>
              </div>
              <div className={`flex items-start gap-2.5 text-sm transition-colors ${
                selected === 'printify'
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 transition-colors ${
                  selected === 'printify'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`} />
                <span>Multiple product options & variants</span>
              </div>
            </div>
          </div>
        </Card>

        {/* My Source Product */}
        <Card
          onClick={() => onSelect('manual')}
          className={`group relative p-6 md:p-8 cursor-pointer transition-all duration-300 border-2 overflow-hidden ${
            selected === 'manual'
              ? 'border-green-500 dark:border-green-400 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 dark:from-green-950/40 dark:via-emerald-950/40 dark:to-green-900/30 shadow-lg shadow-green-500/20 dark:shadow-green-500/10 scale-[1.02]'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-400 dark:hover:border-green-500 hover:shadow-xl hover:shadow-green-500/20 dark:hover:shadow-green-500/10 hover:scale-[1.01] hover:bg-green-50/50 dark:hover:bg-green-950/20'
          }`}
        >
          {/* Selection Indicator */}
          {selected === 'manual' ? (
            <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
              <Check className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className="absolute top-4 right-4 w-7 h-7 rounded-full border-2 border-gray-300 dark:border-gray-600 group-hover:border-green-400 dark:group-hover:border-green-500 flex items-center justify-center transition-all duration-200 group-hover:bg-green-50 dark:group-hover:bg-green-900/20">
              <Circle className="w-3 h-3 text-gray-400 dark:text-gray-500 group-hover:text-green-500 dark:group-hover:text-green-400 transition-colors" fill="currentColor" />
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 md:p-4 rounded-xl transition-all duration-300 ${
                selected === 'manual'
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 shadow-lg shadow-green-500/30'
                  : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-green-50 dark:group-hover:bg-green-900/20'
              }`}>
                <ShoppingBag className={`w-6 h-6 md:w-7 md:h-7 transition-colors ${
                  selected === 'manual'
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-300 group-hover:text-green-600 dark:group-hover:text-green-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className={`font-bold text-lg md:text-xl transition-colors ${
                    selected === 'manual'
                      ? 'text-green-900 dark:text-green-100'
                      : 'text-gray-900 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400'
                  }`}>
                    My Source Product
                  </h3>
                  {!selected && (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      Click to select
                    </span>
                  )}
                </div>
                <p className={`text-sm md:text-base leading-relaxed transition-colors ${
                  selected === 'manual'
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                }`}>
                  Add your own products with custom pricing and shipping. You manage inventory and fulfillment with complete control.
                </p>
              </div>
            </div>

            <div className="mt-2 space-y-2.5">
              <div className={`flex items-start gap-2.5 text-sm transition-colors ${
                selected === 'manual'
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 transition-colors ${
                  selected === 'manual'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`} />
                <span>Full control over pricing</span>
              </div>
              <div className={`flex items-start gap-2.5 text-sm transition-colors ${
                selected === 'manual'
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 transition-colors ${
                  selected === 'manual'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`} />
                <span>Upload custom product images</span>
              </div>
              <div className={`flex items-start gap-2.5 text-sm transition-colors ${
                selected === 'manual'
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 transition-colors ${
                  selected === 'manual'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`} />
                <span>Manage your inventory</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
