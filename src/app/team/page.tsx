import React from "react";
import TeamShowcase from "@/components/team/TeamShowcase";

export const metadata = {
  title: "Team & Leadership",
  description:
    "Meet the institutional leadership, faculty coordinator, and the tech, management, design, and video & photo teams of Shadow Byte Syndicate.",
};

export default function TeamPage() {
  return (
    <div className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <TeamShowcase />
      </div>
    </div>
  );
}
