"use client";

import { Head, Link } from "@inertiajs/react";
import FrontendLayout from "@/layouts/frontend/frontend-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card";
import { Button } from "@/components/frontend/ui/button";
import { Badge } from "@/components/frontend/ui/badge";
import {
  Sparkles,
  Check,
  Star,
  Zap,
  Crown,
  ArrowRight,
  Mail,
  Bot,
  Bell,
  Users,
  Gift,
  Calendar,
  GraduationCap,
  ShoppingCart,
  Heart,
  FileText,
} from "lucide-react";
import { route } from "ziggy-js";

interface PlanFeature {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  is_unlimited: boolean;
}

interface CustomField {
  key: string;
  label: string;
  value: string;
  type: string;
  icon?: string;
  description?: string;
}

interface Plan {
  id: number;
  name: string;
  price: number;
  frequency: string;
  is_popular: boolean;
  description: string | null;
  trial_days: number;
  custom_fields: CustomField[];
  features: PlanFeature[];
}

interface AddOn {
  name: string;
  price: string;
  description: string;
}

interface CurrentPlan {
  id: number;
  name: string;
  price: number;
  frequency: string;
}

interface Props {
  plans: Plan[];
  addOns: AddOn[];
  currentPlan?: CurrentPlan | null;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calendar,
  GraduationCap,
  Heart,
  ShoppingCart,
  FileText,
  Bell,
  Users,
  Mail,
  Bot,
  Gift,
  Sparkles,
  Star,
  Zap,
  Crown,
  ArrowRight,
};

function getIconComponent(iconName: string | null) {
  if (!iconName) return Calendar;
  const lower = iconName.toLowerCase();
  for (const [key, value] of Object.entries(iconMap)) {
    if (key.toLowerCase() === lower) return value;
  }
  return Calendar;
}

export default function PricingPage({ plans, addOns, currentPlan }: Props) {
  const unlimitedFeatures = plans
    .flatMap((p) => p.features.filter((f) => f.is_unlimited))
    .filter((f, i, arr) => arr.findIndex((x) => x.name === f.name) === i)
    .map((f) => ({
      icon: getIconComponent(f.icon),
      text: f.name,
      description: f.description,
    }));

  const defaultFeatures = [
    { icon: Calendar, text: "Unlimited Events", description: null as string | null },
    { icon: GraduationCap, text: "Unlimited Courses", description: null },
    { icon: Heart, text: "Unlimited Donations", description: null },
    { icon: ShoppingCart, text: "Unlimited Marketplace", description: null },
    { icon: FileText, text: "Unlimited Campaign Pages", description: null },
    { icon: Bell, text: "Unlimited Push Newsletter Alerts (FREE)", description: null },
    { icon: Users, text: "Unlimited Volunteer Management & Groups", description: null },
  ];
  const displayFeatures = unlimitedFeatures.length > 0 ? unlimitedFeatures : defaultFeatures;

  const getPlanIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("pro")) return <Crown className="h-6 w-6" />;
    if (n.includes("community")) return <Star className="h-6 w-6" />;
    return <Zap className="h-6 w-6" />;
  };

  const getPlanGradient = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("pro")) return "from-purple-500 to-pink-500";
    if (n.includes("community")) return "from-blue-500 to-indigo-500";
    return "from-green-500 to-emerald-500";
  };

  return (
    <FrontendLayout>
      <Head title="Pricing – Nonprofit Plans | Believe In Unity" />
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
        <div className="container mx-auto px-4 py-10 sm:py-14">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <div className="inline-flex items-center justify-center gap-2 rounded-full bg-primary/10 px-4 py-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">For Nonprofit Organizations</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">
              Simple, transparent pricing
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground">
              Upgrade to Pro and get unlimited mission tools. Pay only for growth.
            </p>
          </div>

          {/* Unlimited features (all plans) */}
          <Card className="mb-10 sm:mb-14 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5">
            <CardHeader>
              <CardTitle className="text-center text-xl sm:text-2xl">
                Unlimited features (all plans)
              </CardTitle>
              <CardDescription className="text-center">
                These tools are included with every plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayFeatures.map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg bg-background/50 dark:bg-white/5"
                    >
                      <Icon className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <span className="text-sm font-medium">{feature.text}</span>
                        {feature.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Current plan (if logged in) */}
          {currentPlan && (
            <Card className="max-w-2xl mx-auto mb-10 bg-gradient-to-r from-green-500/10 to-green-500/5 border-green-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Check className="h-6 w-6 text-green-500" />
                  <h3 className="text-xl font-bold">You&apos;re subscribed</h3>
                </div>
                <p className="text-center text-muted-foreground mb-2">
                  Current plan: <span className="font-semibold text-foreground">{currentPlan.name}</span>
                </p>
                <p className="text-center text-sm text-muted-foreground">
                  ${currentPlan.price}/{currentPlan.frequency}
                </p>
                <div className="flex justify-center mt-4">
                  <Link href={route("plans.index")}>
                    <Button variant="outline" size="sm">
                      Manage plan
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan cards */}
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-6">Subscription tiers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10 sm:mb-14">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`h-full flex flex-col border-2 transition-all ${
                  plan.is_popular
                    ? "border-primary shadow-lg bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <CardHeader className="pb-4">
                  {plan.is_popular && (
                    <div className="flex justify-center mb-2">
                      <Badge className="bg-primary text-primary-foreground text-xs">Most popular</Badge>
                    </div>
                  )}
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getPlanGradient(plan.name)} flex items-center justify-center text-white mx-auto mb-3`}
                  >
                    {getPlanIcon(plan.name)}
                  </div>
                  <CardTitle className="text-xl text-center">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground text-sm">/{plan.frequency}</span>
                  </div>
                  {plan.trial_days > 0 && (
                    <p className="text-sm font-semibold text-primary text-center">
                      {plan.trial_days} day{plan.trial_days !== 1 ? "s" : ""} free trial
                    </p>
                  )}
                  {plan.description && (
                    <p className="text-sm text-muted-foreground text-center mt-2">{plan.description}</p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pt-0">
                  {plan.custom_fields && plan.custom_fields.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {plan.custom_fields.map((field) => {
                        const Icon = field.icon ? getIconComponent(field.icon) : Mail;
                        return (
                          <div
                            key={field.key}
                            className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 text-sm"
                          >
                            <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium">{field.label}</p>
                              <p className="text-xs text-muted-foreground">{field.value}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-auto pt-4">
                    {currentPlan && currentPlan.id === plan.id ? (
                      <Button className="w-full" size="lg" disabled>
                        <Check className="h-4 w-4 mr-2" />
                        Current plan
                      </Button>
                    ) : currentPlan ? (
                      <Link href={route("plans.index")} className="block">
                        <Button
                          className={`w-full ${plan.is_popular ? "bg-primary hover:bg-primary/90" : ""}`}
                          size="lg"
                        >
                          Switch plan
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    ) : (
                      <Link
                        href={route("register")}
                        className="block"
                      >
                        <Button
                          className={`w-full ${plan.is_popular ? "bg-primary hover:bg-primary/90" : ""}`}
                          size="lg"
                        >
                          Get started
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add-ons */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-xl sm:text-2xl">Usage-based add-ons</CardTitle>
              <CardDescription className="text-center">
                Scale your outreach as you grow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {addOns.map((addOn, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{addOn.name}</h4>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {addOn.price}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{addOn.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CTA for non-logged-in */}
          {!currentPlan && (
            <div className="text-center mt-10">
              <p className="text-muted-foreground mb-4">
                Already have an account?{" "}
                <Link href={route("login")} className="text-primary font-medium hover:underline">
                  Sign in
                </Link>{" "}
                to manage your plan.
              </p>
            </div>
          )}
        </div>
      </div>
    </FrontendLayout>
  );
}
