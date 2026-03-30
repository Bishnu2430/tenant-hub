import * as React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: DivProps) {
  return (
    <div
      className={
        "rounded-2xl border border-zinc-200 bg-white shadow-sm " + className
      }
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }: DivProps) {
  return <div className={"px-6 pt-6 " + className} {...props} />;
}

export function CardContent({ className = "", ...props }: DivProps) {
  return <div className={"px-6 pb-6 " + className} {...props} />;
}
