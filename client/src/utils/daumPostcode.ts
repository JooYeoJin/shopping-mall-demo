const SCRIPT_SRC =
  'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

type DaumPostcodeData = {
  zonecode: string
  roadAddress: string
  jibunAddress: string
  userSelectedType: 'R' | 'J'
}

type DaumPostcodeInstance = {
  open: () => void
}

type DaumPostcodeCtor = new (options: {
  oncomplete: (data: DaumPostcodeData) => void
  onclose?: (state: 'FORCE_CLOSE' | 'COMPLETE_CLOSE') => void
}) => DaumPostcodeInstance

declare global {
  interface Window {
    daum?: { Postcode: DaumPostcodeCtor }
  }
}

export type DaumPostcodePick = {
  zonecode: string
  address: string
}

let loading: Promise<void> | null = null

export function loadDaumPostcode(): Promise<void> {
  if (window.daum?.Postcode) return Promise.resolve()
  if (loading) return loading

  loading = new Promise((resolve, reject) => {
    const done = () => {
      if (window.daum?.Postcode) resolve()
      else {
        loading = null
        reject(new Error('우편번호 서비스를 불러오지 못했습니다.'))
      }
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`
    )
    if (existing) {
      if (window.daum?.Postcode) {
        resolve()
        return
      }
      existing.addEventListener('load', done)
      existing.addEventListener('error', () => {
        loading = null
        reject(new Error('우편번호 서비스를 불러오지 못했습니다.'))
      })
      return
    }

    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = done
    script.onerror = () => {
      loading = null
      reject(new Error('우편번호 서비스를 불러오지 못했습니다.'))
    }
    document.head.appendChild(script)
  })

  return loading
}

export function openDaumPostcode(): Promise<DaumPostcodePick | null> {
  const Postcode = window.daum?.Postcode
  if (!Postcode) {
    return loadDaumPostcode().then(() => openDaumPostcode())
  }

  return new Promise((resolve) => {
    let settled = false
    const finish = (value: DaumPostcodePick | null) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    new Postcode({
      oncomplete(data) {
        const address =
          data.userSelectedType === 'J' ? data.jibunAddress : data.roadAddress
        finish({ zonecode: data.zonecode, address })
      },
      onclose(state) {
        if (state === 'FORCE_CLOSE') finish(null)
      },
    }).open()
  })
}
