// Production: /admin is gated by middleware checking the user's role.
// Auth.js is not installed yet — this layout is currently a visual mockup.

import { AdminMasthead } from "@/components/AdminMasthead";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminMasthead />
      <main className="flex-1">{children}</main>
    </>
  );
}
