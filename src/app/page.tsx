import { LoginForm } from "@/components/auth/LoginForm"
import Link from "next/link"

export const metadata = {
  title: "Discux3 - Login",
  description: "Sign in to your account",
}

export default function HomePage({
  searchParams,
}: {
  searchParams: { registered?: string }
}) {
  const showSuccess = searchParams.registered === 'true'
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to Discux3
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to sign in to your account
          </p>
        </div>
        <LoginForm showSuccess={showSuccess} />
        <p className="px-8 text-center text-sm text-muted-foreground">
          <Link
            href="/register"
            className="hover:text-brand underline underline-offset-4"
          >
            Don&apos;t have an account? Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}
