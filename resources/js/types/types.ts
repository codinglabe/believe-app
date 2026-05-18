export enum Page {
  // Main Pages
  Home = 'Home',
  About = 'About',
  Contact = 'Contact',
  Privacy = 'Privacy',
  Terms = 'Terms',
  
  // Donations & Fundraising
  Donate = 'Donate',
  BelieveFundMe = 'BelieveFundMe',
  
  // Organizations
  Organizations = 'Organizations',
  
  // Shopping & Services
  Marketplace = 'Marketplace',
  ServiceHub = 'ServiceHub',
  Cart = 'Cart',
  
  // Jobs & Volunteering
  Jobs = 'Jobs',
  Volunteer = 'Volunteer',
  
  // Education & Events
  Courses = 'Courses',
  Events = 'Events',
  Raffles = 'Raffles',
  
  // Community & Social
  News = 'News',
  SocialFeed = 'SocialFeed',
  FindSupporters = 'FindSupporters',
  Search = 'Search',
  
  // Rewards
  BelievePoints = 'BelievePoints',
  MerchantHub = 'MerchantHub',
  
  // Gift Cards
  GiftCards = 'GiftCards',
  
  // Fractional Ownership
  FractionalOwnership = 'FractionalOwnership',
  FractionalOwnershipPortfolio = 'FractionalOwnershipPortfolio',
  
  // Account
  Login = 'Login',
  Register = 'Register',
  Profile = 'Profile',
  Settings = 'Settings',
  
  // Legacy (keeping for compatibility)
  Mission = 'Mission',
  Projects = 'Projects',
  SupportDashboard = 'SupportDashboard'
}

export interface TranscriptionItem {
  type: 'user' | 'agent';
  text: string;
}
  