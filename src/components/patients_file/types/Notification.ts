

import type { ReactNode } from "react";

export interface Notification {
  
  id: string;

  
  text: string;

  
  read: boolean;

  
  timestamp: Date;

  
  icon?: ReactNode;

  
  type?: string;
}