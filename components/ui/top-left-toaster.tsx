"use client"

import React from 'react';
import { useTopLeftToast } from '@/contexts/top-left-toast-context';
import {
    ToastProvider,
    ToastViewport,
    Toast,
    ToastTitle,
    ToastDescription,
    ToastClose,
} from "@/components/ui/toast";

const viewportPositionClasses: Record<string, string> = {
  "top-left": "fixed top-0 left-0 z-[100] flex max-h-screen w-full flex-col p-4 md:max-w-sm",
  "top-right": "fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col p-4 md:max-w-sm",
  "bottom-left": "fixed bottom-0 left-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 md:max-w-sm",
  "bottom-right": "fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 md:max-w-sm",
};

export function ToastRenderer({ position = "top-left" }: { position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) {
    const { toastState, hideToast } = useTopLeftToast();

    if (!toastState) {
        return null;
    }

    const { id, isOpen, title, description } = toastState;

    return (
        <ToastProvider swipeDirection="right" duration={Infinity}>
            {isOpen && (
                <Toast
                    key={id}
                    open={isOpen}
                    onOpenChange={(open) => {
                        if (!open) {
                            hideToast(id);
                        }
                    }}
                    className="bg-black/80 backdrop-blur-md text-white border border-white/20 rounded-lg shadow-lg"
                >
                    <div className="grid gap-1">
                        {title && <ToastTitle className="text-white drop-shadow">{title}</ToastTitle>}
                        {description && (
                            <ToastDescription className="text-white/90 drop-shadow-sm">{description}</ToastDescription>
                        )}
                    </div>
                    <ToastClose />
                </Toast>
            )}
            <ToastViewport className={viewportPositionClasses[position]} />
        </ToastProvider>
    );
} 