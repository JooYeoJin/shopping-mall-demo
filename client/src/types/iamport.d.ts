/** 포트원(구 아임포트) JS SDK — index.html CDN 로드 */
interface IamportInstance {
  init: (impUid: string) => void
  request_pay: (
    params: Record<string, unknown>,
    callback?: (response: Record<string, unknown>) => void
  ) => void
}

declare global {
  interface Window {
    IMP?: IamportInstance
  }
}

export {}