import ProductList from '@/components/shadcn-studio/blocks/product-list-02/product-list-02'

const productList = [
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/ecommerce/product-list/image-12.png',
    imgAlt: 'Nike Air Force 1',
    name: "Nike Air Force 1 '07 LV8",
    price: 40,
    cardClassName: 'bg-green-600/10 dark:bg-green-400/10'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/ecommerce/product-list/image-11.png',
    imgAlt: 'Air Jordan 1 Low',
    name: 'Air Jordan 1 Low',
    price: 65,
    cardClassName: 'bg-amber-600/10 dark:bg-amber-400/10'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/ecommerce/product-list/image-10.png',
    imgAlt: 'Jordan CMFT Era',
    name: 'Jordan CMFT Era',
    price: 80,
    salePrice: 42,
    cardClassName: 'bg-destructive/10 '
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/ecommerce/product-list/image-9.png',
    imgAlt: 'Nike SB Force 58',
    name: 'Nike SB Force 58',
    price: 48,
    cardClassName: 'bg-amber-600/10 dark:bg-amber-400/10'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/ecommerce/product-list/image-8.png',
    imgAlt: 'Jordan Max Aura 7',
    name: 'Jordan Max Aura 7',
    price: 32,
    cardClassName: 'bg-sky-600/10 dark:bg-sky-400/10'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/ecommerce/product-list/image-7.png',
    imgAlt: 'Nike Pegasus Premium',
    name: 'Nike Pegasus Premium',
    price: 55,
    cardClassName: 'bg-primary/10'
  }
]

const ProductListPage = () => {
  return <ProductList products={productList} />
}

export default ProductListPage
