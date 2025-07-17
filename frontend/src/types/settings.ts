export type ThemeType = 'light' | 'dark';

export interface UserSettings {
  id: number;
  user_id: number;
  theme: ThemeType;
  default_tools: string[];
  notifications_enabled: boolean;
  default_wordlist?: string;
  auto_export: boolean;
}

export interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}