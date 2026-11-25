import { findProfileByUsername, type ProfileIdentity } from "@/domain/user";

export type ViewerProfileRelation = {
  profile: ProfileIdentity;
  owner: boolean;
};

export async function findViewableProfile(
  username: string | undefined,
  viewerId: string | null,
): Promise<ViewerProfileRelation | null> {
  if (!username) return null;

  const profile = await findProfileByUsername(username);
  return profile ? viewerRelation(profile, viewerId) : null;
}

// A private profile is visible to its owner only.
export function viewerRelation(
  profile: ProfileIdentity,
  viewerId: string | null,
): ViewerProfileRelation | null {
  const owner = viewerId === profile.id;
  if (!owner && profile.visibility !== "public") return null;
  return { profile, owner };
}
