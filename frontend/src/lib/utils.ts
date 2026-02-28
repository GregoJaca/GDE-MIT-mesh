import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
    return new Date(dateStr).toLocaleDateString('en-US', options ?? {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}
