import { Container, Section } from "@react-email/components";

interface EmailContainerProps {
  children: React.ReactNode;
}

export const EmailContainer = ({ children }: EmailContainerProps) => (
  <Container
    style={{
      margin: "40px auto",
      padding: "20px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
    }}
  >
    <Section>{children}</Section>
  </Container>
);
