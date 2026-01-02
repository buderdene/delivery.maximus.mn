import Image from 'next/image'

// Util Imports
import { cn } from '@/lib/utils'

const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Image 
        src='/logos/maximus-logo.svg' 
        alt='Maximus Logo' 
        width={140} 
        height={40}
        priority
      />
    </div>
  )
}

export default Logo
