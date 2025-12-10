"use client";

import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Shield, Users } from "lucide-react";
import { Suspense } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

function UsersListSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

function UsersPageContent() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const users = useQuery(api.admin.listUsers);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updateRole = useMutation(api.admin.updateUserRole);

  const handleToggleAdmin = async (userId: Id<"users">, isAdmin: boolean) => {
    try {
      await updateRole({ userId, isAdmin });
      toast.success(isAdmin ? "Admin role granted" : "Admin role revoked");
    } catch (error: any) {
      toast.error(error.message || "Failed to update role");
    }
  };

  if (!users) {
    return <UsersListSkeleton />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">User Management</h1>
        </div>
        <Badge variant="secondary">{users.length} users</Badge>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Admin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.imageUrl || undefined}
                        alt={user.name}
                      />
                      <AvatarFallback>
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNow(user.createdAt, { addSuffix: true })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {user.isAdmin && (
                      <Shield className="h-4 w-4 text-primary" />
                    )}
                    <Switch
                      checked={user.isAdmin}
                      onCheckedChange={(checked) =>
                        handleToggleAdmin(user._id, checked)
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<UsersListSkeleton />}>
      <UsersPageContent />
    </Suspense>
  );
}
