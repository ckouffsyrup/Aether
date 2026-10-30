// Minimal Vite env typing (avoids depending on vite/client types).
interface ImportMetaEnv { readonly DEV: boolean; readonly PROD: boolean }
interface ImportMeta { readonly env: ImportMetaEnv }
declare module '*.css';
