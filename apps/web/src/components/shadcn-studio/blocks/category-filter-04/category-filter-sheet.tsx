'use client'

import { useState, type ReactNode } from 'react'
import { Filter, X, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet'

import { cn } from '@/lib/utils'

export type CategoryItem = {
  id: string
  name: string
  count?: number
}

export type BrandItem = {
  id: string
  name: string
}

export type FilterState = {
  categories: string[]
  brands: string[]
}

type Props = {
  trigger?: ReactNode
  categories: CategoryItem[]
  brands: BrandItem[]
  categoriesLoading?: boolean
  brandsLoading?: boolean
  initialFilters?: Partial<FilterState>
  onApply: (filters: FilterState) => void
  onCategoryChange?: (categoryIds: string[]) => void
  className?: string
}

const CategoryFilterSheet = ({ 
  trigger,
  categories, 
  brands,
  categoriesLoading = false,
  brandsLoading = false,
  initialFilters,
  onApply, 
  onCategoryChange,
  className 
}: Props) => {
  const [open, setOpen] = useState(false)
  
  const [filters, setFilters] = useState<FilterState>({
    categories: initialFilters?.categories || [],
    brands: initialFilters?.brands || [],
  })

  // Sync with external filters when sheet opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && initialFilters) {
      setFilters({
        categories: initialFilters.categories || [],
        brands: initialFilters.brands || [],
      })
    }
    setOpen(isOpen)
  }

  const toggleCategory = (categoryId: string) => {
    const newCategories = filters.categories.includes(categoryId)
      ? filters.categories.filter(id => id !== categoryId)
      : [...filters.categories, categoryId]
    
    setFilters(prev => ({
      ...prev,
      categories: newCategories
    }))
    
    // Notify parent about category change to load related brands
    onCategoryChange?.(newCategories)
  }

  const toggleBrand = (brandId: string) => {
    setFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brandId)
        ? prev.brands.filter(id => id !== brandId)
        : [...prev.brands, brandId]
    }))
  }

  const handleApply = () => {
    onApply(filters)
    setOpen(false)
  }

  const handleClear = () => {
    setFilters({
      categories: [],
      brands: [],
    })
    onCategoryChange?.([])
  }

  const activeFiltersCount = filters.categories.length + filters.brands.length

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant='outline' className='gap-2'>
            <Filter className='h-4 w-4' />
            Шүүлтүүр
            {activeFiltersCount > 0 && (
              <Badge className='h-5 w-5 rounded-full p-0 flex items-center justify-center'>
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className={cn('w-full sm:max-w-md flex flex-col px-6', className)}>
        <SheetHeader className='px-0'>
          <SheetTitle className='flex items-center gap-2'>
            <Filter className='h-5 w-5' />
            Шүүлтүүр
          </SheetTitle>
          <SheetDescription>
            Барааг шүүх үзүүлэлтүүдийг сонгоно уу
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-y-auto py-6 space-y-6'>
          {/* Category Filter */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <h3 className='font-semibold text-sm'>Ангилал</h3>
              {filters.categories.length > 0 && (
                <Badge variant='secondary' className='text-xs h-5 px-1.5'>
                  {filters.categories.length}
                </Badge>
              )}
            </div>
            
            {categoriesLoading ? (
              <div className='flex items-center justify-center py-4'>
                <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
              </div>
            ) : categories.length > 0 ? (
              <div className='flex flex-wrap gap-2'>
                {categories.map(category => {
                  const isSelected = filters.categories.includes(category.id)
                  return (
                    <Badge
                      key={category.id}
                      variant={isSelected ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-all text-sm py-1.5 px-3',
                        isSelected 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                          : 'hover:bg-muted'
                      )}
                      onClick={() => toggleCategory(category.id)}
                    >
                      {category.name}
                      {category.count !== undefined && category.count > 0 && (
                        <span className={cn(
                          'ml-1.5 text-xs',
                          isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        )}>
                          ({category.count})
                        </span>
                      )}
                    </Badge>
                  )
                })}
              </div>
            ) : (
              <p className='text-sm text-muted-foreground'>
                Ангилал олдсонгүй
              </p>
            )}
          </div>

          {/* Brand Filter */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <h3 className='font-semibold text-sm'>Брэнд</h3>
              {filters.brands.length > 0 && (
                <Badge variant='secondary' className='text-xs h-5 px-1.5'>
                  {filters.brands.length}
                </Badge>
              )}
            </div>
            
            {brandsLoading ? (
              <div className='flex items-center justify-center py-4'>
                <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
              </div>
            ) : brands.length > 0 ? (
              <div className='flex flex-wrap gap-2'>
                {brands.map(brand => {
                  const isSelected = filters.brands.includes(brand.id)
                  return (
                    <Badge
                      key={brand.id}
                      variant={isSelected ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-all text-sm py-1.5 px-3',
                        isSelected 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'hover:bg-muted border-blue-200 text-blue-700'
                      )}
                      onClick={() => toggleBrand(brand.id)}
                    >
                      {brand.name}
                    </Badge>
                  )
                })}
              </div>
            ) : (
              <p className='text-sm text-muted-foreground'>
                {filters.categories.length > 0 
                  ? 'Сонгосон ангилалд брэнд олдсонгүй' 
                  : 'Брэнд олдсонгүй'}
              </p>
            )}
          </div>
        </div>

        {/* Selected Filters Summary */}
        {activeFiltersCount > 0 && (
          <div className='border-t pt-4 space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>Сонгосон ({activeFiltersCount})</span>
              <Button variant='ghost' size='sm' onClick={handleClear} className='text-destructive h-8'>
                <X className='h-4 w-4 mr-1' />
                Цэвэрлэх
              </Button>
            </div>
            <div className='flex flex-wrap gap-1.5'>
              {filters.categories.map(catId => {
                const cat = categories.find(c => c.id === catId)
                return cat ? (
                  <Badge key={catId} variant='secondary' className='gap-1 text-xs'>
                    {cat.name}
                    <X 
                      className='h-3 w-3 cursor-pointer' 
                      onClick={() => toggleCategory(catId)}
                    />
                  </Badge>
                ) : null
              })}
              {filters.brands.map(brandId => {
                const brand = brands.find(b => b.id === brandId)
                return brand ? (
                  <Badge key={brandId} className='gap-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200'>
                    {brand.name}
                    <X 
                      className='h-3 w-3 cursor-pointer' 
                      onClick={() => toggleBrand(brandId)}
                    />
                  </Badge>
                ) : null
              })}
            </div>
          </div>
        )}

        <SheetFooter className='gap-2 pt-4 border-t'>
          <SheetClose asChild>
            <Button variant='outline' className='flex-1'>
              Болих
            </Button>
          </SheetClose>
          <Button onClick={handleApply} className='flex-1'>
            Хэрэглэх
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export default CategoryFilterSheet
