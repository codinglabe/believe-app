<?php

namespace App\Mail;

use App\Models\GiftCard;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Stripe\Checkout\Session;

class GiftCardPurchaseReceipt extends Mailable
{
    use Queueable, SerializesModels;

    public GiftCard $giftCard;

    public ?Session $session;

    public bool $readyNotification;

    public bool $pendingFulfillment;

    public int $delayHours;

    /**
     * Create a new message instance.
     */
    public function __construct(
        GiftCard $giftCard,
        ?Session $session = null,
        bool $readyNotification = false,
        bool $pendingFulfillment = false,
    ) {
        $this->giftCard = $giftCard->load(['user', 'organization']);
        $this->session = $session;
        $this->readyNotification = $readyNotification;
        $this->pendingFulfillment = $pendingFulfillment;
        $this->delayHours = max(1, (int) config('services.gift_cards.fulfillment_delay_hours', 72));
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $brand = $this->giftCard->brand_name ?? 'Gift Card';

        if ($this->readyNotification) {
            $subject = 'Your gift card is ready - '.$brand;
        } elseif ($this->pendingFulfillment) {
            $subject = 'Gift Card Purchase Receipt - '.$brand;
        } else {
            $subject = 'Gift Card Purchase Receipt - '.$brand;
        }

        return new Envelope(subject: $subject);
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.gift-card-receipt',
            with: [
                'giftCard' => $this->giftCard,
                'session' => $this->session,
                'readyNotification' => $this->readyNotification,
                'pendingFulfillment' => $this->pendingFulfillment,
                'delayHours' => $this->delayHours,
                'orderNumber' => $this->orderNumber(),
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        // Pending fulfillment receipts should stay lightweight (no card credentials yet).
        if ($this->pendingFulfillment && ! $this->readyNotification) {
            return [];
        }

        $pdfPath = $this->generatePdfReceipt();

        if ($pdfPath && file_exists($pdfPath)) {
            return [
                Attachment::fromPath($pdfPath)
                    ->as('gift-card-receipt.pdf')
                    ->withMime('application/pdf'),
            ];
        }

        return [];
    }

    private function orderNumber(): string
    {
        $metaOrderId = $this->giftCard->meta['orderId'] ?? null;

        if (is_string($metaOrderId) && $metaOrderId !== '') {
            return $metaOrderId;
        }

        return 'GC-'.$this->giftCard->id;
    }

    /**
     * Generate PDF receipt (hiding Stripe details)
     * Note: For production, install barryvdh/laravel-dompdf: composer require barryvdh/laravel-dompdf
     */
    private function generatePdfReceipt(): ?string
    {
        try {
            if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
                $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('emails.gift-card-receipt-pdf', [
                    'giftCard' => $this->giftCard,
                    'session' => $this->session,
                ]);

                $pdfPath = storage_path('app/temp/receipt-'.$this->giftCard->id.'-'.time().'.pdf');
                $dir = dirname($pdfPath);
                if (! is_dir($dir)) {
                    mkdir($dir, 0755, true);
                }

                $pdf->save($pdfPath);

                return $pdfPath;
            }

            \Illuminate\Support\Facades\Log::info('PDF library not available. Install barryvdh/laravel-dompdf for PDF generation.');

            return null;
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to generate PDF receipt: '.$e->getMessage());

            return null;
        }
    }
}
