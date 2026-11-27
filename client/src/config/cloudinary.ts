export function getCloudinaryConfig() {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim() ?? ''
  const uploadPreset =
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim() ?? ''
  return {
    cloudName,
    uploadPreset,
    isConfigured: Boolean(cloudName && uploadPreset),
  }
}