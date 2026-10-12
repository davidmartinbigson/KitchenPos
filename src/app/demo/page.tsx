import type { Metadata } from "next";
import { DemoApp } from "@/components/demo/demo-app";

export const metadata: Metadata = {
  title: "Live demo — try Kitchen POS in your browser",
  description:
    "Play with a full restaurant POS demo: add orders, complete a sale, print a receipt and view the sales report — completely offline in your browser, no account needed.",
};

export default function DemoPage() {
  return <DemoApp />;
}
