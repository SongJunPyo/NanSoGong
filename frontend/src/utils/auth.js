export const PASSWORD_HINT = '8~64자, 영문·숫자·특수문자 포함, 공백 제외'
export const WEEK_DAYS = [['mon', '월'], ['tue', '화'], ['wed', '수'], ['thu', '목'], ['fri', '금'], ['sat', '토'], ['sun', '일']]
export const emptyMember = () => ({ loginId: '', password: '', passwordConfirm: '', name: '', phone: '' })
export const emptyBusiness = () => ({ bizRegNo: '', ownerName: '', openingDate: '', bizName: '' })
export const normalizePhone = (value) => value.replace(/[-\s]/g, '')
export const normalizeBusinessNumber = (value) => value.replace(/[-\s]/g, '')

export function formatBusinessNumber(value) {
  const number = normalizeBusinessNumber(value)
  if (!/^\d{0,10}$/.test(number)) return value
  return number.replace(/^(\d{3})(\d{0,2})(\d{0,5})$/, (_, a, b, c) => `${a}${b ? `-${b}` : ''}${c ? `-${c}` : ''}`)
}

export function validateLoginId(value) {
  return /^[A-Za-z][A-Za-z0-9_]{5,49}$/.test(value) ? '' : '아이디는 영문으로 시작하는 영문·숫자·밑줄 6~50자예요.'
}

export function validateMember(member) {
  const errors = {}
  if (validateLoginId(member.loginId)) errors.loginId = validateLoginId(member.loginId)
  if (member.password.length < 8 || member.password.length > 64 || !/[A-Za-z]/.test(member.password) || !/\d/.test(member.password) || !/[^A-Za-z0-9\s]/.test(member.password) || /\s/.test(member.password)) errors.password = PASSWORD_HINT
  else if (new TextEncoder().encode(member.password).length > 72) errors.password = '비밀번호가 너무 길어요. 영문·숫자·기호로 줄여 주세요'
  if (!member.passwordConfirm || member.password !== member.passwordConfirm) errors.passwordConfirm = '비밀번호가 일치하지 않아요.'
  if (!member.name.trim() || member.name.trim().length > 50) errors.name = '이름을 입력해 주세요. 최대 50자예요.'
  if (!/^01[016789]\d{7,8}$/.test(normalizePhone(member.phone))) errors.phone = '올바른 휴대전화 번호를 입력해 주세요.'
  return errors
}

export function normalizeBusiness(business) {
  return { bizRegNo: normalizeBusinessNumber(business.bizRegNo), ownerName: business.ownerName.trim(), openingDate: business.openingDate, bizName: business.bizName.trim() }
}

export function validateBusiness(business) {
  const value = normalizeBusiness(business)
  const errors = {}
  if (!/^\d{10}$/.test(value.bizRegNo)) errors.bizRegNo = '사업자등록번호는 숫자 10자리로 입력해 주세요.'
  if (!value.ownerName || value.ownerName.length > 50) errors.ownerName = '대표자명을 입력해 주세요. 최대 50자예요.'
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value.openingDate)
  const date = match ? new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`) : null
  if (!match || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10).replaceAll('-', '') !== value.openingDate) errors.openingDate = '실제 존재하는 날짜를 YYYYMMDD 형식으로 입력해 주세요.'
  if (value.bizName.length > 100) errors.bizName = '상호는 100자 이내로 입력해 주세요.'
  return errors
}

export function validateStore(store) {
  const errors = {}
  for (const [key, label, max] of [['name', '매장명', 100], ['category', '업종', 50], ['address', '주소', 255]]) {
    if (!store[key]?.trim() || store[key].trim().length > max) errors[key] = `${label}을 입력해 주세요. 최대 ${max}자예요.`
  }
  if ((store.openTime || store.closeTime) && (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(store.openTime) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(store.closeTime) || store.openTime === store.closeTime)) errors.openHours = '시작·마감 시간을 모두 입력하고 서로 다른 시간을 선택해 주세요.'
  return errors
}

export const isStoreReady = (store) => Boolean(store?.name?.trim() && store?.category?.trim() && store?.address?.trim())
export const firstIncompleteStore = (stores) => stores.find((store) => !isStoreReady(store))
export const loginDestination = (stores) => !stores.length || firstIncompleteStore(stores) ? '/onboarding/store' : '/'

