export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0B] px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-light tracking-[0.3em] text-[#D4A853]">
            MPM
          </h1>
          <p className="mt-1 text-xs tracking-[0.15em] text-neutral-500">
            EMPLOYEE PORTAL
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
