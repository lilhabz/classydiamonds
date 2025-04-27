import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Image from 'next/image';
import Link from 'next/link';

const products = [
  {
    id: 1,
    name: 'Diamond Engagement Ring',
    price: '$4,200',
    image: '/products/engagement-ring.jpg',
    href: '/product/engagement-ring',
  },
  {
    id: 2,
    name: 'Gold Tennis Bracelet',
    price: '$1,800',
    image: '/products/tennis-bracelet.jpg',
    href: '/product/tennis-tennisbracelet',
  },
  {
    id: 3,
    name: 'Sapphire Pendant Necklace',
    price: '$2,500',
    image: '/products/sapphire-necklace.jpg',
    href: '/product/sapphire-necklace',
  },
  {
    id: 4,
    name: 'Pearl Drop Earrings',
    price: '$950',
    image: '/products/pearl-earrings.jpg',
    href: '/product/pearl-earrings',
  },
];

export default function JewelryPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="w-full pt-[120px] pb-16 text-center px-4 -mt-20">
        <h1 className="text-4xl sm:text-5xl font-serif font-semibold mb-6">
          Jewelry Collection
        </h1>
        <p className="text-gray-300 max-w-2xl mx-auto text-base sm:text-lg">
          Discover timeless pieces designed to capture every moment, crafted with passion and precision.
        </p>
      </section>

      {/* Shop by Category */}
      <section className="px-6 py-16 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12">Shop by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8">
          {/* Categories */}
          {[
            { href: '/engagement-rings', label: 'Engagement Rings', image: '/engagement-category.jpg' },
            { href: '/wedding-bands', label: 'Wedding Bands', image: '/wedding-category.jpg' },
            { href: '/necklaces', label: 'Necklaces', image: '/necklaces-category.jpg' },
            { href: '/rings', label: 'Rings', image: '/rings-category.jpg' },
            { href: '/bracelets', label: 'Bracelets', image: '/bracelets-category.jpg' },
            { href: '/earrings', label: 'Earrings', image: '/earrings-category.jpg' },
          ].map((category) => (
            <Link key={category.label} href={category.href} className="group">
              <div className="overflow-hidden rounded-2xl shadow-md">
                <Image
                  src={category.image}
                  alt={category.label}
                  width={500}
                  height={500}
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <p className="mt-3 text-center text-lg font-medium">{category.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* All Products Section */}
      <section className="px-6 py-16 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12">Our Jewelry</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-10">
          {products.map((product) => (
            <Link key={product.id} href={product.href} className="group">
              <div className="overflow-hidden rounded-2xl shadow-lg bg-[#25304f] hover:shadow-2xl hover:ring-2 hover:ring-[#e0e0e0] hover:scale-105 transition-all duration-300">
                <div className="w-full h-80 overflow-hidden">
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={500}
                    height={500}
                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="p-6 text-center">
                  <h3 className="text-xl font-semibold text-[#e0e0e0]">{product.name}</h3>
                  <p className="mt-2 text-gray-400">{product.price}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
