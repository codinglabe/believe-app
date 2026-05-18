// components/frontend/WhatsAppButton.tsx
import { MessageCircle } from 'lucide-react';

interface WhatsAppButtonProps {
  phone?: string;           // e.g. "8801712345678"
  message?: string;
  className?: string;
}

export default function WhatsAppButton({
  phone = "8801749931891", // ← change to your real number
  message = "Hello! I need help with my order/service...",
  className = "",
}: WhatsAppButtonProps) {
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed bottom-6 right-6 z-50 ${className}`}
      aria-label="Chat on WhatsApp"
    >
      <div className="relative group">
        <div className="bg-[#25D366] text-white rounded-full p-4 shadow-lg hover:bg-[#20b858] transition-all duration-300 transform hover:scale-110">
          <MessageCircle className="h-7 w-7" strokeWidth={2.5} />
        </div>

        {/* Optional tooltip */}
        <div className="absolute right-full mr-4 bottom-1/2 translate-y-1/2 bg-black/90 text-white text-sm px-4 py-2 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none">
          Chat on WhatsApp
        </div>
      </div>
    </a>
  );
}
