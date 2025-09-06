import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Search as SearchIcon, ArrowLeft } from 'lucide-react';

interface IrsBmfRecord {
  id: number;
  ein: string;
  name: string;
  city: string;
  state: string;
  ntee_cd: string;
  status: string;
  ruling: string;
  is_header?: boolean;
}

interface Props {
  records: {
    data: IrsBmfRecord[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  states: string[];
  nteeCodes: string[];
  statusCodes: string[];
  filters: {
    q: string;
    state: string;
    ntee: string;
    status: string;
  };
}

export default function Search({ records, states, nteeCodes, statusCodes, filters }: Props) {
  const [searchQuery, setSearchQuery] = useState(filters.q || '');
  const [selectedState, setSelectedState] = useState(filters.state || 'all');
  const [selectedNtee, setSelectedNtee] = useState(filters.ntee || 'all');
  const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');

  const handleSearch = () => {
    const params: Record<string, string> = {};
    if (searchQuery) params.q = searchQuery;
    if (selectedState && selectedState !== 'all') params.state = selectedState;
    if (selectedNtee && selectedNtee !== 'all') params.ntee = selectedNtee;
    if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus;

    router.get(route('irs-bmf.search'), params);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedState('all');
    setSelectedNtee('all');
    setSelectedStatus('all');
    router.get(route('irs-bmf.search'), {});
  };

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

  const formatRulingDate = (ruling: string) => {
    if (!ruling) return 'N/A';

    // Handle transformed ruling date format
    if (ruling.includes('-')) {
      return ruling; // Already formatted
    }

    // Format raw ruling date YYYYMMDD to YYYY-MM-DD
    if (ruling.length === 8) {
      return `${ruling.slice(0, 4)}-${ruling.slice(4, 6)}-${ruling.slice(6)}`;
    }

    return ruling;
  };

  // Filter out header rows from display
  const displayRecords = records.data.filter(record => !record.is_header);

  return (
    <AppLayout>
      <Head title="Search IRS BMF Records" />

      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-6">
            <Link href={route('irs-bmf.index')} className="mr-4">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Search IRS BMF Records
            </h1>
          </div>

          {/* Search Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Search Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Search Query */}
                <div>
                  <label className="block text-sm font-medium mb-2">Search Query</label>
                  <Input
                    placeholder="Organization name, EIN, city, or NTEE code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Search by organization name, EIN, city, or specific NTEE code
                  </p>
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-medium mb-2">State</label>
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger>
                      <SelectValue placeholder="All States" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="all">All States</SelectItem>
                      {states?.filter(Boolean).map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* NTEE Code */}
                <div>
                  <label className="block text-sm font-medium mb-2">NTEE Code</label>
                  <Select value={selectedNtee} onValueChange={setSelectedNtee}>
                    <SelectTrigger>
                      <SelectValue placeholder="All NTEE Codes" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="all">All NTEE Codes</SelectItem>
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {nteeCodes.length} codes available
                      </div>
                      {nteeCodes?.filter(Boolean).slice(0, 100).map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                      {nteeCodes.length > 100 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Showing first 100 codes. Use search query for specific codes.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="all">All Statuses</SelectItem>
                      {statusCodes?.filter(Boolean).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Buttons */}
                <div className="flex items-end space-x-2">
                  <Button onClick={handleSearch} className="w-full">
                    <SearchIcon className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle>
                Search Results ({displayRecords.length} of {records.total} records found)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {displayRecords.length > 0 ? (
                <>
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
                        {displayRecords.map((record) => (
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
                              {formatRulingDate(record.ruling)}
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
                            href={`?page=${records.current_page - 1}&q=${searchQuery}&state=${selectedState !== 'all' ? selectedState : ''}&ntee=${selectedNtee !== 'all' ? selectedNtee : ''}&status=${selectedStatus !== 'all' ? selectedStatus : ''}`}
                            className="px-3 py-2 text-sm border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            Previous
                          </Link>
                        )}
                        {records.current_page < records.last_page && (
                          <Link
                            href={`?page=${records.current_page + 1}&q=${searchQuery}&state=${selectedState !== 'all' ? selectedState : ''}&ntee=${selectedNtee !== 'all' ? selectedNtee : ''}&status=${selectedStatus !== 'all' ? selectedStatus : ''}`}
                            className="px-3 py-2 text-sm border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            Next
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No records found matching your criteria.</p>
                  <Button onClick={clearFilters} className="mt-4">
                    Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
