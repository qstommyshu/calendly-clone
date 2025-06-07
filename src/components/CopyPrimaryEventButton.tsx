"use client"

import { useState } from "react"
import { Button, ButtonProps } from "./ui/button"
import { Copy, CopyCheck, CopyX, Star } from "lucide-react"

type CopyState = "idle" | "copied" | "error"

export function CopyPrimaryEventButton({
  clerkUserId,
  ...buttonProps
}: Omit<ButtonProps, "children" | "onClick"> & {
  clerkUserId: string
}) {
  const [copyState, setCopyState] = useState<CopyState>("idle")

  const CopyIcon = getCopyIcon(copyState)

  return (
    <Button
      {...buttonProps}
      onClick={() => {
        navigator.clipboard
          .writeText(`${location.origin}/book/${clerkUserId}/primary`)
          .then(() => {
            setCopyState("copied")
            setTimeout(() => setCopyState("idle"), 2000)
          })
          .catch(() => {
            setCopyState("error")
            setTimeout(() => setCopyState("idle"), 2000)
          })
      }}
    >
      <Star className="size-4 mr-2" />
      {getChildren(copyState)}
    </Button>
  )
}

function getCopyIcon(copyState: CopyState) {
  switch (copyState) {
    case "idle":
      return Star
    case "copied":
      return CopyCheck
    case "error":
      return CopyX
  }
}

function getChildren(copyState: CopyState) {
  switch (copyState) {
    case "idle":
      return "Copy Primary Link"
    case "copied":
      return "Copied!"
    case "error":
      return "Error"
  }
} 