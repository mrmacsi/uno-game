declare module 'next/cache' {
  export function revalidatePath(path: string): void;
}

declare module 'next/headers' {
  export function cookies(): any;
}

declare module 'next/navigation' {
  export function redirect(url: string): never;
  export function useSearchParams(): URLSearchParams;
  export function useParams(): { [key: string]: string | undefined };
  export function useRouter(): { push: (url: string) => void; replace: (url: string) => void; prefetch: (url: string) => Promise<void> };
}
