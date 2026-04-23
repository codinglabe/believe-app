import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';

function sanitizeFilenamePart(value: string): string {
    return value.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 80);
}

function waitForImages(root: HTMLElement): Promise<void> {
    const imgs = root.querySelectorAll('img');
    return Promise.all(
        Array.from(imgs).map(
            (img) =>
                new Promise<void>((resolve) => {
                    if (img.complete) {
                        resolve();
                        return;
                    }
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    setTimeout(() => resolve(), 8000);
                }),
        ),
    ).then(() => undefined);
}

async function cloneForCapture(source: HTMLElement): Promise<{ clone: HTMLElement; cleanup: () => void }> {
    const clone = source.cloneNode(true) as HTMLElement;
    const rect = source.getBoundingClientRect();
    const width = Math.max(rect.width, source.offsetWidth, 280);
    const height = Math.max(rect.height, source.offsetHeight, 80);

    clone.style.position = 'fixed';
    clone.style.left = '-10000px';
    clone.style.top = '0';
    clone.style.width = `${width}px`;
    clone.style.minHeight = `${height}px`;
    clone.style.margin = '0';
    clone.style.boxSizing = 'border-box';
    clone.style.backgroundColor = '#ffffff';

    document.body.appendChild(clone);
    void clone.offsetHeight;

    await waitForImages(clone);

    const cleanup = () => {
        clone.parentNode?.removeChild(clone);
    };

    return { clone, cleanup };
}

async function renderTicketHtml2Canvas(source: HTMLElement): Promise<string> {
    const { clone, cleanup } = await cloneForCapture(source);
    try {
        const w = Math.max(clone.scrollWidth, clone.offsetWidth, source.offsetWidth, 280);
        const h = Math.max(clone.scrollHeight, clone.offsetHeight, source.offsetHeight, 80);

        const canvas = await html2canvas(clone, {
            backgroundColor: '#ffffff',
            scale: Math.min(2, window.devicePixelRatio || 2),
            useCORS: true,
            allowTaint: true,
            width: w,
            height: h,
            scrollX: 0,
            scrollY: 0,
            logging: false,
            imageTimeout: 15000,
        });
        return canvas.toDataURL('image/png', 0.95);
    } finally {
        cleanup();
    }
}

/** Prefer html-to-image (SVG/QR + CSS); fallback to html2canvas if it fails. */
async function captureTicketPngDataUrl(element: HTMLElement): Promise<string> {
    if (!element.offsetWidth || !element.offsetHeight) {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }

    try {
        return await toPng(element, {
            cacheBust: true,
            pixelRatio: Math.min(2, window.devicePixelRatio || 2),
            backgroundColor: '#ffffff',
        });
    } catch (e) {
        console.warn('[ticket-download] toPng failed, using html2canvas', e);
        return renderTicketHtml2Canvas(element);
    }
}

export async function downloadTicket(ticketElement: HTMLElement, ticketNumber: string): Promise<void> {
    const dataUrl = await captureTicketPngDataUrl(ticketElement);
    const safe = sanitizeFilenamePart(ticketNumber);

    const link = document.createElement('a');
    link.download = `raffle-ticket-${safe}-${new Date().toISOString().split('T')[0]}.png`;
    link.href = dataUrl;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export async function printTicket(ticketElement: HTMLElement): Promise<void> {
    const dataUrl = await captureTicketPngDataUrl(ticketElement);

    // Do not pass `noopener` in the features string — Chrome returns null and print breaks.
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        throw new Error('Popup blocked');
    }

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Raffle ticket</title>
  <style>
    @page { margin: 12mm; size: auto; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; }
    img { max-width: 100%; height: auto; display: block; }
  </style>
</head>
<body>
  <img src="" alt="Raffle ticket" />
</body>
</html>`);

    const img = printWindow.document.querySelector('img');
    if (img) {
        img.src = dataUrl;
    }
    printWindow.document.close();

    const runPrint = () => {
        try {
            printWindow.focus();
            printWindow.print();
        } catch {
            /* ignore */
        }
        printWindow.onafterprint = () => {
            try {
                printWindow.close();
            } catch {
                /* ignore */
            }
        };
        setTimeout(() => {
            if (!printWindow.closed) {
                try {
                    printWindow.close();
                } catch {
                    /* ignore */
                }
            }
        }, 3000);
    };

    if (img && !img.complete) {
        img.onload = () => setTimeout(runPrint, 50);
        img.onerror = () => setTimeout(runPrint, 50);
    } else {
        setTimeout(runPrint, 100);
    }
}
