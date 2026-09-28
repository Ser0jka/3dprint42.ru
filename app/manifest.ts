import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Центр 3D-печати — заявки",
    short_name: "3D-печать",
    description: "Управление заявками Центра 3D-печати",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    background_color: "#11110f",
    theme_color: "#11110f",
    lang: "ru",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
