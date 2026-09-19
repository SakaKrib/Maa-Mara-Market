import RegistrationForm from "../../../../../../components/register";


const RegisterPage = () => {
  return (
    <div className="mm-auth-page flex min-h-svh w-full flex-col items-center justify-center p-4 sm:p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <RegistrationForm />
      </div>
    </div>
  )
};
export default RegisterPage;