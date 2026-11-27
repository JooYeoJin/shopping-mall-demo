export type CloudinaryUploadResult = {
  event: string
  info?: {
    public_id: string
    secure_url: string
  }
}

export type CloudinaryWidget = {
  open: (
    element?: HTMLElement | null,
    options?: Record<string, unknown>,
    callback?: (error: Error | null, result: CloudinaryUploadResult) => void
  ) => void
}

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (
        options: Record<string, unknown>,
        callback: (error: Error | null, result: CloudinaryUploadResult) => void
      ) => CloudinaryWidget
    }
  }
}

export {}