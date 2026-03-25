import {
  deleteUserAccount,
  deleteUserData,
  exportUserData,
  getCurrentUser,
} from "@/lib/persistence/userData";
import { formatEntity } from "@/lib/utils/formatEntity";
import "server-only";

export const userDataDAL = {
  me: async (clerkUserId: string) => {
    const user = await getCurrentUser(clerkUserId);
    return formatEntity(user, "user", user._id);
  },

  export: async (clerkUserId: string) => {
    const data = await exportUserData(clerkUserId);
    return formatEntity(data, "user_export");
  },

  deleteData: async (clerkUserId: string, confirmationText: string) => {
    const result = await deleteUserData(clerkUserId, confirmationText);
    return formatEntity(result, "user");
  },

  deleteAccount: async (clerkUserId: string, confirmationText: string) => {
    const result = await deleteUserAccount(clerkUserId, confirmationText);
    return formatEntity(result, "user");
  },
};
