import { permanentRedirect } from "next/navigation";
import { siteRoutes } from "../../site-routes";

export default function CalculatorPage() {
  permanentRedirect(siteRoutes.quiz);
}
