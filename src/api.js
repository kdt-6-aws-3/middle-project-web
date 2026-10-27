const id = (value) => encodeURIComponent(String(value))
const petPath = (ownerId, petId) => '/owners/' + id(ownerId) + '/pets/' + id(petId)
const appointmentPath = (appointmentId) => '/appointments/' + id(appointmentId)

async function request(path, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch('/api' + path, {
      method,
      headers: {
        Accept: 'application/json, application/problem+json',
        'Accept-Language': 'ko',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch {
    throw new Error('API 서버에 연결할 수 없습니다. WAS와 /api 프록시 설정을 확인하세요.')
  }

  const raw = await response.text()
  let data = null
  if (raw) {
    try { data = JSON.parse(raw) }
    catch {
      if (response.ok) throw new Error('API 응답을 JSON으로 읽을 수 없습니다.')
    }
  }

  if (!response.ok) {
    const fieldErrors = Array.isArray(data?.errors)
      ? data.errors.map((item) => item.message).filter(Boolean).join('\n')
      : ''
    const error = new Error(fieldErrors || data?.detail || data?.title || 'API 요청이 실패했습니다. (HTTP ' + response.status + ')')
    error.status = response.status
    throw error
  }
  return data
}

export const clinicApi = {
  listOwners(name = '', page = 1, size = 5) {
    const query = new URLSearchParams({ name, page: String(page), size: String(size) })
    return request('/owners?' + query)
  },
  getOwner(ownerId) { return request('/owners/' + id(ownerId)) },
  saveOwner(input, ownerId) {
    return request(ownerId ? '/owners/' + id(ownerId) : '/owners', {
      method: ownerId ? 'PUT' : 'POST', body: input,
    })
  },
  deleteOwner(ownerId) { return request('/owners/' + id(ownerId), { method: 'DELETE' }) },
  listPetTypes() { return request('/pettypes') },
  getPet(ownerId, petId) { return request(petPath(ownerId, petId)) },
  savePet(ownerId, input, petId) {
    return request(petId ? petPath(ownerId, petId) : '/owners/' + id(ownerId) + '/pets', {
      method: petId ? 'PUT' : 'POST', body: input,
    })
  },
  deletePet(ownerId, petId) { return request(petPath(ownerId, petId), { method: 'DELETE' }) },
  listVisits(ownerId, petId) { return request(petPath(ownerId, petId) + '/visits') },
  saveVisit(ownerId, petId, input, visitId) {
    return request(petPath(ownerId, petId) + '/visits' + (visitId ? '/' + id(visitId) : ''), {
      method: visitId ? 'PUT' : 'POST', body: input,
    })
  },
  deleteVisit(ownerId, petId, visitId) { return request(petPath(ownerId, petId) + '/visits/' + id(visitId), { method: 'DELETE' }) },
  listHospitals() { return request('/hospitals') },
  getHospital(hospitalId) { return request('/hospitals/' + id(hospitalId)) },
  listHospitalVets(hospitalId) { return request('/hospitals/' + id(hospitalId) + '/vets') },
  listVets(page = 1, size = 20) {
    const query = new URLSearchParams({ page: String(page), size: String(size) })
    return request('/vets?' + query)
  },
  async listAllVets() {
    const first = await this.listVets(1, 100)
    const remaining = await Promise.all(
      Array.from({ length: first.totalPages - 1 }, (_, index) => this.listVets(index + 2, 100))
    )
    return [first, ...remaining].flatMap((result) => result.content)
  },
  listVetAppointments(vetId, date) {
    const query = new URLSearchParams({ date })
    return request('/vets/' + id(vetId) + '/appointments?' + query)
  },
  listAppointments(filters = {}, page = 1, size = 20) {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) {
      if (value !== '' && value !== undefined && value !== null) query.set(key, String(value))
    }
    query.set('page', String(page))
    query.set('size', String(size))
    return request('/appointments?' + query)
  },
  getAppointment(appointmentId) { return request(appointmentPath(appointmentId)) },
  saveAppointment(input, appointmentId) {
    return request(appointmentId ? appointmentPath(appointmentId) : '/appointments', {
      method: appointmentId ? 'PUT' : 'POST', body: input,
    })
  },
  updateAppointmentStatus(appointmentId, status) {
    return request(appointmentPath(appointmentId) + '/status', { method: 'PATCH', body: { status } })
  },
  deleteAppointment(appointmentId) { return request(appointmentPath(appointmentId), { method: 'DELETE' }) },
}
