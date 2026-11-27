import { useCallback } from 'react'
import { useCloudinaryUploadWidget } from '@/hooks/useCloudinaryUploadWidget'

type Props = {
  publicId: string
  imageUrl: string
  disabled?: boolean
  onChange: (payload: { publicId: string; url: string }) => void
  onClear?: () => void
}

export function CloudinaryImageField({
  publicId,
  imageUrl,
  disabled,
  onChange,
  onClear,
}: Props) {
  const handleSuccess = useCallback(
    (payload: { publicId: string; url: string }) => {
      onChange(payload)
    },
    [onChange]
  )

  const { isConfigured, ready, initError, openWidget } =
    useCloudinaryUploadWidget(handleSuccess)

  return (
    <hgroup className="admin-field admin-field--full admin-image-field">
      <span className="admin-field__label">대표 이미지 (Cloudinary) *</span>

      {!isConfigured ? (
        <p className="admin-image-field__hint admin-image-field__hint--warn">
          client/.env 에 <code>VITE_CLOUDINARY_CLOUD_NAME</code>,{' '}
          <code>VITE_CLOUDINARY_UPLOAD_PRESET</code> 을 설정해 주세요.
        </p>
      ) : null}

      {initError ? (
        <p className="admin-message" role="alert">
          {initError}
        </p>
      ) : null}

      <div className="admin-image-field__actions">
        <button
          type="button"
          className="admin-btn admin-btn--ghost"
          disabled={disabled || !isConfigured || !ready}
          onClick={openWidget}
        >
          {ready ? '이미지 업로드' : '위젯 준비 중…'}
        </button>
        {imageUrl && onClear ? (
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            disabled={disabled}
            onClick={onClear}
          >
            이미지 제거
          </button>
        ) : null}
      </div>

      {publicId ? (
        <p className="admin-image-field__meta">
          public_id: <span>{publicId}</span>
        </p>
      ) : null}

      <div
        className={`admin-form__preview admin-form__preview--product${
          imageUrl ? ' admin-form__preview--has-image' : ''
        }`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="업로드한 상품 이미지 미리보기" />
        ) : (
          <p className="admin-image-field__placeholder">
            업로드된 이미지가 여기에 미리보기로 표시됩니다.
          </p>
        )}
      </div>
    </hgroup>
  )
}