import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, MapPin, Hash, Calendar, FileText } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';

interface IrsBmfRecord {
  id: number;
  ein: string;
  name: string;
  ico: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  group: string;
  subsection: string;
  affiliation: string;
  classification: string;
  ruling: string;
  deductibility: string;
  foundation: string;
  activity: string;
  organization: string;
  status: string;
  tax_period: string;
  asset_cd: string;
  income_cd: string;
  revenue_amt: string;
  ntee_cd: string;
  sort_name: string;
  created_at: string;
  file_info?: {
    file_name: string;
    uploaded_at: string;
  };
  is_header?: boolean;
}

interface Props {
  record: IrsBmfRecord;
}

export default function Show({ record }: Props) {
  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';

    // Handle transformed status format like "01 - Active"
    const statusCode = status.split(' - ')[0];

    switch (statusCode) {
      case '01': return 'bg-green-100 text-green-800';
      case '02': return 'bg-yellow-100 text-yellow-800';
      case '03': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';

    // Handle transformed date format
    if (dateStr.includes('-')) {
      return dateStr; // Already formatted
    }

    // Format raw date YYYYMMDD to YYYY-MM-DD
    if (dateStr.length === 8) {
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6)}`;
    }

    // Format raw date YYYYMM to YYYY-MM
    if (dateStr.length === 6) {
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4)}`;
    }

    return dateStr;
  };

  const formatAmount = (amount: string) => {
    if (!amount) return 'N/A';
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Don't show header rows
  if (record.is_header) {
    return (
      <AppLayout>
        <Head title="Header Record" />
        <div className="py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center mb-6">
              <Link href={route('irs-bmf.index')} className="mr-4">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Records
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Header Record
              </h1>
            </div>
            <Card>
              <CardContent className="p-6">
                <p className="text-gray-500 dark:text-gray-400">
                  This is a header record containing column names, not organization data.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Head title={`${record.name} - IRS BMF Record`} />

      <div className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-6">
            <Link href={route('irs-bmf.index')} className="mr-4">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Records
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {record.name}
            </h1>
          </div>

          {/* Basic Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Organization Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">EIN</h3>
                  <p className="font-mono text-lg">{record.ein}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Status</h3>
                  <Badge className={getStatusColor(record.status)}>
                    {record.status}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">NTEE Code</h3>
                  <Badge variant="outline">{record.ntee_cd || 'N/A'}</Badge>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Ruling Date</h3>
                  <p>{formatDate(record.ruling)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {record.ico && record.ico !== 'N/A' && (
                  <p><span className="font-semibold">In Care Of:</span> {record.ico}</p>
                )}
                <p><span className="font-semibold">Street:</span> {record.street || 'N/A'}</p>
                <p><span className="font-semibold">City:</span> {record.city || 'N/A'}</p>
                <p><span className="font-semibold">State:</span> {record.state || 'N/A'}</p>
                <p><span className="font-semibold">ZIP:</span> {record.zip || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Classification Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Hash className="w-5 h-5 mr-2" />
                Classification Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Group</h3>
                  <p>{record.group || 'N/A'}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Subsection</h3>
                  <p>{record.subsection || 'N/A'}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Affiliation</h3>
                  <p>{record.affiliation || 'N/A'}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Classification</h3>
                  <p>{record.classification || 'N/A'}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Organization Type</h3>
                  <p>{record.organization || 'N/A'}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Foundation</h3>
                  <p>{record.foundation || 'N/A'}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Deductibility</h3>
                  <p>{record.deductibility || 'N/A'}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Activity</h3>
                  <p>{record.activity || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Asset Code</h3>
                  <p>{record.asset_cd || 'N/A'}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Income Code</h3>
                  <p>{record.income_cd || 'N/A'}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Revenue Amount</h3>
                  <p>{formatAmount(record.revenue_amt)}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tax Period</h3>
                  <p>{formatDate(record.tax_period)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Import Information */}
          {record.file_info && (
            <Card>
              <CardHeader>
                <CardTitle>Import Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><span className="font-semibold">Source File:</span> {record.file_info.file_name}</p>
                  <p><span className="font-semibold">Imported At:</span> {record.file_info.uploaded_at}</p>
                  <p><span className="font-semibold">Record Created:</span> {new Date(record.created_at).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
