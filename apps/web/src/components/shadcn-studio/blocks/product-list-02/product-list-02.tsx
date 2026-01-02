import { HeartIcon } from 'lucide-react'

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

import { cn } from '@/lib/utils'

export type ProductItem = {
  image: string
  imgAlt: string
  name: string
  price: number
  salePrice?: number
  cardClassName?: string
}

type ProductProps = {
  products: ProductItem[]
}

const ProductList = ({ products }: ProductProps) => {
  return (
    <section className='py-8 sm:py-16 lg:py-24'>
      <div className='mx-auto max-w-7xl space-y-12 px-4 sm:space-y-16 sm:px-6 lg:space-y-24 lg:px-8'>
        <h2 className='text-center text-2xl font-semibold sm:text-3xl lg:text-4xl'>New Sneaker And Sport shoes</h2>

        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {products.map((product, index) => (
            <Card
              key={index}
              className={cn('group border-none shadow-none', product.cardClassName, product.salePrice && 'relative')}
            >
              {/* Sale Badge */}
              {product.salePrice && (
                <Badge variant='destructive' className='absolute bottom-8 left-6'>
                  Sale
                </Badge>
              )}
              <CardContent className='flex flex-1 flex-col justify-between gap-6'>
                <div className='flex items-start justify-between gap-6'>
                  <a href='#' className='flex flex-col gap-1'>
                    <span className='text-muted-foreground text-lg font-medium'>{product.name}</span>
                    {!product.salePrice && <span className='text-2xl font-semibold'>${product.price.toFixed(2)}</span>}
                    {product.salePrice && (
                      <div className='flex items-center gap-2'>
                        <span className='text-2xl font-semibold'>${product.salePrice.toFixed(2)}</span>
                        <span className='text-muted-foreground text-sm line-through'>${product.price.toFixed(2)}</span>
                      </div>
                    )}
                  </a>
                  <CheckboxPrimitive.Root
                    data-slot='checkbox'
                    className='group focus-visible:ring-ring/50 bg-background data-[state=checked]:bg-primary rounded-full border p-2.5 shadow-xs outline-none focus-visible:ring-2'
                    aria-label='Heart icon'
                  >
                    <HeartIcon className='group-data-[state=checked]:stroke-primary-foreground size-4' />
                  </CheckboxPrimitive.Root>
                </div>
                <a href='#' className='py-5'>
                  <img
                    src={product.image}
                    alt={product.imgAlt}
                    className='mx-auto h-62.5 transition-transform duration-300 group-hover:scale-115'
                  />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ProductList
