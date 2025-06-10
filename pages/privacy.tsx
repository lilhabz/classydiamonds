import Head from "next/head";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col px-4 py-8">
      <Head>
        <title>Privacy Policy | Classy Diamonds</title>
        <meta
          name="description"
          content="Learn how Classy Diamonds handles your personal information."
        />
      </Head>

      <Breadcrumbs customLabels={{ privacy: "Privacy" }} />

      <main className="prose prose-invert max-w-2xl mx-auto">
        <h1>Privacy Policy</h1>
        <p>
          We respect your privacy and are committed to protecting your personal
          information. This policy explains what we collect and how we use it.
        </p>
        <h2>Information We Collect</h2>
        <p>
          When you place an order or contact us, we may collect your name,
          shipping address, email address, and phone number. We use this
          information solely to fulfill your requests and to communicate with
          you.
        </p>
        <h2>No Payment Details Collected</h2>
        <p>
          Classy Diamonds does not directly collect or store your credit card or
          other payment details. All transactions are handled by secure third–
          party processors such as Stripe. Please consult their privacy policies
          for more information.
        </p>
        <h2>Contact</h2>
        <p>
          If you have questions about this policy, please reach out via our
          <a href="/contact">contact page</a>.
        </p>
      </main>
    </div>
  );
}
