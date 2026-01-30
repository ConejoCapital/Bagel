'use client';

import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast: 'bg-white border-bagel-orange/20 shadow-lg',
          title: 'text-bagel-dark font-semibold',
          description: 'text-gray-600',
          actionButton: 'bg-bagel-orange text-white hover:bg-bagel-orange/90',
          cancelButton: 'bg-gray-100 text-gray-600',
          success: 'border-green-500/20',
          error: 'border-red-500/20',
          warning: 'border-bagel-sesame/30',
          info: 'border-bagel-orange/30',
        },
      }}
      icons={{
        success: <span className="text-xl text-green-500">🥯</span>,
        error: <span className="text-xl text-red-500">🥯</span>,
        warning: <span className="text-xl text-bagel-sesame">🥯</span>,
        info: <span className="text-xl text-bagel-orange">🥯</span>,
      }}
    />
  );
}
