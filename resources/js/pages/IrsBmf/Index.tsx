import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Database, MapPin, Hash } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';

interface IrsBmfRecord {
  id: number;
  ein: string;
  name: string;
  city: string;
  state: string;
  ntee_cd: string;
  status: string;
  ruling: string;
}

interface Stats {
  total_records: number;
  total_states: number;
  total_ntee_codes: number;
}

interface Props {
  records: {
    data: IrsBmfRecord[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  stats: Stats;
}

export default function Index({ records, stats }: Props) {
  const [isImporting, setIsImporting] = useState(false);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '01': return 'bg-green-100 text-green-800';
      case '02': return 'bg-yellow-100 text-yellow-800';
      case '03': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const triggerImport = async (mode: 'full' | 'update-only') => {
    setIsImporting(true);
    try {
      const response = await fetch(route('irs-bmf.import'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({ mode }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(result.message);
      } else {
        alert('Import failed: ' + result.message);
      }
    } catch (error) {
      alert('Import failed: ' + error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AppLayout>
      <Head title="IRS BMF Records" />
      
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              IRS Business Master File
            </h1>
            <Link href={route('irs-bmf.search')}>
              <Button>
                <Search className="w-4 h-4 mr-2" />
                Search Records
              </Button>
            </Link>
          </div>

          {/* Import Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Data Import Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Manually trigger IRS BMF data import. Full import creates new records, update-only mode only updates existing records.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Monthly automatic updates run on the 1st at 2:00 AM in update-only mode.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => triggerImport('full')}
                    variant="outline"
                    className="whitespace-nowrap"
                    disabled={isImporting}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    {isImporting ? 'Importing...' : 'Full Import'}
                  </Button>
                  <Button 
                    onClick={() => triggerImport('update-only')}
                    variant="outline"
                    className="whitespace-nowrap"
                    disabled={isImporting}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    {isImporting ? 'Importing...' : 'Update Only'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(stats.total_records)}</div>
                <p className="text-xs text-muted-foreground">
                  IRS Exempt Organizations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">States</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(stats.total_states)}</div>
                <p className="text-xs text-muted-foreground">
                  Geographic Coverage
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">NTEE Codes</CardTitle>
                <Hash className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(stats.total_ntee_codes)}</div>
                <p className="text-xs text-muted-foreground">
                  Organization Types
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">EIN</th>
                      <th className="text-left py-2 px-4">Organization Name</th>
                      <th className="text-left py-2 px-4">Location</th>
                      <th className="text-left py-2 px-4">NTEE Code</th>
                      <th className="text-left py-2 px-4">Status</th>
                      <th className="text-left py-2 px-4">Ruling Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.data.map((record) => (
                      <tr key={record.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-2 px-4 font-mono text-sm">{record.ein}</td>
                        <td className="py-2 px-4">
                          <Link 
                            href={route('irs-bmf.show', record.id)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {record.name}
                          </Link>
                        </td>
                        <td className="py-2 px-4">
                          {record.city}, {record.state}
                        </td>
                        <td className="py-2 px-4">
                          <Badge variant="outline">{record.ntee_cd || 'N/A'}</Badge>
                        </td>
                        <td className="py-2 px-4">
                          <Badge className={getStatusColor(record.status)}>
                            {record.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {record.ruling ? `${record.ruling.slice(0, 4)}-${record.ruling.slice(4)}` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {records.last_page > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing {((records.current_page - 1) * records.per_page) + 1} to{' '}
                    {Math.min(records.current_page * records.per_page, records.total)} of{' '}
                    {records.total} results
                  </div>
                  <div className="flex space-x-2">
                    {records.current_page > 1 && (
                      <Link
                        href={`?page=${records.current_page - 1}`}
                        className="px-3 py-2 text-sm border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Previous
                      </Link>
                    )}
                    {records.current_page < records.last_page && (
                      <Link
                        href={`?page=${records.current_page + 1}`}
                        className="px-3 py-2 text-sm border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Next
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
