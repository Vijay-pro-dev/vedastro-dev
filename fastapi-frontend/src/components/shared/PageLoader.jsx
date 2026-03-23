function PageLoader({ message = "Loading..." }) {
  return (
    <div className="page-loader-shell" role="status" aria-live="polite">
      <div className="page-loader-spinner" />
      <p>{message}</p>
    </div>
  )
}

export default PageLoader
