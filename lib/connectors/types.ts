export type ConnectorJob = {
  externalId: string;
  title: string;
  company: string;
  location?: string;
  remote?: boolean;
  url: string;
  description?: string;
  postedAt?: string;
  source: "greenhouse" | "lever" | "ashby" | "workday" | "linkedin" | "alljobs" | "drushim";
};
