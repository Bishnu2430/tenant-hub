import * as React from "react";

type Props = React.LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className = "", ...props }: Props) {
  return (
    <label
      className={"block text-sm font-medium text-zinc-700 " + className}
      {...props}
    />
  );
}
