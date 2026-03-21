import { useState } from "react"
import { useUser } from "../context/UserContext"

function ProfilePage() {
  const { user, updateUser } = useUser()

  const [isEditing, setIsEditing] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)

  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    birth_time: "",
    birth_place: "",
    address: ""
  })

  // 🔥 derive values (important)
  const displayData = isEditing ? formData : {
    name: user?.name || "",
    dob: user?.dob || "",
    birth_time: user?.birth_time || "",
    birth_place: user?.birth_place || "",
    address: user?.address || ""
  }

  const displayImage = imagePreview || user?.profile_pic || null

  const handleEdit = () => {
    setFormData({
      name: user?.name || "",
      dob: user?.dob || "",
      birth_time: user?.birth_time || "",
      birth_place: user?.birth_place || "",
      address: user?.address || ""
    })
    setImagePreview(user?.profile_pic || null)
    setIsEditing(true)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  // 🔥 IMAGE UPLOAD
  const uploadImage = async () => {
    if (!imageFile) return displayImage

    const fd = new FormData()
    fd.append("file", imageFile)

    const res = await fetch("http://127.0.0.1:8000/upload-profile-pic", {
      method: "POST",
      body: fd
    })

    const data = await res.json()
    return data.image_url
  }

  const handleSave = async () => {
    try {
      const imageUrl = await uploadImage()

      await fetch("http://127.0.0.1:8000/user/birth-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_email: user.email,
          ...formData,
          profile_pic: imageUrl
        })
      })

      // 🔥 update context
      updateUser({
        ...user,
        ...formData,
        profile_pic: imageUrl
      })

      setIsEditing(false)

    } catch (err) {
      console.error(err)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setImagePreview(null)
    setImageFile(null)
  }

  return (
    <div className="profile-container">
      <div className="profile-card">

        <h2>My Profile</h2>

        <div className="profile-grid">

          {/* LEFT */}
          <div className="profile-left">
            <img
              src={displayImage || "https://via.placeholder.com/150"}
              className="profile-img"
            />

            {isEditing && (
              <label className="file-upload">
                Choose Image
                <input type="file" onChange={handleImageChange} />
              </label>
            )}
          </div>

          {/* RIGHT */}
          <div className="profile-right">

            <div className="form-group">
              <label>Name</label>
              <input
                name="name"
                value={displayData.name}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>

            <div className="form-group">
              <label>Date of Birth</label>
              <input
                name="dob"
                value={displayData.dob}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>

            <div className="form-group">
              <label>Birth Time</label>
              <input
                name="birth_time"
                value={displayData.birth_time}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>

            <div className="form-group">
              <label>Birth Place</label>
              <input
                name="birth_place"
                value={displayData.birth_place}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                name="address"
                value={displayData.address}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>

          </div>
        </div>

        {/* BUTTONS */}
        <div className="profile-actions">

          {!isEditing ? (
            <button className="btn edit" onClick={handleEdit}>
              Edit
            </button>
          ) : (
            <>
              <button className="btn cancel" onClick={handleCancel}>
                Cancel
              </button>
              <button className="btn save" onClick={handleSave}>
                Save
              </button>
            </>
          )}

        </div>

      </div>
    </div>
  )
}

export default ProfilePage