import { notFound } from "next/navigation";
import { UiLab } from "./ui-lab";
export default function UiLabPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <UiLab />;
}
