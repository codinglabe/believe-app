"use client";

import React, { useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem } from "@/types";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { showErrorToast } from "@/lib/toast";
import { route } from "ziggy-js";

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Believe FundMe", href: "/fundme" },
  { title: "New Campaign", href: "/fundme/create" },
];

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

interface Props {
  categories: Category[];
  narrativeMinLength: number;
  narrativeMinWords: number;
}

const helperPrompts = {
  helps_who:
    "Who are you serving? Describe the beneficiaries (e.g. families, youth, community). Use plain language.",
  fund_usage:
    "What will donations fund in the next 3–6 months? Be specific about programs, supplies, or expenses.",
  expected_impact:
    "What outcomes do you expect in the next 3–12 months? How will lives or the community improve?",
};

export default function FundMeCampaignCreate({ categories, narrativeMinLength, narrativeMinWords }: Props) {
  const [formData, setFormData] = useState({
    title: "",
    fundme_category_id: "",
    goal_amount: "",
    cover_image: null as File | null,
    helps_who: "",
    fund_usage: "",
    expected_impact: "",
    use_of_funds_confirmation: false,
    status: "draft",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | undefined;
    const status = submitter?.getAttribute?.("value") === "in_review" ? "in_review" : "draft";

    setIsSubmitting(true);
    setErrors({});

    const payload = new FormData();
    payload.set("title", formData.title);
    payload.set("fundme_category_id", formData.fundme_category_id);
    payload.set("goal_amount", formData.goal_amount);
    payload.set("helps_who", formData.helps_who);
    payload.set("fund_usage", formData.fund_usage);
    payload.set("expected_impact", formData.expected_impact);
    payload.set("use_of_funds_confirmation", formData.use_of_funds_confirmation ? "1" : "0");
    payload.set("status", status);
    if (formData.cover_image) {
      payload.set("cover_image", formData.cover_image);
    }

    router.post(route("fundme.campaigns.store"), payload, {
      forceFormData: true,
      onError: (err) => {
        setErrors(err);
        showErrorToast("Please fix the errors below.");
        setIsSubmitting(false);
      },
      onSuccess: () => setIsSubmitting(false),
    });
  };

  const set = (key: keyof typeof formData, value: string | boolean | File | null) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Create Believe FundMe Campaign" />
      <div className="flex flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
        <Card className="px-0">
          <CardHeader className="px-4 md:px-6">
            <div className="flex items-center gap-4">
              <Link href={route("fundme.campaigns.index")}>
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <CardTitle className="text-2xl font-bold">New Believe FundMe Campaign</CardTitle>
                <p className="text-muted-foreground">
                  Complete all sections. Each narrative needs at least {narrativeMinLength} characters (plain language, no jargon).
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Campaign title *</Label>
                  <Input
                    id="title"
                    maxLength={120}
                    value={formData.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="e.g. Back-to-School Supplies Drive"
                  />
                  <p className="text-xs text-muted-foreground">{formData.title.length}/120</p>
                  {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={formData.fundme_category_id} onValueChange={(v) => set("fundme_category_id", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.fundme_category_id && (
                    <p className="text-sm text-destructive">{errors.fundme_category_id}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal_amount">Goal amount (USD) *</Label>
                <Input
                  id="goal_amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={formData.goal_amount}
                  onChange={(e) => set("goal_amount", e.target.value)}
                  placeholder="e.g. 5000"
                />
                {errors.goal_amount && <p className="text-sm text-destructive">{errors.goal_amount}</p>}
              </div>

              <div className="space-y-2">
                <Label>Cover image *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                    onChange={(e) => set("cover_image", e.target.files?.[0] ?? null)}
                    className={errors.cover_image ? "border-destructive" : ""}
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Required. JPEG, PNG, GIF or WebP. Max 5 MB.</p>
                {errors.cover_image && <p className="text-sm text-destructive">{errors.cover_image}</p>}
              </div>

              <hr className="border-t" />

              <div className="space-y-2">
                <Label htmlFor="helps_who">Who This Helps *</Label>
                <p className="text-sm text-muted-foreground">{helperPrompts.helps_who}</p>
                <Textarea
                  id="helps_who"
                  rows={4}
                  value={formData.helps_who}
                  onChange={(e) => set("helps_who", e.target.value)}
                  placeholder="Describe who will benefit from this campaign..."
                  className={errors.helps_who ? "border-destructive" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.helps_who.length} characters (min {narrativeMinLength})
                </p>
                {errors.helps_who && <p className="text-sm text-destructive">{errors.helps_who}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fund_usage">What Funds Will Be Used For *</Label>
                <p className="text-sm text-muted-foreground">{helperPrompts.fund_usage}</p>
                <Textarea
                  id="fund_usage"
                  rows={4}
                  value={formData.fund_usage}
                  onChange={(e) => set("fund_usage", e.target.value)}
                  placeholder="Explain how donations will be spent..."
                  className={errors.fund_usage ? "border-destructive" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.fund_usage.length} characters (min {narrativeMinLength})
                </p>
                {errors.fund_usage && <p className="text-sm text-destructive">{errors.fund_usage}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expected_impact">Expected Impact *</Label>
                <p className="text-sm text-muted-foreground">{helperPrompts.expected_impact}</p>
                <Textarea
                  id="expected_impact"
                  rows={4}
                  value={formData.expected_impact}
                  onChange={(e) => set("expected_impact", e.target.value)}
                  placeholder="Describe the outcomes you expect..."
                  className={errors.expected_impact ? "border-destructive" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.expected_impact.length} characters (min {narrativeMinLength})
                </p>
                {errors.expected_impact && <p className="text-sm text-destructive">{errors.expected_impact}</p>}
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="use_of_funds_confirmation"
                  checked={formData.use_of_funds_confirmation}
                  onCheckedChange={(v) => set("use_of_funds_confirmation", !!v)}
                />
                <Label htmlFor="use_of_funds_confirmation" className="text-sm font-normal cursor-pointer">
                  I confirm that funds will be used as described and align with our nonprofit mission.
                </Label>
              </div>
              {errors.use_of_funds_confirmation && (
                <p className="text-sm text-destructive">{errors.use_of_funds_confirmation}</p>
              )}

              <div className="flex flex-wrap gap-3 pt-4">
                <Button type="submit" name="status" value="draft" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save as draft
                </Button>
                <Button
                  type="submit"
                  name="status"
                  value="in_review"
                  variant="default"
                  disabled={isSubmitting || !formData.cover_image}
                  title={!formData.cover_image ? "Add a cover image to publish" : undefined}
                >
                  Publish (go live)
                </Button>
                <Link href={route("fundme.campaigns.index")}>
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
