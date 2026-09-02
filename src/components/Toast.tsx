'use client';
import { useEffect } from 'react';

type ToastProps = {
  message: string;
  isVisible: boolean;
  onClose: () => void;
};

export function Toast({ message, isVisible, onClose }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, message, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300">
      <div className="bg-slate-800 text-white font-bold px-6 py-4 rounded-3xl shadow-2xl border-4 border-slate-700 flex items-center gap-3">
        <span className="text-xl">💬</span>
        <span className="text-lg">{message}</span>
      </div>
    </div>
  );
}
