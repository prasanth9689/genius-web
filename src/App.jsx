import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  ArrowDown, ArrowLeft, ArrowRight, Bell, Bookmark, BriefcaseBusiness, Building2,
  Check, CheckCircle2, ChevronDown, CircleHelp, Clock3,
  Command, Compass, FileText, Filter, Globe2, LayoutDashboard,
  MapPin, Moon, MoreHorizontal, Search, Send, Settings, Share2, ShieldCheck,
  SlidersHorizontal, Sparkles, Sun, Users, X, Zap,
} from 'lucide-react'
import {
  Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate,
  useParams, useSearchParams,
} from 'react-router-dom'
import { companiesData, jobs, mockUser } from './data/jobs'
import { applyForJob, formatExperience, formatSalary, getJobBySlug, getJobs, getRecommendations, readStorage, saveJob, storeSearchHistory, unsaveJob, writeStorage } from './services'
import './App.css'

const AppContext = createContext(null)
const useApp = () => useContext(AppContext)
const brandName = import.meta.env.VITE_BRAND_NAME || 'Genius Jobs'
const searchSuggestions = [...new Set(jobs.flatMap((job) => [job.title, job.companyName, ...job.skills]))]

function BrandText({ compact = false }) {
  const [first, ...rest] = brandName.trim().split(/\s+/)
  return <span>{first?.toLowerCase()}<span className="brand-light">{rest.join('').toLowerCase()}</span>{!compact && <small>CAREER STUDIO</small>}</span>
}

const navItems = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Find jobs', to: '/jobs', icon: Search },
  { label: 'For you', to: '/recommended', icon: Sparkles, badge: '12' },
  { label: 'Saved jobs', to: '/saved-jobs', icon: Bookmark, count: 'saved' },
  { label: 'Applications', to: '/applications', icon: BriefcaseBusiness, count: 'applications' },
  { label: 'Job alerts', to: '/job-alerts', icon: Bell },
]

function App() {
  const [savedIds, setSavedIds] = useState(() => readStorage('genius-saved-jobs', []))
  const [applications, setApplications] = useState(() => readStorage('genius-applications', []))
  const [searchHistory, setSearchHistory] = useState(() => readStorage('genius-search-history', []))
  const [alerts, setAlerts] = useState(() => readStorage('genius-alerts', []))
  const [profile, setProfile] = useState(() => readStorage('genius-profile', mockUser))
  const [theme, setTheme] = useState(() => readStorage('genius-theme', window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  const [toast, setToast] = useState('')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    writeStorage('genius-theme', theme)
  }, [theme])
  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const persist = (key, setter, value) => {
    setter(value)
    writeStorage(key, value)
  }
  const toggleSaved = (id) => {
    const next = savedIds.includes(id) ? unsaveJob(id, savedIds) : saveJob(id, savedIds)
    setSavedIds(next)
    setToast(savedIds.includes(id) ? 'Job removed from saved' : 'Job saved to your list')
  }
  const submitApplication = (job, resume) => {
    const next = applyForJob(job.id, resume, applications)
    setApplications(next)
    setToast('Demo application recorded')
  }
  const recordSearch = (term) => setSearchHistory(storeSearchHistory(term, searchHistory))
  const value = {
    savedIds, applications, searchHistory, alerts, profile, theme, setTheme, toast, setToast, recordSearch,
    toggleSaved, submitApplication,
    updateApplicationStatus: (id, status) => persist('genius-applications', setApplications, applications.map((application) => application.id === id ? { ...application, status } : application)),
    clearDemoActivity: () => {
      persist('genius-saved-jobs', setSavedIds, [])
      persist('genius-applications', setApplications, [])
      persist('genius-alerts', setAlerts, [])
      persist('genius-search-history', setSearchHistory, [])
    },
    updateProfile: (next) => persist('genius-profile', setProfile, next),
    updateAlerts: (next) => persist('genius-alerts', setAlerts, next),
  }

  return (
    <AppContext.Provider value={value}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/jobs" replace />} />
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:jobSlug" element={<JobsPage />} />
          <Route path="/recommended" element={<RecommendedPage />} />
          <Route path="/saved-jobs" element={<SavedJobsPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/applications/:applicationId" element={<ApplicationDetailPage />} />
          <Route path="/job-alerts" element={<AlertsPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/companies/:companySlug" element={<CompanyPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/resume" element={<ResumePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      {toast && <div role="status" className="toast"><CheckCircle2 size={18} />{toast}</div>}
    </AppContext.Provider>
  )
}

function AppShell() {
  const { theme, setTheme, savedIds, applications, searchHistory, recordSearch } = useApp()
  const location = useLocation()
  const [profileMenu, setProfileMenu] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const [globalQuery, setGlobalQuery] = useState('')
  const navigate = useNavigate()
  const isMobileDetail = /^\/jobs\/[^/]+/.test(location.pathname)
  const isPublic = location.pathname === '/login' || location.pathname === '/register'
  const routeJob = getJobBySlug(location.pathname.split('/')[2])
  const routeCompany = companiesData.find((company) => companySlug(company.name) === location.pathname.split('/')[2])
  const routeApplication = applications.find((application) => application.id === location.pathname.split('/')[2])
  const applicationJob = jobs.find((job) => job.id === routeApplication?.jobId)
  const pageTitle = routeJob ? `${routeJob.title} at ${routeJob.companyName} | ${brandName}` : ({
    '/': `${brandName} — Good work. Better futures.`,
    '/dashboard': `Overview | ${brandName}`,
    '/jobs': `Find jobs | ${brandName}`,
    '/recommended': `Recommended roles | ${brandName}`,
    '/saved-jobs': `Saved jobs | ${brandName}`,
    '/applications': `Applications | ${brandName}`,
    '/job-alerts': `Job alerts | ${brandName}`,
    '/companies': `Companies | ${brandName}`,
    '/profile': `Your profile | ${brandName}`,
    '/profile/resume': `Resume library | ${brandName}`,
    '/settings': `Settings | ${brandName}`,
    '/login': `Sign in | ${brandName}`,
    '/register': `Create account | ${brandName}`,
  }[location.pathname] || (routeCompany ? `${routeCompany.name} | ${brandName}` : applicationJob ? `${applicationJob.title} application | ${brandName}` : `Page not found | ${brandName}`))
  useEffect(() => {
    document.title = pageTitle
    const description = document.querySelector('meta[name="description"]')
    if (description) description.setAttribute('content', routeJob ? `${routeJob.title} at ${routeJob.companyName}, ${routeJob.location.city}. Demo job listing on ${brandName}.` : routeCompany ? `Explore roles and learn about ${routeCompany.name} on ${brandName}.` : `Explore thoughtful career opportunities with ${brandName}.`)
    const robots = document.querySelector('meta[name="robots"]')
    if (robots) robots.setAttribute('content', 'noindex, nofollow')
  }, [pageTitle, routeJob, routeCompany])
  const mobileSearch = (event) => {
    event.preventDefault()
    const query = globalQuery.trim()
    recordSearch(query)
    navigate(`/jobs${query ? `?q=${encodeURIComponent(query)}` : ''}`)
    setGlobalQuery('')
  }

  return (
    <div className={`app-shell ${isPublic ? 'public-shell' : ''}`}>
      <header className="topbar">
        <Link className="brand" to="/jobs" aria-label="Genius Jobs home">
          <span className="brand-mark"><Command size={17} strokeWidth={2.5} /></span>
          <BrandText />
        </Link>
        <form className="global-search" onSubmit={mobileSearch}>
          <Search size={17} />
          <input aria-label="Search jobs" list="job-suggestions" value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} placeholder="Search roles, skills, companies..." />
          <kbd>⌘ K</kbd>
        </form>
        <datalist id="job-suggestions">{[...new Set([...searchSuggestions, ...searchHistory])].map((suggestion) => <option value={suggestion} key={suggestion} />)}</datalist>
        <div className="topbar-actions">
          <button className="icon-button theme-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          <div className="popover-wrap">
            <button className="icon-button notification-button" aria-label="Notifications" aria-expanded={notifications} onClick={() => { setNotifications(!notifications); setProfileMenu(false) }}><Bell size={18} /><i /></button>
            {notifications && <div className="popover notification-popover"><strong>You’re all caught up</strong><p>New job alerts and application updates will show up here.</p><Link to="/job-alerts" onClick={() => setNotifications(false)}>Manage alerts <ArrowRight size={14} /></Link></div>}
          </div>
          <div className="popover-wrap">
            <button className="profile-trigger" onClick={() => { setProfileMenu(!profileMenu); setNotifications(false) }} aria-expanded={profileMenu}>
              <span className="avatar">PS</span><span className="profile-trigger-name">Priya Sharma</span><ChevronDown size={15} />
            </button>
            {profileMenu && <div className="popover profile-popover">
              <div className="popover-user"><span className="avatar">PS</span><span><strong>Priya Sharma</strong><small>Candidate account</small></span></div>
              <Link to="/profile" onClick={() => setProfileMenu(false)}><Users size={15} />My profile</Link>
              <Link to="/profile/resume" onClick={() => setProfileMenu(false)}><FileText size={15} />Resume library</Link>
              <Link to="/settings" onClick={() => setProfileMenu(false)}><Settings size={15} />Account settings</Link>
              <button onClick={() => { setProfileMenu(false); navigate('/login') }}>Sign out <ArrowRight size={15} /></button>
            </div>}
          </div>
        </div>
      </header>
      {!isPublic && <nav className="primary-nav" aria-label="Main navigation">
        <div className="primary-nav-group" aria-label="Workspace">
          {navItems.map(({ label, to, icon: Icon, badge, count }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {badge && <small className="nav-badge">{badge}</small>}
              {count && <small className="nav-count">{count === 'saved' ? savedIds.length : applications.length}</small>}
            </NavLink>
          ))}
        </div>
        <div className="primary-nav-group primary-nav-discover" aria-label="Discover">
          <NavLink to="/companies" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Building2 size={18} /><span>Companies</span></NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Settings size={18} /><span>Settings</span></NavLink>
        </div>
      </nav>}
      <div className="workspace">
        <main className={`main-content ${isMobileDetail ? 'mobile-detail-route' : ''}`} key={`${location.pathname}${location.search}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>
}

function SearchHero({ compact = false }) {
  const { recordSearch } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [experience, setExperience] = useState('')
  const submit = (event) => {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (location.trim()) params.set('location', location.trim())
    if (experience) params.set('experience', experience)
    recordSearch([query.trim(), location.trim()].filter(Boolean).join(' in '))
    navigate(`/jobs${params.size ? `?${params}` : ''}`)
  }
  return <form className={`search-panel ${compact ? 'search-panel-compact' : ''}`} onSubmit={submit}>
    <label className="search-field query-field"><Search size={19} /><span><small>WHAT ARE YOU LOOKING FOR?</small><input list="job-suggestions" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Job title, skills, or company" /></span></label>
    <label className="search-field experience-field"><BriefcaseBusiness size={18} /><span><small>EXPERIENCE</small><select value={experience} onChange={(event) => setExperience(event.target.value)}><option value="">Any experience</option><option value="0">Fresher</option><option value="1">1–2 years</option><option value="3">3–5 years</option><option value="5">5–8 years</option><option value="6">6–10 years</option></select></span><ChevronDown className="select-chevron" size={15} /></label>
    <label className="search-field location-field"><MapPin size={18} /><span><small>WHERE?</small><input list="city-options" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City, area, or remote" /></span><datalist id="city-options"><option>Chennai</option><option>Bengaluru</option><option>Hyderabad</option><option>Pune</option><option>Mumbai</option><option>Delhi NCR</option><option>Coimbatore</option><option>Remote</option></datalist></label>
    <button className="button button-primary search-submit" type="submit"><Search size={17} /> Find jobs</button>
  </form>
}

function LandingPage() {
  return <div className="landing-page">
    <section className="landing-hero">
      <div className="hero-grid-pattern" />
      <div className="hero-copy"><div className="hero-kicker"><span className="live-dot" /> A better way to find your next role</div>
        <h1>Good work.<br /><span>Better futures.</span></h1>
        <p>Find meaningful work with teams building what’s next. Your next chapter starts with a search.</p>
        <SearchHero />
        <div className="hero-proof"><div className="avatar-stack"><span>AS</span><span>MK</span><span>RD</span><b>+</b></div><span><strong>2,400+</strong> professionals exploring new roles</span><span className="proof-divider" /><span><ShieldCheck size={16} /> Curated, verified opportunities</span></div>
      </div>
      <div className="hero-art" aria-hidden="true"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-card art-note"><span className="art-check"><Check size={16} /></span><span><b>A great fit</b><small>Role matched to your strengths</small></span></div><div className="art-card art-profile"><span className="art-avatar">PS</span><span><b>Your next chapter</b><small>Product & technology roles</small></span><span className="match-pill">92% match</span></div><div className="art-card art-mini"><span className="mini-logo">n</span><span><b>Product Engineer</b><small>Northstar Labs · Hybrid</small></span><Bookmark size={16} /></div><div className="art-center"><div className="center-spark"><Sparkles size={38} /></div><span>make room<br />for what’s next</span></div></div>
    </section>
    <section className="proof-strip"><span>FEATURED TEAMS</span>{companiesData.slice(0, 4).map((company) => <Link to={`/companies/${companySlug(company.name)}`} key={company.id}><span className="proof-icon" style={{ color: company.color }}>{company.name.slice(0, 1)}</span>{company.name}</Link>)}</section>
    <section className="landing-section">
      <div className="section-title-row"><div><div className="eyebrow">A GOOD PLACE TO START</div><h2>Find work that fits your life.</h2><p>Explore opportunities across the roles people are excited about.</p></div><Link className="text-link" to="/jobs">Browse all jobs <ArrowRight size={16} /></Link></div>
      <div className="category-grid">{[{ icon: BriefcaseBusiness, title: 'Engineering', query: 'Developer' }, { icon: Sparkles, title: 'Product & design', query: 'Designer' }, { icon: Search, title: 'Data & analytics', query: 'Data Analyst' }, { icon: Globe2, title: 'Cloud & operations', query: 'DevOps' }].map(({ icon: Icon, title, query }) => <Link className="category-card" to={`/jobs?q=${encodeURIComponent(query)}`} key={title}><span className="category-icon"><Icon size={16} /></span><strong>{title}</strong><small>{getJobs({ q: query }).length} demo roles</small><ArrowRight size={16} /></Link>)}</div>
    </section>
    <BrowseCities />
    <FeaturedJobs />
    <RecentRemoteJobs />
    <CandidateBenefits />
    <section className="landing-cta"><div className="cta-mark"><Sparkles size={22} /></div><div><div className="eyebrow">YOUR NEXT CHAPTER</div><h2>Make your next move a good one.</h2><p>Explore the jobs, teams, and opportunities waiting for you.</p></div><Link className="button button-light" to="/jobs">Explore opportunities <ArrowRight size={16} /></Link></section>
    <section className="recruiter-cta"><span className="recruiter-icon"><Building2 size={20} /></span><div><span className="eyebrow">HIRING A GREAT TEAM?</span><h2>Meet people who care about the work.</h2><p>Discover the fictional teams and opportunities featured in this demo.</p></div><Link className="button button-secondary" to="/companies">Explore companies <ArrowRight size={15} /></Link></section>
    <footer className="site-footer"><Link className="brand" to="/"><span className="brand-mark"><Command size={17} /></span><BrandText /></Link><span>A more thoughtful way to find what’s next.</span><span>© 2026 {brandName} · Demo experience</span></footer>
  </div>
}

function FeaturedJobs() {
  return <section className="landing-section featured-section"><div className="section-title-row"><div><div className="eyebrow">HAND-PICKED FOR YOU</div><h2>Roles worth a closer look.</h2><p>Fresh opportunities from fictional, demo employers.</p></div><Link className="text-link" to="/jobs">See all roles <ArrowRight size={16} /></Link></div><div className="featured-jobs-grid">{jobs.filter((job) => job.isFeatured).slice(0, 3).map((job) => <JobCard key={job.id} job={job} compact />)}</div></section>
}

function BrowseCities() {
  const cities = [...new Set(jobs.map((job) => job.location.city))]
  return <section className="cities-section"><div><div className="eyebrow">WHERE WOULD YOU LIKE TO WORK?</div><h2>Good work, close to home.</h2><p>Explore demo listings by location or try a remote role.</p></div><div className="city-chips">{cities.map((city) => <Link to={`/jobs?location=${encodeURIComponent(city)}`} key={city}><MapPin size={13} />{city}<span>{jobs.filter((job) => job.location.city === city).length}</span></Link>)}</div></section>
}

function RecentRemoteJobs() {
  const recent = [...jobs].sort((a, b) => b.postedAt.localeCompare(a.postedAt)).slice(0, 3)
  const remote = jobs.filter((job) => job.workMode === 'Remote').slice(0, 3)
  return <section className="landing-section discovery-jobs"><div className="discovery-job-block"><div className="section-title-row"><div><div className="eyebrow">JUST ADDED</div><h2>Recently posted.</h2><p>New possibilities, all from demo employers.</p></div><Link className="text-link" to="/jobs?sort=recent">Explore <ArrowRight size={15} /></Link></div><div className="discovery-job-list">{recent.map((job) => <JobCard key={job.id} job={job} compact />)}</div></div><div className="discovery-job-block"><div className="section-title-row"><div><div className="eyebrow">WORK FROM ANYWHERE</div><h2>Remote, by design.</h2><p>Flexible roles made for focus and freedom.</p></div><Link className="text-link" to="/jobs?workMode=Remote">Explore <ArrowRight size={15} /></Link></div><div className="discovery-job-list">{remote.map((job) => <JobCard key={job.id} job={job} compact />)}</div></div></section>
}

function CandidateBenefits() {
  const benefits = [
    { icon: Sparkles, title: 'Search that feels like yours', copy: 'Keep your goals, skills, and preferred places close to every search.' },
    { icon: ShieldCheck, title: 'Clear, thoughtful details', copy: 'Compare the work, team, location, and expectations before you apply.' },
    { icon: Clock3, title: 'Your momentum, in one place', copy: 'Save interesting roles and keep your demo application activity organized.' },
  ]
  return <section className="candidate-benefits"><div className="eyebrow">A LITTLE MORE CLARITY, A LOT MORE YOU</div><h2>A calmer way to move forward.</h2><p>Job searching is a big enough job. Your tools should make it feel lighter.</p><div className="benefit-grid">{benefits.map(({ icon: Icon, title, copy }) => <article key={title}><span><Icon size={18} /></span><strong>{title}</strong><p>{copy}</p></article>)}</div></section>
}

function DashboardPage() {
  const { savedIds, applications, profile } = useApp()
  const recommendations = getRecommendations(profile).slice(0, 3)
  const stats = [
    { label: 'Good-fit roles', value: recommendations.length + 9, detail: 'picked for your profile', icon: Sparkles, to: '/recommended', tone: 'violet' },
    { label: 'Saved for later', value: savedIds.length, detail: 'roles on your shortlist', icon: Bookmark, to: '/saved-jobs', tone: 'blue' },
    { label: 'Applications', value: applications.length, detail: 'your recent activity', icon: Send, to: '/applications', tone: 'green' },
    { label: 'Interviews', value: applications.filter((application) => application.status === 'Interview Scheduled').length, detail: 'in your calendar', icon: Users, to: '/applications', tone: 'amber' },
    { label: 'Profile strength', value: '78%', detail: 'add a few more details', icon: Users, to: '/profile', tone: 'amber' },
  ]
  return <div className="page-wrap dashboard-page">
    <div className="dashboard-welcome"><div><div className="eyebrow">TUESDAY, OCTOBER 27, 2026</div><h1>Good afternoon, {profile.name.split(' ')[0]} <span className="wave">✦</span></h1><p>A little progress today can open up something great tomorrow.</p></div><Link className="button button-primary" to="/jobs"><Search size={17} /> Explore jobs</Link></div>
    <div className="dashboard-banner"><div className="banner-decoration"><Sparkles size={84} /></div><div><span className="banner-label"><Zap size={14} /> YOUR NEXT MOVE</span><h2>One thoughtful search can change everything.</h2><p>We found roles that line up with your experience and what you want to do next.</p><Link to="/recommended">See your recommendations <ArrowRight size={16} /></Link></div><div className="banner-metric"><span>92%</span><small>profile match</small><div className="metric-ring" /></div></div>
    <div className="stats-grid">{stats.map(({ label, value, detail, icon: Icon, to, tone }) => <Link className="stat-card" to={to} key={label}><span className={`stat-icon ${tone}`}><Icon size={18} /></span><span className="stat-value">{value}</span><strong>{label}</strong><small>{detail}</small><ArrowRight className="stat-arrow" size={16} /></Link>)}</div>
    <div className="dashboard-columns"><section className="dashboard-panel"><div className="panel-heading"><div><h2>Picked for you</h2><p>Based on your skills and preferences</p></div><Link to="/recommended">View all <ArrowRight size={15} /></Link></div><div className="recommendation-mini-list">{recommendations.map(({ job, score }) => <div className="recommendation-mini" key={job.id}><CompanyMark job={job} /><div className="mini-job-copy"><Link to={`/jobs/${job.slug}`}>{job.title}</Link><span>{job.companyName} · {job.location.city}</span></div><span className="score-pill">{score}%</span></div>)}</div></section>
      <section className="dashboard-panel activity-panel"><div className="panel-heading"><div><h2>Application activity</h2><p>Your search, at a glance</p></div><Link to="/applications">Track <ArrowRight size={15} /></Link></div>{applications.length ? <div className="recommendation-mini-list">{applications.slice(0, 3).map((application) => { const job = jobs.find((item) => item.id === application.jobId); return job && <div className="recommendation-mini" key={application.id}><CompanyMark job={job} /><div className="mini-job-copy"><Link to={`/applications/${application.id}`}>{job.title}</Link><span>{job.companyName} · {application.status}</span></div><span className="status-pill"><i />{application.status}</span></div>})}</div> : <div className="activity-empty"><span><Send size={20} /></span><strong>Your next move starts here</strong><p>When you apply to a role, you’ll find updates and next steps right here.</p><Link to="/jobs">Find a role <ArrowRight size={14} /></Link></div>}</section></div>
    <div className="demo-note"><CircleHelp size={15} /> You’re exploring a demo workspace. Your saved jobs and profile stay on this device.</div>
  </div>
}

function JobsPage() {
  const { jobSlug } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [pageSize, setPageSize] = useState(20)
  const [filtersVisible, setFiltersVisible] = useState(true)
  const [filterDrawer, setFilterDrawer] = useState(false)
  const query = params.get('q') || ''
  const results = useMemo(() => getJobs(Object.fromEntries(params.entries())), [params])
  const selectedJob = jobSlug ? getJobBySlug(jobSlug) : null
  const invalidSlug = Boolean(jobSlug && !selectedJob)
  const updateParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const chooseJob = (job) => navigate(`/jobs/${job.slug}${location.search}`)
  const visibleFilters = [...params.entries()].filter(([key]) => !['sort', 'page'].includes(key))
  const resetFilters = () => setParams({}, { replace: true })

  return <div className={`jobs-page ${jobSlug ? 'has-selection' : ''} ${filtersVisible ? '' : 'filters-collapsed'} ${filterDrawer ? 'filter-drawer-open' : ''}`}>
    <div className="jobs-top">
      <div className="jobs-top-title"><div><div className="eyebrow">OPPORTUNITIES, WITH INTENTION</div><h1>Find your next role.</h1></div><div className="demo-tag"><span /> DEMO JOBS</div></div>
      <JobsSearchBar key={`${query}|${params.get('location') || ''}|${params.get('experience') || ''}`} params={params} setParams={setParams} query={query} />
      <div className="results-toolbar"><div className="results-count"><strong>{results.length}</strong> {results.length === 1 ? 'opportunity' : 'opportunities'} <span>·</span> A good place to start</div><div className="toolbar-actions"><button className="toolbar-filter" onClick={() => { setFiltersVisible(!filtersVisible); setFilterDrawer(!filterDrawer) }}><SlidersHorizontal size={16} /> Filters <span>{visibleFilters.length || ''}</span></button><label className="sort-select">Sort by <select value={params.get('sort') || 'recent'} onChange={(event) => updateParam('sort', event.target.value)}><option value="recent">Most recent</option><option value="relevance">Relevance</option><option value="salaryHigh">Salary: high to low</option><option value="salaryLow">Salary: low to high</option><option value="experience">Experience</option></select><ChevronDown size={14} /></label></div></div>
      {visibleFilters.length > 0 && <div className="active-filter-row">{visibleFilters.map(([key, value]) => <button key={key} className="filter-chip" onClick={() => updateParam(key, '')}>{keyLabel(key)}: {value}<X size={13} /></button>)}<button className="clear-filters" onClick={resetFilters}>Clear all</button></div>}
    </div>
    <div className="job-explorer">
      <FiltersPane params={params} updateParam={updateParam} resetFilters={resetFilters} />
      <section className={`job-inbox ${selectedJob ? 'inbox-with-selection' : ''}`}>
        <div className="inbox-heading"><div><strong>Open roles</strong><span>Thoughtful teams, real potential.</span></div><button className="icon-button inbox-more" aria-label="More list options"><MoreHorizontal size={19} /></button></div>
        <div className="job-list-scroll" aria-label="Job results">
          {invalidSlug && <div className="job-not-found"><span><Search size={19} /></span><strong>This role has moved</strong><p>It may have closed or the link may be incorrect.</p><button className="button button-secondary" onClick={() => navigate(`/jobs${location.search}`)}>Back to all jobs</button></div>}
          {!invalidSlug && results.slice(0, pageSize).map((job) => <JobCard key={job.id} job={job} selected={selectedJob?.id === job.id} onSelect={() => chooseJob(job)} />)}
          {!invalidSlug && results.length === 0 && <div className="empty-results"><span><Search size={22} /></span><h3>No roles match just yet</h3><p>Try a different title or loosen a filter to see more opportunities.</p><button className="button button-secondary" onClick={resetFilters}>Clear filters</button></div>}
          {!invalidSlug && results.length > pageSize && <button className="load-more" onClick={() => setPageSize((size) => size + 20)}>Load more opportunities <ArrowDown size={15} /></button>}
        </div>
        <div className="inbox-footer"><span>Showing {Math.min(results.length, pageSize)} of {results.length} roles</span><span>Demo listings · Updated today</span></div>
      </section>
      <section className={`job-detail-column ${selectedJob || invalidSlug ? 'detail-visible' : ''}`}>
        {selectedJob ? <JobDetail job={selectedJob} onBack={() => navigate(`/jobs${location.search}`)} /> : invalidSlug ? <div className="detail-empty"><span className="detail-empty-icon"><X size={24} /></span><h2>Role not found</h2><p>This link doesn’t point to an active demo listing.</p><button className="button button-primary" onClick={() => navigate(`/jobs${location.search}`)}>Browse open roles</button></div> : <div className="detail-empty"><div className="detail-illustration"><div><BriefcaseBusiness size={26} /></div><span className="floating-spark">✦</span></div><div className="eyebrow">YOUR NEXT CHAPTER</div><h2>Every good move<br />starts somewhere.</h2><p>Select a role to see the details, get a feel for the team, and decide if it’s right for you.</p><div className="detail-empty-hint"><ArrowLeft size={15} /> Choose a role from the list</div></div>}
      </section>
    </div>
    {filterDrawer && <button className="drawer-overlay filter-overlay" aria-label="Close filters" onClick={() => { setFilterDrawer(false); setFiltersVisible(true) }} />}
  </div>
}

function JobsSearchBar({ params, setParams, query }) {
  const { recordSearch } = useApp()
  const [q, setQ] = useState(query)
  const [location, setLocation] = useState(params.get('location') || '')
  const [experience, setExperience] = useState(params.get('experience') || '')
  const submit = (event) => {
    event.preventDefault()
    const next = new URLSearchParams(params)
    q.trim() ? next.set('q', q.trim()) : next.delete('q')
    location.trim() ? next.set('location', location.trim()) : next.delete('location')
    experience ? next.set('experience', experience) : next.delete('experience')
    recordSearch([q.trim(), location.trim()].filter(Boolean).join(' in '))
    setParams(next, { replace: true })
  }
  return <form className="jobs-searchbar" onSubmit={submit}>
    <label><Search size={18} /><input list="job-suggestions" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Role, skill, or company" aria-label="Search by role skill or company" /></label>
    <i />
    <label><MapPin size={18} /><input list="job-cities" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or remote" aria-label="Search by location" /><datalist id="job-cities"><option>Chennai</option><option>Bengaluru</option><option>Hyderabad</option><option>Pune</option><option>Mumbai</option><option>Delhi NCR</option><option>Remote</option></datalist></label>
    <i />
    <label className="jobs-experience-field"><BriefcaseBusiness size={17} /><select aria-label="Filter by experience" value={experience} onChange={(event) => setExperience(event.target.value)}><option value="">Any experience</option><option value="0">Fresher</option><option value="1">1–2 years</option><option value="3">3–5 years</option><option value="5">5–8 years</option><option value="6">6–10 years</option></select><ChevronDown size={13} /></label>
    {(q || location || experience) && <button className="search-clear" type="button" aria-label="Clear search fields" onClick={() => { setQ(''); setLocation(''); setExperience(''); const next = new URLSearchParams(params); ['q', 'location', 'experience'].forEach((key) => next.delete(key)); setParams(next, { replace: true }) }}><X size={15} /></button>}
    <button className="button button-primary" type="submit">Search roles <ArrowRight size={16} /></button>
  </form>
}

function FiltersPane({ params, updateParam, resetFilters }) {
  const [collapsed, setCollapsed] = useState({})
  const checkGroup = (title, key, values) => <div className="filter-group" key={key}><button className="filter-group-title" aria-expanded={!collapsed[key]} onClick={() => setCollapsed((state) => ({ ...state, [key]: !state[key] }))}>{title}<ChevronDown size={14} /></button>{!collapsed[key] && <div className="filter-options">{values.map((value) => <label className="check-option" key={value}><input type="radio" name={key} checked={params.get(key) === value} onChange={() => updateParam(key, params.get(key) === value ? '' : value)} /><span className="custom-radio" /><span>{key === 'experience' ? ({ 0: 'Fresher', 1: '1–2 years', 3: '3–5 years', 5: '5–8 years', 6: '6–10 years' })[value] : key === 'salary' ? `₹${value} LPA+` : value}</span></label>)}</div>}</div>
  return <aside className="filters-pane">
    <div className="filters-title"><span><Filter size={16} /> Refine your search</span><button onClick={resetFilters}>Reset</button></div>
    {checkGroup('Experience', 'experience', ['0', '1', '3', '5', '6'])}
    {checkGroup('Work arrangement', 'workMode', ['Remote', 'Hybrid', 'On-site'])}
    {checkGroup('Employment type', 'employmentType', ['Full Time', 'Contract'])}
    {checkGroup('Minimum salary', 'salary', ['6', '10', '15'])}
    {checkGroup('Skills', 'skills', ['React', 'Kotlin', 'Node.js', 'Python', 'SQL', 'Figma'])}
    {checkGroup('Company', 'company', companiesData.map((company) => company.name))}
    {checkGroup('Industry', 'industry', [...new Set(jobs.map((job) => job.industry))])}
    <div className="filter-group"><label className="filter-group-title" htmlFor="posted-filter">Date posted</label><select id="posted-filter" className="filter-select" value={params.get('posted') || ''} onChange={(event) => updateParam('posted', event.target.value)}><option value="">Any time</option><option value="week">Past week</option><option value="month">Past month</option></select></div>
    <div className="filter-footnote"><ShieldCheck size={14} /> All listings are demo opportunities</div>
  </aside>
}

function CompanyMark({ job, size = 'normal' }) {
  return <span className={`company-mark ${size}`} style={{ '--company-color': job.companyColor || '#6259e8' }}>{job.companyName?.split(/\s+/).slice(0, 2).map((word) => word[0]).join('')}</span>
}

function JobCard({ job, compact = false, selected = false, onSelect }) {
  const { savedIds, toggleSaved } = useApp()
  const navigate = useNavigate()
  const saved = savedIds.includes(job.id)
  const openJob = () => onSelect ? onSelect() : navigate(`/jobs/${job.slug}`)
  return <article className={`job-card ${selected ? 'selected' : ''} ${compact ? 'compact-job-card' : ''} job-card-interactive`} aria-label={`View ${job.title} at ${job.companyName}`} tabIndex={0} onClick={openJob} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openJob() } }}>
    <div className="job-card-top"><CompanyMark job={job} /><div className="job-card-heading"><h3 title={job.title}>{job.title}</h3><div>{job.companyName}{job.companyVerified && <ShieldCheck className="verified-icon" size={13} aria-label="Verified company" />}</div></div><button className={`bookmark-button ${saved ? 'is-saved' : ''}`} aria-label={saved ? 'Remove saved job' : 'Save job'} onClick={(event) => { event.preventDefault(); event.stopPropagation(); toggleSaved(job.id) }}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /></button></div>
    <div className="job-meta-line"><span><MapPin size={13} />{job.location.city}</span><span><BriefcaseBusiness size={13} />{formatExperience(job.experience)}</span></div>
    <div className="job-salary-line">{formatSalary(job.salary)} <span>·</span> {job.workMode}</div>
    {!compact && <div className="job-skills-row">{job.skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}{job.skills.length > 3 && <small>+{job.skills.length - 3}</small>}</div>}
    <div className="job-card-footer"><span className={job.isFeatured ? 'new-role-tag' : ''}>{job.isFeatured && <span className="new-indicator" />} {job.isFeatured ? 'New opportunity' : 'Recently posted'}</span><span>{postedAgo(job.postedAt)}</span></div>
  </article>
}

function postedAgo(value) {
  const day = Number(value.slice(8, 10))
  const days = Math.max(0, 27 - day)
  return days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`
}

function JobDetail({ job, onBack }) {
  const { savedIds, toggleSaved, applications, submitApplication, setToast } = useApp()
  const [applyOpen, setApplyOpen] = useState(false)
  const [resume, setResume] = useState('Priya_Sharma_Product_Engineer.pdf')
  const saved = savedIds.includes(job.id)
  const applied = applications.some((application) => application.jobId === job.id)
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setToast('Job link copied to clipboard')
    } catch (error) {
      console.error('Unable to copy the job link.', error)
      setToast('Copy this link from your browser address bar')
    }
  }
  return <div className="detail-scroll">
    <div className="detail-sticky-head"><button className="mobile-back" onClick={onBack}><ArrowLeft size={17} /> All roles</button><div className="detail-actions-top"><button className={`icon-button ${saved ? 'saved-action' : ''}`} onClick={() => toggleSaved(job.id)} aria-label={saved ? 'Unsave job' : 'Save job'}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /></button><button className="icon-button" onClick={share} aria-label="Share job"><Share2 size={17} /></button></div></div>
    <div className="detail-main">
      <div className="detail-company-row"><CompanyMark job={job} size="large" /><div><strong>{job.companyName}</strong>{job.companyVerified && <span className="verified-label"><ShieldCheck size={13} /> Verified employer</span>}</div><button className="company-more" aria-label="More company options"><MoreHorizontal size={18} /></button></div>
      <h2 className="detail-job-title">{job.title}</h2><p className="detail-company-industry">{job.industry} <span>·</span> Posted {postedAgo(job.postedAt).toLowerCase()}</p>
      <div className="detail-facts"><span><MapPin size={15} />{job.location.city}, {job.location.state}</span><span><BriefcaseBusiness size={15} />{formatExperience(job.experience)}</span><span><Globe2 size={15} />{job.workMode}</span><span><Clock3 size={15} />{job.employmentType}</span></div>
      <div className="detail-salary-row"><strong>{formatSalary(job.salary)}</strong><span>{job.openings} openings</span><span>{job.applicantCount} people viewed this role</span></div>
      <div className="detail-primary-actions">{applied ? <button className="button button-applied" disabled><CheckCircle2 size={17} /> Application recorded</button> : <button className="button button-primary" onClick={() => setApplyOpen(true)}><Send size={16} /> Apply for this role <ArrowRight size={15} /></button>}<button className={`button button-secondary ${saved ? 'button-saved' : ''}`} onClick={() => toggleSaved(job.id)}><Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Saved' : 'Save role'}</button></div>
      <div className="demo-disclaimer"><CircleHelp size={15} /><span>This is a demo listing. Applying records your interest on this device; no employer receives your information.</span></div>
      {applyOpen && <div className="application-panel"><div className="application-panel-head"><div><span className="eyebrow">DEMO APPLICATION</span><h3>Ready to take the next step?</h3></div><button className="icon-button" onClick={() => setApplyOpen(false)} aria-label="Close application"><X size={18} /></button></div><p>We’ll attach your selected resume to a local demo application for <strong>{job.companyName}</strong>.</p><label className="resume-select-label">Choose a resume<select value={resume} onChange={(event) => setResume(event.target.value)}><option>Priya_Sharma_Product_Engineer.pdf</option><option>Priya_Sharma_Full_Stack.pdf</option></select></label><div className="applicant-summary"><span className="avatar">PS</span><span><strong>{mockUser.name}</strong><small>{mockUser.headline} · {mockUser.location}</small></span><CheckCircle2 size={17} /></div><button className="button button-primary submit-application" onClick={() => { submitApplication(job, resume); setApplyOpen(false) }}>Submit demo application <ArrowRight size={16} /></button></div>}
      <DetailSection title="About the role"><p>{job.description}</p></DetailSection>
      <DetailSection title="What you’ll do"><ul>{job.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul></DetailSection>
      <DetailSection title="What you’ll bring"><ul>{job.requirements.map((item) => <li key={item}>{item}</li>)}</ul></DetailSection>
      <DetailSection title="Skills for this role"><div className="detail-skills">{job.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></DetailSection>
      <DetailSection title="Nice to have"><ul>{job.preferredQualifications.map((item) => <li key={item}>{item}</li>)}</ul></DetailSection>
      <DetailSection title="Education"><p>{job.education}</p></DetailSection>
      <DetailSection title="A few good things"><div className="benefit-tags">{job.benefits.map((benefit) => <span key={benefit}><Check size={13} />{benefit}</span>)}</div></DetailSection>
      <DetailSection title="A little about the team"><div className="company-overview"><CompanyMark job={job} /><div><strong>{job.companyName}</strong><p>{companiesData.find((company) => company.id === job.companyId)?.description}</p><Link to={`/companies/${companySlug(job.companyName)}`}>Explore company <ArrowRight size={14} /></Link></div></div><div className="location-note"><MapPin size={15} /><span>{job.location.area}, {job.location.city}, {job.location.state}</span><small>{job.workMode} · India</small></div></DetailSection>
      <div className="similar-jobs"><h3>Other opportunities to explore</h3>{jobs.filter((other) => other.id !== job.id && (other.industry === job.industry || other.skills.some((skill) => job.skills.includes(skill)))).slice(0, 2).map((other) => <Link key={other.id} to={`/jobs/${other.slug}`} className="similar-job"><CompanyMark job={other} /><span><strong>{other.title}</strong><small>{other.companyName} · {other.location.city}</small></span><ArrowRight size={15} /></Link>)}</div>
    </div>
    <div className="detail-bottom-actions">{applied ? <span><CheckCircle2 size={17} /> Application recorded</span> : <button className="button button-primary" onClick={() => setApplyOpen(true)}>Apply for this role <ArrowRight size={15} /></button>}<button className="button button-secondary" onClick={() => toggleSaved(job.id)}><Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Saved' : 'Save'}</button></div>
  </div>
}

function DetailSection({ title, children }) {
  return <section className="detail-section"><h3>{title}</h3>{children}</section>
}

function companySlug(name = '') {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
function keyLabel(key) {
  return ({ q: 'Keyword', location: 'Location', workMode: 'Work mode', employmentType: 'Type', experience: 'Experience', salary: 'Salary', skills: 'Skill', posted: 'Posted' })[key] || key
}

function JobCollectionPage({ title, eyebrow, description, list }) {
  return <div className="page-wrap collection-page"><PageHeading eyebrow={eyebrow} title={title} description={description} action={<Link className="button button-secondary" to="/jobs"><Search size={16} /> Find roles</Link>} /><div className="collection-jobs">{list.length ? list.map((job) => <JobCard key={job.id} job={job} />) : <div className="empty-results"><span><Bookmark size={22} /></span><h3>Nothing here just yet</h3><p>Explore roles and save the ones you’d like to come back to.</p><Link className="button button-primary" to="/jobs">Explore opportunities</Link></div>}</div></div>
}

function SavedJobsPage() {
  const { savedIds } = useApp()
  return <JobCollectionPage title="Your shortlist." eyebrow="SAVED FOR LATER" description="A place for the opportunities you want to think about." list={jobs.filter((job) => savedIds.includes(job.id))} />
}

function RecommendedPage() {
  const { profile } = useApp()
  const recommendations = getRecommendations(profile)
  return <div className="page-wrap collection-page"><PageHeading eyebrow="A GOOD FIT, STARTING HERE" title="Picked for you." description="Demo recommendations scored from skills, role preferences, location, and experience." action={<span className="demo-tag"><Sparkles size={13} /> DEMO MATCHING</span>} /><div className="recommendation-explainer"><Sparkles size={17} /><span><strong>How the demo score works</strong><small>Skills overlap (45%) · Preferred titles (25%) · Location (20%) · Experience fit (10%). These scores are examples, not AI predictions.</small></span></div><div className="recommendation-list">{recommendations.slice(0, 18).map(({ job, score }) => <div className="recommendation-row" key={job.id}><JobCard job={job} /><div className="match-score"><span>{score}%</span><small>match</small><div className="score-track"><i style={{ width: `${score}%` }} /></div></div></div>)}</div></div>
}

function ApplicationsPage() {
  const { applications } = useApp()
  const statuses = ['Applied', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Offered', 'Rejected']
  return <div className="page-wrap applications-page"><PageHeading eyebrow="KEEP YOUR MOMENTUM" title="Your applications." description="Track the demo applications you’ve submitted from this device." /><div className="application-stats">{statuses.slice(0, 4).map((status) => <div key={status}><span>{applications.filter((application) => application.status === status).length}</span><small>{status}</small></div>)}</div>{applications.length ? <div className="application-table"><div className="application-table-head"><span>ROLE</span><span>COMPANY</span><span>APPLIED</span><span>STATUS</span><span /></div>{applications.map((application) => { const job = jobs.find((item) => item.id === application.jobId); return job && <Link className="application-table-row" key={application.id} to={`/applications/${application.id}`}><span className="application-role"><CompanyMark job={job} /><strong>{job.title}<small>{job.location.city} · {job.workMode}</small></strong></span><span>{job.companyName}</span><span>{new Date(application.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span><span className="status-pill"><i />{application.status}</span><ArrowRight size={16} /></Link>})}</div> : <div className="empty-results"><span><Send size={22} /></span><h3>Your next step will show up here</h3><p>Explore open roles and submit a demo application to track it here.</p><Link className="button button-primary" to="/jobs">Explore roles</Link></div>}<div className="demo-note"><CircleHelp size={15} /> Application statuses are simulated for this frontend demo.</div></div>
}

function ApplicationDetailPage() {
  const { applicationId } = useParams()
  const { applications, updateApplicationStatus, setToast } = useApp()
  const application = applications.find((item) => item.id === applicationId)
  const job = jobs.find((item) => item.id === application?.jobId)
  if (!job) return <NotFoundPage />
  const statuses = ['Applied', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Rejected', 'Offered']
  return <div className="page-wrap application-detail-page"><Link to="/applications" className="back-link"><ArrowLeft size={16} /> All applications</Link><PageHeading eyebrow="APPLICATION TRACKING" title={job.title} description={`${job.companyName} · ${job.location.city}`} /><div className="application-detail-card"><span className="status-pill"><i />{application.status}</span><h2>Application received</h2><p>Your demo application has been saved on this device. No information has been sent to an employer.</p><div><span>Resume selected</span><strong>{application.resume}</strong></div><div><span>Submitted</span><strong>{new Date(application.appliedAt).toLocaleString('en-IN')}</strong></div><label className="status-preview">Preview a demo status<select value={application.status} onChange={(event) => { updateApplicationStatus(application.id, event.target.value); setToast('Demo status updated') }}>{statuses.map((status) => <option key={status}>{status}</option>)}</select><small>This preview is local and does not reflect an employer decision.</small></label><Link className="button button-secondary" to={`/jobs/${job.slug}`}>View role details <ArrowRight size={15} /></Link></div></div>
}

function AlertsPage() {
  const { alerts, updateAlerts, setToast } = useApp()
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')
  const [frequency, setFrequency] = useState('Weekly')
  const addAlert = (event) => {
    event.preventDefault()
    if (!keyword.trim()) return
    updateAlerts([{ id: `alert-${Date.now()}`, keyword: keyword.trim(), location: location.trim() || 'Anywhere', frequency, enabled: true }, ...alerts])
    setKeyword('')
    setLocation('')
    setToast('Demo alert created')
  }
  return <div className="page-wrap alerts-page">
    <PageHeading eyebrow="STAY IN THE LOOP" title="Your job alerts." description="Set a search once and keep an eye on new opportunities that fit." />
    <div className="alert-create-card">
      <div className="alert-create-heading"><span><Bell size={18} /></span><div><h2>Create a job alert</h2><p>Notification delivery isn’t connected in this demo.</p></div></div>
      <form onSubmit={addAlert}>
        <label>Keywords<input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="e.g. React developer" required /></label>
        <label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Any location" /></label>
        <label>Frequency<select value={frequency} onChange={(event) => setFrequency(event.target.value)}><option>Daily</option><option>Weekly</option></select></label>
        <button className="button button-primary"><Bell size={16} /> Create alert</button>
      </form>
    </div>
    <div className="alert-list-heading"><h2>Active searches <span>{alerts.length}</span></h2></div>
    {alerts.length ? <div className="alerts-list">{alerts.map((alert) => (
      <div className={`alert-row ${alert.enabled ? '' : 'alert-disabled'}`} key={alert.id}>
        <span className="alert-row-icon"><Search size={17} /></span>
        <span className="alert-row-copy"><strong>{alert.keyword}</strong><small>{alert.location} · {alert.frequency}</small></span>
        <label className="switch"><input type="checkbox" checked={alert.enabled} onChange={() => updateAlerts(alerts.map((item) => item.id === alert.id ? { ...item, enabled: !item.enabled } : item))} /><span /></label>
        <button className="icon-button" aria-label={`Delete ${alert.keyword} alert`} onClick={() => updateAlerts(alerts.filter((item) => item.id !== alert.id))}><X size={17} /></button>
      </div>
    ))}</div> : <div className="empty-results"><span><Bell size={22} /></span><h3>No alerts set up yet</h3><p>Create a search alert and keep your next opportunity in view.</p></div>}
  </div>
}

function CompaniesPage() {
  return <div className="page-wrap companies-page"><PageHeading eyebrow="MEET THE PEOPLE BEHIND THE WORK" title="Companies with a point of view." description="Get to know the teams shaping thoughtful products and better ways of working." /><div className="companies-grid">{companiesData.map((company) => { const count = jobs.filter((job) => job.companyId === company.id).length; return <Link className="company-card" key={company.id} to={`/companies/${companySlug(company.name)}`}><span className="company-card-mark" style={{ '--company-color': company.color }}>{company.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('')}</span><span className="company-card-meta">{company.verified && <span><ShieldCheck size={13} /> Verified</span>}<MoreHorizontal size={17} /></span><h2>{company.name}</h2><span className="company-industry">{company.industry}</span><p>{company.description}</p><div className="company-card-footer"><span><MapPin size={14} />{company.headquarters}</span><span><BriefcaseBusiness size={14} />{count} open roles</span></div><span className="company-card-cta">View company <ArrowRight size={15} /></span></Link>})}</div></div>
}

function CompanyPage() {
  const { companySlug: slug } = useParams()
  const firstJob = jobs.find((job) => companySlug(job.companyName) === slug)
  const company = companiesData.find((item) => companySlug(item.name) === slug)
  if (!company || !firstJob) return <NotFoundPage />
  const openings = jobs.filter((job) => job.companyId === company.id)
  return <div className="page-wrap company-detail-page"><Link to="/companies" className="back-link"><ArrowLeft size={16} /> All companies</Link><section className="company-hero-card"><span className="company-card-mark" style={{ '--company-color': company.color }}>{company.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('')}</span><div><div className="eyebrow">A TEAM TO GET TO KNOW</div><h1>{company.name} {company.verified && <ShieldCheck size={20} />}</h1><p>{company.industry} · {company.headquarters}, India</p></div><span className="company-open-count">{openings.length}<small>open roles</small></span></section><section className="company-about"><div><h2>About the team</h2><p>{company.description} The team values thoughtful collaboration, inclusive design, and the space to do your best work.</p></div><div><h3>Company details</h3><span><Building2 size={15} /> {company.industry}</span><span><MapPin size={15} /> {company.headquarters}, India</span><span><Users size={15} /> Growing product team</span></div></section><h2 className="company-roles-title">Open roles <span>{openings.length}</span></h2><div className="collection-jobs">{openings.map((job) => <JobCard key={job.id} job={job} />)}</div></div>
}

function ProfilePage() {
  const { profile, updateProfile, setToast } = useApp()
  const [form, setForm] = useState(profile)
  const [editing, setEditing] = useState(false)
  const change = (key, value) => setForm((previous) => ({ ...previous, [key]: value }))
  const save = (event) => {
    event.preventDefault()
    const next = { ...form, skills: typeof form.skills === 'string' ? form.skills.split(',').map((skill) => skill.trim()).filter(Boolean) : form.skills }
    updateProfile(next)
    setForm(next)
    setEditing(false)
    setToast('Profile saved on this device')
  }
  const skillsValue = Array.isArray(form.skills) ? form.skills.join(', ') : form.skills
  return <div className="page-wrap profile-page">
    <PageHeading eyebrow="YOUR PROFESSIONAL STORY" title="Your profile." description="Show teams what you bring and what you’re looking for." action={<button className="button button-secondary" onClick={() => setEditing(!editing)}>{editing ? 'Cancel editing' : 'Edit profile'}</button>} />
    <div className="profile-layout">
      <aside className="profile-summary-card">
        <div className="profile-avatar-large">PS</div><h2>{profile.name}</h2><p>{profile.headline}</p><span><MapPin size={14} />{profile.location}</span>
        <div className="profile-progress"><div><strong>Profile strength</strong><span>78%</span></div><i><b /></i><small>Profiles with more detail stand out.</small></div>
        <Link to="/profile/resume"><FileText size={16} /> Manage resumes <ArrowRight size={15} /></Link>
      </aside>
      <form className="profile-form" onSubmit={save}>
        <div className="profile-section-heading"><div><h2>Professional details</h2><p>Help us make your search feel more like you.</p></div>{editing && <button className="button button-primary" type="submit">Save changes <Check size={16} /></button>}</div>
        {[['name', 'Full name'], ['headline', 'Professional headline'], ['location', 'Location'], ['summary', 'About you']].map(([key, label]) => <label className="profile-field" key={key}>{label}{key === 'summary' ? <textarea disabled={!editing} rows="4" value={form[key] || ''} onChange={(event) => change(key, event.target.value)} /> : <input disabled={!editing} value={form[key] || ''} onChange={(event) => change(key, event.target.value)} />}</label>)}
        <label className="profile-field">Skills<input disabled={!editing} value={skillsValue} onChange={(event) => change('skills', event.target.value)} /><small>Separate skills with commas</small></label>
        <div className="profile-two-fields">
          <label className="profile-field">Years of experience<input type="number" disabled={!editing} min="0" value={form.experience} onChange={(event) => change('experience', Number(event.target.value))} /></label>
          <label className="profile-field">Expected salary (annual)<input type="number" disabled={!editing} value={form.expectedSalary} onChange={(event) => change('expectedSalary', Number(event.target.value))} /></label>
        </div>
        <div className="profile-section-heading"><div><h2>Experience & education</h2><p>Give hiring teams a little more context about your journey.</p></div></div>
        <label className="profile-field">Work experience<textarea disabled={!editing} rows="3" value={form.workExperience || ''} onChange={(event) => change('workExperience', event.target.value)} /></label>
        <label className="profile-field">Education<input disabled={!editing} value={form.education || ''} onChange={(event) => change('education', event.target.value)} /></label>
        <div className="profile-section-heading"><div><h2>Looking for</h2><p>Your preferences help refine demo recommendations.</p></div></div>
        <label className="profile-field">Preferred roles<input disabled={!editing} value={form.preferredTitles.join(', ')} onChange={(event) => change('preferredTitles', event.target.value.split(',').map((item) => item.trim()))} /></label>
        <label className="profile-field">Preferred locations<input disabled={!editing} value={form.preferredCities.join(', ')} onChange={(event) => change('preferredCities', event.target.value.split(',').map((item) => item.trim()))} /></label>
      </form>
    </div>
  </div>
}

function ResumePage() {
  const [fileName, setFileName] = useState('Priya_Sharma_Product_Engineer.pdf')
  const [error, setError] = useState('')
  const onFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { setError('Please choose a PDF file.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Your PDF must be smaller than 5 MB.'); return }
    setFileName(file.name)
    setError('')
  }
  return <div className="page-wrap resume-page"><PageHeading eyebrow="YOUR STORY, READY TO SHARE" title="Resume library." description="Choose a resume when you apply. Files stay in this browser demo only." /><div className="resume-list-card"><div className="resume-file"><span><FileText size={22} /></span><div><strong>{fileName}</strong><small>PDF document · Demo resume</small></div><span className="resume-default"><Check size={13} /> Default</span><MoreHorizontal size={18} /></div><label className="upload-resume"><input type="file" accept="application/pdf,.pdf" onChange={onFile} /><span><span className="upload-icon"><ArrowDown size={18} /></span><strong>Choose a PDF to add a resume</strong><small>PDF only · Up to 5 MB · Filename shown in this browser demo only</small><span className="button button-secondary">Browse files</span></span></label>{error && <p className="form-error" role="alert">{error}</p>}</div><div className="demo-note"><ShieldCheck size={15} /> Resume files are not uploaded or stored on a server.</div></div>
}

function SettingsPage() {
  const { theme, setTheme, setToast, clearDemoActivity } = useApp()
  return <div className="page-wrap settings-page"><PageHeading eyebrow="MAKE THIS SPACE YOURS" title="Settings." description="A few simple preferences for a more comfortable search." /><section className="settings-card"><div className="settings-row"><span className="settings-icon"><Moon size={18} /></span><span><strong>Appearance</strong><small>Choose the look that works for you.</small></span><select value={theme} onChange={(event) => setTheme(event.target.value)}><option value="light">Light</option><option value="dark">Dark</option></select></div><div className="settings-row"><span className="settings-icon"><Bell size={18} /></span><span><strong>Job notifications</strong><small>Manage your saved searches and alert frequency.</small></span><Link className="button button-secondary" to="/job-alerts">Manage alerts <ArrowRight size={14} /></Link></div><div className="settings-row"><span className="settings-icon"><Globe2 size={18} /></span><span><strong>Demo data</strong><small>Your activity is stored locally in this browser.</small></span><span className="settings-status">Local only</span></div><div className="settings-row"><span className="settings-icon"><CircleHelp size={18} /></span><span><strong>Reset demo activity</strong><small>Clear saved jobs, applications, and alerts from this device.</small></span><button className="button button-danger" onClick={() => { clearDemoActivity(); setToast('Demo activity cleared') }}>Clear activity</button></div></section><div className="demo-note"><CircleHelp size={15} /> No notification delivery or account services are connected in this frontend demo.</div></div>
}

function AuthPage({ mode }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const isLogin = mode === 'login'
  return <div className="auth-page"><section className="auth-card"><div className="auth-brand"><span className="brand-mark"><Command size={17} /></span><BrandText compact /></div><div className="eyebrow">{isLogin ? 'WELCOME BACK' : 'A NEW CHAPTER STARTS HERE'}</div><h1>{isLogin ? 'Good to see you.' : 'Make room for what’s next.'}</h1><p>{isLogin ? 'Sign in to pick up where you left off.' : 'Create a demo account to explore your career studio.'}</p><form onSubmit={(event) => { event.preventDefault(); setMessage('This is a demo sign-in. No account was created.'); setTimeout(() => navigate('/dashboard'), 800) }}><label>Email address<input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>{!isLogin && <label>Your name<input placeholder="Full name" required /></label>}<label>Password<input type="password" placeholder="At least 8 characters" minLength="8" required /></label><button className="button button-primary">{isLogin ? 'Sign in to demo' : 'Create demo account'} <ArrowRight size={16} /></button>{message && <p className="auth-message" role="status">{message}</p>}</form><div className="auth-switch">{isLogin ? 'New to Genius Jobs?' : 'Already have a demo account?'} <Link to={isLogin ? '/register' : '/login'}>{isLogin ? 'Create an account' : 'Sign in'}</Link></div><div className="demo-note"><ShieldCheck size={15} /> Demo only. No real account or authentication is created.</div></section></div>
}

function NotFoundPage() {
  return <div className="not-found-page"><span className="not-found-mark"><Compass size={27} /></span><div className="eyebrow">A LITTLE OFF THE MAP</div><h1>We can’t find that page.</h1><p>The link may have changed, or this page may no longer be here.</p><Link className="button button-primary" to="/dashboard">Back to your workspace <ArrowRight size={16} /></Link><Link className="not-found-secondary" to="/jobs">Or explore open roles</Link></div>
}

export default App
