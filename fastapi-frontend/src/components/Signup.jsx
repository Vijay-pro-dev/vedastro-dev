// import { useState } from "react"
// import axios from "axios"
// import { useNavigate } from "react-router-dom"

// function Signup(){

// const [email,setEmail]=useState("")
// const [password,setPassword]=useState("")
// const navigate=useNavigate()

// const handleSignup = async () => {

// try{

// const res = await axios.post("http://127.0.0.1:8000/signup",{
// email: email,
// password: password
// })

// alert(res.data.message)
// navigate("/login")

// }catch(error){

// console.log(error.response)

// alert(error.response?.data?.detail)

// }

// }

// return(

// <div>

// <h2>Signup</h2>

// <input
// placeholder="Email"
// onChange={(e)=>setEmail(e.target.value)}
// />

// <input
// type="password"
// placeholder="Password"
// onChange={(e)=>setPassword(e.target.value)}
// />

// <button onClick={handleSignup}>Signup</button>

// </div>

// )

// }

// export default Signup

import {useState} from "react"
import axios from "axios"
import {useNavigate,Link} from "react-router-dom"

function Signup(){

const navigate = useNavigate()

const [email,setEmail] = useState("")
const [password,setPassword] = useState("")

const handleSignup = async(e)=>{

e.preventDefault()

await axios.post("http://127.0.0.1:8000/signup",{
email,
password
})

navigate("/login")

}

return (
  <div className="signup-container">
    <div className="signup-card">

      <h2>Create Account </h2>

      <form onSubmit={handleSignup}>

        <div className="input-group">
          <input
            type="email"
            placeholder="Enter your email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="input-group">
          <input
            type="password"
            placeholder="Enter your password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit">Signup</button>

      </form>

      <p>
        Already have account? <Link to="/login">Login</Link>
      </p>

    </div>
  </div>
);

}

export default Signup