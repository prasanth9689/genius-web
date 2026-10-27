import { companiesData, jobs } from './data/jobs.js'

export function getJobs(filters = {}) {
  const query = (filters.q || '').trim().toLowerCase()
  const location = (filters.location || '').trim().toLowerCase()
  const skills = (filters.skills || '').trim().toLowerCase()
  const filtered = jobs.filter((job) => {
    const searchable = `${job.title} ${job.companyName} ${job.skills.join(' ')}`.toLowerCase()
    const jobLocation = `${job.location.city} ${job.location.area}`.toLowerCase()
    const postedAge = Math.max(0, 27 - Number(job.postedAt.slice(8, 10)))
    const experience = Number(filters.experience)
    const experienceMatch = !filters.experience ||
      (experience === 0 && job.experience.min === 0) ||
      (experience === 1 && job.experience.max >= 1 && job.experience.min <= 2) ||
      (experience === 3 && job.experience.max >= 3 && job.experience.min <= 5) ||
      (experience === 5 && job.experience.max >= 5 && job.experience.min <= 8) ||
      (experience === 6 && job.experience.max >= 6 && job.experience.min <= 10)
    return (!query || searchable.includes(query)) &&
      (!location || jobLocation.includes(location)) &&
      (!filters.company || job.companyName === filters.company) &&
      (!filters.industry || job.industry === filters.industry) &&
      (!filters.workMode || job.workMode === filters.workMode) &&
      (!filters.employmentType || job.employmentType === filters.employmentType) &&
      experienceMatch &&
      (!filters.salary || !job.salary.visible || job.salary.min >= Number(filters.salary)) &&
      (!skills || job.skills.some((skill) => skill.toLowerCase().includes(skills))) &&
      (!filters.posted || (filters.posted === 'week' ? postedAge <= 7 : postedAge <= 30))
  })
  const sorters = {
    recent: (a, b) => b.postedAt.localeCompare(a.postedAt) || a.id.localeCompare(b.id),
    relevance: (a, b) => {
      if (!query) return b.postedAt.localeCompare(a.postedAt) || a.id.localeCompare(b.id)
      const score = (job) => (job.title.toLowerCase().includes(query) ? 3 : 0) +
        (job.companyName.toLowerCase().includes(query) ? 2 : 0) +
        (job.skills.some((skill) => skill.toLowerCase().includes(query)) ? 1 : 0)
      return score(b) - score(a) || b.postedAt.localeCompare(a.postedAt)
    },
    salaryHigh: (a, b) => (b.salary.max || 0) - (a.salary.max || 0),
    salaryLow: (a, b) => (a.salary.min || 0) - (b.salary.min || 0),
    experience: (a, b) => a.experience.min - b.experience.min,
  }
  return [...filtered].sort(sorters[filters.sort] || sorters.recent)
}

export const getJobBySlug = (slug) => jobs.find((job) => job.slug === slug)
export const getCompanyBySlug = (slug) => companiesData.find((company) => company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === slug)

export function getCompanies(filters = {}) {
  const query = (filters.q || '').trim().toLowerCase()
  return companiesData.filter((company) => !query || `${company.name} ${company.industry} ${company.headquarters}`.toLowerCase().includes(query))
}

export function getRecommendations(profile) {
  return jobs.map((job) => {
    const skills = job.skills.filter((skill) => profile.skills.some((item) => item.toLowerCase() === skill.toLowerCase())).length
    const skillScore = (skills / Math.max(1, job.skills.length)) * 45
    const titleScore = profile.preferredTitles.some((title) => job.title.toLowerCase().includes(title.toLowerCase()) || title.toLowerCase().includes(job.title.replace(/^(product|senior|platform|associate|lead) /i, '').toLowerCase())) ? 25 : 0
    const locationScore = profile.preferredCities.includes(job.location.city) ? 20 : 0
    const experienceScore = profile.experience >= job.experience.min && profile.experience <= job.experience.max ? 10 : 0
    return { job, score: Math.min(99, Math.round(skillScore + titleScore + locationScore + experienceScore)) }
  }).sort((a, b) => b.score - a.score || a.job.id.localeCompare(b.job.id))
}

export const getRecommendedJobs = getRecommendations

export function saveJob(jobId, savedIds = readStorage('genius-saved-jobs', [])) {
  if (!jobs.some((job) => job.id === jobId)) throw new Error(`Cannot save unknown job ${jobId}.`)
  const next = savedIds.includes(jobId) ? savedIds : [...savedIds, jobId]
  writeStorage('genius-saved-jobs', next)
  return next
}

export function unsaveJob(jobId, savedIds = readStorage('genius-saved-jobs', [])) {
  const next = savedIds.filter((id) => id !== jobId)
  writeStorage('genius-saved-jobs', next)
  return next
}

export function applyForJob(jobId, resume, existing = readStorage('genius-applications', [])) {
  if (!jobs.some((job) => job.id === jobId)) throw new Error(`Cannot apply to unknown job ${jobId}.`)
  const application = { id: `APP-${jobId}`, jobId, resume, status: 'Applied', appliedAt: new Date().toISOString() }
  const next = [application, ...existing.filter((item) => item.jobId !== jobId)]
  writeStorage('genius-applications', next)
  return next
}

export function storeSearchHistory(term, history = readStorage('genius-search-history', [])) {
  const normalized = term.trim()
  if (!normalized) return history
  const next = [normalized, ...history.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 8)
  writeStorage('genius-search-history', next)
  return next
}

export function formatSalary(salary) {
  if (!salary?.visible) return 'Salary not disclosed'
  return `₹${salary.min}–${salary.max} LPA`
}

export function formatExperience(experience) {
  if (experience.min === 0) return 'Fresher'
  return `${experience.min}–${experience.max} years`
}

export function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch (error) {
    console.error(`Unable to read ${key} from local storage.`, error)
    return fallback
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Unable to save ${key} to local storage.`, error)
    throw error
  }
}
