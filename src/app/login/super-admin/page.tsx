import React from "react";
import LoginForm from "@/components/auth/LoginForm";
import { ROLES } from "@/lib/constants";

export const metadata = {
  title: "Super Admin Command Login",
  description: "Secure login for top-level Syndicate administrators.",
};

export default function SuperAdminLoginPage() {
  return (
    <LoginForm
      role={ROLES.SUPER_ADMIN}
      badgeText="SYSTEM ROOT ACCESS"
      portalTitle="Super Admin Command Console"
      portalSubtitle="Full-spectrum administrative control over accounts, site content, security logs, and settings."
    />
  );
}
