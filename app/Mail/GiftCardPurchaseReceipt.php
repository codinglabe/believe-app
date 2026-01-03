<?php

namespace App\Mail;

use App\Models\GiftCard;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;
use Stripe\Checkout\Session;

class GiftCardPurchaseReceipt extends Mailable
{
    use Queueable, SerializesModels;

    public GiftCard $giftCard;
    public ?Session $session;

    /**
     * Create a new message instance.
     */
    public function __construct(GiftCard $giftCard, ?Session $session = null)
    {
        $this->giftCard = $giftCard->load(['user', 'organization']);
        $this->session = $session;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Gift Card Purchase Receipt - ' . ($this->giftCard->brand_name ?? 'Gift Card'),
        );
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

    /**
     * Generate PDF receipt (hiding Stripe details)
     * Note: For production, install barryvdh/laravel-dompdf: composer require barryvdh/laravel-dompdf
     */
    private function generatePdfReceipt(): ?string
    {
        try {
            // Check if dompdf is available
            if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
                $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('emails.gift-card-receipt-pdf', [
                    'giftCard' => $this->giftCard,
                    'session' => $this->session, // Can be null for Believe Points payments
                ]);

                $pdfPath = storage_path('app/temp/receipt-' . $this->giftCard->id . '-' . time() . '.pdf');
                $dir = dirname($pdfPath);
                if (!is_dir($dir)) {
                    mkdir($dir, 0755, true);
                }

                $pdf->save($pdfPath);
                return $pdfPath;
            }

            // Fallback: Generate HTML receipt (can be printed as PDF by user)
            // For now, return null to skip PDF attachment
            // In production, install: composer require barryvdh/laravel-dompdf
            \Illuminate\Support\Facades\Log::info('PDF library not available. Install barryvdh/laravel-dompdf for PDF generation.');
            return null;
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to generate PDF receipt: ' . $e->getMessage());
            return null;
        }
    }
}

