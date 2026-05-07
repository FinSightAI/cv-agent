import { listWorkdayJobs, parseWorkdayUrl } from "./workday";
import type { ConnectorJob } from "./types";

// Default seed list — popular companies running Workday public boards.
// User can extend this in their preferences.
export const DEFAULT_WORKDAY_BOARDS = [
  "https://siemens.wd1.myworkdayjobs.com/Siemens_Careers",
  "https://salesforce.wd12.myworkdayjobs.com/External_Career_Site",
  "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite",
  "https://nbcuni.wd1.myworkdayjobs.com/NBCUCareers",
  "https://citi.wd5.myworkdayjobs.com/2",
];

export type WorkdaySearchOptions = {
  keywords: string;
  boards: string[];
  perBoardLimit?: number;
};

export async function searchWorkday(
  opts: WorkdaySearchOptions,
): Promise<ConnectorJob[]> {
  const limit = opts.perBoardLimit ?? 30;
  const tasks = opts.boards.map(async (board) => {
    const coords = parseWorkdayUrl(board);
    if (!coords) return [] as ConnectorJob[];
    try {
      const jobs = await listWorkdayJobs(coords, opts.keywords, limit);
      return jobs.slice(0, limit);
    } catch {
      // One bad board shouldn't kill the rest.
      return [] as ConnectorJob[];
    }
  });
  const results = await Promise.all(tasks);
  return results.flat();
}
