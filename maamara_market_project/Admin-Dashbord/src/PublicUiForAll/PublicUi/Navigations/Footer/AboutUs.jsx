import { useEffect, useState } from "react";
import { ArrowLeft, HeartHandshake, PackageCheck, Sprout } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../../../Services/Api";
import { sanitizeRichText } from "../../../../utils/sanitizeRichText";

const AboutUs = () => {
  const [about, setAbout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/api/admin-about/")
      .then(({ data }) => {
        if (active) setAbout(data);
      })
      .catch((requestError) => {
        console.error("Failed to load About page:", requestError);
        if (active) setError("We couldn't load the About page right now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) {
    return <main className="min-h-[60vh] bg-[#f8f8f6] px-4 py-12 text-foreground sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl rounded-[20px] border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Loading About Maa Mara…</div></main>;
  }

  if (error || !about) {
    return <main className="min-h-[60vh] bg-[#f8f8f6] px-4 py-12 text-foreground sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl rounded-[20px] border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">{error || "About information is not available."}</div></main>;
  }

  const sections = [
    { key: "impact_content", title: about.impact_title || "Our impact", icon: HeartHandshake },
    { key: "products_content", title: about.products_title || "What you can find", icon: PackageCheck },
    { key: "materials_content", title: "Materials & quality", icon: Sprout },
  ];

  return (
    <main className="min-h-screen bg-[#f8f8f6] text-gray-900">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 sm:py-14">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
            <ArrowLeft size={16} /> Back to marketplace
          </Link>
          <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">About Maa Mara Market</p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{about.hero_title || about.about_title || "About Maa Mara Market"}</h1>
              {about.hero_subtitle && <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">{about.hero_subtitle}</p>}
            </div>
            {about.hero_image && <img src={about.hero_image} alt="" className="h-64 w-full rounded-[20px] object-cover sm:h-80" />}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 sm:py-14">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Our story</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{about.about_title || "About Maa Mara"}</h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {sections.map(({ key, title, icon: Icon }) => (
            <article key={key} className="rounded-[20px] border border-gray-200 bg-white p-6">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-[#eef3f8] text-[#2563eb]"><Icon size={20} /></div>
              <h3 className="text-lg font-bold">{title}</h3>
              <div
                className="mt-4 text-sm leading-7 text-gray-600 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:font-semibold [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-[#2563eb] [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-[#2563eb] [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(about[key] || "") }}
              />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

export default AboutUs;
