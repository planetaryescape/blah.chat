"use client";

import { useEffect, useState } from "react";
import { KeyboardHelp } from "./KeyboardHelp";

/**
 * Manager component that listens for the `open-keyboard-help` event
 * and shows the keyboard shortcuts dialog.
 */
export function KeyboardHelpManager() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("open-keyboard-help", handleOpen);
    return () => window.removeEventListener("open-keyboard-help", handleOpen);
  }, []);

  return <KeyboardHelp open={open} onOpenChange={setOpen} />;
}
