// pages/WebhookManagement.tsx
import { Head, usePage, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import { Plus, Trash2, RefreshCw, ExternalLink, Check, X } from 'lucide-react';
import axios from 'axios';
import SettingsLayout from '@/layouts/settings/layout';
import { PrintifyWebhook } from '@/types/printify';


interface WebhookManagementProps {
  webhooks: PrintifyWebhook[];
}

const ORDER_EVENTS = [
  { value: 'order:created', label: 'Order Created', description: 'Triggered when an order is created in Printify' },
  { value: 'order:updated', label: 'Order Updated', description: 'Triggered when order status is updated' },
  { value: 'order:sent-to-production', label: 'Sent to Production', description: 'Triggered when order is sent to production' },
  { value: 'order:shipment:created', label: 'Shipment Created', description: 'Triggered when items are fulfilled with tracking' },
  { value: 'order:shipment:delivered', label: 'Shipment Delivered', description: 'Triggered when items are delivered' },
];

export default function WebhookManagement({ webhooks: initialWebhooks }: WebhookManagementProps) {
  const [webhooks, setWebhooks] = useState<PrintifyWebhook[]>(initialWebhooks);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    url: `${window.location.origin}/webhooks/printify/orders`,
    events: ['order:created', 'order:updated', 'order:shipment:created']
  });

  const fetchWebhooks = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/admin/webhooks/printify');
      if (response.data.success) {
        setWebhooks(response.data.data || []);
      } else {
        showErrorToast(response.data.message || 'Failed to fetch webhooks');
      }
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Failed to fetch webhooks');
    } finally {
      setIsLoading(false);
    }
  };

  const setupWebhooks = async () => {
  setIsCreating(true);
  try {
    const response = await axios.post('/admin/webhooks/setup-printify');

    if (response.data.success) {
      showSuccessToast(response.data.message || 'All webhooks setup successfully!');
      await fetchWebhooks();
      setShowCreateForm(false);
    } else {
      // Partial success - some webhooks created, some failed
      showErrorToast(response.data.message || 'Some webhooks failed to setup');
      // You might want to show detailed results
      console.log('Detailed results:', response.data.data);
    }
  } catch (error: any) {
    showErrorToast(error.response?.data?.message || 'Failed to setup webhooks');
  } finally {
    setIsCreating(false);
  }
};

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }

    try {
      const response = await axios.delete(`/admin/webhooks/printify/${webhookId}`);

      if (response.data.success) {
        showSuccessToast('Webhook deleted successfully!');
        setWebhooks(webhooks.filter(w => w.id !== webhookId));
      } else {
        showErrorToast(response.data.message || 'Failed to delete webhook');
      }
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Failed to delete webhook');
    }
  };

  const handleEventToggle = (eventValue: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventValue)
        ? prev.events.filter(e => e !== eventValue)
        : [...prev.events, eventValue]
    }));
  };

  const handleSelectAllEvents = () => {
    setFormData(prev => ({
      ...prev,
      events: ORDER_EVENTS.map(event => event.value)
    }));
  };

  const handleDeselectAllEvents = () => {
    setFormData(prev => ({
      ...prev,
      events: []
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <SettingsLayout activeTab="webhook-manage">
      <Head title="Webhook Management" />

      <div className="space-y-6">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Printify Webhooks</h1>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              Manage webhook integrations with Printify for real-time order updates
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={fetchWebhooks}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus size={16} className="mr-2" />
              Setup Webhooks
            </button>
          </div>
        </div>

        {/* Webhook Setup Form */}
        {showCreateForm && (
          <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Setup Printify Webhooks</h3>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Webhook URL
                  </label>
                  <input
                    type="text"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    readOnly
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    This URL will receive webhook notifications from Printify
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Events to Subscribe
                    </label>
                    <div className="space-x-2">
                      <button
                        type="button"
                        onClick={handleSelectAllEvents}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-200 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllEvents}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-200 hover:underline cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 space-y-2">
                    {ORDER_EVENTS.map((event) => (
                      <div key={event.value} className="flex items-start space-x-3">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={formData.events.includes(event.value)}
                            onChange={() => handleEventToggle(event.value)}
                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {event.label}
                          </label>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={setupWebhooks}
                    disabled={isCreating || formData.events.length === 0}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <>
                        <RefreshCw size={16} className="animate-spin mr-2" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <Check size={16} className="mr-2" />
                        Setup Webhooks
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Webhooks List */}
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Active Webhooks
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Webhooks currently registered with Printify
            </p>
          </div>

          {isLoading ? (
            <div className="px-4 py-8 text-center">
              <RefreshCw size={24} className="animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading webhooks...</p>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <ExternalLink size={48} className="mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No webhooks</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by setting up your first webhook.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus size={16} className="mr-2" />
                  Setup Webhooks
                </button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {webhooks.map((webhook) => (
                <li key={webhook.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                            {webhook.url}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">

                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100"
                            >
                              {webhook.topic}
                                      </span>
                                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100">
                              Active
                            </span>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <button
                          onClick={() => deleteWebhook(webhook.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors cursor-pointer"
                          title="Delete webhook"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Information Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
            Webhook Information
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>• Webhooks provide real-time order status updates from Printify</li>
            <li>• Ensure your webhook URL is accessible from the internet</li>
            <li>• Webhook secret is configured in your environment variables</li>
            <li>• All webhook activities are logged for debugging</li>
          </ul>
        </div>
      </div>
    </SettingsLayout>
  );
}
