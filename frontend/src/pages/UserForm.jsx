import { useEffect, useId, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import BirthTimeQuestionnaire from "../components/profile/BirthTimeQuestionnaire"
import { useToast } from "../components/shared/ToastProvider"
import { useUser } from "../context/UserContext"
import { api } from "../lib/api"

const parseBirthPlace = (rawValue) => {
  const raw = String(rawValue || "").trim()
  if (!raw) return { city: "", district: "", country: "" }
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 3) {
    const country = parts[parts.length - 1]
    const district = parts[parts.length - 2]
    const city = parts.slice(0, -2).join(", ")
    return { city, district, country }
  }
  if (parts.length === 2) {
    return { city: parts[0], district: "", country: parts[1] }
  }
  return { city: parts[0], district: "", country: "" }
}

function SearchSelect({
  value,
  options,
  onChange,
  placeholder,
  disabled,
  loading,
  error,
  allowCustom = true,
  maxResults = 60,
  inputName,
}) {
  const wrapperRef = useRef(null)
  const reactId = useId()
  const listId = `ss-${reactId}`
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [query, setQuery] = useState("")

  const normalizedQuery = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!Array.isArray(options) || options.length === 0) return []
    if (!normalizedQuery) return options.slice(0, maxResults)
    return options.filter((opt) => String(opt).toLowerCase().includes(normalizedQuery)).slice(0, maxResults)
  }, [options, normalizedQuery, maxResults])

  useEffect(() => {
    if (!open) return undefined
    const onDocMouseDown = (event) => {
      if (!wrapperRef.current) return
      if (wrapperRef.current.contains(event.target)) return
      setOpen(false)
      setActiveIndex(-1)
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [open])

  const commitValue = (nextValue) => {
    const next = String(nextValue || "")
    setQuery(next)
    onChange(next)
    setOpen(false)
    setActiveIndex(-1)
  }

  const onInputChange = (next) => {
    setQuery(next)
    if (allowCustom) onChange(next)
    setOpen(true)
    setActiveIndex(-1)
  }

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((curr) => Math.min(curr + 1, filtered.length - 1))
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((curr) => Math.max(curr - 1, 0))
      return
    }
    if (event.key === "Enter") {
      if (!open) return
      event.preventDefault()
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        commitValue(filtered[activeIndex])
      } else if (allowCustom) {
        commitValue(query)
      }
      return
    }
    if (event.key === "Escape") {
      event.preventDefault()
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <input
        name={inputName}
        className={error ? "input-invalid" : ""}
        value={open ? query : (value || "")}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => {
          setQuery(value || "")
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={Boolean(error)}
      />

      {open && !disabled && (
        <div
          id={listId}
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 50,
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            maxHeight: 260,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 8,
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          }}
        >
          {loading && (
            <div style={{ padding: "10px 12px", fontSize: 14, opacity: 0.8 }}>
              Loading...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: 14, opacity: 0.8 }}>
              No results
            </div>
          )}

          {!loading &&
            filtered.map((opt, idx) => {
              const isActive = idx === activeIndex
              return (
                <div
                  key={`${opt}-${idx}`}
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => {
                    // Prevent blur before selection
                    e.preventDefault()
                    commitValue(opt)
                  }}
                  style={{
                    padding: "10px 12px",
                    cursor: "pointer",
                    background: isActive ? "rgba(59,130,246,0.14)" : "transparent",
                  }}
                >
                  {opt}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

const LOCATION_API_BASE =
  import.meta.env.VITE_LOCATION_API_BASE || "https://countriesnow.space/api/v0.1"

const buildLocationUrl = (path) => {
  const base = String(LOCATION_API_BASE).replace(/\/+$/, "")
  const cleanedPath = String(path || "").replace(/^\/+/, "")
  return `${base}/${cleanedPath}`
}

function UserForm() {
  const navigate = useNavigate()
  const { user, updateUser, t } = useUser()
  const { showError, showSuccess } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [countryCode, setCountryCode] = useState("+91")
  const [timeParts, setTimeParts] = useState({ hour: "12", minute: "00", meridiem: "AM" })

  const [birthTimeKnowledge, setBirthTimeKnowledge] = useState("yes")
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    dob: "",
    birth_time: "",
    birth_place: "",
    birth_time_accuracy: "exact",
  })

  const [birthCountry, setBirthCountry] = useState("India")
  const [birthDistrict, setBirthDistrict] = useState("")
  const [birthCity, setBirthCity] = useState("")
  const [countryOptions, setCountryOptions] = useState([])
  const [districtOptions, setDistrictOptions] = useState([])
  const [cityOptions, setCityOptions] = useState([])
  const [locationLoading, setLocationLoading] = useState({ countries: false, districts: false, cities: false })
  const [locationError, setLocationError] = useState("")
  const locationCacheRef = useRef({
    countries: null,
    districtsByCountry: {},
    citiesByCountryDistrict: {},
  })
  const [careerData, setCareerData] = useState({
    education: "",
    interests: "",
    goals: "",
    current_role: "",
    years_experience: 0,
    goal_clarity: "medium",
    role_match: "medium",
  })
  const MAX_NAME_WORDS = 60

  const validateFullName = (value) => {
    const trimmed = value.trim()
    if (!trimmed) return { isValid: false, message: "Full name is required." }
    if (trimmed.length < 4 || trimmed.length > 50) return { isValid: false, message: "Full name must be 4-50 characters." }
    const words = trimmed.split(/\s+/)
    if (words.length < 2) return { isValid: false, message: "Enter at least first and last name." }
    if (words.some((w) => w.length < 2)) return { isValid: false, message: "Each name part must be at least 2 letters." }
    if (!/^[A-Za-z]+( [A-Za-z]+)+$/.test(trimmed)) return { isValid: false, message: "Use letters only with single spaces; no numbers or symbols." }
    if (words.length > MAX_NAME_WORDS) return { isValid: false, message: `Full name cannot exceed ${MAX_NAME_WORDS} words.` }
    return { isValid: true, message: "Valid Full Name" }
  }

  const validateCurrentRole = (value) => {
    const trimmed = value.trim()
    if (trimmed.length < 2) return { isValid: false, message: "Current role must be at least 2 characters." }
    if (trimmed.length > 50) return { isValid: false, message: "Current role must be at most 50 characters." }
    if (!/^[A-Za-z&/ -]+$/.test(trimmed)) return { isValid: false, message: "Use only letters, spaces, and & / - symbols." }
    if (/^[^A-Za-z]*$/.test(trimmed)) return { isValid: false, message: "Current role must contain letters." }
    if (/^[0-9 ]+$/.test(trimmed)) return { isValid: false, message: "Numbers-only role is not allowed." }
    return { isValid: true, message: "Valid" }
  }

  const validateEducation = (value) => {
    const trimmed = value.trim()
    if (trimmed.length < 2) return { isValid: false, message: "Education must be at least 2 characters." }
    if (trimmed.length > 100) return { isValid: false, message: "Education seems too long." }
    if (!/^[A-Za-z., ]+$/.test(trimmed)) return { isValid: false, message: "Use letters, spaces, dots, and commas only." }
    return { isValid: true, message: "Valid" }
  }

  const validateExperience = (value) => {
    if (value === "" || value === null) return { isValid: false, message: "Experience is required." }
    const num = Number(value)
    if (!Number.isFinite(num)) return { isValid: false, message: "Experience must be a number." }
    if (num < 0 || num > 50) return { isValid: false, message: "Experience must be between 0 and 50." }
    return { isValid: true, message: "Valid" }
  }

  const validateInterests = (value) => {
    const trimmed = value.trim()
    if (trimmed.length < 3) return { isValid: false, message: "Interests must be at least 3 characters." }
    if (trimmed.length > 200) return { isValid: false, message: "Interests must be under 200 characters." }
    if (/^[0-9 ,]+$/.test(trimmed)) return { isValid: false, message: "Interests cannot be numbers only." }
    return { isValid: true, message: "Valid" }
  }

  const validateGoals = (value) => {
    const trimmed = value.trim()
    if (trimmed.length < 10) return { isValid: false, message: "Goals must be at least 10 characters." }
    if (trimmed.length > 300) return { isValid: false, message: "Goals must be under 300 characters." }
    const lower = trimmed.toLowerCase()
    if (["nothing", "idk", "none", "na"].includes(lower)) return { isValid: false, message: "Please enter a meaningful goal." }
    if (/^[0-9 ]+$/.test(trimmed)) return { isValid: false, message: "Goals cannot be numbers only." }
    return { isValid: true, message: "Valid" }
  }

  const validateAddress = (value) => {
    const trimmed = value.trim()
    // Address is optional. Validate only when user provides a value.
    if (!trimmed) return { isValid: true, message: "Valid" }
    if (trimmed.length < 10) return { isValid: false, message: "Address must be at least 10 characters." }
    if (trimmed.length > 200) return { isValid: false, message: "Address must be under 200 characters." }
    if (!/^[A-Za-z0-9 ,/-]+$/.test(trimmed)) return { isValid: false, message: "Use letters, numbers, spaces, commas, hyphens, and slashes only." }
    if (/^[0-9 ]+$/.test(trimmed)) return { isValid: false, message: "Address cannot be numbers only." }
    return { isValid: true, message: "Valid" }
  }

  useEffect(() => {
    let cancelled = false
    const loadCountries = async () => {
      if (locationCacheRef.current.countries) {
        setCountryOptions(locationCacheRef.current.countries)
        return
      }
      setLocationLoading((curr) => ({ ...curr, countries: true }))
      setLocationError("")
      try {
        const response = await fetch(buildLocationUrl("/countries/positions"))
        const data = await response.json()
        const list = (data?.data || [])
          .map((row) => row?.name)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
        if (cancelled) return
        locationCacheRef.current.countries = list
        setCountryOptions(list)
      } catch (error) {
        console.error("Failed to load countries", error)
        if (!cancelled) setLocationError("Could not load countries list. Please try again.")
      } finally {
        if (!cancelled) setLocationLoading((curr) => ({ ...curr, countries: false }))
      }
    }
    loadCountries()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadDistricts = async () => {
      const country = birthCountry.trim()
      if (!country) {
        setDistrictOptions([])
        return
      }
      if (locationCacheRef.current.districtsByCountry[country]) {
        setDistrictOptions(locationCacheRef.current.districtsByCountry[country])
        return
      }
      setLocationLoading((curr) => ({ ...curr, districts: true }))
      setLocationError("")
      try {
        const response = await fetch(buildLocationUrl("/countries/states"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country }),
        })
        const data = await response.json()
        const list = (data?.data?.states || [])
          .map((row) => row?.name)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
        if (cancelled) return
        locationCacheRef.current.districtsByCountry[country] = list
        setDistrictOptions(list)
      } catch (error) {
        console.error("Failed to load districts", error)
        if (!cancelled) setLocationError("Could not load districts/states list. Please type it manually.")
      } finally {
        if (!cancelled) setLocationLoading((curr) => ({ ...curr, districts: false }))
      }
    }
    loadDistricts()
    return () => {
      cancelled = true
    }
  }, [birthCountry])

  useEffect(() => {
    let cancelled = false
    const loadCities = async () => {
      const country = birthCountry.trim()
      const district = birthDistrict.trim()
      if (!country || !district) {
        setCityOptions([])
        return
      }
      if (districtOptions.length > 0 && !districtOptions.includes(district)) {
        // Avoid calling API for partial/non-matching district while typing.
        setCityOptions([])
        return
      }
      const cacheKey = `${country}::${district}`
      if (locationCacheRef.current.citiesByCountryDistrict[cacheKey]) {
        setCityOptions(locationCacheRef.current.citiesByCountryDistrict[cacheKey])
        return
      }
      setLocationLoading((curr) => ({ ...curr, cities: true }))
      setLocationError("")
      try {
        const response = await fetch(buildLocationUrl("/countries/state/cities"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country, state: district }),
        })
        const data = await response.json()
        const list = (data?.data || [])
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
        if (cancelled) return
        locationCacheRef.current.citiesByCountryDistrict[cacheKey] = list
        setCityOptions(list)
      } catch (error) {
        console.error("Failed to load cities", error)
        if (!cancelled) setLocationError("Could not load cities list. Please type your city manually.")
      } finally {
        if (!cancelled) setLocationLoading((curr) => ({ ...curr, cities: false }))
      }
    }
    loadCities()
    return () => {
      cancelled = true
    }
  }, [birthCountry, birthDistrict, districtOptions])

  useEffect(() => {
    const composed = [birthCity.trim(), birthDistrict.trim(), birthCountry.trim()].filter(Boolean).join(", ")
    setFormData((current) => (current.birth_place === composed ? current : { ...current, birth_place: composed }))
  }, [birthCity, birthDistrict, birthCountry])

  const handleBirthCountryChange = (nextCountry) => {
    setBirthCountry(nextCountry)
    setBirthDistrict("")
    setBirthCity("")
    setDistrictOptions([])
    setCityOptions([])
    setErrors((current) => ({ ...current, birth_country: "", birth_district: "", birth_city: "" }))
  }

  const handleBirthDistrictChange = (nextDistrict) => {
    setBirthDistrict(nextDistrict)
    setBirthCity("")
    setCityOptions([])
    setErrors((current) => ({ ...current, birth_district: "", birth_city: "" }))
  }

  const handleBirthCityChange = (nextCity) => {
    setBirthCity(nextCity)
    setErrors((current) => ({ ...current, birth_city: "" }))
  }

  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem("token")
      if (!token) {
        // unauthenticated: start with blank form, skip fetch
        setLoading(false)
        return
      }
      try {
        const response = await api.get("/profile")
        const profile = response.data

        // derive country code + local number if present
        if (profile.phone) {
          const phoneDigits = profile.phone.replace(/[^0-9+]/g, "")
          const phoneMatch = phoneDigits.match(/^(\+?\d{1,3})?(\d{10,})$/)
          if (phoneMatch) {
            setCountryCode(phoneMatch[1] || "+91")
            setFormData((prev) => ({ ...prev, phone: phoneMatch[2].slice(0, 10) }))
          } else {
            setFormData((prev) => ({ ...prev, phone: profile.phone }))
          }
        }

        const deriveTimeParts = (timeStr) => {
          if (!timeStr) return { hour: "12", minute: "00", meridiem: "AM" }
          const parts = timeStr.trim().toLowerCase()
          const match12 = parts.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)$/)
          if (match12) {
            return {
              hour: String(Number(match12[1])).padStart(2, "0"),
              minute: match12[2],
              meridiem: match12[4].toUpperCase(),
            }
          }
          const match24 = parts.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
          if (match24) {
            let h = Number(match24[1])
            const meridiem = h >= 12 ? "PM" : "AM"
            h = h % 12 || 12
            return {
              hour: String(h).padStart(2, "0"),
              minute: match24[2],
              meridiem,
            }
          }
          return { hour: "12", minute: "00", meridiem: "AM" }
        }

        setFormData({
          name: profile.name || "",
          phone: profile.phone ? profile.phone.replace(/[^0-9]/g, "").slice(-10) : "",
          address: profile.address || "",
          dob: profile.dob || "",
          birth_time: profile.birth_time || "",
          birth_place: profile.birth_place || "",
          birth_time_accuracy: profile.birth_time_accuracy || "unknown",
        })
        setTimeParts(deriveTimeParts(profile.birth_time))
        const parsedBirthPlace = parseBirthPlace(profile.birth_place || "")
        setBirthCountry(parsedBirthPlace.country || "India")
        setBirthDistrict(parsedBirthPlace.district || "")
        setBirthCity(parsedBirthPlace.city || "")
        setCareerData({
          education: profile.education || "",
          interests: profile.interests || "",
          goals: profile.goals || "",
          current_role: profile.current_role || "",
          years_experience: profile.years_experience || 0,
          goal_clarity: profile.goal_clarity || "medium",
          role_match: profile.role_match || "medium",
        })
        if (profile.birth_time_accuracy === "estimated_by_ai") {
          setBirthTimeKnowledge("no")
        }
      } catch (error) {
        console.error("Failed to load profile", error)
        showError("Could not load your saved profile data.")
      }
      setLoading(false)
    }

    loadProfile()
  }, [showError])

  const validateBirthStep = () => {
    const nextErrors = {}
    const nameCheck = validateFullName(formData.name)
    if (!nameCheck.isValid) nextErrors.name = nameCheck.message
    if (!formData.phone.trim()) {
      nextErrors.phone = "Phone number is required."
    } else if (!/^\d{10}$/.test(formData.phone.trim())) {
      nextErrors.phone = "Phone number should be exactly 10 digits."
    }
    if (!formData.dob) {
      nextErrors.dob = "Date of birth is required."
    } else if (new Date(formData.dob) > new Date()) {
      nextErrors.dob = "Date of birth cannot be in the future."
    }
    const isValidBirthTime = (value) =>
      /^([01]?\d|2[0-3]):[0-5]\d$/.test(value.trim())

    if (birthTimeKnowledge !== "no" && !formData.birth_time) {
      nextErrors.birth_time = "Birth time is required."
    } else if (birthTimeKnowledge !== "no" && formData.birth_time && !isValidBirthTime(formData.birth_time)) {
      nextErrors.birth_time = "Enter a valid time (HH:MM)"
    }
    if (!birthCountry.trim()) nextErrors.birth_country = "Country is required."
    if (!birthDistrict.trim()) nextErrors.birth_district = "District/State is required."
    if (!birthCity.trim()) nextErrors.birth_city = "City is required."
    const addressCheck = validateAddress(formData.address || "")
    if (!addressCheck.isValid) nextErrors.address = addressCheck.message
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const validateCareerStep = () => {
    const nextErrors = {}
    const roleCheck = validateCurrentRole(careerData.current_role)
    if (!roleCheck.isValid) nextErrors.current_role = roleCheck.message

    const eduCheck = validateEducation(careerData.education)
    if (!eduCheck.isValid) nextErrors.education = eduCheck.message

    const expCheck = validateExperience(careerData.years_experience)
    if (!expCheck.isValid) nextErrors.years_experience = expCheck.message

    const interestCheck = validateInterests(careerData.interests)
    if (!interestCheck.isValid) nextErrors.interests = interestCheck.message

    const goalsCheck = validateGoals(careerData.goals)
    if (!goalsCheck.isValid) nextErrors.goals = goalsCheck.message

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleBirthTimeKnowledge = (knowledge) => {
    setBirthTimeKnowledge(knowledge)
    if (knowledge === "yes") {
      setFormData((current) => ({ ...current, birth_time_accuracy: "exact" }))
      setCurrentStep(1)
      setShowQuestionnaire(false)
      return
    }
    if (knowledge === "approximate") {
      setFormData((current) => ({ ...current, birth_time_accuracy: "approximate" }))
      setCurrentStep(1)
      setShowQuestionnaire(false)
      return
    }
    setShowQuestionnaire(true)
  }

  const handleFormChange = (event) => {
    const { name, value } = event.target
    if (name === "birth_country") {
      handleBirthCountryChange(value)
      return
    }
    if (name === "birth_district") {
      handleBirthDistrictChange(value)
      return
    }
    if (name === "birth_city") {
      handleBirthCityChange(value)
      return
    } else if (name === "phone") {
      // keep only digits for local part
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10)
      setFormData((current) => ({ ...current, [name]: digitsOnly }))
    } else if (name === "name") {
      const normalized = value.replace(/\s+/g, " ").trimStart()
      const err = (() => {
        const trimmed = normalized.trim()
        if (!trimmed) return "Full name is required."
        if (trimmed.length < 4 || trimmed.length > 50) return "Full name must be 4-50 characters."
        const words = trimmed.split(/\s+/)
        if (words.length < 2) return "Enter at least first and last name."
        if (words.some((w) => w.length < 2)) return "Each name part must be at least 2 letters."
        if (!/^[A-Za-z]+( [A-Za-z]+)+$/.test(trimmed)) return "Use letters only with single spaces; no numbers or symbols."
        return ""
      })()
      // hard trim length to 50 to prevent overflow typing
      const clipped = normalized.length > 50 ? normalized.slice(0, 50) : normalized
      setFormData((current) => ({ ...current, [name]: clipped }))
      setErrors((current) => ({ ...current, name: err }))
    } else if (name === "address") {
      const normalized = value.replace(/\s+/g, " ").trimStart()
      const clipped = normalized.length > 200 ? normalized.slice(0, 200) : normalized
      const check = validateAddress(clipped)
      setFormData((current) => ({ ...current, address: clipped }))
      setErrors((current) => ({ ...current, address: check.isValid ? "" : check.message }))
    } else if (["birth_hour", "birth_minute", "birth_meridiem"].includes(name)) {
      setTimeParts((current) => {
        const updated = { ...current, [name.replace("birth_", "")]: value }
        const hourNum = Number(updated.hour) % 12 || 12
        const minuteNum = Number(updated.minute) % 60
        const isPM = updated.meridiem === "PM"
        const hour24 = (hourNum % 12) + (isPM ? 12 : 0)
        const composed = `${String(hour24).padStart(2, "0")}:${String(minuteNum).padStart(2, "0")}`
        setFormData((curr) => ({ ...curr, birth_time: composed }))
        return updated
      })
    } else {
      setFormData((current) => ({ ...current, [name]: value }))
    }
    setErrors((current) => ({ ...current, [name]: "" }))
  }

  const handleCareerChange = (event) => {
    const { name, value } = event.target
    const sanitized =
      name === "years_experience"
        ? value.replace(/[^\d.-]/g, "")
        : value

    setCareerData((current) => ({
      ...current,
      [name]: name === "years_experience" ? (sanitized === "" ? "" : Number(sanitized)) : sanitized,
    }))

    // run field-level validation
    let err = ""
    if (name === "current_role") {
      const check = validateCurrentRole(sanitized)
      if (!check.isValid) err = check.message
    } else if (name === "education") {
      const check = validateEducation(sanitized)
      if (!check.isValid) err = check.message
    } else if (name === "years_experience") {
      const check = validateExperience(sanitized === "" ? "" : Number(sanitized))
      if (!check.isValid) err = check.message
    } else if (name === "interests") {
      const check = validateInterests(sanitized.trim())
      if (!check.isValid) err = check.message
    } else if (name === "goals") {
      const check = validateGoals(sanitized)
      if (!check.isValid) err = check.message
    }

    setErrors((current) => ({ ...current, [name]: err }))
  }

  const handleSaveBirthData = async () => {
    if (!validateBirthStep()) {
      showError("Please fix the highlighted personal profile fields.")
      return
    }
    const birthPlaceValue = formData.birth_place.trim()
    const token = localStorage.getItem("token")
    const phoneWithCode = `${countryCode}${formData.phone}`
    if (!token) {
      // guest flow: keep data locally and move ahead
      localStorage.setItem(
        "guest_profile_draft",
        JSON.stringify({ formData: { ...formData, birth_place: birthPlaceValue, phone: phoneWithCode }, careerData })
      )
      setCurrentStep(2)
      showSuccess("Profile saved locally. Create an account later to sync.")
      return
    }
    setSaving(true)
    try {
      const response = await api.put("/profile", {
        ...formData,
        phone: phoneWithCode,
        birth_place: birthPlaceValue,
      })
      updateUser(response.data)
      showSuccess("Personal profile saved successfully.")
      setCurrentStep(2)
    } catch (error) {
      showError(error.response?.data?.detail || "Error saving birth data")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCareerProfile = async () => {
    if (!validateCareerStep()) {
      showError("Please fix the highlighted career profile fields.")
      return
    }
    const birthPlaceValue = formData.birth_place.trim()
    const phoneWithCode = `${countryCode}${formData.phone}`
    const token = localStorage.getItem("token")
    if (!token) {
      localStorage.setItem(
        "guest_profile_draft",
        JSON.stringify({ formData: { ...formData, birth_place: birthPlaceValue, phone: phoneWithCode }, careerData })
      )
      showSuccess("Profile saved locally. Sign up later to keep it in your account.")
      navigate("/dashboard", { state: { guestProfile: { ...formData, phone: phoneWithCode, birth_place: birthPlaceValue, ...careerData } } })
      return
    }
    setSaving(true)
    try {
      const response = await api.put("/profile", {
        ...formData,
        phone: phoneWithCode,
        birth_place: birthPlaceValue,
        ...careerData,
      })
      updateUser(response.data)
      showSuccess("Career profile saved successfully.")
      navigate("/dashboard")
    } catch (error) {
      showError(error.response?.data?.detail || "Error saving career profile")
    } finally {
      setSaving(false)
    }
  }

  if (showQuestionnaire) {
    return (
      <BirthTimeQuestionnaire
        userId={user?.user_id}
        onComplete={() => {
          setShowQuestionnaire(false)
          setCurrentStep(1)
        }}
        onClose={() => {
          setShowQuestionnaire(false)
          setCurrentStep(0)
        }}
      />
    )
  }

  if (loading) {
    return (
      <div className="user-form-container">
        <div className="skeleton-card">
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      </div>
    )
  }

  return (
    <div className="user-form-container">
      {currentStep === 0 && (
        <div className="form-card">
          <button
            type="button"
            className="form-card-close"
            aria-label="Close"
            onClick={() => navigate(-1)}
          >
            ✕
          </button>
          <h2>{t.birthTimeSetup}</h2>
          <p className="form-subtitle">{t.birthTimeSub}</p>

          <div className="birth-time-options">
            <button className="option-btn" onClick={() => handleBirthTimeKnowledge("yes")}>
              <span className="option-icon">Yes</span>
              <span className="option-text">{t.knowExactBirthTime}</span>
            </button>
            <button className="option-btn" onClick={() => handleBirthTimeKnowledge("approximate")}>
              <span className="option-icon">Near</span>
              <span className="option-text">{t.knowApproxBirthTime}</span>
            </button>
            <button className="option-btn" onClick={() => handleBirthTimeKnowledge("no")}>
              <span className="option-icon">AI</span>
              <span className="option-text">{t.estimateWithAi}</span>
            </button>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <div className="form-card">
          <h2>{t.personalProfile}</h2>

          <div className="input-group">
            <label>{t.fullName}</label>
            <input className={errors.name ? "input-invalid" : ""} name="name" value={formData.name} onChange={handleFormChange} />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>

          <div className="input-group">
            <label>{t.phone}</label>
            <div className="phone-row">
              <select
                className="country-code"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                aria-label="Country code"
              >
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
                <option value="+61">+61</option>
                <option value="+971">+971</option>
              </select>
              <input
                className={errors.phone ? "input-invalid" : ""}
                name="phone"
                value={formData.phone}
                onChange={handleFormChange}
                placeholder="10-digit number"
                inputMode="numeric"
              />
            </div>
            {errors.phone && <p className="field-error">{errors.phone}</p>}
          </div>

          <div className="input-group">
            <label>{t.dateOfBirth}</label>
            <input
              className={errors.dob ? "input-invalid" : ""}
              type="date"
              name="dob"
              value={formData.dob}
              max={new Date().toISOString().split("T")[0]}
              onChange={handleFormChange}
            />
            {errors.dob && <p className="field-error">{errors.dob}</p>}
          </div>

          {birthTimeKnowledge !== "no" && (
            <div className="input-group">
              <label>{t.birthTime}</label>
              <div className="time-grid">
                <select
                  name="birth_hour"
                  value={timeParts.hour}
                  onChange={handleFormChange}
                  aria-label="Hour"
                >
                  {[...Array(12)].map((_, i) => {
                    const val = String((i + 1)).padStart(2, "0")
                    return (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    )
                  })}
                </select>
                <span className="time-sep">:</span>
                <select
                  name="birth_minute"
                  value={timeParts.minute}
                  onChange={handleFormChange}
                  aria-label="Minutes"
                >
                  {[...Array(60)].map((_, i) => {
                    const val = String(i).padStart(2, "0")
                    return (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    )
                  })}
                </select>
                <select
                  name="birth_meridiem"
                  value={timeParts.meridiem}
                  onChange={handleFormChange}
                  aria-label="AM or PM"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
              {errors.birth_time && <p className="field-error">{errors.birth_time}</p>}
            </div>
          )}

          <div className="input-group">
            <label>{t.birthCountry || "Birth Country"}</label>
            <SearchSelect
              inputName="birth_country"
              value={birthCountry}
              options={countryOptions}
              onChange={handleBirthCountryChange}
              placeholder={t.selectCountry || "Select country"}
              disabled={locationLoading.countries}
              loading={locationLoading.countries}
              error={errors.birth_country}
              allowCustom={false}
              maxResults={300}
            />
            {errors.birth_country && <p className="field-error">{errors.birth_country}</p>}
          </div>

          <div className="input-group">
            <label>{t.birthDistrict || "Birth District/State"}</label>
            <SearchSelect
              inputName="birth_district"
              value={birthDistrict}
              options={districtOptions}
              onChange={handleBirthDistrictChange}
              placeholder={t.selectDistrict || "Select or type district/state"}
              disabled={!birthCountry || locationLoading.districts}
              loading={locationLoading.districts}
              error={errors.birth_district}
              allowCustom
              maxResults={200}
            />
            {errors.birth_district && <p className="field-error">{errors.birth_district}</p>}
          </div>

          <div className="input-group">
            <label>{t.birthCity || "Birth City"}</label>
            <SearchSelect
              inputName="birth_city"
              value={birthCity}
              options={cityOptions}
              onChange={handleBirthCityChange}
              placeholder={t.selectCity || "Select or type city"}
              disabled={!birthCountry || !birthDistrict || locationLoading.cities}
              loading={locationLoading.cities}
              error={errors.birth_city}
              allowCustom
              maxResults={200}
            />
            {errors.birth_city && <p className="field-error">{errors.birth_city}</p>}
            {locationError && <p className="field-error">{locationError}</p>}
          </div>

          <div className="input-group">
            <label>{t.address}</label>
            <textarea className={errors.address ? "input-invalid" : ""} name="address" value={formData.address} onChange={handleFormChange} rows="3" />
            {errors.address && <p className="field-error">{errors.address}</p>}
          </div>

          <div className="button-group">
            <button className="btn-secondary" onClick={() => setCurrentStep(0)}>
              {t.back}
            </button>
            <button className="btn-primary" onClick={handleSaveBirthData} disabled={saving}>
              {saving ? t.saving : t.next}
            </button>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="form-card">
          <h2>{t.careerProfile}</h2>

          <div className="input-group">
            <label>{t.currentRole}</label>
            <input className={errors.current_role ? "input-invalid" : ""} name="current_role" value={careerData.current_role} onChange={handleCareerChange} />
            {errors.current_role && <p className="field-error">{errors.current_role}</p>}
          </div>

          <div className="input-group">
            <label>{t.education}</label>
            <input className={errors.education ? "input-invalid" : ""} name="education" value={careerData.education} onChange={handleCareerChange} />
            {errors.education && <p className="field-error">{errors.education}</p>}
          </div>

          <div className="input-group">
            <label>{t.yearsOfExperience}</label>
            <input
              type="number"
              min="0"
              name="years_experience"
              value={careerData.years_experience}
              onChange={handleCareerChange}
            />
            {errors.years_experience && <p className="field-error">{errors.years_experience}</p>}
          </div>

          <div className="input-group">
            <label>{t.interests}</label>
            <textarea className={errors.interests ? "input-invalid" : ""} name="interests" value={careerData.interests} onChange={handleCareerChange} rows="3" />
            {errors.interests && <p className="field-error">{errors.interests}</p>}
          </div>

          <div className="input-group">
            <label>{t.goals}</label>
            <textarea className={errors.goals ? "input-invalid" : ""} name="goals" value={careerData.goals} onChange={handleCareerChange} rows="3" />
            {errors.goals && <p className="field-error">{errors.goals}</p>}
          </div>

          <div className="input-group">
            <label>{t.goalClarity}</label>
            <select name="goal_clarity" value={careerData.goal_clarity} onChange={handleCareerChange}>
              <option value="low">{t.low}</option>
              <option value="medium">{t.medium}</option>
              <option value="high">{t.high}</option>
            </select>
          </div>

          <div className="input-group">
            <label>{t.roleMatch}</label>
            <select name="role_match" value={careerData.role_match} onChange={handleCareerChange}>
              <option value="low">{t.low}</option>
              <option value="medium">{t.medium}</option>
              <option value="high">{t.high}</option>
            </select>
          </div>

          <div className="button-group">
            <button className="btn-secondary" onClick={() => setCurrentStep(1)}>
              {t.back}
            </button>
            <button className="btn-primary" onClick={handleSaveCareerProfile} disabled={saving}>
              {saving ? t.saving : t.complete}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserForm
