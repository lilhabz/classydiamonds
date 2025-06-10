import Head from "next/head";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col px-4 py-8">
      <Head>
        <title>Terms of Service | Classy Diamonds</title>
        <meta
          name="description"
          content="Review the terms of service for using Classy Diamonds."
        />
      </Head>

      <Breadcrumbs customLabels={{ terms: "Terms" }} />

      <main className="prose prose-invert max-w-2xl mx-auto">
        <h1>Terms of Service</h1>
        <p>
          By accessing or using the Classy Diamonds website, you agree to the
          following terms. These terms may be updated from time to time, and it
          is your responsibility to review them periodically.
        </p>
        <h2>Use of Our Site</h2>
        <p>
          You may browse our catalog and place orders for products. All
          purchases are subject to product availability. We reserve the right to
          refuse or cancel any order.
        </p>
        <h2>Payments</h2>
        <p>
          We do not collect or store your payment information on this site. All
          payments are processed securely through third–party providers such as
          Stripe. Please refer to those providers for information about their
          practices.
        </p>
        <h2>Limitation of Liability</h2>
        <p>
          Classy Diamonds is not liable for any indirect, incidental, or
          consequential damages arising from your use of this site.
        </p>
        <h2>Contact Us</h2>
        <p>
          If you have any questions about these terms, please contact us through
          our <a href="/contact">contact page</a>.
        </p>
      </main>
    </div>
  );
}
