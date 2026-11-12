import React from "react";
import { getSiteSettings } from "@/services/siteService";
import ContactForm from "@/components/contact/ContactForm";
import { Mail, Shield, MessageSquare, Terminal, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contact & Inquiries",
  description: "Get in touch with the Shadow Byte Syndicate coordination team.",
};

export default async function ContactPage() {
  const settings = await getSiteSettings();

  return (
    <div className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-brand-redDark/20 border border-brand-red/30 rounded-full text-xs font-mono text-brand-redBright uppercase tracking-wider">
            <Mail className="w-3.5 h-3.5" />
            <span>COMMUNICATION CHANNELS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Contact Shadow Byte Syndicate
          </h1>
          <p className="text-sm text-brand-gray-muted max-w-xl mx-auto font-sans">
            Have questions regarding upcoming CTFs, guest workshops, or responsible security disclosures? Reach out through our verified channels.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Details & Guidelines */}
          <div className="space-y-6">
            <div className="cyber-panel p-6 rounded-lg border border-brand-border space-y-4">
              <h3 className="text-base font-bold text-white font-mono border-l-2 border-brand-red pl-2">
                Official Coordinates
              </h3>

              <div className="space-y-3 text-xs font-mono text-brand-gray-text">
                <div>
                  <span className="text-brand-gray-dim uppercase block text-[10px]">Administrative Email</span>
                  {settings?.contactEmail ? (
                    <a
                      href={`mailto:${settings.contactEmail}`}
                      className="text-white hover:text-brand-redBright font-medium break-all"
                    >
                      {settings.contactEmail}
                    </a>
                  ) : (
                    <span className="text-brand-gray-muted italic">
                      Not configured yet — submit inquiries via the form.
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-brand-gray-dim uppercase block text-[10px]">Location / Headquarters</span>
                  {settings?.headquarters ? (
                    <span className="text-white">{settings.headquarters}</span>
                  ) : (
                    <span className="text-brand-gray-muted italic">Not configured yet</span>
                  )}
                </div>

                <div>
                  <span className="text-brand-gray-dim uppercase block text-[10px]">Operational Timezone</span>
                  <span className="text-white">{settings?.timezone || "Asia/Kolkata"}</span>
                </div>
              </div>
            </div>

            <div className="cyber-panel p-6 rounded-lg border border-brand-border space-y-3">
              <h3 className="text-base font-bold text-white font-mono border-l-2 border-brand-red pl-2">
                Security Disclosure Guidelines
              </h3>
              <p className="text-xs text-brand-gray-muted leading-relaxed font-sans">
                If you are contacting us regarding a vulnerability report in collegiate infrastructure, please encrypt your findings or prefix your message subject with <code className="text-brand-redBright">[VULN-DISCLOSURE]</code> for expedited handling by our Faculty Coordinator.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}

