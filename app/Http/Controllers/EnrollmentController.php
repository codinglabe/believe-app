<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;

class EnrollmentController extends Controller
{
    /**
     * Process the course enrollment
     */
    public function store(Request $request, $slug)
    {
        $course = Course::where('slug', $slug)->firstOrFail();

        $validated = $request->validate([
            'terms_accepted' => 'required|accepted',
        ]);

        $user = Auth::user();

        // Check if user is already enrolled
        $existingEnrollment = Enrollment::where('course_id', $course->id)
            ->where('user_id', $user->id)
            ->whereIn('status', ['active', 'completed'])
            ->first();

        if ($existingEnrollment) {
            return redirect()->route('course.show', $course->slug)
                ->with('error', 'You are already enrolled in this course.');
        }

        // Check if course is full
        $totalEnrolled = Enrollment::where('course_id', $course->id)
            ->whereIn('status', ['active', 'completed'])
            ->count();

        if ($totalEnrolled >= $course->max_participants) {
            return redirect()->route('course.show', $course->slug)
                ->with('error', 'This course is full.');
        }

        // Check if course has started
        $startDateTime = $this->parseDateTime($course->start_date, $course->start_time);

        if ($startDateTime->isPast()) {
            return redirect()->route('course.show', $course->slug)
                ->with('error', 'This course has already started.');
        }

        try {
            DB::beginTransaction();

            // Generate unique enrollment ID
            $enrollmentId = $this->generateUniqueEnrollmentId();

            // Create enrollment record
            $enrollment = Enrollment::create([
                'user_id' => $user->id,
                'course_id' => $course->id,
                'status' => 'pending',
                'amount_paid' => $course->pricing_type === 'paid' ? $course->course_fee : 0,
                'payment_method' => $course->pricing_type === 'paid' ? 'stripe' : 'free',
                'enrolled_at' => now(),
                'enrollment_id' => $enrollmentId,
            ]);

            if ($course->pricing_type === 'free') {
                // For free courses, complete enrollment immediately
                $enrollment->update([
                    'status' => 'active',
                    'transaction_id' => 'free_enrollment_' . $enrollment->id,
                ]);

                // Create transaction record for free enrollment
                Transaction::record([
                    'user_id' => $user->id,
                    'related_id' => $enrollment->id,
                    'related_type' => Enrollment::class,
                    'type' => 'enrollment',
                    'status' => Transaction::STATUS_COMPLETED,
                    'amount' => 0,
                    'fee' => 0,
                    'currency' => 'USD',
                    'payment_method' => 'free',
                    'meta' => [
                        'course_id' => $course->id,
                        'course_name' => $course->name,
                        'enrollment_id' => $enrollment->enrollment_id,
                        'pricing_type' => 'free'
                    ],
                    'processed_at' => now(),
                ]);

                // Update course enrolled count
                $course->increment('enrolled');

                DB::commit();

                // Redirect to success page with enrollment_id as query parameter
                return redirect(route('courses.enrollment.success') . '?enrollment_id=' . $enrollment->id)
                    ->with('success', 'Successfully enrolled in the course!');
            } else {
                // Create pending transaction record for paid enrollment
                $transaction = Transaction::record([
                    'user_id' => $user->id,
                    'related_id' => $enrollment->id,
                    'related_type' => Enrollment::class,
                    'type' => 'purchase',
                    'status' => Transaction::STATUS_PENDING,
                    'amount' => $course->course_fee,
                    'fee' => 0,
                    'currency' => 'USD',
                    'payment_method' => 'stripe',
                    'meta' => [
                        'course_id' => $course->id,
                        'course_name' => $course->name,
                        'enrollment_id' => $enrollment->enrollment_id,
                        'pricing_type' => 'paid'
                    ],
                    'processed_at' => null,
                ]);

                // For paid courses, proceed to Stripe checkout
                $totalAmountInCents = (int) ($course->course_fee * 100);

                $checkout = $user->checkoutCharge(
                    $totalAmountInCents,
                    "Enrollment for {$course->name}",
                    1,
                    [
                        'success_url' => route('courses.enrollment.success') . '?session_id={CHECKOUT_SESSION_ID}',
                        'cancel_url' => route('courses.enrollment.cancel', $enrollment->id),
                        'metadata' => [
                            'enrollment_id' => $enrollment->id,
                            'transaction_id' => $transaction->id,
                            'course_id' => $course->id,
                            'user_id' => $user->id,
                            'course_fee' => $course->course_fee,
                        ],
                        'payment_method_types' => ['card'],
                    ]
                );

                DB::commit();

                return Inertia::location($checkout->url);
            }
        } catch (\Exception $e) {
            DB::rollBack();

            if (isset($enrollment)) {
                $enrollment->update(['status' => 'failed']);
            }

            return redirect()->back()->with([
                'error' => 'Enrollment processing failed: ' . $e->getMessage(),
            ]);
        }
    }

    /**
     * Handle successful enrollment/payment
     */
    public function success(Request $request)
    {
        $sessionId = $request->get('session_id');
        $enrollmentId = $request->get('enrollment_id');

        // Handle free enrollment success - check for enrollment_id first
        if ($enrollmentId && !$sessionId) {
            $enrollment = Enrollment::with([
                'course.organization',
                'course.topic',
                'course.eventType',
                'user'
            ])->find($enrollmentId);
            
            if ($enrollment) {
                // Verify it's a free enrollment
                if ($enrollment->course->pricing_type === 'free') {
                    return Inertia::render('frontend/course/enrollment/Success', [
                        'enrollment' => $enrollment,
                        'course' => $enrollment->course,
                        'type' => 'free',
                        'meetingLink' => $enrollment->course->meeting_link,
                    ]);
                } else {
                    // Enrollment exists but it's a paid course, should have session_id
                    return redirect()->route('course.index')->with([
                        'warning' => 'Payment session missing. Please complete your payment.'
                    ]);
                }
            } else {
                // Enrollment not found
                return redirect()->route('course.index')->with([
                    'error' => 'Enrollment not found. Please contact support if you believe this is an error.'
                ]);
            }
        }

        // Handle paid enrollment success - must have session_id
        if (!$sessionId) {
            // If we have an enrollment_id but it's not free, or enrollment not found
            if ($enrollmentId) {
                $enrollment = Enrollment::with(['course', 'user'])->find($enrollmentId);
                if ($enrollment && $enrollment->course->pricing_type === 'paid') {
                    // This is a paid course, should have session_id
                    return redirect()->route('course.index')->with([
                        'warning' => 'Payment session missing. Please try enrolling again.'
                    ]);
                }
            }
            // No enrollment_id or session_id found
            return redirect()->route('course.index')->with([
                'warning' => 'Invalid enrollment session. Please try enrolling again.'
            ]);
        }

        try {
            DB::beginTransaction();

            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);
            $enrollment = Enrollment::with([
                'course.organization',
                'course.topic',
                'course.eventType',
                'user'
            ])->findOrFail($session->metadata->enrollment_id);

            // Update enrollment with Stripe payment info
            $enrollment->update([
                'transaction_id' => $session->payment_intent,
                'payment_method' => $session->payment_method_types[0] ?? 'card',
                'status' => 'active',
                'enrolled_at' => now(),
            ]);

            // Update transaction record with payment details
            if (isset($session->metadata->transaction_id)) {
                $transaction = Transaction::find($session->metadata->transaction_id);
                if ($transaction) {
                    $transaction->update([
                        'status' => Transaction::STATUS_COMPLETED,
                        'meta' => array_merge($transaction->meta ?? [], [
                            'stripe_session_id' => $session->id,
                            'stripe_payment_intent' => $session->payment_intent,
                            'payment_status' => $session->payment_status,
                        ]),
                        'processed_at' => now(),
                    ]);
                }
            }

            // Update course enrolled count
            $enrollment->course->increment('enrolled');

            DB::commit();

            return Inertia::render('frontend/course/enrollment/Success', [
                'enrollment' => $enrollment,
                'course' => $enrollment->course,
                'type' => 'paid',
                'meetingLink' => $enrollment->course->meeting_link,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->route('course.index')->withErrors([
                'message' => 'Error verifying payment: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Handle cancelled enrollment
     */
    public function cancel($enrollmentId)
    {
        $enrollment = Enrollment::with(['course'])->findOrFail($enrollmentId);

        // Update enrollment status to cancelled
        $enrollment->update(['status' => 'cancelled']);

        // Update related transaction to cancelled
        $transaction = Transaction::where('related_id', $enrollment->id)
            ->where('related_type', Enrollment::class)
            ->where('status', Transaction::STATUS_PENDING)
            ->first();

        if ($transaction) {
            $transaction->update([
                'status' => Transaction::STATUS_CANCELLED,
                'processed_at' => now(),
            ]);
        }

        return Inertia::render('frontend/enrollment/Cancel', [
            'enrollment' => $enrollment,
            'course' => $enrollment->course,
        ]);
    }

    /**
     * Cancel user enrollment
     */
    public function cancelEnrollment(Request $request, $slug)
    {
        $course = Course::where('slug', $slug)->firstOrFail();
        $user = Auth::user();

        $enrollment = Enrollment::where('course_id', $course->id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if (!$enrollment) {
            return redirect()->route('course.show', $course->slug)
                ->with('error', 'No active enrollment found.');
        }

        // Check if cancellation is allowed (24 hours before start)
        $startDateTime = $this->parseDateTime($course->start_date, $course->start_time);
        $hoursUntilStart = now()->diffInHours($startDateTime, false);

        if ($hoursUntilStart < 24) {
            return redirect()->route('course.show', $course->slug)
                ->with('error', 'Cancellation is only allowed 24 hours before course start.');
        }

        try {
            DB::beginTransaction();

            $enrollment->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
            ]);

            // Create cancellation transaction record
            Transaction::record([
                'user_id' => $user->id,
                'related_id' => $enrollment->id,
                'related_type' => Enrollment::class,
                'type' => 'cancellation',
                'status' => Transaction::STATUS_COMPLETED,
                'amount' => 0,
                'fee' => 0,
                'currency' => 'USD',
                'payment_method' => $enrollment->payment_method,
                'meta' => [
                    'course_id' => $course->id,
                    'course_name' => $course->name,
                    'enrollment_id' => $enrollment->enrollment_id,
                    'original_amount' => $enrollment->amount_paid,
                    'cancellation_reason' => 'user_requested'
                ],
                'processed_at' => now(),
            ]);

            // Decrease course enrolled count
            $course->decrement('enrolled');

            DB::commit();

            return redirect()->route('course.show', $course->slug)
                ->with('success', 'Your enrollment has been cancelled successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->withErrors([
                'cancellation' => 'Failed to cancel enrollment: ' . $e->getMessage(),
            ]);
        }
    }

    /**
     * Request refund for enrollment
     */
    public function refund(Request $request, $slug)
    {
        $course = Course::where('slug', $slug)->firstOrFail();
        $user = Auth::user();

        $enrollment = Enrollment::where('course_id', $course->id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->where('amount_paid', '>', 0)
            ->first();

        if (!$enrollment) {
            return redirect()->route('course.show', $course->slug)
                ->with('error', 'No eligible enrollment found for refund.');
        }

        // Check if refund is allowed (within 7 days of enrollment)
        $daysSinceEnrollment = $enrollment->enrolled_at->diffInDays(now());

        if ($daysSinceEnrollment > 7) {
            return redirect()->route('course.show', $course->slug)
                ->with('error', 'Refund requests are only allowed within 7 days of enrollment.');
        }

        try {
            DB::beginTransaction();

            // Process Stripe refund if there's a transaction ID
            if ($enrollment->transaction_id && $enrollment->transaction_id !== 'free_enrollment_' . $enrollment->id) {
                $stripe = Cashier::stripe();
                $refund = $stripe->refunds->create([
                    'payment_intent' => $enrollment->transaction_id,
                    'reason' => 'requested_by_customer',
                ]);

                // Create refund transaction record
                Transaction::record([
                    'user_id' => $user->id,
                    'related_id' => $enrollment->id,
                    'related_type' => Enrollment::class,
                    'type' => 'refund',
                    'status' => Transaction::STATUS_COMPLETED,
                    'amount' => $enrollment->amount_paid,
                    'fee' => 0,
                    'currency' => 'USD',
                    'payment_method' => 'stripe',
                    'transaction_id' => $refund->id,
                    'meta' => [
                        'course_id' => $course->id,
                        'course_name' => $course->name,
                        'enrollment_id' => $enrollment->enrollment_id,
                        'original_payment_intent' => $enrollment->transaction_id,
                        'stripe_refund_id' => $refund->id,
                        'refund_reason' => 'requested_by_customer'
                    ],
                    'processed_at' => now(),
                ]);
            }

            $enrollment->update([
                'status' => 'refunded',
                'refunded_at' => now(),
            ]);

            // Decrease course enrolled count
            $course->decrement('enrolled');

            DB::commit();

            return redirect()->route('course.show', $course->slug)
                ->with('success', 'Your refund request has been processed successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->withErrors([
                'refund' => 'Failed to process refund: ' . $e->getMessage(),
            ]);
        }
    }

    /**
     * Show user's enrollments
     */
    public function myEnrollments(Request $request)
    {
        $user = Auth::user();

        $query = Enrollment::with([
            'course.topic',
            'course.eventType',
            'course.organization',
            'course.creator'
        ])
            ->where('user_id', $user->id);

        // Apply search filter
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->whereHas('course', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }

        // Apply status filter
        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        $enrollments = $query->orderBy('enrolled_at', 'desc')->paginate(10);

        $enrollments->getCollection()->transform(function ($enrollment) use ($user) {
            if ($enrollment->status === 'active') {
                $enrollment->course->meeting_link = $enrollment->course->meeting_link;
            }
            return $enrollment;
        });

        // Calculate enrollment statistics
        $enrollmentStats = [
            'total_enrolled' => Enrollment::where('user_id', $user->id)->count(),
            'total_spent' => Enrollment::where('user_id', $user->id)->sum('amount_paid') ?? 0,
            'active_enrollments' => Enrollment::where('user_id', $user->id)->where('status', 'active')->count(),
            'completed_enrollments' => Enrollment::where('user_id', $user->id)->where('status', 'completed')->count(),
        ];

        return Inertia::render('frontend/user-profile/my-enrollments', [
            'enrollments' => $enrollments,
            'enrollmentStats' => $enrollmentStats,
            'filters' => [
                'search' => $request->get('search', ''),
                'status' => $request->get('status', ''),
            ],
        ]);
    }

    /**
     * Generate a unique enrollment ID
     * Format: ENR-YYYYMMDD-XXXXXXXX (e.g., ENR-20250115-A1B2C3D4)
     */
    private function generateUniqueEnrollmentId(): string
    {
        $maxAttempts = 10;
        $attempt = 0;

        do {
            // Generate ID with date prefix for better uniqueness
            $datePrefix = now()->format('Ymd');
            $randomPart = strtoupper(Str::random(8));
            $enrollmentId = 'ENR-' . $datePrefix . '-' . $randomPart;

            // Check if this ID already exists
            $exists = Enrollment::where('enrollment_id', $enrollmentId)->exists();
            
            if (!$exists) {
                return $enrollmentId;
            }

            $attempt++;
            
            // If we've tried too many times, add more randomness
            if ($attempt >= $maxAttempts) {
                $randomPart = strtoupper(Str::random(12));
                $enrollmentId = 'ENR-' . $datePrefix . '-' . $randomPart . '-' . time();
                // Final check before returning
                if (!Enrollment::where('enrollment_id', $enrollmentId)->exists()) {
                    return $enrollmentId;
                }
            }
        } while ($attempt < $maxAttempts);

        // Fallback: use timestamp-based ID
        return 'ENR-' . now()->format('YmdHis') . '-' . strtoupper(Str::random(8));
    }

    /**
     * Parse datetime properly handling cases where date already contains time
     */
    private function parseDateTime($date, $time)
    {
        try {
            // Handle different date formats
            if (strpos($date, ' ') !== false) {
                // Date already contains time, extract just the date part
                $datePart = explode(' ', $date)[0];
            } else {
                $datePart = $date;
            }

            // Combine date and time
            $dateTimeString = $datePart . ' ' . $time;
            return Carbon::parse($dateTimeString);

        } catch (\Exception $e) {
            Log::error('DateTime parsing error in EnrollmentController', [
                'date' => $date,
                'time' => $time,
                'error' => $e->getMessage()
            ]);
            
            // Fallback to current time
            return Carbon::now();
        }
    }
}
