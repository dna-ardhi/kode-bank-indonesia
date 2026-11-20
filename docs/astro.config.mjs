import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

const repo = "https://github.com/dna-ardhi/kode-bank-indonesia";

export default defineConfig({
  site: "https://dna-ardhi.github.io",
  base: "/kode-bank-indonesia",
  integrations: [
    starlight({
      title: "kode-bank-indonesia",
      description: "Kode bank, BIC, dan e-wallet Indonesia sebagai static JSON API.",
      customCss: ["./src/styles/custom.css"],
      defaultLocale: "root",
      locales: {
        root: { label: "Bahasa Indonesia", lang: "id" },
        en: { label: "English", lang: "en" },
      },
      social: [{ icon: "github", label: "GitHub", href: repo }],
      editLink: { baseUrl: `${repo}/edit/main/docs/src/content/docs/` },
      sidebar: [
        {
          label: "Mulai",
          translations: { en: "Get started" },
          items: ["quick-start", "form-example"],
        },
        {
          label: "Referensi",
          translations: { en: "Reference" },
          items: ["reference/api", "reference/schema", "reference/verified"],
        },
        {
          label: "Data",
          items: ["data/browse", "data/sources", "data/updates"],
        },
        {
          label: "Proyek",
          translations: { en: "Project" },
          items: ["contributing", "faq", "changelog"],
        },
      ],
    }),
  ],
});
