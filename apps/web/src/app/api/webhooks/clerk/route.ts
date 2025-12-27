import { api } from "@blah-chat/backend/convex/_generated/api";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { headers } from "next/headers";
import { Webhook } from "svix";
import logger from "@/lib/logger";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    logger.error("Missing CLERK_WEBHOOK_SECRET environment variable");
    return new Response("Internal Server Error", { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    logger.error("Missing svix headers");
    return new Response("Bad Request", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    logger.error({ err }, "Webhook signature verification failed");
    return new Response("Unauthorized", { status: 401 });
  }

  const eventType = evt.type;

  try {
    if (eventType === "user.created") {
      const { id, email_addresses, first_name, last_name, image_url } =
        evt.data;

      const primaryEmail = email_addresses.find(
        (e) => e.id === evt.data.primary_email_address_id,
      );

      if (!primaryEmail) {
        logger.error({ clerkId: id }, "No primary email found for user");
        return new Response("Bad Request", { status: 400 });
      }

      await convex.mutation(api.users.createUser, {
        clerkId: id,
        email: primaryEmail.email_address,
        name: `${first_name || ""} ${last_name || ""}`.trim() || "Anonymous",
        imageUrl: image_url,
      });

      logger.info(
        { clerkId: id, email: primaryEmail.email_address },
        "User created",
      );
    } else if (eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } =
        evt.data;

      const primaryEmail = email_addresses.find(
        (e) => e.id === evt.data.primary_email_address_id,
      );

      await convex.mutation(api.users.updateUser, {
        clerkId: id,
        ...(primaryEmail && { email: primaryEmail.email_address }),
        name: `${first_name || ""} ${last_name || ""}`.trim() || "Anonymous",
        imageUrl: image_url,
      });

      logger.info({ clerkId: id }, "User updated");
    } else if (eventType === "user.deleted") {
      const { id } = evt.data;

      if (!id) {
        logger.error("No user ID in delete event");
        return new Response("Bad Request", { status: 400 });
      }

      await convex.mutation(api.users.deleteUser, {
        clerkId: id,
      });

      logger.info({ clerkId: id }, "User deleted");
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    logger.error({ error, eventType }, "Error processing webhook");
    return new Response("Internal Server Error", { status: 500 });
  }
}
