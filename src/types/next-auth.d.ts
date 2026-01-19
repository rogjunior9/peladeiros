import { DefaultSession, DefaultUser } from "next-auth";
import { UserRole, PlayerType } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      playerType: PlayerType;
      phone: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: UserRole;
    playerType: PlayerType;
    phone: string | null;
  }
}
