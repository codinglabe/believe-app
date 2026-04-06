import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/frontend/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Upload, Calendar, DollarSign, Users, Gift } from 'lucide-react';
import { PageProps } from '@/types';
import AppLayout from '@/layouts/app-layout';

interface Prize {
    name: string;
    description: string;
}

export default function CreateRaffle() {
    const [currentTab, setCurrentTab] = useState('basic');
    const [prizes, setPrizes] = useState<Prize[]>([
        { name: '', description: '' },
        { name: '', description: '' },
        { name: '', description: '' }
    ]);

    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        description: '',
        ticket_price: '',
        total_tickets: '',
        draw_date: '',
        image: null as File | null,
        prizes: prizes,
        winners_count: 3,
    });

    const addPrize = () => {
        setPrizes([...prizes, { name: '', description: '' }]);
    };

    const removePrize = (index: number) => {
        if (prizes.length > 1) {
            const newPrizes = prizes.filter((_, i) => i !== index);
            setPrizes(newPrizes);
            setData('prizes', newPrizes);
        }
    };

    const updatePrize = (index: number, field: keyof Prize, value: string) => {
        const newPrizes = prizes.map((prize, i) => 
            i === index ? { ...prize, [field]: value } : prize
        );
        setPrizes(newPrizes);
        setData('prizes', newPrizes);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('raffles.store'));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('image', file);
        }
    };

    const goToNextTab = () => {
        if (currentTab === 'basic') {
            setCurrentTab('prizes');
        } else if (currentTab === 'prizes') {
            setCurrentTab('settings');
        }
    };

    const goToPreviousTab = () => {
        if (currentTab === 'prizes') {
            setCurrentTab('basic');
        } else if (currentTab === 'settings') {
            setCurrentTab('prizes');
        }
    };

    const validateCurrentTab = () => {
        switch (currentTab) {
            case 'basic':
                return data.title && data.description && data.ticket_price && data.total_tickets && data.draw_date;
            case 'prizes':
                return prizes.some(prize => prize.name.trim() !== '');
            case 'settings':
                return true;
            default:
                return false;
        }
    };


    return (
        <AppLayout>
            <Head title="Create Raffle" />
            
            <div className="w-full space-y-6 px-4">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Raffle Draw</h1>
                    <p className="text-gray-600 dark:text-gray-400">Set up a new raffle draw for your organization</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="basic">Basic Info</TabsTrigger>
                            <TabsTrigger value="prizes">Prizes</TabsTrigger>
                            <TabsTrigger value="settings">Settings</TabsTrigger>
                        </TabsList>

                        {/* Basic Information */}
                        <TabsContent value="basic">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Gift className="w-5 h-5 mr-2" />
                                        Basic Information
                                    </CardTitle>
                                    <CardDescription>
                                        Provide the essential details for your raffle draw
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Raffle Title *</Label>
                                        <Input
                                            id="title"
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            placeholder="Enter raffle title"
                                            className={errors.title ? 'border-red-500' : ''}
                                        />
                                        {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description *</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Describe your raffle draw"
                                            rows={4}
                                            className={errors.description ? 'border-red-500' : ''}
                                        />
                                        {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="ticket_price" className="flex items-center">
                                                <DollarSign className="w-4 h-4 mr-1" />
                                                Ticket Price *
                                            </Label>
                                            <Input
                                                id="ticket_price"
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                value={data.ticket_price}
                                                onChange={(e) => setData('ticket_price', e.target.value)}
                                                placeholder="0.00"
                                                className={errors.ticket_price ? 'border-red-500' : ''}
                                            />
                                            {errors.ticket_price && <p className="text-sm text-red-500">{errors.ticket_price}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="total_tickets" className="flex items-center">
                                                <Users className="w-4 h-4 mr-1" />
                                                Total Tickets *
                                            </Label>
                                            <Input
                                                id="total_tickets"
                                                type="number"
                                                min="1"
                                                max="10000"
                                                value={data.total_tickets}
                                                onChange={(e) => setData('total_tickets', e.target.value)}
                                                placeholder="100"
                                                className={errors.total_tickets ? 'border-red-500' : ''}
                                            />
                                            {errors.total_tickets && <p className="text-sm text-red-500">{errors.total_tickets}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="draw_date" className="flex items-center">
                                            <Calendar className="w-4 h-4 mr-1" />
                                            Draw Date & Time *
                                        </Label>
                                        <Input
                                            id="draw_date"
                                            type="datetime-local"
                                            value={data.draw_date}
                                            onChange={(e) => setData('draw_date', e.target.value)}
                                            className={errors.draw_date ? 'border-red-500' : ''}
                                        />
                                        {errors.draw_date && <p className="text-sm text-red-500">{errors.draw_date}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="image">Raffle Image</Label>
                                        <div className="flex items-center space-x-4">
                                            <Input
                                                id="image"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                            <Upload className="w-4 h-4 text-gray-400" />
                                        </div>
                                        {errors.image && <p className="text-sm text-red-500">{errors.image}</p>}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Prizes */}
                        <TabsContent value="prizes">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span className="flex items-center">
                                            <Gift className="w-5 h-5 mr-2" />
                                            Prizes
                                        </span>
                                        <Button type="button" onClick={addPrize} variant="outline" size="sm">
                                            <Plus className="w-4 h-4 mr-1" />
                                            Add Prize
                                        </Button>
                                    </CardTitle>
                                    <CardDescription>
                                        Define the prizes for your raffle draw
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {prizes.map((prize, index) => (
                                        <div key={index} className="p-4 border rounded-lg space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium">Prize {index + 1}</h4>
                                                {prizes.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        onClick={() => removePrize(index)}
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <Label htmlFor={`prize_name_${index}`}>Prize Name *</Label>
                                                <Input
                                                    id={`prize_name_${index}`}
                                                    value={prize.name}
                                                    onChange={(e) => updatePrize(index, 'name', e.target.value)}
                                                    placeholder="Enter prize name"
                                                />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <Label htmlFor={`prize_description_${index}`}>Description</Label>
                                                <Textarea
                                                    id={`prize_description_${index}`}
                                                    value={prize.description}
                                                    onChange={(e) => updatePrize(index, 'description', e.target.value)}
                                                    placeholder="Enter prize description"
                                                    rows={2}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {errors.prizes && <p className="text-sm text-red-500">{errors.prizes}</p>}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Settings */}
                        <TabsContent value="settings">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Raffle Settings</CardTitle>
                                    <CardDescription>
                                        Configure additional settings for your raffle
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="winners_count">Number of Winners</Label>
                                        <Input
                                            id="winners_count"
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={data.winners_count}
                                            onChange={(e) => setData('winners_count', parseInt(e.target.value))}
                                            placeholder="3"
                                        />
                                        <p className="text-sm text-gray-500">
                                            How many winners will be selected for this raffle?
                                        </p>
                                        {errors.winners_count && <p className="text-sm text-red-500">{errors.winners_count}</p>}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center pt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div>
                            {currentTab !== 'basic' && (
                                <Button type="button" variant="outline" onClick={goToPreviousTab}>
                                    Previous
                                </Button>
                            )}
                        </div>
                        
                        <div className="flex space-x-4">
                            <Button type="button" variant="outline" onClick={() => window.history.back()}>
                                Cancel
                            </Button>
                            
                            {currentTab !== 'settings' ? (
                                <Button 
                                    type="button" 
                                    onClick={goToNextTab}
                                    disabled={!validateCurrentTab()}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                >
                                    Next
                                </Button>
                            ) : (
                                <Button 
                                    type="submit" 
                                    disabled={processing || !validateCurrentTab()} 
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                >
                                    {processing ? 'Creating...' : 'Create Raffle'}
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

