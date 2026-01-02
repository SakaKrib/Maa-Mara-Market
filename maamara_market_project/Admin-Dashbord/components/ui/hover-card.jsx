// src/components/ui/hover-card.jsx
import * as React from "react"
import * as HoverCardPrimitive from "@radix-ui/react-hover-card"
import { useTheme } from "@mui/material"
import { tokens } from "@/theme"   // ✅ import your tokens
import { cn } from "@/lib/utils"

const HoverCard = HoverCardPrimitive.Root
const HoverCardTrigger = HoverCardPrimitive.Trigger

const HoverCardContent = React.forwardRef(
  ({ className, align = "center", sideOffset = 4, ...props }, ref) => {
    const theme = useTheme()
    const colors = tokens(theme.palette.mode)

    return (
      <HoverCardPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-64 rounded-md p-4 shadow-md outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2",
          "data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2",
          "data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        style={{
          backgroundColor: colors.primary[600],   // card bg
          color: colors.gray[100],               // text color
          border: `1px solid ${colors.gray[400]}`, // border
        }}
        {...props}
      />
    )
  }
)

HoverCardContent.displayName = HoverCardPrimitive.Content.displayName

export { HoverCard, HoverCardTrigger, HoverCardContent }
