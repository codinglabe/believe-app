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
  raw: Record<string, any>;
}

interface Props {
  record: IrsBmfRecord;
}

export default function Show({ record }: Props) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case '01': return 'bg-green-100 text-green-800';
      case '02': return 'bg-yellow-100 text-yellow-800';
      case '03': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4)}`;
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
                {record.ico && (
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

          {/* Activity Codes */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Activity Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm">{record.activity || 'N/A'}</p>
            </CardContent>
          </Card>

          {/* Raw Data */}
          <Card>
            <CardHeader>
              <CardTitle>Raw IRS Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(record.raw, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
