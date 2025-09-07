import html2canvas from 'html2canvas';

export const downloadTicket = async (ticketElement: HTMLElement, ticketNumber: string) => {
    try {
        // Create a canvas from the ticket element
        const canvas = await html2canvas(ticketElement, {
            backgroundColor: '#ffffff',
            scale: 2, // Higher resolution
            useCORS: true,
            allowTaint: true,
        });

        // Convert canvas to blob
        canvas.toBlob((blob) => {
            if (blob) {
                // Create download link
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `raffle-ticket-${ticketNumber}.png`;
                
                // Trigger download
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up
                URL.revokeObjectURL(url);
            }
        }, 'image/png', 0.95);
    } catch (error) {
        console.error('Error downloading ticket:', error);
        alert('Failed to download ticket. Please try again.');
    }
};

export const printTicket = (ticketElement: HTMLElement) => {
    try {
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print your ticket.');
            return;
        }

        // Get the ticket HTML
        const ticketHTML = ticketElement.outerHTML;
        
        // Create print-friendly HTML
        const printHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Raffle Ticket</title>
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: white;
                    }
                    @media print {
                        body { margin: 0; padding: 0; }
                        @page { margin: 0; }
                    }
                </style>
            </head>
            <body>
                ${ticketHTML}
            </body>
            </html>
        `;

        printWindow.document.write(printHTML);
        printWindow.document.close();
        
        // Wait for images to load, then print
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        };
    } catch (error) {
        console.error('Error printing ticket:', error);
        alert('Failed to print ticket. Please try again.');
    }
};
