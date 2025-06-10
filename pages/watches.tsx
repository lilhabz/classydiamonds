import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { GetServerSideProps } from "next";
import clientPromise from "@/lib/mongodb";
import { useCart } from "@/context/CartContext";

export type ProductType = {
  id: string;
  slug?: string;
  name: string;
  price: number;
  image: string;
  category: string;
};

interface WatchesProps {
  products: ProductType[];
}

export default function WatchesPage({ products }: WatchesProps) {
  const { addToCart } = useCart();

  const placeholders: ProductType[] = [
    {
      id: "p1",
      name: "Classic Gold Watch",
      price: 899,
      image: "/products/placeholder.jpg",
      slug: "#",
      category: "watches",
    },
    {
      id: "p2",
      name: "Elegant Silver Watch",
      price: 799,
      image: "/products/placeholder.jpg",
      slug: "#",
      category: "watches",
    },
    {
      id: "p3",
      name: "Modern Chronograph",
      price: 999,
      image: "/products/placeholder.jpg",
      slug: "#",
      category: "watches",
    },
  ];

  const watchProducts = products.length > 0 ? products : placeholders;

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head>
        <title>Watches</title>
        <meta
          name="description"
          content="Browse our selection of luxury watches."
        />
      </Head>
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-6">Watches</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {watchProducts.map((product) => (
            <div
              key={product.id}
              className="group bg-[var(--bg-nav)] rounded-2xl overflow-hidden shadow-lg hover:scale-105 transition flex flex-col h-full"
            >
              <Link
                href={
                  product.slug && product.slug !== "#"
                    ? `/category/${product.category}/${product.slug}`
                    : "#"
                }
              >
                <div className="w-full h-44 relative">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition"
                  />
                </div>
                <div className="p-4 text-center flex-1 flex flex-col justify-between">
                  <h3 className="font-semibold text-[var(--foreground)]">
                    {product.name}
                  </h3>
                  <p className="text-[#cfd2d6]">
                    ${product.price.toLocaleString()}
                  </p>
                </div>
              </Link>
              {product.slug && product.slug !== "#" && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    addToCart({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image: product.image,
                      quantity: 1,
                    });
                  }}
                  className="m-4 px-4 py-2 bg-[var(--foreground)] text-[var(--bg-nav)] rounded-xl font-semibold hover:bg-gray-100 hover:scale-105 hover:shadow-2xl transition"
                >
                  Add to Cart
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<WatchesProps> = async () => {
  const client = await clientPromise;
  const productsRaw = await client
    .db()
    .collection("products")
    .find({ category: "watches" })
    .toArray();

  const products: ProductType[] = productsRaw.map((p: any) => ({
    id: p._id.toString(),
    slug: p.slug,
    name: p.name,
    price: p.price,
    image: p.imageUrl || p.image,
    category: p.category,
  }));

  return { props: { products } };
};
