export type Branch = {
  id: string;
  name: string;
  address: string;
  googleMapsUrl: string | null;
  latitude: number;
  longitude: number;
  radiusM: number;
  isActive: boolean;
};

export type BranchWithDistance = Branch & { distanceM: number };
