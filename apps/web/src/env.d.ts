/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FULFILL_CONTRACT_ADDRESS?: `0x${string}`;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  ethereum?: any;
}
