const id = (value) => encodeURIComponent(String(value))
const petPath = (ownerId, petId) => '/owners/' + id(ownerId) + '/pets/' + id(petId)

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
    throw new Error(fieldErrors || data?.detail || data?.title || 'API 요청이 실패했습니다. (HTTP ' + response.status + ')')
  }
  return data
}

export const clinicApi = {
  listOwners(lastName = '', page = 1, size = 5) {
    const query = new URLSearchParams({ lastName, page: String(page), size: String(size) })
    return request('/owners?' + query)
  },
  getOwner(ownerId) { return request('/owners/' + id(ownerId)) },
  saveOwner(input, ownerId) {
    return request(ownerId ? '/owners/' + id(ownerId) : '/owners', {
      method: ownerId ? 'PUT' : 'POST', body: input,
    })
  },
  listPetTypes() { return request('/pettypes') },
  getPet(ownerId, petId) { return request(petPath(ownerId, petId)) },
  savePet(ownerId, input, petId) {
    return request(petId ? petPath(ownerId, petId) : '/owners/' + id(ownerId) + '/pets', {
      method: petId ? 'PUT' : 'POST', body: input,
    })
  },
  listVisits(ownerId, petId) { return request(petPath(ownerId, petId) + '/visits') },
  addVisit(ownerId, petId, input) {
    return request(petPath(ownerId, petId) + '/visits', { method: 'POST', body: input })
  },
  listVets() { return request('/vets') },
}
