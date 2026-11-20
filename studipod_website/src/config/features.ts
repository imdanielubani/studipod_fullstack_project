import { BookOpen, MonitorPlay, Puzzle, Target, Users, type LucideIcon } from "lucide-react";

export type FeatureId = "circle" | "purpose" | "interactive" | "practice" | "share";

export interface Feature {
  id: FeatureId;
  title: string;
  description: string;
  icon: LucideIcon;
}

/** The Pod Experience — five parts of one collaborative study experience. */
export const features: readonly Feature[] = [
  {
    id: "circle",
    title: "Find Your Study Circle",
    description: "Connect with other learners and build meaningful study partnerships.",
    icon: Users,
  },
  {
    id: "purpose",
    title: "Study With Purpose",
    description: "Participate in examination-specific study groups and focused learning sessions.",
    icon: Target,
  },
  {
    id: "interactive",
    title: "Learn Interactively",
    description: "Discuss topics, share screens, engage in live sessions and exchange ideas.",
    icon: MonitorPlay,
  },
  {
    id: "practice",
    title: "Practice Together",
    description: "Challenge your understanding, solve problems and prepare collaboratively.",
    icon: Puzzle,
  },
  {
    id: "share",
    title: "Share Knowledge",
    description: "Discover and exchange resources that make learning more accessible.",
    icon: BookOpen,
  },
] as const;
