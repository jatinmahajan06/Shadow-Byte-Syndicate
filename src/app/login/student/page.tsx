import React from "react";
import LoginForm from "@/components/auth/LoginForm";
import { ROLES } from "@/lib/constants";

export const metadata = {
  title: "Student Portal Login",
  description: "Sign in to your student member account to register for events and manage participation.",
};

export default function StudentLoginPage() {
  return (
    <LoginForm
      role={ROLES.STUDENT}
      badgeText="STUDENT ACCESS POINT"
      portalTitle="Student Member Portal"
      portalSubtitle="Authenticate with your collegiate student credentials to browse and register for events."
    />
  );
}
