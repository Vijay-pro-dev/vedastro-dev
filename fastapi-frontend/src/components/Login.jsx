// import {useState} from "react"
// import axios from "axios"
// import {useNavigate} from "react-router-dom"

// function Login(){

// const[email,setEmail]=useState("")
// const[password,setPassword]=useState("")
// const navigate=useNavigate()

// const handleLogin=async()=>{

// try{

// const res = await axios.post("http://127.0.0.1:8000/login",{
// email:email,
// password:password
// })

// alert(res.data.message)

// navigate("/form")

// }catch(err){

// alert(err.response?.data?.detail)

// }

// }

// return(

// <div>

// <h2>Login</h2>

// <input
// placeholder="Email"
// onChange={(e)=>setEmail(e.target.value)}
// />

// <input
// type="password"
// placeholder="Password"
// onChange={(e)=>setPassword(e.target.value)}
// />

// <button onClick={handleLogin}>Login</button>

// </div>

// )

// }

// export default Login


import {useState} from "react"
import axios from "axios"
import {useNavigate} from "react-router-dom"

function Login(){

const navigate = useNavigate()

const [email,setEmail] = useState("")
const [password,setPassword] = useState("")

const handleLogin = async(e)=>{

e.preventDefault()

await axios.post("http://127.0.0.1:8000/login",{
email,
password
})

navigate("/form")

}

return (
  <div className="login-container">
    <div className="login-card">

      <h2>Welcome Back 👋</h2>

      <form onSubmit={handleLogin}>

        <div className="login-input">
          <input
            type="email"
            placeholder="Enter your email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="login-input">
          <input
            type="password"
            placeholder="Enter your password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="login-btn1" type="submit">
          Login
        </button>

      </form>

      <p
        className="login-link1"
        onClick={() => navigate("/signup")}
      >
        Don’t have an account? Signup
      </p>

    </div>
  </div>
);
}

export default Login