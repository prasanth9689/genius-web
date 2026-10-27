import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { applyForJob, formatExperience, formatSalary, getCompanyBySlug, getJobBySlug, getJobs, getRecommendations, readStorage, saveJob, storeSearchHistory, writeStorage } from './services.js'
import { jobs, mockUser } from './data/jobs.js'

describe('job services', () => {
  it('creates 60 stable, individually addressable demo jobs', () => {
    assert.equal(jobs.length, 60)
    assert.equal(new Set(jobs.map((job) => job.id)).size, 60)
    assert.equal(new Set(jobs.map((job) => job.slug)).size, 60)
    assert.equal(getJobBySlug(jobs[0].slug).id, jobs[0].id)
  })

  it('filters by keyword, location, and work mode', () => {
    const results = getJobs({ q: 'Android', location: 'Chennai', workMode: 'Hybrid' })
    assert.ok(results.length > 0)
    assert.ok(results.every((job) => job.title.includes('Android') && job.location.city === 'Chennai' && job.workMode === 'Hybrid'))
    assert.ok(getJobs({ company: 'TechNova Solutions' }).every((job) => job.companyName === 'TechNova Solutions'))
    assert.equal(getCompanyBySlug('technova-solutions').name, 'TechNova Solutions')
  })

  it('formats salary visibility and experience', () => {
    assert.equal(formatSalary({ min: 8, max: 12, visible: true }), '₹8–12 LPA')
    assert.equal(formatSalary({ visible: false }), 'Salary not disclosed')
    assert.equal(formatExperience({ min: 3, max: 5 }), '3–5 years')
  })

  it('calculates recommendation scores from profile preferences', () => {
    const recommended = getRecommendations(mockUser)
    assert.equal(recommended.length, 60)
    assert.ok(recommended[0].score >= recommended.at(-1).score)
    assert.ok(recommended.every(({ score }) => score >= 0 && score <= 99))
  })

  it('reads and writes local storage values', () => {
    const values = new Map()
    globalThis.localStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    }
    writeStorage('test-key', ['JOB1001'])
    assert.deepEqual(readStorage('test-key', []), ['JOB1001'])
    assert.deepEqual(saveJob('JOB1001', []), ['JOB1001'])
    assert.equal(readStorage('genius-saved-jobs', [])[0], 'JOB1001')
    assert.equal(applyForJob('JOB1001', 'candidate.pdf', [])[0].status, 'Applied')
    assert.equal(readStorage('genius-applications', [])[0].resume, 'candidate.pdf')
    assert.deepEqual(storeSearchHistory('React developer', ['Chennai', 'react developer']), ['React developer', 'Chennai'])
    assert.equal(readStorage('genius-search-history', [])[0], 'React developer')
    delete globalThis.localStorage
  })
})
