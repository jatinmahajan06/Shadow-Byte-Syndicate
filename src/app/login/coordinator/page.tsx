import React from "react";
import LoginForm from "@/components/auth/LoginForm";
import { ROLES } from "@/lib/constants";

export const metadata = {
  title: "Coordinator Portal Login",
  description: "Secure login for appointed club coordinators.",
};

export default function CoordinatorLoginPage() {
  return (
    <LoginForm
      role={ROLES.COORDINATOR}
      badgeText="AUTHORIZED COORDINATOR PORTAL"
      portalTitle="Coordinator Management Portal"
      portalSubtitle="Appointed coordinators access event publishing and knowledge hub authoring."
    />
  );
}

