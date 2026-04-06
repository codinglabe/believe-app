import { Head, Link } from "@inertiajs/react";
import FrontendLayout from "@/layouts/frontend/frontend-layout";
import { Button } from "@/components/frontend/ui/button";
import { Card, CardContent, CardHeader } from "@/components/frontend/ui/card";
import { Heart, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { route } from "ziggy-js";

interface Props {
  donation: {
    id: number;
    amount_dollars: number;
    receipt_number: string;
    donor_name: string | null;
  };
  campaign: {
    title: string;
    slug: string;
    organization_name: string;
  };
}

export default function FundMeThankYou({ donation, campaign }: Props) {
  return (
    <FrontendLayout>
      <Head title="Thank you for your donation – Believe FundMe" />
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <Card className="overflow-hidden border-2 border-primary/20 shadow-xl">
            <div className="bg-primary/10 px-6 py-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary text-primary-foreground mb-4">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Thank you for your donation!
              </h1>
              <p className="mt-2 text-muted-foreground flex items-center justify-center gap-1">
                <Sparkles className="h-4 w-4 text-primary" />
                Your generosity makes a difference.
              </p>
            </div>
            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="text-center space-y-1">
                <p className="text-4xl font-bold text-primary">
                  ${donation.amount_dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground">
                  donated to <span className="font-medium text-foreground">{campaign.title}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {campaign.organization_name}
                </p>
              </div>
              {donation.receipt_number && (
                <p className="text-xs text-muted-foreground text-center">
                  Receipt # {donation.receipt_number}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Link href={route("fundme.show", { slug: campaign.slug })} className="flex-1">
                  <Button variant="outline" className="w-full gap-2">
                    <Heart className="h-4 w-4" />
                    View campaign
                  </Button>
                </Link>
                <Link href={route("fundme.index")} className="flex-1">
                  <Button className="w-full gap-2">
                    Find more campaigns
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          <p className="text-center text-sm text-muted-foreground mt-6">
            A receipt has been sent to your email. Funds go directly to the nonprofit.
          </p>
        </div>
      </div>
    </FrontendLayout>
  );
}
