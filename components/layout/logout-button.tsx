"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/login/actions";

export function LogoutMenuItem() {
  return (
    <DropdownMenuItem
      className="text-status-danger focus:text-status-danger"
      onSelect={(event) => {
        event.preventDefault();
        void logoutAction();
      }}
    >
      Abmelden
    </DropdownMenuItem>
  );
}
