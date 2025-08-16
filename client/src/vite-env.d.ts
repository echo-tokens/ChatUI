/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ACCOUNT_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
