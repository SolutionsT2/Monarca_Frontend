/**
 * Description: Hook to update an existing approval rule via the API.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchRequest } from "../../utils/apiService";
import { ApprovalRule } from "../../types/approvalRules";

interface UpdateApprovalRulePayload {
  ruleId: string;
  data: Partial<Omit<ApprovalRule, "id">>;
}

/**
 * Sends a PATCH request to update an existing approval rule.
 * Accepts a partial payload — only the provided fields are updated.
 * @param payload Rule ID and partial updated data.
 * @returns Promise resolving to the updated ApprovalRule.
 */
const updateApprovalRule = async ({
  ruleId,
  data,
}: UpdateApprovalRulePayload): Promise<ApprovalRule> => {
  return patchRequest(
    `/approval-rules/${ruleId}`,
    data as Record<string, unknown>,
  );
};

/**
 * Hook to update an approval rule. Invalidates the rules list cache on success.
 * @returns Mutation object with mutate function and isPending state.
 */
export const useUpdateApprovalRule = () => {
  const queryClient = useQueryClient();

  return useMutation<ApprovalRule, Error, UpdateApprovalRulePayload>({
    mutationFn: updateApprovalRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvalRules"] });
    },
  });
};

/*
 * Modification History:
 * - 2026-04-08 | Juan de Dios Gastélum | Initial file creation.
 * - 2026-05-12 | Juan de Dios Gastélum | Replaced TODO with real API call.
 * - 2026-05-26 | Juan de Dios Gastélum | Changed data payload to Partial to support
 *   single-field updates such as priority reordering.
 */