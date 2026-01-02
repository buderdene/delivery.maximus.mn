import { HeartIcon, StarIcon } from 'lucide-react'

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel'

export type ProductItem = {
  productSrc: string
  productAlt: string
  productLink: string
  name: string
  rating: number
  discountedPrice?: number
  originalPrice: number
}

type ProductProps = {
  products: ProductItem[]
}

const ProductList = ({ products }: ProductProps) => {
  return (
    <section className='bg-muted py-8 sm:py-16 lg:py-24'>
      <Carousel
        className='mx-auto flex max-w-7xl flex-col gap-12 px-4 sm:gap-16 sm:px-6 lg:gap-24 lg:px-8'
        opts={{
          align: 'start',
          slidesToScroll: 1
        }}
      >
        <div className='flex justify-between gap-6'>
          <h2 className='grow text-2xl font-semibold sm:text-3xl lg:text-4xl'>Trending In Western Wear</h2>

          <div className='flex items-start gap-4'>
            <CarouselPrevious
              variant='default'
              className='disabled:bg-primary/10 disabled:text-primary static size-10 translate-y-0 rounded-md disabled:opacity-100'
            />
            <CarouselNext
              variant='default'
              className='disabled:bg-primary/10 disabled:text-primary static size-10 translate-y-0 rounded-md disabled:opacity-100'
            />
          </div>
        </div>

        {/* Product Carousel */}
        <div className='relative'>
          <CarouselContent className='sm:-ml-6'>
            {products.map((product, index) => (
              <CarouselItem key={index} className='sm:basis-1/2 sm:pl-6 lg:basis-1/3 xl:basis-1/4'>
                <Card className='gap-0 overflow-hidden border-none py-0 shadow-none'>
                  <div className='relative'>
                    {product.discountedPrice && (
                      <Badge
                        variant='destructive'
                        className='absolute top-2.5 left-2.5 rounded-sm border-none uppercase'
                      >
                        Sale
                      </Badge>
                    )}
                    <a href={product.productLink}>
                      <img src={product.productSrc} alt={product.productAlt} className='w-full' />
                    </a>
                    <CheckboxPrimitive.Root
                      data-slot='checkbox'
                      className='group focus-visible:ring-ring/50 bg-background data-[state=checked]:bg-primary absolute right-2.5 bottom-2.5 rounded-full p-2.5 shadow-xs outline-none focus-visible:ring-2'
                      aria-label='Add wishlist'
                    >
                      <HeartIcon className='group-data-[state=checked]:stroke-primary-foreground size-4' />
                    </CheckboxPrimitive.Root>
                  </div>
                  <CardContent className='flex flex-col gap-1 py-4'>
                    <div className='flex items-start justify-between gap-1'>
                      <a href={product.productLink}>
                        <span className='text-muted-foreground text-lg'>{product.name}</span>
                      </a>
                      <Badge className='bg-amber-600/10 text-amber-600 focus-visible:ring-amber-600/20 focus-visible:outline-none dark:bg-amber-400/10 dark:text-amber-400 dark:focus-visible:ring-amber-400/40'>
                        <StarIcon />
                        {product.rating}
                      </Badge>
                    </div>

                    <a href={product.productLink}>
                      {!product.discountedPrice && (
                        <span className='text-2xl font-semibold'>${product.originalPrice.toFixed(2)}</span>
                      )}

                      {product.discountedPrice && (
                        <div className='flex items-center gap-2'>
                          <span className='text-2xl font-semibold'>${product.discountedPrice.toFixed(2)}</span>
                          <span className='text-muted-foreground line-through'>
                            ${product.originalPrice.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </a>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </div>
      </Carousel>
    </section>
  )
}

export default ProductList
