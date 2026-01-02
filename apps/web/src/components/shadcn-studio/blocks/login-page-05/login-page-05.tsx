import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

import Logo from '@/components/shadcn-studio/logo'
import AuthLines from '@/assets/svg/auth-lines'
import LoginForm from '@/components/shadcn-studio/blocks/login-page-05/login-form'

const Login = () => {
  return (
    <div className='bg-muted flex h-auto min-h-screen items-center justify-center px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-24'>
      <Card className='relative w-full max-w-md overflow-hidden border-none pt-12 shadow-lg'>
        <div className='to-primary/10 pointer-events-none absolute top-0 h-52 w-full rounded-t-xl bg-gradient-to-t from-transparent'></div>

        <AuthLines className='pointer-events-none absolute inset-x-0 top-0' />

        <CardHeader className='justify-center gap-6 text-center'>
          <Logo className='justify-center gap-3' />

          <div>
            <CardTitle className='mb-1.5 text-2xl'>Sales Maximus</CardTitle>
            <CardDescription className='text-base'>Нэвтрэх мэдээллээ оруулна уу</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <LoginForm />

          <div className='mt-6 flex items-center gap-4'>
            <Separator className='flex-1' />
            <p className='text-muted-foreground text-sm'>MAXIMUS ERP</p>
            <Separator className='flex-1' />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login
