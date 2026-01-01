import RegisterForm from '@/components/auth/register-form'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">Create an account</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your information to get started
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}

