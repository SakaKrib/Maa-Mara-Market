import { useEffect, useState } from "react";
import LoginForm from "../AdminLogin/AdminLogin";



const AuthPage = ({initialMethod}) => {
    const [method, setMethod] = useState(initialMethod)



useEffect(() => {
    setMethod(initialMethod);

}, [initialMethod]);

const route = method ==='login' ? 'api/token/' : 'api/user/register:';

return (
    <div>
        <LoginForm route={route} method={method}/>
    </div>
);
}


export default AuthPage;