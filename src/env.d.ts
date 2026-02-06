/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly AZURE_STORAGE_ACCOUNT_NAME: string;
  readonly AZURE_STORAGE_CONTAINER_NAME: string;
  readonly AZURE_STORAGE_SAS_TOKEN?: string;
  readonly AZURE_STORAGE_CONNECTION_STRING?: string;
  readonly USE_LOCAL_CACHE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
