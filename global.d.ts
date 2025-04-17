declare module 'next/cache' {
  export function revalidatePath(path: string): void;
}

declare module 'next/headers' {
  export function cookies(): any;
}

declare module 'next/navigation' {
  export function redirect(url: string): never;
}
