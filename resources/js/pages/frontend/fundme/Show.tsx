"use client";

import { Head, Link, usePage } from "@inertiajs/react";
import FrontendLayout from "@/layouts/frontend/frontend-layout";
import { Button } from "@/components/frontend/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card";
import { Input } from "@/components/frontend/ui/input";
import { Label } from "@/components/frontend/ui/label";
import { Checkbox } from "@/components/frontend/ui/checkbox";
import { Heart, Shield, Building2, Loader2, ArrowLeft, BadgeCheck } from "lucide-react";
import { route } from "ziggy-js";
import { useState, useEffect } from "react";

interface CampaignPayload {
  id: number;
  organization_id?: number;
  can_edit?: boolean;
  title: string;
  slug: string;
  goal_amount_dollars: number;
  raised_amount_dollars: number;
  progress_percent: number;
  cover_image: string | null;
  helps_who: string;
  fund_usage: string;
  expected_impact: string;
  organization: {
    id: number;
    name: string;
    description?: string;
    mission?: string;
    image: string | null;
  } | null;
  category: { id: number; name: string; slug: string } | null;
}

interface Props {
  campaign: CampaignPayload;
}

const presetAmounts = [25, 50, 100, 250, 500, 1000];

export default function FundMeShow({ campaign }: Props) {
  const pageProps = usePage().props as { auth?: { user?: { name?: string; email?: string } }; success?: string };
  const authUser = pageProps.auth?.user;

  const [amount, setAmount] = useState<string>("");
  const [donorName, setDonorName] = useState(authUser?.name ?? "");
  const [donorEmail, setDonorEmail] = useState(authUser?.email ?? "");
  const [anonymous, setAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (pageProps.success) {
      setAmount("");
      setDonorName(authUser?.name ?? "");
      setDonorEmail(authUser?.email ?? "");
    }
  }, [pageProps.success, authUser?.name, authUser?.email]);

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const num = parseFloat(amount);
    if (!num || num < 1) {
      setErrors({ amount: "Please enter at least $1.00" });
      return;
    }
    setIsSubmitting(true);
    try {
      const csrf = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
      const res = await fetch(route("fundme.donate.store"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-TOKEN": csrf,
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          fundme_campaign_id: campaign.id,
          amount: num,
          donor_name: anonymous ? "" : donorName,
          donor_email: donorEmail,
          anonymous,
        }),
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      if (res.status === 401) {
        window.location.href = `${route("login")}?redirect=${encodeURIComponent(route("fundme.show", { slug: campaign.slug }))}`;
        return;
      }
      setErrors({ amount: data.error || "Something went wrong. Please try again." });
    } catch {
      setErrors({ amount: "Something went wrong. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FrontendLayout>
      <Head title={campaign.title + " – Believe FundMe"} />
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
        {/* Hero */}
        <section className="relative">
          <div className="aspect-[21/9] max-h-[420px] w-full bg-muted relative overflow-hidden">
            {campaign.cover_image ? (
              <img
                src={campaign.cover_image}
                alt=""
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Heart className="h-24 w-24 text-muted-foreground/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 text-white">
              <div className="container mx-auto px-4">
                <p className="text-sm font-medium uppercase tracking-wider text-white/90">
                  {campaign.category?.name ?? "Campaign"}
                </p>
                <h1 className="text-2xl md:text-4xl font-bold mt-1 drop-shadow-md">
                  {campaign.title}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  {campaign.organization?.image ? (
                    <img
                      src={campaign.organization.image}
                      alt=""
                      className="w-8 h-8 rounded-full border-2 border-white/80 object-cover"
                    />
                  ) : (
                    <Building2 className="w-8 h-8 text-white/80" />
                  )}
                  <span className="font-medium">{campaign.organization?.name ?? "Nonprofit"}</span>
                  <BadgeCheck className="w-5 h-5 text-primary fill-primary" />
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/30">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(100, campaign.progress_percent)}%` }}
            />
          </div>
        </section>

        <section className="container mx-auto px-4 py-8">
          <Link
            href={route("fundme.index")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to campaigns
          </Link>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Who This Helps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{campaign.helps_who}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What Funds Will Be Used For</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{campaign.fund_usage}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Expected Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{campaign.expected_impact}</p>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="text-xl">Support this campaign</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    ${campaign.raised_amount_dollars.toLocaleString("en-US", { minimumFractionDigits: 2 })} raised of $
                    {campaign.goal_amount_dollars.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, campaign.progress_percent)}%` }}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {!authUser ? (
                    <div className="space-y-4 py-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        You must be logged in to donate to this campaign.
                      </p>
                      <Link href={`${route("login")}?redirect=${encodeURIComponent(route("fundme.show", { slug: campaign.slug }))}`}>
                        <Button className="w-full gap-2">
                          <Heart className="h-4 w-4" />
                          Log in to donate
                        </Button>
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        Donations go to the organization via Stripe. Only logged-in users can donate.
                      </p>
                    </div>
                  ) : (
                  <form onSubmit={handleDonate} className="space-y-4">
                    <div>
                      <Label>Amount (USD) *</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {presetAmounts.map((a) => (
                          <Button
                            key={a}
                            type="button"
                            variant={amount === String(a) ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAmount(String(a))}
                          >
                            ${a}
                          </Button>
                        ))}
                      </div>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="Other amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="mt-2"
                      />
                      {errors.amount && (
                        <p className="text-sm text-destructive mt-1">{errors.amount}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="donor_name">Your name (optional)</Label>
                      <Input
                        id="donor_name"
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        placeholder="John Doe"
                        disabled={anonymous}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="donor_email">Email *</Label>
                      <Input
                        id="donor_email"
                        type="email"
                        value={donorEmail}
                        onChange={(e) => setDonorEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                      />
                      {errors.donor_email && (
                        <p className="text-sm text-destructive">{errors.donor_email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="anonymous"
                        checked={anonymous}
                        onCheckedChange={(v) => setAnonymous(!!v)}
                      />
                      <Label htmlFor="anonymous" className="text-sm font-normal cursor-pointer">
                        Give anonymously
                      </Label>
                    </div>
                    <Button
                      type="submit"
                      className="w-full gap-2"
                      disabled={isSubmitting || !amount || parseFloat(amount) < 1}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Heart className="h-4 w-4" />
                      )}
                      Donate
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      You will be taken to Stripe Checkout to complete your donation securely. Funds go to the nonprofit.
                    </p>
                  </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </FrontendLayout>
  );
}
