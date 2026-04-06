import html2canvas from 'html2canvas';

export const downloadTicket = async (ticketElement: HTMLElement, ticketNumber: string) => {
    try {
        // Show loading state
        const originalContent = ticketElement.innerHTML;
        ticketElement.innerHTML = `
            <div class="flex items-center justify-center h-48 bg-gray-100 rounded-2xl">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p class="text-gray-600 font-medium">Preparing download...</p>
                </div>
            </div>
        `;

        // Wait a moment for the loading state to show
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Wait for any images to load
        const images = ticketElement.querySelectorAll('img');
        await Promise.all(Array.from(images).map(img => {
            return new Promise((resolve) => {
                if (img.complete) {
                    resolve(true);
                } else {
                    img.onload = () => resolve(true);
                    img.onerror = () => resolve(true);
                    // Timeout after 5 seconds
                    setTimeout(() => resolve(true), 5000);
                }
            });
        }));

        // Create a canvas from the ticket element
        const canvas = await html2canvas(ticketElement, {
            backgroundColor: '#ffffff',
            scale: 2, // Good resolution for download
            useCORS: true,
            allowTaint: true,
            width: ticketElement.offsetWidth,
            height: ticketElement.offsetHeight,
            scrollX: 0,
            scrollY: 0,
            logging: false,
            imageTimeout: 5000,
        });

        // Restore original content
        ticketElement.innerHTML = originalContent;

        // Convert canvas to blob
        canvas.toBlob((blob) => {
            if (blob) {
                // Create download link
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `raffle-ticket-${ticketNumber}-${new Date().toISOString().split('T')[0]}.png`;
                
                // Trigger download
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up
                URL.revokeObjectURL(url);

                // Show success message
                const successDiv = document.createElement('div');
                successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300';
                successDiv.innerHTML = `
                    <div class="flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                        </svg>
                        Ticket downloaded successfully!
                    </div>
                `;
                document.body.appendChild(successDiv);

                // Remove success message after 3 seconds
                setTimeout(() => {
                    successDiv.style.transform = 'translateX(100%)';
                    setTimeout(() => {
                        document.body.removeChild(successDiv);
                    }, 300);
                }, 3000);
            }
        }, 'image/png', 0.95);
    } catch (error) {
        console.error('Error downloading ticket:', error);
        
        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300';
        errorDiv.innerHTML = `
            <div class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
                Failed to download ticket. Please try again.
            </div>
        `;
        document.body.appendChild(errorDiv);

        // Remove error message after 5 seconds
        setTimeout(() => {
            errorDiv.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(errorDiv);
            }, 300);
        }, 5000);
    }
};

export const printTicket = (ticketElement: HTMLElement) => {
    try {
        // Show loading state
        const originalContent = ticketElement.innerHTML;
        ticketElement.innerHTML = `
            <div class="flex items-center justify-center h-48 bg-gray-100 rounded-2xl">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                    <p class="text-gray-600 font-medium">Preparing for print...</p>
                </div>
            </div>
        `;

        // Wait a moment for the loading state to show
        setTimeout(() => {
            // Restore original content
            ticketElement.innerHTML = originalContent;

            // Create a new window for printing
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                // Show error message
                const errorDiv = document.createElement('div');
                errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300';
                errorDiv.innerHTML = `
                    <div class="flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                        Please allow popups to print your ticket.
                    </div>
                `;
                document.body.appendChild(errorDiv);

                // Remove error message after 5 seconds
                setTimeout(() => {
                    errorDiv.style.transform = 'translateX(100%)';
                    setTimeout(() => {
                        document.body.removeChild(errorDiv);
                    }, 300);
                }, 5000);
                return;
            }

            // Get the ticket HTML
            const ticketHTML = ticketElement.outerHTML;
            
            // Create print-friendly HTML with better styling
            const printHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Raffle Ticket - Print</title>
                    <meta charset="utf-8">
                    <style>
                        * {
                            box-sizing: border-box;
                        }
                        body {
                            margin: 0;
                            padding: 20px;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                            background: white;
                            color: #000;
                        }
                        .ticket-container {
                            max-width: 100%;
                            margin: 0 auto;
                        }
                        @media print {
                            body { 
                                margin: 0; 
                                padding: 10px; 
                            }
                            @page { 
                                margin: 0.5in;
                                size: A4 landscape;
                            }
                            .ticket-container {
                                transform: scale(0.8);
                                transform-origin: top left;
                            }
                        }
                        @media screen {
                            .ticket-container {
                                max-width: 800px;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="ticket-container">
                        ${ticketHTML}
                    </div>
                </body>
                </html>
            `;

            printWindow.document.write(printHTML);
            printWindow.document.close();
            
            // Wait for images to load, then print
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                    
                    // Show success message
                    const successDiv = document.createElement('div');
                    successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300';
                    successDiv.innerHTML = `
                        <div class="flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            Print dialog opened successfully!
                        </div>
                    `;
                    document.body.appendChild(successDiv);

                    // Remove success message after 3 seconds
                    setTimeout(() => {
                        successDiv.style.transform = 'translateX(100%)';
                        setTimeout(() => {
                            document.body.removeChild(successDiv);
                        }, 300);
                    }, 3000);

                    // Close the print window after a delay
                    setTimeout(() => {
                        printWindow.close();
                    }, 1000);
                }, 1000);
            };
        }, 500);
    } catch (error) {
        console.error('Error printing ticket:', error);
        
        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300';
        errorDiv.innerHTML = `
            <div class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
                Failed to print ticket. Please try again.
            </div>
        `;
        document.body.appendChild(errorDiv);

        // Remove error message after 5 seconds
        setTimeout(() => {
            errorDiv.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(errorDiv);
            }, 300);
        }, 5000);
    }
};

