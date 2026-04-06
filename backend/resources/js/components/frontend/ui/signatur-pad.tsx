// components/frontend/ui/signature-pad.tsx
"use client";

import React, { useRef, useEffect } from 'react';

interface SignaturePadProps {
  value: string;
  onChange: (signature: string) => void;
  width?: number;
  height?: number;
  className?: string;
}

export function SignaturePad({
  value,
  onChange,
  width = 400,
  height = 200,
  className = ''
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#5053FC';

    // Load existing signature if available
    if (value) {
      const img = new Image();
      img.src = value;
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Drawing functions
    const startDrawing = (e: MouseEvent | TouchEvent) => {
      isDrawingRef.current = true;
      const { offsetX, offsetY } = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      const { offsetX, offsetY } = getCoordinates(e);
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
    };

    const stopDrawing = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      onChange(canvas.toDataURL());
    };

    const getCoordinates = (e: MouseEvent | TouchEvent) => {
      if (!canvas) return { offsetX: 0, offsetY: 0 };

      const rect = canvas.getBoundingClientRect();
      let offsetX, offsetY;

      if ('touches' in e) {
        offsetX = e.touches[0].clientX - rect.left;
        offsetY = e.touches[0].clientY - rect.top;
      } else {
        offsetX = (e as MouseEvent).offsetX;
        offsetY = (e as MouseEvent).offsetY;
      }

      return { offsetX, offsetY };
    };

    // Event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [value]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return (
    <div className={`flex flex-col items-start ${className}`}>
      <div className="relative border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-950">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="block touch-none cursor-crosshair"
        />
      </div>
      <button
        type="button"
        onClick={clearSignature}
        className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
      >
        Clear Signature
      </button>
    </div>
  );
}
