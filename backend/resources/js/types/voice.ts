export enum Page {
  Home = "Home",
  Mission = "Our Mission",
  Projects = "Projects",
  Donate = "Donate",
  Settings = "Settings",
}

export interface TranscriptionItem {
  type: "user" | "agent"
  text: string
}
