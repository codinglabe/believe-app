import React, { useEffect, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/frontend/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/frontend/ui/radio-group';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    CalendarIcon,
    Clock,
    Upload,
    X,
    Image as ImageIcon,
    Video,
    Link as LinkIcon,
    Globe,
    Settings
} from 'lucide-react';
import { totalmem } from 'os';
import toast from 'react-hot-toast';

interface Props {
    facebookConnected: boolean;
    accounts: Array<{ // এই interface যোগ করুন
        id: number;
        facebook_page_name: string;
        picture_url?: string;
        followers_count: number;
    }>;
    connectedAccount?: { // optional হিসেবে
        id: number;
        name: string;
        picture_url?: string;
    };
    hasConnectedAccounts: boolean;
}

export default function Create({ facebookConnected, accounts,
    connectedAccount,
    hasConnectedAccounts  }: Props) {
    const [form, setForm] = useState({
        message: '',
        link: '',
        schedule_type: 'now' as 'now' | 'later',
        scheduled_date: null as Date | null,
        scheduled_time: '09:00',
        facebook_account_id: connectedAccount?.id || (accounts.length > 0 ? accounts[0].id : ''),
    });

    const [image, setImage] = useState<File | null>(null);
    const [video, setVideo] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [charCount, setCharCount] = useState(0);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name === 'message') {
            setCharCount(value.length);
        }

        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allowed image types for Facebook
    const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/bmp'
    ];

    if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a valid image file (JPG, PNG, GIF, BMP only)');
        e.target.value = '';
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size should be less than 10MB');
        e.target.value = '';
        return;
    }

    // Validate file extension
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
        toast.error('Invalid file extension. Please use JPG, PNG, GIF, or BMP');
        e.target.value = '';
        return;
    }

    setImage(file);
    setVideo(null);
    setVideoPreview(null);

    const reader = new FileReader();
    reader.onloadend = () => {
        setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
};

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('video/')) {
            toast.error('Please upload a video file');
            return;
        }

        if (file.size > 50 * 1024 * 1024) { // 50MB
            toast.error('Video size should be less than 50MB');
            return;
        }

        setVideo(file);
        setImage(null);
        setImagePreview(null);

        const reader = new FileReader();
        reader.onloadend = () => {
            setVideoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        setImage(null);
        setImagePreview(null);
    };

    const removeVideo = () => {
        setVideo(null);
        setVideoPreview(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!facebookConnected) {
            toast.error('Please connect to Facebook first');
            return;
        }

        if (!form.message.trim()) {
            toast.error('Please enter a message');
            return;
        }

        if (form.message.length > 5000) {
            toast.error('Message is too long (max 5000 characters)');
            return;
        }

        if (!form.facebook_account_id) {
            toast.error('Please select a Facebook page');
            return;
        }

        // Validate schedule fields if scheduling for later
        if (form.schedule_type === 'later') {
            if (!form.scheduled_date) {
                toast.error('Please select a date for scheduling');
                return;
            }
            if (!form.scheduled_time) {
                toast.error('Please select a time for scheduling');
                return;
            }

            // Check if scheduled date/time is in the future
            const [hours, minutes] = form.scheduled_time.split(':').map(Number);
            const scheduledDateTime = new Date(
                form.scheduled_date.getFullYear(),
                form.scheduled_date.getMonth(),
                form.scheduled_date.getDate(),
                hours,
                minutes,
                0
            );

            const now = new Date();
            if (scheduledDateTime <= now) {
                toast.error('Scheduled date and time must be in the future');
                return;
            }
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('message', form.message);
            formData.append('facebook_account_id', form.facebook_account_id.toString());
            formData.append('schedule_type', form.schedule_type);

            if (form.link) {
                formData.append('link', form.link);
            }

            if (image) {
                // Debug image info
                console.log('Image to upload:', {
                    name: image.name,
                    size: image.size,
                    type: image.type,
                    lastModified: image.lastModified,
                });
                formData.append('image', image);
            }

            if (video) {
                formData.append('video', video);
            }

            if (form.schedule_type === 'later' && form.scheduled_date) {
                formData.append('scheduled_date', format(form.scheduled_date, 'yyyy-MM-dd'));
                formData.append('scheduled_time', form.scheduled_time);
            }

            await router.post(route("facebook.posts.store"), formData, {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: (page) => {
                    const successMessage = page.props.success ||
                                        page.props.flash?.success ||
                                        'Post published successfully!';

                    toast.success(successMessage);
                    router.visit(route('facebook.posts.index'));
                },
                onError: (errors) => {
                    console.log('Errors object:', errors);

                    // Handle publish_error specifically
                    if (errors?.publish_error) {
                        toast.error(errors.publish_error);
                    }

                    // Handle validation errors
                    if (errors && typeof errors === 'object') {
                        Object.entries(errors).forEach(([key, value]) => {
                            if (key !== 'publish_error' && value) {
                                if (Array.isArray(value)) {
                                    value.forEach(err => toast.error(err));
                                } else {
                                    toast.error(value);
                                }
                            }
                        });
                    }
                },
            });
        } catch (error: any) {
            console.error('Submit error:', error);
            toast.error(error?.message || 'Failed to create post');
        } finally {
            setLoading(false);
        }
    };

    if (!facebookConnected) {
    console.log('Facebook connection status:', facebookConnected);
    console.log('Props received:', { facebookConnected });

    // For testing, you can temporarily bypass this
    // return (
    //     <div>Facebook not connected: {JSON.stringify({facebookConnected})}</div>
    // );

    // Or check local storage for debug
    const debugMode = localStorage.getItem('facebook_debug_mode') === 'true';

    if (!debugMode) {
        return (
            <AppLayout>
                <Head title="Configure Facebook" />
                <div className="container mx-auto p-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center py-12">
                                <div className="mx-auto w-24 h-24 mb-6 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                                    <Settings className="h-12 w-12 text-yellow-600" />
                                </div>
                                <h2 className="text-2xl font-bold mb-3">Facebook Connection Check</h2>
                                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                                    Status: {facebookConnected ? 'Connected' : 'Not Connected'}
                                </p>
                                <div className="space-y-3">
                                    <div className="flex gap-3 justify-center">
                                        <Link href="/debug-facebook-connection">
                                            <Button variant="outline">
                                                Debug Connection
                                            </Button>
                                        </Link>
                                        <Link href="/facebook/connect">
                                            <Button>
                                                Connect Facebook Page
                                            </Button>
                                        </Link>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            localStorage.setItem('facebook_debug_mode', 'true');
                                            window.location.reload();
                                        }}
                                    >
                                        Enable Debug Mode (Temporary)
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </AppLayout>
        );
    }
}

    return (
        <AppLayout>
            <Head title="Create Facebook Post" />

            <div className="container mx-auto p-4 md:p-6">
                <div className="max-w-full mx-auto">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold tracking-tight">Create Facebook Post</h1>
                        <p className="text-muted-foreground">
                            Create a post to share on your Facebook page
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column - Form */}
                            <div className="lg:col-span-2 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Post Content</CardTitle>
                                        <CardDescription>
                                            Write your message and add attachments
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="message">Message *</Label>
                                            <Textarea
                                                id="message"
                                                name="message"
                                                value={form.message}
                                                onChange={handleInputChange}
                                                placeholder="What would you like to share?"
                                                className="min-h-[150px]"
                                                required
                                            />
                                            <div className="flex justify-between text-sm text-muted-foreground">
                                                <span>{charCount} / 5000 characters</span>
                                                <span>{Math.floor(charCount / 200)} minutes read</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="link">
                                                <div className="flex items-center gap-2">
                                                    <LinkIcon className="h-4 w-4" />
                                                    Link (Optional)
                                                </div>
                                            </Label>
                                            <Input
                                                id="link"
                                                name="link"
                                                type="url"
                                                value={form.link}
                                                onChange={handleInputChange}
                                                placeholder="https://example.com"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Media Upload */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Media Attachments</CardTitle>
                                        <CardDescription>
                                            Add images or videos to your post (optional)
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                            {/* Image Upload */}
                                            <div className="space-y-2">
                                                <Label htmlFor="image">
                                                    <div className="flex items-center gap-2">
                                                        <ImageIcon className="h-4 w-4" />
                                                        Upload Image
                                                    </div>
                                                </Label>
                                                {imagePreview ? (
                                                    <div className="relative">
                                                        <img
                                                            src={imagePreview}
                                                            alt="Preview"
                                                            className="w-full h-48 object-cover rounded-lg"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="icon"
                                                            className="absolute top-2 right-2 h-8 w-8"
                                                            onClick={removeImage}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary transition-colors">
                                                        <Input
                                                            id="image"
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleImageUpload}
                                                            className="hidden"
                                                        />
                                                        <Label
                                                            htmlFor="image"
                                                            className="cursor-pointer flex flex-col items-center gap-2"
                                                        >
                                                            <Upload className="h-8 w-8 text-muted-foreground" />
                                                            <div>
                                                                <p className="font-medium">Click to upload image</p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    PNG, JPG, GIF up to 10MB
                                                                </p>
                                                            </div>
                                                        </Label>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Video Upload */}
                                            {/* <div className="space-y-2">
                                                <Label htmlFor="video">
                                                    <div className="flex items-center gap-2">
                                                        <Video className="h-4 w-4" />
                                                        Upload Video
                                                    </div>
                                                </Label>
                                                {videoPreview ? (
                                                    <div className="relative">
                                                        <div className="w-full h-48 bg-black rounded-lg flex items-center justify-center">
                                                            <video
                                                                src={videoPreview}
                                                                className="max-w-full max-h-full"
                                                                controls
                                                            />
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="icon"
                                                            className="absolute top-2 right-2 h-8 w-8"
                                                            onClick={removeVideo}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary transition-colors">
                                                        <Input
                                                            id="video"
                                                            type="file"
                                                            accept="video/*"
                                                            onChange={handleVideoUpload}
                                                            className="hidden"
                                                        />
                                                        <Label
                                                            htmlFor="video"
                                                            className="cursor-pointer flex flex-col items-center gap-2"
                                                        >
                                                            <Upload className="h-8 w-8 text-muted-foreground" />
                                                            <div>
                                                                <p className="font-medium">Click to upload video</p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    MP4, MOV, AVI up to 50MB
                                                                </p>
                                                            </div>
                                                        </Label>
                                                    </div>
                                                )}
                                            </div> */}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Column - Schedule & Actions */}
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Schedule</CardTitle>
                                        <CardDescription>
                                            Choose when to publish your post
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <RadioGroup
                                            value={form.schedule_type}
                                            onValueChange={(value) =>
                                                setForm(prev => ({ ...prev, schedule_type: value as 'now' | 'later' }))
                                            }
                                            className="space-y-3"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="now" id="now" />
                                                <Label htmlFor="now" className="cursor-pointer">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4" />
                                                        <span>Publish Now</span>
                                                    </div>
                                                </Label>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="later" id="later" />
                                                <Label htmlFor="later" className="cursor-pointer">
                                                    <div className="flex items-center gap-2">
                                                        <CalendarIcon className="h-4 w-4" />
                                                        <span>Schedule for Later</span>
                                                    </div>
                                                </Label>
                                            </div>
                                        </RadioGroup>

                                        {form.schedule_type === 'later' && (
                                            <div className="space-y-4 pt-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="scheduled_date">Date *</Label>
                                                    <div className="relative">
                                                        <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                                                        <Input
                                                            id="scheduled_date"
                                                            type="date"
                                                            value={form.scheduled_date ? format(form.scheduled_date, 'yyyy-MM-dd') : ''}
                                                            onChange={(e) => {
                                                                const dateValue = e.target.value;
                                                                if (dateValue) {
                                                                    const date = new Date(dateValue + 'T00:00:00');
                                                                    setForm(prev => ({ ...prev, scheduled_date: date }));
                                                                } else {
                                                                    setForm(prev => ({ ...prev, scheduled_date: null }));
                                                                }
                                                            }}
                                                            min={format(new Date(), 'yyyy-MM-dd')}
                                                            className="pl-10"
                                                            required={form.schedule_type === 'later'}
                                                        />
                                                    </div>
                                                    {form.scheduled_date && (
                                                        <p className="text-sm text-muted-foreground">
                                                            Selected: {format(form.scheduled_date, "EEEE, MMMM d, yyyy")}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="scheduled_time">Time *</Label>
                                                    <Input
                                                        id="scheduled_time"
                                                        type="time"
                                                        value={form.scheduled_time}
                                                        onChange={(e) =>
                                                            setForm(prev => ({ ...prev, scheduled_time: e.target.value }))
                                                        }
                                                        required={form.schedule_type === 'later'}
                                                        min={form.scheduled_date &&
                                                            new Date(form.scheduled_date).toDateString() === new Date().toDateString()
                                                            ? new Date().toTimeString().slice(0, 5)
                                                            : undefined}
                                                    />
                                                </div>

                                                {form.scheduled_date && (
                                                    <div className="p-3 bg-muted rounded-lg">
                                                        <p className="text-sm font-medium">
                                                            Scheduled for:
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {format(form.scheduled_date, "EEEE, MMMM d, yyyy")} at {form.scheduled_time}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Preview */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Preview</CardTitle>
                                        <CardDescription>
                                            How your post will appear
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="text-sm font-medium">Facebook Page Post</div>
                                            <div className="border rounded-lg p-4 bg-card">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <Globe className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">Your Page</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {form.schedule_type === 'now' ? 'Just now' : 'Scheduled'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <p className="text-sm mb-3 whitespace-pre-line">
                                                    {form.message || 'Your message will appear here...'}
                                                </p>

                                                {(imagePreview || videoPreview) && (
                                                    <div className="mb-3">
                                                        {imagePreview && (
                                                            <img
                                                                src={imagePreview}
                                                                alt="Preview"
                                                                className="w-full rounded-lg"
                                                            />
                                                        )}
                                                        {videoPreview && (
                                                            <div className="w-full h-48 bg-black rounded-lg flex items-center justify-center">
                                                                <Video className="h-12 w-12 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {form.link && (
                                                    <div className="p-3 border rounded-lg bg-muted/50">
                                                        <p className="text-xs text-muted-foreground mb-1">Link Preview</p>
                                                        <p className="text-sm truncate">{form.link}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Actions */}
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="space-y-3">
                                            <Button
                                                type="submit"
                                                className="w-full"
                                                size="lg"
                                                disabled={loading || !form.message.trim()}
                                            >
                                                {loading ? (
                                                    <>
                                                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                                                        {form.schedule_type === 'now' ? 'Publishing...' : 'Scheduling...'}
                                                    </>
                                                ) : (
                                                    <>
                                                        {form.schedule_type === 'now' ? 'Publish Now' : 'Schedule Post'}
                                                    </>
                                                )}
                                            </Button>

                                            <Link href="/facebook">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full"
                                                >
                                                    Cancel
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
