"use client";
import { useEffect, useState } from "react";

// Dynamically import Clerk components to avoid errors when Clerk isn't configured
export function UserButton() {
  const [hasClerk, setHasClerk] = useState(false);
  const [ClerkUserButton, setClerkUserButton] =
    useState<React.ComponentType | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      setHasClerk(true);
      import("@clerk/nextjs").then((m) => {
        setClerkUserButton(() => m.UserButton);
      });
    }
  }, []);

  if (!hasClerk) return null;
  if (!ClerkUserButton) return null;
  return <ClerkUserButton />;
}
