export interface Channel {
  id: string;
  name: string;
  type: number;
  permissions: string[];
}

export interface Role {
  id: string;
  name: string;
  color: string;
  permissions: number;
}

export interface Guild {
  id: string;
  name: string;
  icon?: string;
  ownerId: string;
  permissions: number;
  roles: Role[];
  channels: Channel[];
}

export interface DiscordProfile {
  id: string;
  username: string;
  avatar: string | null;
  email?: string;
  global_name?: string | null;
}
