// pages/WebhookManagement.tsx
import { Head, usePage, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import { Plus, Trash2, RefreshCw, ExternalLink, Check, X } from 'lucide-react';
import axios from 'axios';
import SettingsLayout from '@/layouts/settings/layout';
import { PrintifyWebhook } from '@/types/printify';
import { PhazeWebhook } from '@/types/phaze';


interface WebhookManagementProps {
  printifyWebhooks: PrintifyWebhook[];
  phazeWebhooks: PhazeWebhook[];
}

const ORDER_EVENTS = [
  { value: 'order:created', label: 'Order Created', description: 'Triggered when an order is created in Printify' },
  { value: 'order:updated', label: 'Order Updated', description: 'Triggered when order status is updated' },
  { value: 'order:sent-to-production', label: 'Sent to Production', description: 'Triggered when order is sent to production' },
  { value: 'order:shipment:created', label: 'Shipment Created', description: 'Triggered when items are fulfilled with tracking' },
  { value: 'order:shipment:delivered', label: 'Shipment Delivered', description: 'Triggered when items are delivered' },
];

export default function WebhookManagement({ printifyWebhooks: initialPrintifyWebhooks, phazeWebhooks: initialPhazeWebhooks }: WebhookManagementProps) {
  const [printifyWebhooks, setPrintifyWebhooks] = useState<PrintifyWebhook[]>(initialPrintifyWebhooks);
  const [phazeWebhooks, setPhazeWebhooks] = useState<PhazeWebhook[]>(initialPhazeWebhooks);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPhazeCreateForm, setShowPhazeCreateForm] = useState(false);
  const [isCreatingPhaze, setIsCreatingPhaze] = useState(false);
  const [isLoadingPhaze, setIsLoadingPhaze] = useState(false);
  const [formData, setFormData] = useState({
    url: `${window.location.origin}/webhooks/printify/orders`,
    events: ['order:created', 'order:updated', 'order:shipment:created']
  });
  const [phazeFormData, setPhazeFormData] = useState({
    url: `${window.location.origin}`,
    api_key: '',
    authorization_header_name: 'authorization'
  });

  const fetchWebhooks = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/admin/webhooks/printify');
      if (response.data.success) {
        setPrintifyWebhooks(response.data.data || []);
      } else {
        showErrorToast(response.data.message || 'Failed to fetch webhooks');
      }
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Failed to fetch webhooks');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPhazeWebhooks = async () => {
    setIsLoadingPhaze(true);
    try {
      const response = await axios.get('/admin/webhooks/phaze');
      if (response.data.success) {
        setPhazeWebhooks(response.data.data || []);
      } else {
        showErrorToast(response.data.message || 'Failed to fetch Phaze webhooks');
      }
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Failed to fetch Phaze webhooks');
    } finally {
      setIsLoadingPhaze(false);
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

  const deleteWebhook = async (webhook: PrintifyWebhook) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }

    try {
      // Extract host from webhook URL
      const url = new URL(webhook.url);
      const host = url.host;

      const response = await axios.delete(`/admin/webhooks/printify/${webhook.id}`, {
        params: {
          url: webhook.url
        }
      });

      if (response.data.success) {
        showSuccessToast('Webhook deleted successfully!');
        setPrintifyWebhooks(printifyWebhooks.filter(w => w.id !== webhook.id));
      } else {
        showErrorToast(response.data.message || 'Failed to delete webhook');
      }
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Failed to delete webhook');
    }
  };

  const createPhazeWebhook = async () => {
    setIsCreatingPhaze(true);
    try {
      const response = await axios.post('/admin/webhooks/phaze', phazeFormData);

      if (response.data.success) {
        showSuccessToast(response.data.message || 'Phaze webhook created successfully!');
        await fetchPhazeWebhooks();
        setShowPhazeCreateForm(false);
        setPhazeFormData({
          url: `${window.location.origin}`,
          api_key: '',
          authorization_header_name: 'authorization'
        });
      } else {
        showErrorToast(response.data.message || 'Failed to create Phaze webhook');
      }
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Failed to create Phaze webhook');
    } finally {
      setIsCreatingPhaze(false);
    }
  };

  const deletePhazeWebhook = async (webhook: PhazeWebhook) => {
    if (!confirm('Are you sure you want to delete this Phaze webhook?')) {
      return;
    }

    try {
      // If we have a database ID, use it; otherwise use Phaze webhook ID
      const deleteUrl = webhook.id
        ? `/admin/webhooks/phaze/${webhook.id}`
        : `/admin/webhooks/phaze/${webhook.phaze_webhook_id}`;

      const config = webhook.phaze_webhook_id && !webhook.id
        ? { params: { phaze_webhook_id: webhook.phaze_webhook_id } }
        : {};

      const response = await axios.delete(deleteUrl, config);

      if (response.data.success) {
        showSuccessToast('Phaze webhook deleted successfully!');
        await fetchPhazeWebhooks(); // Refresh the list
      } else {
        showErrorToast(response.data.message || 'Failed to delete Phaze webhook');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete Phaze webhook';
      showErrorToast(errorMessage);
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

      <div className="space-y-8">
        {/* Printify Webhooks Section */}
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
          ) : printifyWebhooks.length === 0 ? (
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
              {printifyWebhooks.map((webhook) => (
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
                          onClick={() => deleteWebhook(webhook)}
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

        </div>

        {/* Phaze Webhooks Section */}
        <div className="space-y-6">
          {/* Header */}
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Phaze Webhooks</h1>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Manage webhook integrations with Phaze for real-time gift card purchase updates
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={fetchPhazeWebhooks}
                disabled={isLoadingPhaze}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw size={16} className={`mr-2 ${isLoadingPhaze ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowPhazeCreateForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus size={16} className="mr-2" />
                Create Webhook
              </button>
            </div>
          </div>

          {/* Phaze Webhook Create Form */}
          {showPhazeCreateForm && (
            <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Create Phaze Webhook</h3>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Base URL
                    </label>
                    <input
                      type="text"
                      value={phazeFormData.url}
                      onChange={(e) => setPhazeFormData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://yourdomain.com"
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Webhook URL will be: {phazeFormData.url}/webhooks/phaze
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      API Key (Optional)
                    </label>
                    <input
                      type="text"
                      value={phazeFormData.api_key}
                      onChange={(e) => setPhazeFormData(prev => ({ ...prev, api_key: e.target.value }))}
                      placeholder="Leave empty to auto-generate"
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      A secure API key will be auto-generated if not provided
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Authorization Header Name
                    </label>
                    <input
                      type="text"
                      value={phazeFormData.authorization_header_name}
                      onChange={(e) => setPhazeFormData(prev => ({ ...prev, authorization_header_name: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Header name Phaze will use to send the API key (default: authorization)
                    </p>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPhazeCreateForm(false);
                        setPhazeFormData({
                          url: `${window.location.origin}`,
                          api_key: '',
                          authorization_header_name: 'authorization'
                        });
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createPhazeWebhook}
                      disabled={isCreatingPhaze || !phazeFormData.url}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreatingPhaze ? (
                        <>
                          <RefreshCw size={16} className="animate-spin mr-2" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Check size={16} className="mr-2" />
                          Create Webhook
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Phaze Webhooks List */}
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Active Phaze Webhooks
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                Webhooks currently registered with Phaze API
              </p>
            </div>

            {isLoadingPhaze ? (
              <div className="px-4 py-8 text-center">
                <RefreshCw size={24} className="animate-spin mx-auto text-gray-400" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading webhooks...</p>
              </div>
            ) : phazeWebhooks.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <ExternalLink size={48} className="mx-auto text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No webhooks</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by creating your first Phaze webhook.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowPhazeCreateForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus size={16} className="mr-2" />
                    Create Webhook
                  </button>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {phazeWebhooks.map((webhook) => (
                  <li key={webhook.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                              {webhook.url}
                            </p>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {webhook.phaze_webhook_id && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                Phaze ID: {webhook.phaze_webhook_id}
                              </span>
                            )}
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              webhook.is_active
                                ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            }`}>
                              {webhook.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100">
                              {webhook.authorization_header_name}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Created: {formatDate(webhook.created_at)}
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                                    <button
                                      onClick={() => deletePhazeWebhook(webhook)}
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

          {/* Phaze Information Card */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
              Phaze Webhook Information
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>• Webhooks provide real-time gift card purchase status updates from Phaze</li>
              <li>• Ensure your webhook URL is accessible from the internet</li>
              <li>• API key is stored securely in the database</li>
              <li>• All webhook activities are logged for debugging</li>
            </ul>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
