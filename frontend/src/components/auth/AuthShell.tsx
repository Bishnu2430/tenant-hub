import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
            <p className="text-sm text-zinc-600">{subtitle}</p>
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
