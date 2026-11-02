import { Button } from "@react-email/components";

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
}

export const EmailButton = ({ href, children }: EmailButtonProps) => (
  <Button
    href={href}
    style={{
      backgroundColor: "#8b5cf6",
      color: "#ffffff",
      padding: "12px 24px",
      borderRadius: "6px",
      textDecoration: "none",
      display: "inline-block",
      marginTop: "16px",
    }}
  >
    {children}
  </Button>
);
