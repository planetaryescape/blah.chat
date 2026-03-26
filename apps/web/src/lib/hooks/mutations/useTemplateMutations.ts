import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSDKClient } from "@/lib/api/sdkClient";

function useInvalidateTemplates() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["templates"] });
  };
}

export function useCreateTemplate() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateTemplates();

  return useMutation({
    mutationFn: (args: {
      name: string;
      prompt: string;
      description?: string;
      category: string;
    }) => sdk.createTemplate(args),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateTemplate() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateTemplates();

  return useMutation({
    mutationFn: (args: {
      templateId: string;
      name?: string;
      prompt?: string;
      description?: string;
      category?: string;
    }) => {
      const { templateId, ...payload } = args;
      return sdk.updateTemplate(templateId, payload);
    },
    onSuccess: () => invalidate(),
  });
}

export function useDeleteTemplate() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateTemplates();

  return useMutation({
    mutationFn: (args: { templateId: string }) =>
      sdk.deleteTemplate(args.templateId),
    onSuccess: () => invalidate(),
  });
}

export function useIncrementTemplateUsage() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateTemplates();

  return useMutation({
    mutationFn: (args: { templateId: string }) =>
      sdk.incrementTemplateUsage(args.templateId),
    onSuccess: () => invalidate(),
  });
}
