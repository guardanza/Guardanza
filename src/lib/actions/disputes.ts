"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function openDispute(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const guarantee_id = String(formData.get("guarantee_id"));
  const contract_id = String(formData.get("contract_id"));

  const { data: dispute, error } = await supabase
    .from("disputes")
    .insert({ guarantee_id, opened_by: userRes.user!.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/contracts/${contract_id}`);
  redirect(`/disputes/${dispute.id}`);
}

export async function createProposal(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const dispute_id = String(formData.get("dispute_id"));
  const supersedes_proposal_id = String(formData.get("supersedes_proposal_id") || "") || null;

  const descriptions = formData.getAll("item_description").map(String);
  const quantities = formData.getAll("item_quantity").map(String);
  const amounts = formData.getAll("item_amount").map(String);
  const versionIds = formData.getAll("item_repair_reference_version_id").map(String);

  type DraftItem = { description: string; quantity: number; amount: number; repair_reference_version_id: string | null };
  const draftItems: DraftItem[] = [];

  for (let i = 0; i < descriptions.length; i++) {
    if (!descriptions[i]) continue;
    const versionId = versionIds[i] || null;
    const quantity = Number(quantities[i] || 1);

    if (versionId) {
      // Resolve the catalog price now, the same value the DB trigger will
      // freeze into the row, so proposals.total_amount matches
      // sum(proposal_items.amount) exactly.
      const { data: version, error: versionError } = await supabase
        .from("repair_reference_versions")
        .select("unit_price")
        .eq("id", versionId)
        .single();
      if (versionError) throw new Error(versionError.message);
      draftItems.push({
        description: descriptions[i],
        quantity,
        amount: Number(version.unit_price) * quantity,
        repair_reference_version_id: versionId,
      });
    } else {
      draftItems.push({
        description: descriptions[i],
        quantity,
        amount: Number(amounts[i] || 0),
        repair_reference_version_id: null,
      });
    }
  }

  const total_amount = draftItems.reduce((sum, it) => sum + it.amount, 0);

  const { data: proposal, error } = await supabase
    .from("proposals")
    .insert({ dispute_id, created_by: userRes.user!.id, total_amount, supersedes_proposal_id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  for (const item of draftItems) {
    const { error: itemError } = await supabase.from("proposal_items").insert({
      proposal_id: proposal.id,
      description: item.description,
      quantity: item.quantity,
      amount: item.amount,
      repair_reference_version_id: item.repair_reference_version_id,
    });
    if (itemError) throw new Error(itemError.message);
  }

  revalidatePath(`/disputes/${dispute_id}`);
  redirect(`/disputes/${dispute_id}`);
}

export async function acceptProposal(proposalId: string, disputeId: string) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { error } = await supabase.rpc("accept_proposal", {
    p_proposal_id: proposalId,
    p_actor_user_id: userRes.user!.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/disputes/${disputeId}`);
}

export async function rejectProposal(proposalId: string, disputeId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const motivo_rechazo = String(formData.get("motivo_rechazo") || "");

  const { error } = await supabase.rpc("reject_proposal", {
    p_proposal_id: proposalId,
    p_actor_user_id: userRes.user!.id,
    p_motivo_rechazo: motivo_rechazo,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/disputes/${disputeId}`);
}
