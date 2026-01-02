import ProductList from '@/components/shadcn-studio/blocks/product-list-07/product-list-07'

const productList = [
  {
    productSrc: 'https://cdn.shadcnstudio.com/ss-assets/blocks/ecommerce/product-list/image-35.png',
    productAlt: 'summer dress',
    productLink: '#',
    name: 'Summer Dress',
    rating: 4.1,
    discountedPrice: 80,
    originalPrice: 129
  },
  {
    productSrc: 'https://cdn.shadcnstudio.com/ss-assets/blocks/ecommerce/product-list/image-34.png',
    productAlt: 'formal shirt',
    productLink: '#',
    name: 'Formal Shirt',
    rating: 4.8,
    discountedPrice: 52,
    originalPrice: 80
  },
  {
    productSrc: 'https://cdn.shadcnstudio.com/ss-assets/blocks/ecommerce/product-list/image-33.png',
    productAlt: 'denim t-shirt',
    productLink: '#',
    name: 'Denim T-shirt',
    rating: 5.0,
    originalPrice: 85
  },
  {
    productSrc: 'https://cdn.shadcnstudio.com/ss-assets/blocks/ecommerce/product-list/image-32.png',
    productAlt: 'plain shirt',
    productLink: '#',
    name: 'Plain shirt',
    rating: 4.3,
    originalPrice: 32
  },
  {
    productSrc: 'https://cdn.shadcnstudio.com/ss-assets/blocks/ecommerce/product-list/image-43.png',
    productAlt: 'striped shirt',
    productLink: '#',
    name: 'Striped Shirt',
    rating: 4.4,
    discountedPrice: 72,
    originalPrice: 90
  },
  {
    productSrc: 'https://cdn.shadcnstudio.com/ss-assets/blocks/ecommerce/product-list/image-44.png',
    productAlt: 'checked shirt',
    productLink: '#',
    name: 'Checked Shirt',
    rating: 3.9,
    originalPrice: 65
  },
  {
    productSrc: 'https://cdn.shadcnstudio.com/ss-assets/blocks/ecommerce/product-list/image-45.png',
    productAlt: 'white jacket',
    productLink: '#',
    name: 'White Jacket',
    rating: 4.9,
    discountedPrice: 99,
    originalPrice: 160
  }
]

const ProductListPage = () => {
  return <ProductList products={productList} />
}

export default ProductListPage
