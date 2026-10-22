import { useEffect, useState } from 'react'
import { clinicApi } from './api'

const statusText = {
  REQUESTED: '접수 대기',
  CONFIRMED: '예약 확정',
  CANCELLED: '취소',
  COMPLETED: '진료 완료',
}
const statusOptions = [['', '전체 내역'], ['REQUESTED', '접수 대기'], ['CONFIRMED', '예약 확정'], ['COMPLETED', '진료 완료'], ['CANCELLED', '취소']]
const isClosed = (status) => status === 'CANCELLED' || status === 'COMPLETED'
const errorText = (error) => error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'
const displayDateTime = (value) => value ? value.replace('T', ' ').slice(0, 16) : '-'
const localDateTime = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-') + 'T' + [String(date.getHours()).padStart(2, '0'), String(date.getMinutes()).padStart(2, '0')].join(':')
const appointmentFields = (value) => {
  const date = value.slice(0, 10)
  const hour = Number(value.slice(11, 13))
  const minute = value.slice(14, 16)
  if (hour !== 0) return { appointmentDate: date, appointmentHour: String(hour), appointmentMinute: minute }
  const previousDay = new Date(date + 'T12:00:00')
  previousDay.setDate(previousDay.getDate() - 1)
  return { appointmentDate: localDateTime(previousDay).slice(0, 10), appointmentHour: '24', appointmentMinute: minute }
}
const nextCalendarDate = (value) => {
  const nextDay = new Date(value + 'T12:00:00')
  nextDay.setDate(nextDay.getDate() + 1)
  return localDateTime(nextDay).slice(0, 10)
}

export function Appointments({ go, petId }) {
  const [filters, setFilters] = useState({ hospitalId: '', vetId: '', petId: petId ? String(petId) : '', status: '' })
  const [applied, setApplied] = useState({ petId: petId ? String(petId) : '' })
  const [hospitals, setHospitals] = useState([])
  const [vets, setVets] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([clinicApi.listHospitals(), clinicApi.listVets()])
      .then(([hospitalList, vetList]) => { setHospitals(hospitalList); setVets(vetList) })
      .catch((e) => setError(errorText(e)))
  }, [])
  useEffect(() => {
    let active = true
    clinicApi.listAppointments(applied)
      .then((data) => { if (active) setAppointments(data) })
      .catch((e) => { if (active) setError(errorText(e)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [applied])

  function search(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    setApplied({ ...filters })
  }
  function showStatus(status) {
    setFilters((current) => ({ ...current, status }))
    setError('')
    setLoading(true)
    setApplied({ ...filters, status })
  }
  const change = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }))

  return <section className="page">
    <div className="page-heading"><div><span className="eyebrow">APPOINTMENTS</span><h1>진료 접수 내역</h1><p>접수 상태와 예약 내역을 조회하고 관리하세요.</p></div><button className="button" onClick={() => go('appointmentForm')}>+ 새 예약</button></div>
    <div className="status-quick" aria-label="접수 상태 바로 보기">
      {statusOptions.map(([value, label]) => <button key={value} type="button" className={'status-chip' + (applied.status === value || (!applied.status && !value) ? ' status-chip-active' : '')} aria-pressed={applied.status === value || (!applied.status && !value)} onClick={() => showStatus(value)}>{label}</button>)}
    </div>
    <form className="filter-card" onSubmit={search}>
      <label>병원<select name="hospitalId" value={filters.hospitalId} onChange={change}><option value="">전체</option>{hospitals.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name}</option>)}</select></label>
      <label>수의사<select name="vetId" value={filters.vetId} onChange={change}><option value="">전체</option>{vets.map((vet) => <option key={vet.id} value={vet.id}>{vet.name}</option>)}</select></label>
      <label>반려동물 ID<input name="petId" type="number" min="1" value={filters.petId} onChange={change} placeholder="전체" /></label>
      <label>상태<select name="status" value={filters.status} onChange={change}><option value="">전체</option>{Object.entries(statusText).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button className="button" type="submit">조회</button>
    </form>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    {!loading && !error && <p className="result-count">조회된 접수 내역 {appointments.length}건</p>}
    {loading ? <p className="empty">불러오는 중...</p> : error ? null : appointments.length === 0 ? <p className="empty">조건에 맞는 접수 내역이 없습니다.</p> :
      <div className="table-wrap"><table><thead><tr><th>접수 번호</th><th>예약 일시</th><th>반려동물</th><th>병원</th><th>수의사</th><th>상태</th><th></th></tr></thead><tbody>
        {appointments.map((appointment) => <tr key={appointment.id}><td>#{appointment.id}</td><td>{displayDateTime(appointment.appointmentAt)}</td><td>{appointment.petName}</td><td>{appointment.hospitalName}</td><td>{appointment.vetName}</td><td>{statusText[appointment.status] || appointment.status}</td><td><button className="text-link" onClick={() => go('appointment', { appointmentId: appointment.id })}>상세 보기 →</button></td></tr>)}
      </tbody></table></div>}
  </section>
}

export function AppointmentDetails({ appointmentId, go }) {
  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    clinicApi.getAppointment(appointmentId)
      .then(setAppointment)
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false))
  }, [appointmentId])

  async function changeStatus(status) {
    if ((status === 'CANCELLED' || status === 'COMPLETED') &&
      !window.confirm(status === 'CANCELLED' ? '예약을 취소할까요? 취소 후에는 상태를 바꿀 수 없습니다.' : '진료를 완료 처리할까요? 완료 후에는 상태를 바꿀 수 없습니다.')) return
    setBusy(true); setError('')
    try { setAppointment(await clinicApi.updateAppointmentStatus(appointmentId, status)) }
    catch (e) { setError(errorText(e)) }
    finally { setBusy(false) }
  }
  async function remove() {
    if (!window.confirm('이 예약을 영구 삭제할까요? 기록을 남기려면 예약 취소를 사용하세요.')) return
    setBusy(true); setError('')
    try { await clinicApi.deleteAppointment(appointmentId); go('appointments') }
    catch (e) { setError(errorText(e)); setBusy(false) }
  }

  if (loading) return <section className="page"><p className="empty">불러오는 중...</p></section>
  if (!appointment) return <section className="page"><div className="notice notice-error" role="alert">{error || '예약을 찾을 수 없습니다.'}</div></section>
  return <section className="page narrow">
    <button className="back-link" onClick={() => go('appointments')}>← 접수 내역</button>
    <span className="eyebrow">APPOINTMENT</span><h1>진료 접수 상세</h1>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    <div className="detail-card">
      <div><small>접수 번호</small><strong>#{appointment.id}</strong></div>
      <div><small>상태</small><strong>{statusText[appointment.status] || appointment.status}</strong></div>
      <div><small>예약 일시</small><strong>{displayDateTime(appointment.appointmentAt)}</strong></div>
      <div><small>반려동물</small><strong>{appointment.petName} (ID {appointment.petId})</strong></div>
      <div><small>병원</small><strong>{appointment.hospitalName}</strong></div>
      <div><small>수의사</small><strong>{appointment.vetName}</strong></div>
      <div><small>진료 사유</small><strong>{appointment.reason || '-'}</strong></div>
      <div><small>신청 일시</small><strong>{displayDateTime(appointment.createdAt)}</strong></div>
    </div>
    <div className="inline-actions appointment-actions">
      {!isClosed(appointment.status) && <>
        <button className="button button-secondary" disabled={busy} onClick={() => go('appointmentForm', { appointmentId })}>예약 변경</button>
        {appointment.status === 'REQUESTED' && <button className="button" disabled={busy} onClick={() => changeStatus('CONFIRMED')}>예약 확정</button>}
        {appointment.status === 'CONFIRMED' && <button className="button" disabled={busy} onClick={() => changeStatus('COMPLETED')}>진료 완료</button>}
        <button className="button button-secondary" disabled={busy} onClick={() => changeStatus('CANCELLED')}>예약 취소</button>
      </>}
      <button className="button button-secondary danger" disabled={busy} onClick={remove}>예약 삭제</button>
    </div>
  </section>
}

export function AppointmentForm({ appointmentId, ownerId, petId, go }) {
  const editing = Boolean(appointmentId)
  const [minimumDate] = useState(() => localDateTime(new Date()).slice(0, 10))
  const [form, setForm] = useState({ hospitalId: '', petId: petId ? String(petId) : '', vetId: '', appointmentDate: '', appointmentHour: '', appointmentMinute: '', reason: '' })
  const [appointment, setAppointment] = useState(null)
  const [hospitals, setHospitals] = useState([])
  const [vets, setVets] = useState([])
  const [pets, setPets] = useState([])
  const [owners, setOwners] = useState([])
  const [ownerQuery, setOwnerQuery] = useState('')
  const [selectedOwnerId, setSelectedOwnerId] = useState(ownerId ? String(ownerId) : '')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [vetSchedule, setVetSchedule] = useState([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleError, setScheduleError] = useState('')
  const [scheduleRetryKey, setScheduleRetryKey] = useState(0)
  const scheduleDate = form.appointmentDate ? (form.appointmentHour === '24' ? nextCalendarDate(form.appointmentDate) : form.appointmentDate) : ''
  const bookedTimes = vetSchedule
    .filter((item) => item.status !== 'CANCELLED' && String(item.id) !== String(appointmentId))
    .map((item) => item.appointmentAt.slice(11, 16))
  const selectedTime = form.appointmentHour && form.appointmentMinute
    ? String(form.appointmentHour === '24' ? 0 : Number(form.appointmentHour)).padStart(2, '0') + ':' + form.appointmentMinute
    : ''

  useEffect(() => {
    Promise.all([clinicApi.listHospitals(), editing ? clinicApi.getAppointment(appointmentId) : Promise.resolve(null)])
      .then(([hospitalList, current]) => {
        setHospitals(hospitalList)
        if (current) {
          setAppointment(current)
          setScheduleLoading(true)
          setForm({
            hospitalId: String(current.hospitalId),
            petId: String(current.petId),
            vetId: String(current.vetId),
            ...appointmentFields(current.appointmentAt),
            reason: current.reason || '',
          })
        }
      })
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false))
  }, [appointmentId, editing])

  useEffect(() => {
    if (!selectedOwnerId) return
    let active = true
    clinicApi.getOwner(selectedOwnerId)
      .then((owner) => {
        if (!active) return
        setOwners((current) => current.some((item) => String(item.id) === String(owner.id)) ? current : [owner, ...current])
        setPets(owner.pets || [])
      })
      .catch((e) => { if (active) setError(errorText(e)) })
    return () => { active = false }
  }, [selectedOwnerId])

  useEffect(() => {
    if (!form.hospitalId) return
    let active = true
    clinicApi.listHospitalVets(form.hospitalId)
      .then((data) => { if (active) setVets(data) })
      .catch((e) => { if (active) setError(errorText(e)) })
    return () => { active = false }
  }, [form.hospitalId])

  useEffect(() => {
    if (!form.vetId || !scheduleDate) return
    let active = true
    clinicApi.listVetAppointments(form.vetId, scheduleDate)
      .then((data) => { if (active) setVetSchedule(data) })
      .catch((e) => { if (active) setScheduleError(errorText(e)) })
      .finally(() => { if (active) setScheduleLoading(false) })
    return () => { active = false }
  }, [form.vetId, scheduleDate, scheduleRetryKey])

  async function searchOwners(event) {
    event.preventDefault()
    setSearching(true); setError('')
    try {
      const result = await clinicApi.listOwners(ownerQuery.trim(), 1, 100)
      setOwners(result.content || [])
      setSelectedOwnerId('')
      setPets([])
      setForm((current) => ({ ...current, petId: '' }))
    } catch (e) { setError(errorText(e)) }
    finally { setSearching(false) }
  }

  function selectOwner(event) {
    const nextOwnerId = event.target.value
    setSelectedOwnerId(nextOwnerId)
    setPets([])
    setForm((current) => ({ ...current, petId: '' }))
  }

  function change(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value, ...(name === 'hospitalId' ? { vetId: '' } : {}) }))
    if (name === 'hospitalId') { setVets([]); setError('') }
    if (['hospitalId', 'vetId', 'appointmentDate'].includes(name) || (name === 'appointmentHour' && (value === '24') !== (form.appointmentHour === '24'))) {
      setVetSchedule([])
      setScheduleError('')
      setScheduleLoading(true)
    }
  }

  async function submit(event) {
    event.preventDefault()
    const hour = Number(form.appointmentHour)
    const minute = Number(form.appointmentMinute)
    if (!form.appointmentDate || !form.appointmentHour || !form.appointmentMinute || hour < 1 || hour > 24 || ![0, 30].includes(minute)) {
      setError('예약 시간은 정각 또는 30분으로 선택하세요.')
      return
    }
    const selectedTime = new Date(form.appointmentDate + 'T00:00:00')
    selectedTime.setDate(selectedTime.getDate() + (hour === 24 ? 1 : 0))
    selectedTime.setHours(hour === 24 ? 0 : hour, minute, 0, 0)
    if (!Number.isFinite(selectedTime.getTime())) { setError('예약 날짜를 다시 선택하세요.'); return }
    if (selectedTime.getTime() + 30 * 60_000 <= Date.now()) {
      setError('현재 진행 중이거나 이후인 30분 예약 시간을 선택하세요.')
      return
    }
    setSaving(true); setError('')
    try {
      const saved = await clinicApi.saveAppointment({
        hospitalId: Number(form.hospitalId),
        petId: Number(form.petId),
        vetId: Number(form.vetId),
        appointmentAt: localDateTime(selectedTime) + ':00',
        reason: form.reason,
      }, appointmentId)
      go('appointment', { appointmentId: saved.id })
    } catch (e) { setError(e.status === 409 ? '같은 시간대에 다른 예약이 먼저 잡혔습니다. 접수 내역을 확인하고 다른 시간을 선택하세요.' : errorText(e)) }
    finally { setSaving(false) }
  }

  const back = () => go(editing ? 'appointment' : 'appointments', editing ? { appointmentId } : {})
  if (loading) return <section className="page narrow"><p className="empty">불러오는 중...</p></section>
  return <section className="page narrow">
    <button className="back-link" onClick={back}>← 돌아가기</button>
    <span className="eyebrow">APPOINTMENT</span><h1>{editing ? '예약 변경' : '새 진료 예약'}</h1>
    <p className="page-intro">병원과 해당 병원 소속 수의사, 반려동물, 예약 일시를 선택하세요.</p>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    {appointment && isClosed(appointment.status) ? <p className="empty">취소되거나 완료된 예약은 변경할 수 없습니다.</p> : <>
      <form className="owner-search-card" onSubmit={searchOwners}>
        <label htmlFor="appointment-owner-search">보호자 이름으로 반려동물 찾기</label>
        <div className="search-row"><input id="appointment-owner-search" value={ownerQuery} onChange={(event) => setOwnerQuery(event.target.value)} placeholder="이름을 입력하거나 비워 두고 조회" /><button className="button button-secondary" type="submit" disabled={searching}>보호자 조회</button></div>
        <label className="field">보호자<select value={selectedOwnerId} onChange={selectOwner}><option value="">선택하세요</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name} (ID {owner.id})</option>)}</select></label>
      </form>
      <form className="form-card" onSubmit={submit}>
        <label className="field">병원<select name="hospitalId" value={form.hospitalId} onChange={change} required><option value="">병원 선택</option>{hospitals.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name}</option>)}</select></label>
        <div className="form-grid">
          <label className="field">반려동물<select name="petId" value={form.petId} onChange={change} required><option value="">반려동물 선택</option>{form.petId && !pets.some((pet) => String(pet.id) === form.petId) && <option value={form.petId}>{appointment?.petName || '선택된 반려동물'} (ID {form.petId})</option>}{pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name} (ID {pet.id})</option>)}</select></label>
          <label className="field">수의사<select name="vetId" value={form.vetId} onChange={change} required disabled={!form.hospitalId}><option value="">수의사 선택</option>{vets.map((vet) => <option key={vet.id} value={vet.id}>{vet.name}</option>)}</select></label>
        </div>
        <div className="appointment-time-grid">
          <label className="field">예약 날짜<input name="appointmentDate" type="date" value={form.appointmentDate} onChange={change} min={minimumDate} required /></label>
          <label className="field">시<select name="appointmentHour" value={form.appointmentHour} onChange={change} required><option value="">시 선택</option>{Array.from({ length: 24 }, (_, index) => index + 1).map((hourOption) => <option key={hourOption} value={hourOption}>{hourOption}시</option>)}</select></label>
          <label className="field">분<select name="appointmentMinute" value={form.appointmentMinute} onChange={change} required><option value="">분 선택</option><option value="00">00분</option><option value="30">30분</option></select></label>
        </div>
        <p className="field-hint">30분 단위로 접수할 수 있습니다. 24시는 선택한 날짜의 다음 날 00시대로 저장됩니다.</p>
        {form.vetId && scheduleDate && <div className="vet-schedule" aria-live="polite">
          <strong>수의사 예약 현황 · {scheduleDate}</strong>
          {scheduleLoading ? <p>예약 현황을 불러오는 중...</p> : scheduleError ? <p className="schedule-error">{scheduleError} <button className="text-link" type="button" onClick={() => { setScheduleError(''); setScheduleLoading(true); setScheduleRetryKey((value) => value + 1) }}>다시 불러오기</button></p> : bookedTimes.length ? <p>이미 예약된 시간: {[...new Set(bookedTimes)].sort().join(', ')}</p> : <p>해당 날짜에 잡힌 예약이 없습니다.</p>}
          {!scheduleLoading && !scheduleError && selectedTime && bookedTimes.includes(selectedTime) && <small className="schedule-error">선택한 시간은 이미 예약되어 있습니다. 다른 시간을 선택하세요.</small>}
        </div>}
        <label className="field">진료 사유 (선택)<textarea name="reason" value={form.reason} onChange={change} maxLength={255} rows="4" /></label>
        <div className="form-actions"><button className="button button-secondary" type="button" onClick={back}>취소</button><button className="button" type="submit" disabled={saving}>{saving ? '저장 중...' : editing ? '변경 저장' : '예약 신청'}</button></div>
      </form>
    </>}
  </section>
}
