import api from '@/services/api'

const SPECIALTY_ALIASES = [
  { match: /(cardio|heart|chest pain|hypertension)/i, specialty: 'Cardiology' },
  { match: /(derm|skin|rash|eczema|acne)/i, specialty: 'Dermatology' },
  { match: /(endocr|diabetes|thyroid|hormone)/i, specialty: 'Endocrinology' },
  { match: /(gastro|stomach|digest|abdomen|nausea|vomit)/i, specialty: 'Gastroenterology' },
  { match: /(general|physician|primary care|family medicine|doctor)/i, specialty: 'General Practice' },
  { match: /(neuro|headache|migraine|seizure|stroke|numb)/i, specialty: 'Neurology' },
  { match: /(obstetric|gynec|pregnan|women|menstrual)/i, specialty: 'Obstetrics & Gynecology' },
  { match: /(onco|cancer|tumor|tumour)/i, specialty: 'Oncology' },
  { match: /(ophthal|eye|vision|blurred sight|blurry vision)/i, specialty: 'Ophthalmology' },
  { match: /(ortho|bone|joint|fracture|sprain|back pain)/i, specialty: 'Orthopedics' },
  { match: /(pedi|child|infant|baby|toddler)/i, specialty: 'Pediatrics' },
  { match: /(psychi|mental|anxiety|depress|panic|sleep)/i, specialty: 'Psychiatry' },
  { match: /(pulmon|lung|asthma|cough|breath|respir)/i, specialty: 'Pulmonology' },
  { match: /(radiol|imaging|scan|x-ray|mri|ct)/i, specialty: 'Radiology' },
  { match: /(uro|urinary|kidney|bladder|prostate)/i, specialty: 'Urology' },
]

export function resolveDoctorSpecialty(value) {
  const normalized = String(value || '').trim()
  if (!normalized) {
    return 'General Practice'
  }

  const exactMatch = SPECIALTY_ALIASES.find(({ specialty }) => specialty.toLowerCase() === normalized.toLowerCase())
  if (exactMatch) {
    return exactMatch.specialty
  }

  const aliasMatch = SPECIALTY_ALIASES.find(({ match }) => match.test(normalized))
  if (aliasMatch) {
    return aliasMatch.specialty
  }

  return normalized
}

export async function fetchDoctorsBySpecialty(specialty) {
  const params = specialty ? { specialty } : undefined
  const response = await api.get('/doctors/doctors', { params })
  return Array.isArray(response.data) ? response.data : []
}

export async function fetchAllDoctors() {
  const response = await api.get('/doctors/doctors')
  return Array.isArray(response.data) ? response.data : []
}

export function mapDoctorsForAi(doctors = []) {
  if (!Array.isArray(doctors)) return []

  return doctors
    .filter((doctor) => doctor?.id && doctor?.specialty)
    .map((doctor) => ({
      id: String(doctor.id),
      fullName: String(doctor.fullName || ''),
      specialty: String(doctor.specialty || ''),
    }))
}