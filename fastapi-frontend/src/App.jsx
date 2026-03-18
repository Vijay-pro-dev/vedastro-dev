// import { BrowserRouter, Routes, Route } from "react-router-dom";

// import Login from "./components/Login";
// import Signup from "./components/Signup";
// import AdminLogin from "./components/AdminLogin";
// import UserForm from "./components/UserForm";
// import Dashboard from "./components/Dashboard";

// function App() {

// return (

// <BrowserRouter>

// <Routes>

// <Route path="/" element={<Signup />} />

// <Route path="/login" element={<Login />} />

// <Route path="/admin" element={<AdminLogin />} />

// <Route path="/form" element={<UserForm />} />

// <Route path="/dashboard" element={<Dashboard />} />

// </Routes>

// </BrowserRouter>

// )

// }

// export default App;

import { BrowserRouter, Routes, Route } from "react-router-dom"

import LandingPage from "./components/LandingPage"
import Login from "./components/Login"
import Signup from "./components/Signup"
import AdminLogin from "./components/AdminLogin"
import UserForm from "./components/UserForm"
import Dashboard from "./components/Dashboard"
import { UserProvider } from "./context/UserContext"

import "./App.css"

function App(){
  return(
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage/>} />
          <Route path="/signup" element={<Signup/>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/admin" element={<AdminLogin/>} />
          <Route path="/form" element={<UserForm/>} />
          <Route path="/dashboard" element={<Dashboard/>} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  )
}

export default App