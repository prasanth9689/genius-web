const companies = [
  { id: 'COMP001', name: 'TechNova Solutions', color: '#6259e8', industry: 'Software Development', headquarters: 'Chennai', verified: true, description: 'Building thoughtful digital products for teams that move the world forward.' },
  { id: 'COMP002', name: 'CloudWorks Studio', color: '#168c91', industry: 'Cloud & Data', headquarters: 'Bengaluru', verified: true, description: 'Making cloud infrastructure more useful, reliable, and accessible.' },
  { id: 'COMP003', name: 'Northstar Labs', color: '#e48043', industry: 'Product & Design', headquarters: 'Pune', verified: true, description: 'A product company turning complex workflows into simple experiences.' },
  { id: 'COMP004', name: 'Juniper Systems', color: '#4778c7', industry: 'Enterprise Technology', headquarters: 'Hyderabad', verified: false, description: 'Helping ambitious businesses build dependable software at scale.' },
  { id: 'COMP005', name: 'Brightline Digital', color: '#c45483', industry: 'Digital Services', headquarters: 'Mumbai', verified: true, description: 'A close-knit team partnering with the next generation of businesses.' },
]

const locations = [
  { city: 'Chennai', area: 'Sholinganallur', state: 'Tamil Nadu' },
  { city: 'Bengaluru', area: 'Indiranagar', state: 'Karnataka' },
  { city: 'Hyderabad', area: 'HITEC City', state: 'Telangana' },
  { city: 'Pune', area: 'Hinjawadi', state: 'Maharashtra' },
  { city: 'Mumbai', area: 'Andheri East', state: 'Maharashtra' },
  { city: 'Delhi NCR', area: 'Gurugram', state: 'Haryana' },
  { city: 'Coimbatore', area: 'Peelamedu', state: 'Tamil Nadu' },
  { city: 'Remote', area: 'India', state: 'India' },
]

const roles = [
  { title: 'Android Developer', skills: ['Kotlin', 'Jetpack Compose', 'MVVM', 'Room', 'Retrofit'], min: 3, max: 5, salary: [8, 12], industry: 'Mobile Technology', focus: 'crafting fast, accessible Android experiences with modern Kotlin tooling' },
  { title: 'React Developer', skills: ['React', 'TypeScript', 'JavaScript', 'CSS', 'Testing Library'], min: 2, max: 4, salary: [7, 11], industry: 'Software Development', focus: 'building responsive product interfaces and reusable component systems' },
  { title: 'Full Stack Developer', skills: ['React', 'Node.js', 'PostgreSQL', 'REST APIs', 'TypeScript'], min: 3, max: 6, salary: [10, 16], industry: 'Software Development', focus: 'shipping complete product features from polished UI through reliable APIs' },
  { title: 'Backend Developer', skills: ['Java', 'Spring Boot', 'MySQL', 'Redis', 'REST APIs'], min: 3, max: 5, salary: [9, 14], industry: 'Enterprise Technology', focus: 'designing resilient services and clear APIs for high-volume applications' },
  { title: 'Node.js Developer', skills: ['Node.js', 'Express', 'MongoDB', 'AWS', 'Jest'], min: 2, max: 5, salary: [8, 13], industry: 'Cloud & Data', focus: 'developing dependable server-side services and integrations' },
  { title: 'Flutter Developer', skills: ['Flutter', 'Dart', 'Firebase', 'Provider', 'REST APIs'], min: 2, max: 4, salary: [7, 12], industry: 'Mobile Technology', focus: 'creating consistent, high-quality mobile apps across platforms' },
  { title: 'DevOps Engineer', skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD'], min: 4, max: 7, salary: [13, 20], industry: 'Cloud & Data', focus: 'making delivery pipelines safer and infrastructure easier to operate' },
  { title: 'QA Engineer', skills: ['Playwright', 'Cypress', 'Jest', 'API Testing', 'SQL'], min: 2, max: 5, salary: [6, 10], industry: 'Software Development', focus: 'raising product quality through thoughtful automation and exploratory testing' },
  { title: 'UI/UX Designer', skills: ['Figma', 'Prototyping', 'Design Systems', 'Research', 'Accessibility'], min: 3, max: 6, salary: [9, 15], industry: 'Product & Design', focus: 'making complex workflows feel clear through research-led product design' },
  { title: 'Data Analyst', skills: ['SQL', 'Python', 'Power BI', 'Statistics', 'Excel'], min: 1, max: 4, salary: [6, 10], industry: 'Data & Analytics', focus: 'turning product and business data into decisions teams can act on' },
  { title: 'Python Developer', skills: ['Python', 'Django', 'PostgreSQL', 'Celery', 'AWS'], min: 2, max: 5, salary: [8, 13], industry: 'Software Development', focus: 'building maintainable Python services for data-rich products' },
  { title: 'Java Developer', skills: ['Java', 'Spring Boot', 'Kafka', 'Microservices', 'SQL'], min: 3, max: 6, salary: [10, 16], industry: 'Enterprise Technology', focus: 'developing robust Java services for business-critical platforms' },
]

const titlesByIndex = (role, index) => {
  const prefixes = ['Product', 'Senior', 'Platform', 'Associate', 'Lead']
  return `${prefixes[Math.floor(index / roles.length) % prefixes.length]} ${role.title}`
}

export const companiesData = companies

export const jobs = Array.from({ length: 60 }, (_, index) => {
  const role = roles[index % roles.length]
  const company = companies[Math.floor(index / roles.length) % companies.length]
  const location = locations[(index * 3 + Math.floor(index / roles.length)) % locations.length]
  const id = `JOB${String(1001 + index).padStart(4, '0')}`
  const title = titlesByIndex(role, index)
  const min = index % 17 === 0 ? 0 : role.min + (index % 3 === 0 ? 0 : index % 2)
  const max = min === 0 ? 1 : Math.max(min + 1, role.max + (index % 4 === 0 ? 1 : 0))
  const postedDay = 27 - (index % 12)
  const workMode = ['Hybrid', 'On-site', 'Remote'][index % 3]
  const employmentType = index % 9 === 0 ? 'Contract' : 'Full Time'
  const companySlug = company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const titleSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return {
    id,
    slug: `${titleSlug}-${companySlug}-${id}`,
    title,
    companyId: company.id,
    companyName: company.name,
    companyLogo: null,
    companyColor: company.color,
    companyVerified: company.verified,
    location: { ...location, country: 'India' },
    workMode,
    employmentType,
    experience: { min, max },
    salary: { min: role.salary[0] + (index % 3), max: role.salary[1] + (index % 3), currency: 'INR', visible: index % 11 !== 0 },
    skills: role.skills,
    postedAt: `2026-10-${String(Math.max(1, postedDay)).padStart(2, '0')}T09:00:00+05:30`,
    openings: 2 + (index % 5),
    applicantCount: 18 + ((index * 7) % 86),
    description: `${company.name} is looking for a ${title.toLowerCase()} to join a collaborative product team. You will be ${role.focus}, working closely with engineering, design, and customer teams to deliver measurable improvements.`,
    responsibilities: [
      `Own delivery of ${role.title.toLowerCase()} features from discovery through release.`,
      `Collaborate with product and design partners to turn user needs into reliable solutions.`,
      `Improve quality, performance, and documentation across the ${company.name} platform.`,
    ],
    requirements: [
      `Hands-on experience with ${role.skills.slice(0, 2).join(' and ')}.`,
      `A practical understanding of ${role.skills[2]} and modern software delivery.`,
      'Clear communication and a thoughtful approach to solving customer problems.',
    ],
    preferredQualifications: [`Experience with ${role.skills[3]}`, 'Comfort working in an iterative, cross-functional team.'],
    education: 'Bachelor’s degree or equivalent practical experience',
    benefits: ['Flexible working hours', 'Health insurance', 'Annual learning allowance', 'Paid time off'],
    industry: role.industry,
    isFeatured: index % 8 === 0,
    isVerified: company.verified,
    status: 'active',
  }
})

export const mockUser = {
  name: 'vishwa',
  headline: 'Product-minded software professional',
  location: 'Chennai, India',
  experience: 4,
  skills: ['React', 'TypeScript', 'Node.js', 'Figma', 'SQL'],
  preferredTitles: ['React Developer', 'Full Stack Developer', 'UI/UX Designer'],
  preferredCities: ['Chennai', 'Bengaluru', 'Remote'],
  expectedSalary: 1200000,
  summary: 'Curious builder who enjoys creating thoughtful digital experiences and collaborating across product teams.',
  workExperience: 'Product Engineer · Nimble Product Studio · 2022–Present\nBuilding accessible product interfaces and collaborating with design and backend teams.',
  education: 'Bachelor of Technology · Information Technology · 2018–2022',
}
