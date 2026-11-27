/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_CLOUDINARY_CLOUD_NAME: string
  readonly VITE_CLOUDINARY_UPLOAD_PRESET: string
  readonly VITE_PORTONE_IMP_CODE?: string
  readonly VITE_PORTONE_PG?: string
  readonly VITE_PORTONE_PG_NAVER?: string
  readonly VITE_PORTONE_PG_KAKAO?: string
  readonly VITE_PORTONE_PG_TOSS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}