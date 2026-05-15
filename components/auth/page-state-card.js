import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PageStateCard({
  heading,
  Icon,
  iconTone = "primary",
  cardTitle,
  cardDescription,
  body,
  ctaLabel,
  ctaHref,
  ctaVariant = "default",
}) {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              iconTone === "destructive" ? "bg-destructive/10" : "bg-primary/10"
            }`}
          >
            <Icon
              className={`h-5 w-5 ${
                iconTone === "destructive" ? "text-destructive" : "text-primary"
              }`}
              aria-hidden="true"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{cardTitle}</CardTitle>
            <CardDescription>{cardDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {body ? <p className="text-sm text-muted-foreground">{body}</p> : null}
            <Button variant={ctaVariant} className="w-full" asChild>
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
