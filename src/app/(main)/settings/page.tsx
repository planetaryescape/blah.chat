"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomInstructionsForm } from "@/components/settings/CustomInstructionsForm";
import { MemorySettings } from "@/components/settings/MemorySettings";
import { SearchSettings } from "@/components/settings/SearchSettings";
import { BudgetSettings } from "@/components/settings/BudgetSettings";
import { MessageLimitSettings } from "@/components/settings/MessageLimitSettings";
import { MaintenanceSettings } from "@/components/settings/MaintenanceSettings";
import { UISettings } from "@/components/settings/UISettings";

export default function SettingsPage() {
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <Tabs defaultValue="personalization" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="personalization">Personalization</TabsTrigger>
          <TabsTrigger value="ui">UI</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="personalization" className="mt-6">
          <CustomInstructionsForm />
        </TabsContent>

        <TabsContent value="ui" className="mt-6">
          <UISettings />
        </TabsContent>

        <TabsContent value="memory" className="mt-6">
          <MemorySettings />
        </TabsContent>

        <TabsContent value="search" className="mt-6">
          <SearchSettings />
        </TabsContent>

        <TabsContent value="budget" className="mt-6">
          <BudgetSettings />
        </TabsContent>

        <TabsContent value="limits" className="mt-6">
          <MessageLimitSettings />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <MaintenanceSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
