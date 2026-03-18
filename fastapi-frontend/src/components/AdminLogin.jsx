import {useState} from "react"
import axios from "axios"

function AdminLogin(){

const[email,setEmail]=useState("")
const[password,setPassword]=useState("")

const handleAdmin=async()=>{

const res=await axios.post("http://127.0.0.1:8000/admin-login",{
email,
password

})

alert(res.data.message)

}

return(

<div>

<h2>Admin Login</h2>

<input placeholder="email"
onChange={(e)=>setEmail(e.target.value)}/>

<input type="password"
placeholder="password"
onChange={(e)=>setPassword(e.target.value)}/>

<button onClick={handleAdmin}>Login</button>

</div>

)

}

export default AdminLogin