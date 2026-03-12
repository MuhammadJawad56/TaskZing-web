import { proposals as mockProposals } from "@/lib/mock-data/proposals";
import type { Proposal, ProposalWithDetails } from "@/lib/types/proposal";
import { getJobById } from "./jobs";
import { getUserById } from "./users";

const LOCAL_PROPOSALS_STORAGE_KEY = "taskzing_local_proposals";

function readLocalProposals(): Proposal[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(LOCAL_PROPOSALS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Proposal[]) : [];
  } catch {
    return [];
  }
}

function getAllProposals(): Proposal[] {
  return [...readLocalProposals(), ...mockProposals];
}

function getFallbackTestUserProposal(providerId: string): Proposal[] {
  if (providerId !== "test-user") return [];

  const now = new Date().toISOString();
  return [
    {
      applicationId: "local-proposal-test-user",
      jobId: "task-1",
      providerId,
      clientId: "user-5",
      proposalText: "Temporary local proposal so provider pages remain testable during migration.",
      bidAmount: 1200,
      estimatedDuration: "1 week",
      status: "submitted",
      isMessaged: false,
      isHired: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

async function enrichProposal(proposal: Proposal): Promise<ProposalWithDetails> {
  const [provider, task] = await Promise.all([
    proposal.providerId ? getUserById(proposal.providerId) : Promise.resolve(null),
    proposal.jobId ? getJobById(proposal.jobId) : Promise.resolve(null),
  ]);

  return {
    ...proposal,
    provider: provider
      ? {
          id: provider.uid,
          fullName:
            provider.fullName || provider.username || provider.email.split("@")[0],
          photoUrl: provider.photoUrl,
          totalRating: provider.totalRating,
          totalReviews: provider.totalReviews,
          isVerified: provider.isVerified,
        }
      : undefined,
    task: task
      ? {
          jobId: task.jobId,
          title: task.title,
          price: task.price || task.fixedPrice || 0,
          jobType: task.jobType,
        }
      : undefined,
  };
}

export async function getProposalsByJobId(
  jobId: string
): Promise<ProposalWithDetails[]> {
  const proposals = getAllProposals()
    .filter((proposal) => proposal.jobId === jobId)
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return Promise.all(proposals.map(enrichProposal));
}

export async function getProposalCounts(
  jobId: string
): Promise<{ total: number; hired: number }> {
  const proposals = await getProposalsByJobId(jobId);
  return {
    total: proposals.length,
    hired: proposals.filter((proposal) => proposal.isHired).length,
  };
}

export async function getProposalsByProviderId(
  providerId: string
): Promise<ProposalWithDetails[]> {
  const proposals = [...getFallbackTestUserProposal(providerId), ...getAllProposals()]
    .filter((proposal) => proposal.providerId === providerId)
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return Promise.all(proposals.map(enrichProposal));
}
