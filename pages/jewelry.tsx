import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Image from 'next/image';
import Link from 'next/link';
import Head from 'next/head';

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
    href: '/product/tennis-bracelet',
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
    <div className="min-h-screen flex flex-col bg-[#1f2a44] text-[#e0e0e0]">
      <Head>
        <title>Jewelry Collection | Classy Diamonds</title>
        <meta name="description" content="Explore timeless engagement rings, wedding bands, necklaces, earrings, and more, crafted with passion at Classy Diamonds." />
      </Head>

      <Navbar />

      {/* Hero Section */}
      <section className="w-full flex flex-col items-center justify-center text-center -mt-20 pt-32 pb-24 px-4">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Jewelry Collection
        </h1>
        <p className="text-lg md:text-xl max-w-2xl text-[#cfd2d6]">
          Discover timeless pieces designed to capture every moment, crafted with passion and precision.
        </p>
      </section>

      {/* Shop by Category */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-semibold text-center mb-16">Shop by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8 text-center">
          {[
            { href: '/engagement-rings', label: 'Engagement' },
            { href: '/wedding-bands', label: 'Wedding Bands' },
            { href: '/rings', label: 'Rings' },
            { href: '/bracelets', label: 'Bracelets' },
            { href: '/necklaces', label: 'Necklaces' },
            { href: '/earrings', label: 'Earrings' },
          ].map((category) => (
            <Link
              key={category.label}
              href={category.href}
              className="group bg-[#25304f] rounded-2xl overflow-hidden shadow-md hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center py-10 text-lg font-semibold text-[#cfd2d6] hover:text-white transition-colors hover:cursor-pointer"
            >
              {category.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Our Jewelry Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-semibold text-center mb-12">Our Jewelry</h2>
        <p className="text-center text-[#cfd2d6] max-w-2xl mx-auto mb-16 text-lg">
          Browse our exclusive collection of fine jewelry, meticulously crafted to celebrate life's most treasured moments.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-10">
          {products.map((product) => (
            <Link key={product.id} href={product.href} className="group hover:cursor-pointer">
              <div className="bg-[#25304f] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:ring-2 hover:ring-[#e0e0e0] hover:scale-105 transition-all duration-300">
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
                  <h3 className="text-2xl font-semibold text-[#cfd2d6] group-hover:text-white transition-colors duration-300">{product.name}</h3>
                  <p className="mt-2 text-gray-400 group-hover:text-white transition-colors duration-300">{product.price}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      
    </div>
  );
}
