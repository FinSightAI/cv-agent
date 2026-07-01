"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function Checkbox({
  className,
  checked,
  onCheckedChange,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        "peer size-4 shrink-0 rounded border border-input bg-background shadow-xs outline-none transition-colors",
        "data-checked:bg-primary data-checked:border-primary data-checked:text-primary-foreground",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current transition-none">
        <CheckIcon className="size-3 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
