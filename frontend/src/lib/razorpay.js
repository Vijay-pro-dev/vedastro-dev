export function loadRazorpay() {
  if (typeof window === "undefined") return Promise.reject(new Error("Razorpay requires a browser"))
  if (window.Razorpay) return Promise.resolve(true)

  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"))
    document.body.appendChild(script)
  })
}

