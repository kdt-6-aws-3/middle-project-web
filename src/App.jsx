import { useCallback, useEffect, useState } from 'react'
import { clinicApi } from './api'
import { Appointments, AppointmentDetails, AppointmentForm } from './Appointments'
import './App.css'

const formatDate = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
const today = () => formatDate(new Date())
const fullName = (person) => person?.name || ''
const errorText = (error) => error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'

function Action({ children, onClick, secondary = false, type = 'button', disabled = false }) {
  return <button type={type} className={secondary ? 'button button-secondary' : 'button'} onClick={onClick} disabled={disabled}>{children}</button>
}

function Notice({ children, tone = 'info' }) {
  return <div className={'notice notice-' + tone} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>
}

function Home({ go }) {
  return <>
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">PETCLINIC · CARE RECORD</span>
        <h1>반려동물의 오늘을<br /><em>더 건강하게.</em></h1>
        <p>보호자와 반려동물 정보, 진료 기록을 한곳에서 확인하고 관리하세요.</p>
        <div className="hero-actions">
          <Action onClick={() => go('owners')}>보호자 찾기 →</Action>
          <Action secondary onClick={() => go('ownerForm')}>새 보호자 등록</Action>
        </div>
      </div>
      <div className="hero-art" aria-hidden="true"><span>🐾</span><strong>PetClinic</strong><small>함께하는 건강 기록</small></div>
    </section>
    <section className="section">
      <div className="section-heading"><span className="eyebrow">QUICK ACCESS</span><h2>무엇을 도와드릴까요?</h2></div>
      <div className="feature-grid">
        <button className="feature-card" onClick={() => go('owners')}><span>🔎</span><strong>보호자 검색</strong><small>보호자와 반려동물 기록 찾기</small><b>바로가기 →</b></button>
        <button className="feature-card" onClick={() => go('ownerForm')}><span>✍️</span><strong>보호자 등록</strong><small>새 보호자 정보 입력하기</small><b>바로가기 →</b></button>
        <button className="feature-card" onClick={() => go('vets')}><span>🩺</span><strong>수의사 안내</strong><small>수의사와 전문 분야 확인하기</small><b>바로가기 →</b></button>
        <button className="feature-card" onClick={() => go('appointments')}><span>📅</span><strong>진료 접수 내역</strong><small>접수 현황 조회와 신규 예약 신청</small><b>바로가기 →</b></button>
      </div>
    </section>
  </>
}

function Owners({ go }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ content: [], page: 1, totalElements: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    clinicApi.listOwners(filter, page, 5)
      .then((data) => {
        if (!active) return
        if (filter && data.totalElements === 1 && data.content.length === 1) {
          go('owner', { ownerId: data.content[0].id })
          return
        }
        setResult(data)
      })
      .catch((e) => { if (active) setError(errorText(e)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filter, page, go])

  function search(e) {
    e.preventDefault()
    const nextFilter = query.trim()
    if (nextFilter === filter && page === 1) return
    setLoading(true)
    setError('')
    setPage(1)
    setFilter(nextFilter)
  }

  function changePage(nextPage) {
    setLoading(true)
    setError('')
    setPage(nextPage)
  }

  const owners = result.content ?? []
  return <section className="page">
    <div className="page-heading"><div><span className="eyebrow">OWNERS</span><h1>보호자 찾기</h1><p>이름으로 검색하거나 전체 보호자 목록을 확인하세요.</p></div><Action onClick={() => go('ownerForm')}>+ 새 보호자</Action></div>
    <form className="search-row" onSubmit={search}>
      <label htmlFor="owner-search" className="sr-only">보호자 이름</label>
      <input id="owner-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="보호자 이름을 입력하세요" />
      <Action type="submit">검색</Action>
    </form>
    {error && <Notice tone="error">{error}</Notice>}
    {loading ? <p className="empty">불러오는 중...</p> : error ? null : owners.length === 0 ? <p className="empty">검색 결과가 없습니다.</p> :
      <div className="table-wrap"><table><thead><tr><th>보호자</th><th>주소</th><th>전화번호</th><th></th></tr></thead><tbody>
        {owners.map((owner) => <tr key={owner.id}><td><strong>{fullName(owner)}</strong></td><td>{owner.address}</td><td>{owner.phone}</td><td><button className="text-link" onClick={() => go('owner', { ownerId: owner.id })}>상세 보기 →</button></td></tr>)}
      </tbody></table></div>}
    {!loading && !error && result.totalPages > 1 && <div className="pagination">
      <Action secondary disabled={page <= 1} onClick={() => changePage(page - 1)}>이전</Action>
      <span>{result.page} / {result.totalPages} 페이지 · 총 {result.totalElements}명</span>
      <Action secondary disabled={page >= result.totalPages} onClick={() => changePage(page + 1)}>다음</Action>
    </div>}
  </section>
}

function PetVisits({ ownerId, petId, go, busy, onDelete }) {
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true
    clinicApi.listVisits(ownerId, petId)
      .then((data) => { if (active) setVisits([...data].sort((a, b) => b.date.localeCompare(a.date))) })
      .catch((e) => { if (active) setError(errorText(e)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [ownerId, petId, retryKey])

  return <div className="visits">
    <h4>진료 기록 {!loading && !error && <small>{visits.length}건</small>}</h4>
    {loading ? <p>진료 기록을 불러오는 중...</p> : error ? <div className="notice notice-error" role="alert">{error} <button className="text-link" onClick={() => { setError(''); setLoading(true); setRetryKey((value) => value + 1) }}>다시 불러오기</button></div> : visits.length ? visits.map((visit) => <article className="visit-entry" key={visit.id}>
      <div className="visit-entry-head"><time dateTime={visit.date}>{visit.date}</time><div className="row-actions"><button className="text-link" onClick={() => go('visitForm', { ownerId, petId, visitId: visit.id })}>수정</button><button className="text-link danger" disabled={busy} onClick={() => onDelete(visit.id)}>삭제</button></div></div>
      <div className="visit-entry-body"><div><small>진료 내용</small><p>{visit.description}</p></div><div><small>처방 약품</small><p>{visit.prescription || '처방 없음'}</p></div></div>
    </article>) : <p>아직 진료 기록이 없습니다.</p>}
  </div>
}

function OwnerDetails({ ownerId, go }) {
  const [owner, setOwner] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [visitsRefreshKey, setVisitsRefreshKey] = useState(0)
  useEffect(() => {
    let active = true
    clinicApi.getOwner(ownerId).then((data) => { if (active) setOwner(data) }).catch((e) => { if (active) setError(errorText(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [ownerId])
  async function removeOwner() {
    if (!window.confirm('보호자를 삭제하면 반려동물, 방문 기록, 진료 예약도 함께 삭제됩니다. 계속할까요?')) return
    setBusy(true); setError('')
    try { await clinicApi.deleteOwner(ownerId); go('owners') }
    catch (e) { setError(errorText(e)); setBusy(false) }
  }
  async function removeRelated(message, action) {
    if (!window.confirm(message)) return
    setBusy(true); setError('')
    try { await action(); setOwner(await clinicApi.getOwner(ownerId)); setVisitsRefreshKey((value) => value + 1) }
    catch (e) { setError(errorText(e)) }
    finally { setBusy(false) }
  }
  if (loading) return <p className="empty">불러오는 중...</p>
  if (error && !owner) return <section className="page"><Notice tone="error">{error}</Notice></section>
  return <section className="page">
    <button className="back-link" onClick={() => go('owners')}>← 보호자 목록</button>
    <div className="page-heading"><div><span className="eyebrow">OWNER PROFILE</span><h1>{fullName(owner)}</h1><p>보호자 정보와 반려동물의 진료 기록</p></div><div className="inline-actions"><Action secondary onClick={() => go('ownerForm', { ownerId })}>정보 수정</Action><Action secondary disabled={busy} onClick={removeOwner}>보호자 삭제</Action></div></div>
    {error && <Notice tone="error">{error}</Notice>}
    <div className="info-card"><div><small>이름</small><strong>{owner.name}</strong></div><div><small>주소</small><strong>{owner.address}</strong></div><div><small>전화번호</small><strong>{owner.phone}</strong></div></div>
    <div className="section-heading inline"><div><span className="eyebrow">PETS & VISITS</span><h2>반려동물과 진료 기록</h2></div><Action onClick={() => go('petForm', { ownerId })}>+ 반려동물 등록</Action></div>
    {owner.pets?.length ? <div className="pet-grid">{owner.pets.map((pet) => <article className="pet-card" key={pet.id}>
      <div className="pet-heading"><span className="pet-icon">🐶</span><div><h3>{pet.name}</h3><p>{pet.type?.name || '종류 미등록'} · {pet.birthDate || '생일 미등록'}</p></div></div>
      <div className="pet-actions"><button className="text-link" onClick={() => go('petForm', { ownerId, petId: pet.id })}>정보 수정</button><button className="text-link" onClick={() => go('visitForm', { ownerId, petId: pet.id })}>+ 진료 기록</button><button className="text-link" onClick={() => go('appointmentForm', { ownerId, petId: pet.id })}>+ 진료 예약</button><button className="text-link" onClick={() => go('appointments', { petId: pet.id })}>접수 내역</button><button className="text-link danger" disabled={busy} onClick={() => removeRelated('반려동물을 삭제하면 진료 기록과 진료 예약도 함께 삭제됩니다. 계속할까요?', () => clinicApi.deletePet(ownerId, pet.id))}>반려동물 삭제</button></div>
      <PetVisits key={`${pet.id}-${visitsRefreshKey}`} ownerId={ownerId} petId={pet.id} go={go} busy={busy} onDelete={(visitId) => removeRelated('이 진료 기록을 삭제할까요?', () => clinicApi.deleteVisit(ownerId, pet.id, visitId))} />
    </article>)}</div> : <p className="empty">등록된 반려동물이 없습니다.</p>}
  </section>
}

function Field({ label, name, value, onChange, type = 'text', required = true, maxLength, min, max, children }) {
  return <label className="field"><span>{label}</span>{children || <input name={name} value={value ?? ''} onChange={onChange} type={type} required={required} maxLength={maxLength} min={min} max={max} />}</label>
}

function OwnerForm({ ownerId, go }) {
  const editing = Boolean(ownerId)
  const [form, setForm] = useState({ name: '', address: '', phone: '' })
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!editing) return
    clinicApi.getOwner(ownerId).then((data) => setForm({ name: data.name, address: data.address, phone: data.phone })).catch((e) => setError(errorText(e))).finally(() => setLoading(false))
  }, [editing, ownerId])
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  async function submit(e) {
    e.preventDefault()
    if (!/^\d{2,3}-\d{3,4}-\d{4}$/.test(form.phone)) { setError('전화번호는 010-1234-5678 형식으로 입력하세요.'); return }
    setSaving(true); setError('')
    try { const saved = await clinicApi.saveOwner(form, ownerId); go('owner', { ownerId: saved.id }) }
    catch (e) { setError(errorText(e)) }
    finally { setSaving(false) }
  }
  return <section className="page narrow">
    <button className="back-link" onClick={() => go(editing ? 'owner' : 'owners', editing ? { ownerId } : {})}>← 돌아가기</button>
    <span className="eyebrow">OWNER</span><h1>{editing ? '보호자 정보 수정' : '새 보호자 등록'}</h1><p className="page-intro">보호자의 기본 정보를 입력해 주세요.</p>
    {error && <Notice tone="error">{error}</Notice>}
    {loading ? <p className="empty">불러오는 중...</p> : <form className="form-card" onSubmit={submit}>
      <Field label="이름" name="name" value={form.name} onChange={change} maxLength={255} />
      <Field label="주소" name="address" value={form.address} onChange={change} maxLength={255} />
      <Field label="전화번호 (예: 010-1234-5678)" name="phone" value={form.phone} onChange={change} type="tel" maxLength={13} />
      <div className="form-actions"><Action secondary onClick={() => go(editing ? 'owner' : 'owners', editing ? { ownerId } : {})}>취소</Action><Action type="submit" disabled={saving}>{saving ? '저장 중...' : editing ? '수정 저장' : '보호자 등록'}</Action></div>
    </form>}
  </section>
}

function PetForm({ ownerId, petId, go }) {
  const editing = Boolean(petId)
  const [owner, setOwner] = useState(null)
  const [types, setTypes] = useState([])
  const [form, setForm] = useState({ name: '', birthDate: '', typeId: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    Promise.all([clinicApi.getOwner(ownerId), clinicApi.listPetTypes(), editing ? clinicApi.getPet(ownerId, petId) : Promise.resolve(null)]).then(([data, petTypes, pet]) => {
      setOwner(data); setTypes(petTypes)
      if (pet) setForm({ name: pet.name, birthDate: pet.birthDate || '', typeId: String(pet.type?.id || '') })
    }).catch((e) => setError(errorText(e))).finally(() => setLoading(false))
  }, [ownerId, petId, editing])
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  async function submit(e) {
    e.preventDefault(); setSaving(true); setError('')
    try { await clinicApi.savePet(ownerId, { ...form, typeId: Number(form.typeId) }, petId); go('owner', { ownerId }) }
    catch (e) { setError(errorText(e)) }
    finally { setSaving(false) }
  }
  return <section className="page narrow">
    <button className="back-link" onClick={() => go('owner', { ownerId })}>← 보호자 상세</button>
    <span className="eyebrow">PET</span><h1>{editing ? '반려동물 정보 수정' : '반려동물 등록'}</h1><p className="page-intro">보호자: {fullName(owner)}<br />같은 이름의 반려동물도 등록할 수 있습니다.</p>
    {error && <Notice tone="error">{error}</Notice>}
    {loading ? <p className="empty">불러오는 중...</p> : <form className="form-card" onSubmit={submit}>
      <Field label="이름" name="name" value={form.name} onChange={change} maxLength={255} />
      <div className="form-grid"><Field label="생일" name="birthDate" value={form.birthDate} onChange={change} type="date" max={today()} />
        <Field label="종류" name="typeId" value={form.typeId} onChange={change}><select name="typeId" value={form.typeId} onChange={change} required><option value="">종류 선택</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></Field></div>
      <div className="form-actions"><Action secondary onClick={() => go('owner', { ownerId })}>취소</Action><Action type="submit" disabled={saving}>{saving ? '저장 중...' : editing ? '수정 저장' : '반려동물 등록'}</Action></div>
    </form>}
  </section>
}

function VisitForm({ ownerId, petId, visitId, go }) {
  const editing = Boolean(visitId)
  const [pet, setPet] = useState(null)
  const [form, setForm] = useState({ date: today(), description: '', prescription: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    Promise.all([clinicApi.getPet(ownerId, petId), editing ? clinicApi.listVisits(ownerId, petId) : Promise.resolve([])]).then(([data, visits]) => {
      setPet(data)
      if (editing) {
        const visit = visits.find((item) => String(item.id) === String(visitId))
        if (!visit) throw new Error('진료 기록을 찾을 수 없습니다.')
        setForm({ date: visit.date, description: visit.description, prescription: visit.prescription || '' })
      }
    }).catch((e) => setError(errorText(e))).finally(() => setLoading(false))
  }, [ownerId, petId, visitId, editing])
  async function submit(e) {
    e.preventDefault(); setSaving(true); setError('')
    try { await clinicApi.saveVisit(ownerId, petId, form, visitId); go('owner', { ownerId }) }
    catch (e) { setError(errorText(e)) }
    finally { setSaving(false) }
  }
  return <section className="page narrow">
    <button className="back-link" onClick={() => go('owner', { ownerId })}>← 보호자 상세</button>
    <span className="eyebrow">VISIT</span><h1>{editing ? '진료 기록 수정' : '진료 기록 추가'}</h1><p className="page-intro">반려동물: {pet?.name}</p>
    {error && <Notice tone="error">{error}</Notice>}
    {loading ? <p className="empty">불러오는 중...</p> : <form className="form-card" onSubmit={submit}>
      <Field label="진료 날짜" name="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} type="date" max={today()} />
      <label className="field"><span>진료 내용</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required maxLength={255} rows="5" placeholder="진료 내용을 입력하세요" /></label>
      <label className="field"><span>처방 내역 (선택)</span><textarea value={form.prescription} onChange={(e) => setForm({ ...form, prescription: e.target.value })} maxLength={255} rows="3" placeholder="처방이 없으면 비워 두세요" /></label>
      <div className="form-actions"><Action secondary onClick={() => go('owner', { ownerId })}>취소</Action><Action type="submit" disabled={saving}>{saving ? '저장 중...' : editing ? '수정 저장' : '진료 기록 저장'}</Action></div>
    </form>}
  </section>
}

function Vets() {
  const [vets, setVets] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [hospitalId, setHospitalId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    clinicApi.listHospitals().then(setHospitals).catch((e) => setError(errorText(e)))
  }, [])
  useEffect(() => {
    let active = true
    const load = hospitalId ? clinicApi.listHospitalVets(hospitalId) : clinicApi.listVets()
    load.then((data) => { if (active) setVets(data) })
      .catch((e) => { if (active) setError(errorText(e)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [hospitalId])
  return <section className="page"><span className="eyebrow">VETERINARIANS</span><h1>수의사 안내</h1><p className="page-intro">PetClinic 수의사와 전문 분야를 확인하세요.</p>
    <label className="field"><span>병원</span><select value={hospitalId} onChange={(e) => { setHospitalId(e.target.value); setError(''); setLoading(true) }}><option value="">전체 병원</option>{hospitals.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name}</option>)}</select></label>
    {error && <Notice tone="error">{error}</Notice>}
    {loading ? <p className="empty">불러오는 중...</p> : error ? null : vets.length === 0 ? <p className="empty">등록된 수의사가 없습니다.</p> : <div className="table-wrap"><table><thead><tr><th>수의사</th><th>병원</th><th>전문 분야</th></tr></thead><tbody>{vets.map((vet) => <tr key={vet.id}><td><strong>{fullName(vet)}</strong></td><td>{vet.hospital?.name || '미지정'}</td><td>{vet.specialties?.length ? vet.specialties.map((item) => item.name).join(', ') : '일반 진료'}</td></tr>)}</tbody></table></div>}
  </section>
}

function App() {
  useEffect(() => { localStorage.removeItem('petclinic-react-demo-v1') }, [])
  const [screen, setScreen] = useState({ name: 'home', nonce: 0 })
  const go = useCallback((name, params = {}) => { setScreen({ name, ...params, nonce: Date.now() + Math.random() }); window.scrollTo(0, 0) }, [])
  return <div className="site">
    <header className="site-header"><button className="brand" onClick={() => go('home')} aria-label="PetClinic 홈"><span>✦</span> PetClinic</button>
      <nav aria-label="주 메뉴"><button className={screen.name === 'home' ? 'active' : ''} onClick={() => go('home')}>홈</button><button className={['owners', 'owner', 'ownerForm', 'petForm', 'visitForm'].includes(screen.name) ? 'active' : ''} onClick={() => go('owners')}>보호자</button><button className={screen.name === 'vets' ? 'active' : ''} onClick={() => go('vets')}>수의사</button><button className={['appointments', 'appointment', 'appointmentForm'].includes(screen.name) ? 'active' : ''} onClick={() => go('appointments')}>진료 접수</button></nav>
    </header>
    <main key={screen.nonce}>
      {screen.name === 'home' && <Home go={go} />}
      {screen.name === 'owners' && <Owners go={go} />}
      {screen.name === 'owner' && <OwnerDetails ownerId={screen.ownerId} go={go} />}
      {screen.name === 'ownerForm' && <OwnerForm ownerId={screen.ownerId} go={go} />}
      {screen.name === 'petForm' && <PetForm ownerId={screen.ownerId} petId={screen.petId} go={go} />}
      {screen.name === 'visitForm' && <VisitForm ownerId={screen.ownerId} petId={screen.petId} visitId={screen.visitId} go={go} />}
      {screen.name === 'vets' && <Vets />}
      {screen.name === 'appointments' && <Appointments go={go} petId={screen.petId} />}
      {screen.name === 'appointment' && <AppointmentDetails appointmentId={screen.appointmentId} go={go} />}
      {screen.name === 'appointmentForm' && <AppointmentForm appointmentId={screen.appointmentId} ownerId={screen.ownerId} petId={screen.petId} go={go} />}
    </main>
    <footer className="site-footer"><span>✦ PetClinic</span><small>반려동물과 보호자를 위한 건강 기록</small></footer>
  </div>
}

export default App

