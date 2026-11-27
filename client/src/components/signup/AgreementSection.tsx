type AgreementSectionProps = {
  agreeAll: boolean
  agreeTerms: boolean
  agreePrivacy: boolean
  agreeMarketing: boolean
  agreeSms: boolean
  agreeEmail: boolean
  onAgreeAllChange: (checked: boolean) => void
  onAgreeTermsChange: (checked: boolean) => void
  onAgreePrivacyChange: (checked: boolean) => void
  onAgreeMarketingChange: (checked: boolean) => void
  onAgreeSmsChange: (checked: boolean) => void
  onAgreeEmailChange: (checked: boolean) => void
}

function AgreeCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label className="signup-agree__check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}

export function AgreementSection(props: AgreementSectionProps) {
  const {
    agreeAll,
    agreeTerms,
    agreePrivacy,
    agreeMarketing,
    agreeSms,
    agreeEmail,
    onAgreeAllChange,
    onAgreeTermsChange,
    onAgreePrivacyChange,
    onAgreeMarketingChange,
    onAgreeSmsChange,
    onAgreeEmailChange,
  } = props

  return (
    <section className="signup-agree" aria-labelledby="signup-agree-title">
      <h2 id="signup-agree-title" className="signup-form__section-title">
        약관 동의
      </h2>

      <div className="signup-agree__row">
        <span className="signup-agree__label">모두 동의합니다.</span>
        <AgreeCheckbox
          checked={agreeAll}
          onChange={onAgreeAllChange}
          label="동의함"
        />
      </div>

      <div className="signup-agree__row">
        <span className="signup-agree__label">[필수] 이용약관 동의</span>
        <AgreeCheckbox
          checked={agreeTerms}
          onChange={onAgreeTermsChange}
          label="동의함"
        />
      </div>

      <div className="signup-agree__row">
        <span className="signup-agree__label">
          [필수] 개인정보 수집 및 이용 동의
        </span>
        <AgreeCheckbox
          checked={agreePrivacy}
          onChange={onAgreePrivacyChange}
          label="동의함"
        />
      </div>

      <div className="signup-agree__row">
        <span className="signup-agree__label">[선택] 쇼핑정보 수신 동의</span>
        <AgreeCheckbox
          checked={agreeMarketing}
          onChange={onAgreeMarketingChange}
          label="동의함"
        />
      </div>

      <div className="signup-agree__row signup-agree__row--nested">
        <span>SMS 수신을 동의하십니까?</span>
        <AgreeCheckbox
          checked={agreeSms}
          onChange={onAgreeSmsChange}
          label="동의함"
        />
      </div>

      <div className="signup-agree__row signup-agree__row--nested">
        <span>이메일 수신을 동의하십니까?</span>
        <AgreeCheckbox
          checked={agreeEmail}
          onChange={onAgreeEmailChange}
          label="동의함"
        />
      </div>
    </section>
  )
}